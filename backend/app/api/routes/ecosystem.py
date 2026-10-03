"""BIN4 Ecosystem API — organizations, verified identity, relationships,
connections, ingestion, labs/devices, emergency packets, export,
interoperability map, partner clients, webhooks, entitlements, KPIs.

Every route: Clerk auth + explicit authorization. Org membership NEVER
implies pet access. Verification NEVER self-asserted. External data enters
ONLY via the ingestion pipeline. Webhook/partner payloads carry IDs only.
"""
import hmac
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_optional_user
from app.core.config import settings
from app.core.ownership import get_user_or_404, require_dog_ownership
from app.core.audit import log_audit
from app.core.observability import log_event
from app.db.session import get_db
from app.models import all_models as M
from app.models import foundation_models as F
from app.models import collaboration_models as C
from app.models import ecosystem_models as E
from app.schemas import ecosystem_schemas as ES
from app.services import org_service as orgs
from app.services import ingestion_service as ingest
from app.services import fhir_maps
from app.services import partner_service as partners
from app.services import webhook_service as webhooks
from app.services import collaboration_service as svc

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _audit(db: Session, action: str, user, dog_id=None, rid=None, rtype: str = ""):
    try:
        log_audit(db, action=action, user_id=user.id, dog_id=dog_id,
                  details={"resource_type": rtype, "resource_id": str(rid) if rid else None})
    except Exception:
        pass


def _user_by_email(db: Session, email: str):
    user = db.query(M.User).filter(func.lower(M.User.email) == email.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=422,
                            detail="No PAWPHILE account for that email.")
    return user


def _integration_consent(db: Session, user, purpose: str) -> None:
    row = db.query(F.ConsentRecord).filter(
        F.ConsentRecord.user_id == user.id,
        F.ConsentRecord.purpose == purpose).order_by(
        F.ConsentRecord.created_at.desc()).first()
    if not row or row.status != "GRANTED":
        raise HTTPException(status_code=403,
                            detail=f"Integration requires granted `{purpose}` consent. "
                                   "Grant it in Consent Center to continue.")


def _conn_or_404(db: Session, user, conn_id: UUID) -> E.ExternalConnection:
    c = db.query(E.ExternalConnection).filter(
        E.ExternalConnection.id == conn_id,
        E.ExternalConnection.owner_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Connection not found.")
    return c


# ══════════════ ORGANIZATIONS ══════════════

@router.post("/orgs", status_code=201)
def create_org(payload: ES.OrgCreate,
               clerk_user_id: str = Depends(get_current_user),
               db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    org = E.Organization(name=payload.name, org_type=payload.org_type,
                        contact=payload.contact, location=payload.location,
                        status="ACTIVE", created_by=user.id)
    db.add(org)
    db.flush()
    db.add(E.OrgMembership(org_id=org.id, user_id=user.id, role="OWNER", status="ACTIVE"))
    db.commit()
    db.refresh(org)
    _audit(db, "org.created", user, None, org.id, "organization")
    db.commit()
    return ES.org_out(org)


@router.get("/orgs")
def my_orgs(clerk_user_id: str = Depends(get_current_user),
            db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    rows = db.query(E.OrgMembership).filter(E.OrgMembership.user_id == user.id).all()
    out = []
    for m in rows:
        org = db.query(E.Organization).filter(E.Organization.id == m.org_id).first()
        if org:
            d = ES.org_out(org)
            d.update({"my_role": m.role, "my_status": m.status})
            out.append(d)
    return {"organizations": out}


@router.get("/orgs/{org_id}")
def get_org(org_id: UUID, clerk_user_id: str = Depends(get_current_user),
            db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    org = orgs.org_or_404(db, org_id)
    m = orgs.membership(db, org_id, user.id)
    if not m:
        raise HTTPException(status_code=404, detail="Organization not found.")
    d = ES.org_out(org)
    d.update({"my_role": m.role, "my_status": m.status})
    return d


@router.get("/orgs/{org_id}/members")
def list_members(org_id: UUID, clerk_user_id: str = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    orgs.org_or_404(db, org_id)
    if not orgs.membership(db, org_id, user.id):
        raise HTTPException(status_code=404, detail="Organization not found.")
    rows = db.query(E.OrgMembership).filter(E.OrgMembership.org_id == org_id).all()
    return [{"id": str(m.id), "user_id": str(m.user_id), "role": m.role,
             "status": m.status} for m in rows]


@router.post("/orgs/{org_id}/members", status_code=201)
def add_member(org_id: UUID, payload: ES.MemberAdd,
               clerk_user_id: str = Depends(get_current_user),
               db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    orgs.org_or_404(db, org_id)
    orgs.require_org_role(db, org_id, user, "OWNER", "ADMIN")
    if payload.role == "OWNER":
        orgs.require_org_role(db, org_id, user, "OWNER")
    target = _user_by_email(db, payload.user_email)
    if orgs.membership(db, org_id, target.id):
        raise HTTPException(status_code=409, detail="User is already a member.")
    m = E.OrgMembership(org_id=org_id, user_id=target.id,
                       role=payload.role, status="ACTIVE")
    db.add(m)
    db.commit()
    _audit(db, "org.membership_created", user, None, m.id, "org_membership")
    db.commit()
    return {"id": str(m.id), "role": m.role, "status": m.status}


@router.patch("/orgs/{org_id}/members/{member_id}")
def update_member(org_id: UUID, member_id: UUID, payload: ES.MemberUpdate,
                  clerk_user_id: str = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    orgs.org_or_404(db, org_id)
    orgs.require_org_role(db, org_id, user, "OWNER", "ADMIN")
    m = db.query(E.OrgMembership).filter(
        E.OrgMembership.id == member_id, E.OrgMembership.org_id == org_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Membership not found.")
    if payload.role == "OWNER":
        orgs.require_org_role(db, org_id, user, "OWNER")
    if payload.role:
        m.role = payload.role
    if payload.status:
        # Never strand an org without an active OWNER.
        if m.role == "OWNER" and payload.status != "ACTIVE":
            others = db.query(E.OrgMembership).filter(
                E.OrgMembership.org_id == org_id, E.OrgMembership.role == "OWNER",
                E.OrgMembership.status == "ACTIVE",
                E.OrgMembership.id != m.id).count()
            if others == 0:
                raise HTTPException(status_code=409,
                                    detail="Cannot remove the last active OWNER.")
        m.status = payload.status
    m.updated_at = _utcnow()
    db.commit()
    _audit(db, "org.membership_changed", user, None, m.id, "org_membership")
    db.commit()
    return {"id": str(m.id), "role": m.role, "status": m.status}


@router.patch("/orgs/{org_id}")
def update_org(org_id: UUID, status: str,
               clerk_user_id: str = Depends(get_current_user),
               db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    org = orgs.org_or_404(db, org_id)
    orgs.require_org_role(db, org_id, user, "OWNER")
    if status not in E.ORG_STATUS:
        raise HTTPException(status_code=422, detail="Invalid organization status.")
    org.status = status
    db.commit()
    _audit(db, "org.status_changed", user, None, org.id, "organization")
    db.commit()
    return ES.org_out(org)


# ══════════════ PROFESSIONALS (verified identity) ══════════════

@router.post("/professionals", status_code=201)
def create_professional(payload: ES.ProfessionalCreate,
                        clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Register a professional CLAIM. Always UNVERIFIED; verification is a
    separate reviewed workflow (never self-asserted)."""
    user = get_user_or_404(clerk_user_id, db)
    org_id = None
    if payload.org_id:
        orgs.org_or_404(db, payload.org_id)
        if not orgs.membership(db, payload.org_id, user.id):
            raise HTTPException(status_code=404, detail="Organization not found.")
        org_id = payload.org_id
    p = E.VetProfessional(user_id=user.id, org_id=org_id,
                          display_name=payload.display_name,
                          professional_role=payload.professional_role,
                          professional_type=payload.professional_type,
                          jurisdiction=payload.jurisdiction,
                          location=payload.location,
                          verification_state="UNVERIFIED", is_active=True,
                          professional_metadata={})
    db.add(p)
    db.commit()
    db.refresh(p)
    _audit(db, "professional.created", user, None, p.id, "vet_professional")
    db.commit()
    return ES.prof_out(p)


@router.get("/professionals")
def list_professionals(org_id: Optional[UUID] = None,
                       clerk_user_id: str = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    q = db.query(E.VetProfessional)
    if org_id:
        orgs.org_or_404(db, org_id)
        if not orgs.membership(db, org_id, user.id):
            raise HTTPException(status_code=404, detail="Organization not found.")
        q = q.filter(E.VetProfessional.org_id == org_id)
    else:
        q = q.filter(E.VetProfessional.user_id == user.id)
    return [ES.prof_out(p) for p in q.order_by(E.VetProfessional.created_at.desc()).all()]


@router.post("/professionals/{prof_id}/request-verification")
def request_verification(prof_id: UUID, payload: ES.VerificationRequest,
                         clerk_user_id: str = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    p = db.query(E.VetProfessional).filter(E.VetProfessional.id == prof_id).first()
    if not p or p.user_id != user.id:
        raise HTTPException(status_code=404, detail="Professional profile not found.")
    if p.verification_state == "VERIFIED":
        raise HTTPException(status_code=409, detail="Already VERIFIED.")
    p.verification_state = "PENDING"
    p.jurisdiction = payload.jurisdiction
    p.verification_evidence_ref = (
        f"license:{payload.license_no.strip()}|jurisdiction:{payload.jurisdiction.strip()}|"
        f"evidence:{payload.evidence_ref.strip()}")
    p.updated_at = _utcnow()
    db.commit()
    _audit(db, "professional.verification_requested", user, None, p.id, "vet_professional")
    db.commit()
    return ES.prof_out(p)


@router.post("/professionals/{prof_id}/review")
def review_verification(prof_id: UUID, payload: ES.VerificationReview,
                        clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Org-admin review. Approval requires recorded evidence and yields
    org-attested VERIFIED (labeled as such — not an independent credential
    check). Only an org ADMIN/OWNER of the professional's org may review."""
    user = get_user_or_404(clerk_user_id, db)
    p = db.query(E.VetProfessional).filter(E.VetProfessional.id == prof_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Professional profile not found.")
    if not p.org_id:
        raise HTTPException(status_code=422,
                            detail="Independent (org-less) profiles cannot be verified "
                                   "in-product. Join an organization first.")
    orgs.org_or_404(db, p.org_id)
    orgs.require_org_role(db, p.org_id, user, "OWNER", "ADMIN")
    if user.id == p.user_id:
        raise HTTPException(status_code=403,
                            detail="Self-review is not allowed: verification is never self-asserted.")
    if p.verification_state != "PENDING":
        raise HTTPException(status_code=409,
                            detail=f"Profile is {p.verification_state}; only PENDING profiles can be reviewed.")
    if payload.approve:
        if not p.verification_evidence_ref:
            raise HTTPException(status_code=422,
                                detail="Cannot verify without recorded license evidence.")
        p.verification_state = "VERIFIED"
        p.verification_source = "org_attestation"
        p.verified_at = _utcnow()
        p.verification_expires_at = _utcnow() + timedelta(days=365)
        p.reviewed_by_user_id = user.id
    else:
        p.verification_state = "UNVERIFIED"
        p.reviewed_by_user_id = user.id
    p.updated_at = _utcnow()
    db.commit()
    _audit(db, "professional.verification_changed", user, None, p.id, "vet_professional")
    db.commit()
    return ES.prof_out(p)


@router.post("/professionals/{prof_id}/suspend")
def suspend_professional(prof_id: UUID,
                         clerk_user_id: str = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    p = db.query(E.VetProfessional).filter(E.VetProfessional.id == prof_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Professional profile not found.")
    if not p.org_id:
        raise HTTPException(status_code=404, detail="Professional profile not found.")
    orgs.org_or_404(db, p.org_id)
    orgs.require_org_role(db, p.org_id, user, "OWNER", "ADMIN")
    p.verification_state = "SUSPENDED"
    p.updated_at = _utcnow()
    db.commit()
    _audit(db, "professional.verification_changed", user, None, p.id, "vet_professional")
    db.commit()
    return ES.prof_out(p)


# ══════════════ CARE RELATIONSHIPS (owner-controlled) ══════════════

@router.post("/pets/{pet_id}/relationships", status_code=201)
def create_relationship(pet_id: UUID, payload: ES.RelationshipCreate,
                        clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Owner links a pet to a professional/org with purpose/scope/expiry.
    Organizations can never silently establish access: only the owner creates
    ACTIVE links here."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    prof = None
    if payload.professional_id:
        prof = db.query(E.VetProfessional).filter(
            E.VetProfessional.id == payload.professional_id).first()
        if not prof:
            raise HTTPException(status_code=404, detail="Professional not found.")
    org_id = payload.org_id
    if org_id:
        orgs.org_or_404(db, org_id)
    r = E.PetCareRelationship(pet_id=dog.id, owner_id=user.id,
                              professional_id=prof.id if prof else None,
                              org_id=org_id, purpose=payload.purpose,
                              scope=payload.scope, status="ACTIVE",
                              expires_at=payload.expires_at)
    db.add(r)
    db.commit()
    db.refresh(r)
    _audit(db, "relationship.created", user, dog.id, r.id, "pet_care_relationship")
    webhooks.emit(db, "RELATIONSHIP_CHANGED", owner_id=user.id,
                  ref={"id": str(r.id), "status": "ACTIVE"})
    db.commit()
    return ES.rel_out(r)


@router.get("/pets/{pet_id}/relationships")
def list_relationships(pet_id: UUID,
                       clerk_user_id: str = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    rows = db.query(E.PetCareRelationship).filter(
        E.PetCareRelationship.pet_id == pet_id).order_by(
        E.PetCareRelationship.created_at.desc()).all()
    return [ES.rel_out(r) for r in rows]


@router.patch("/pets/{pet_id}/relationships/{rel_id}")
def update_relationship(pet_id: UUID, rel_id: UUID, payload: ES.RelationshipUpdate,
                        clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    r = db.query(E.PetCareRelationship).filter(
        E.PetCareRelationship.id == rel_id,
        E.PetCareRelationship.pet_id == pet_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Relationship not found.")
    if payload.status:
        r.status = payload.status
    r.updated_at = _utcnow()
    db.commit()
    _audit(db, "relationship.changed", user, dog.id, r.id, "pet_care_relationship")
    webhooks.emit(db, "RELATIONSHIP_CHANGED", owner_id=user.id,
                  ref={"id": str(r.id), "status": r.status})
    db.commit()
    return ES.rel_out(r)


@router.get("/vet/relationships")
def vet_relationships(clerk_user_id: str = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Relationships pointing at my professional profile or my orgs."""
    user = get_user_or_404(clerk_user_id, db)
    prof_ids = [p.id for p in db.query(E.VetProfessional).filter(
        E.VetProfessional.user_id == user.id).all()]
    my_orgs = [m.org_id for m in db.query(E.OrgMembership).filter(
        E.OrgMembership.user_id == user.id,
        E.OrgMembership.status == "ACTIVE").all()]
    q = db.query(E.PetCareRelationship).filter(
        E.PetCareRelationship.status == "ACTIVE")
    rows = [r for r in q.all()
            if (r.professional_id in prof_ids)
            or (r.org_id is not None and r.org_id in my_orgs)]
    out = []
    for r in rows:
        pet = db.query(M.DogProfile).filter(M.DogProfile.id == r.pet_id).first()
        d = ES.rel_out(r)
        d.update({"pet_name": pet.name if pet else None})
        out.append(d)
    return {"relationships": out}


# ══════════════ CONNECTIONS + INGESTION ══════════════

_CONN_PURPOSE = {"LAB": "integration_lab", "IMAGING": "integration_imaging",
                 "DEVICE": "integration_device", "PIMS": "integration_pims",
                 "PARTNER": "integration_partner"}


@router.post("/pets/{pet_id}/connections", status_code=201)
def create_connection(pet_id: UUID, payload: ES.ConnectionCreate,
                      clerk_user_id: str = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Explicit, consent-gated connection. Shows WHAT/WHY via scopes; the
    consent purpose names the category (never hidden behind generic terms)."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    purpose = _CONN_PURPOSE[payload.provider_type]
    _integration_consent(db, user, purpose)
    target_pet = None
    if payload.pet_id:
        if str(payload.pet_id) != str(dog.id):
            raise HTTPException(status_code=404, detail="Pet not found.")
        target_pet = dog.id
    c = E.ExternalConnection(owner_id=user.id, pet_id=target_pet,
                             provider_type=payload.provider_type,
                             provider_name=payload.provider_name,
                             status="CONNECTED", scopes=payload.scopes,
                             consent_purpose=purpose)
    db.add(c)
    db.commit()
    db.refresh(c)
    _audit(db, "connection.created", user, dog.id, c.id, "external_connection")
    webhooks.emit(db, "CONNECTION_CHANGED", owner_id=user.id,
                  ref={"id": str(c.id), "status": "CONNECTED"})
    db.commit()
    return ES.conn_out(c, consent_status="GRANTED")


@router.get("/pets/{pet_id}/connections")
def list_connections(pet_id: UUID,
                     clerk_user_id: str = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    rows = db.query(E.ExternalConnection).filter(
        E.ExternalConnection.owner_id == user.id,
        E.ExternalConnection.pet_id == pet_id).order_by(
        E.ExternalConnection.created_at.desc()).all()
    return [ES.conn_out(r, consent_status=_consent_state(db, user, r)) for r in rows]


@router.get("/connections")
def my_connections(clerk_user_id: str = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    rows = db.query(E.ExternalConnection).filter(
        E.ExternalConnection.owner_id == user.id).order_by(
        E.ExternalConnection.created_at.desc()).all()
    return {"connections": [ES.conn_out(r, consent_status=_consent_state(db, user, r))
                            for r in rows]}


def _consent_state(db: Session, user, conn: E.ExternalConnection) -> str:
    row = db.query(F.ConsentRecord).filter(
        F.ConsentRecord.user_id == user.id,
        F.ConsentRecord.purpose == (conn.consent_purpose or "")).order_by(
        F.ConsentRecord.created_at.desc()).first()
    return row.status if row else "UNKNOWN"


@router.post("/connections/{conn_id}/revoke")
def revoke_connection(conn_id: UUID,
                      clerk_user_id: str = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    c = _conn_or_404(db, user, conn_id)
    c.status = "REVOKED"
    c.updated_at = _utcnow()
    db.commit()
    _audit(db, "connection.revoked", user, c.pet_id, c.id, "external_connection")
    webhooks.emit(db, "CONNECTION_CHANGED", owner_id=user.id,
                  ref={"id": str(c.id), "status": "REVOKED"})
    db.commit()
    return ES.conn_out(c, consent_status=_consent_state(db, user, c))


@router.get("/connections/{conn_id}/health")
def connection_health(conn_id: UUID,
                      clerk_user_id: str = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    c = _conn_or_404(db, user, conn_id)
    return {"connection_id": str(c.id), "status": c.status,
            "adapter": ingest.connector_for(c).provider_type,
            **ingest.connector_for(c).health(c)}


@router.post("/connections/{conn_id}/imports", status_code=201)
def run_import(conn_id: UUID, payload: ES.ImportIn,
               clerk_user_id: str = Depends(get_current_user),
               db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    c = _conn_or_404(db, user, conn_id)
    if c.status != "CONNECTED":
        raise HTTPException(status_code=409, detail=f"Connection is {c.status}.")
    if not c.pet_id:
        raise HTTPException(status_code=422,
                            detail="Connection has no pet scope; create a pet-scoped connection first.")
    require_dog_ownership(c.pet_id, clerk_user_id, db)
    _integration_consent(db, user, c.consent_purpose or "")
    result = ingest.ingest_records(db, c, c.pet_id, payload.kind, payload.records)
    _audit(db, "import.completed", user, c.pet_id, c.id, "external_connection")
    webhooks.emit(db, "IMPORT_COMPLETED", owner_id=user.id,
                  ref={"id": str(c.id), "imported": result["imported"],
                       "rejected": result["rejected"]})
    db.commit()
    return result


@router.get("/connections/{conn_id}/imports")
def list_imports(conn_id: UUID, limit: int = Query(50, le=200),
                 clerk_user_id: str = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    c = _conn_or_404(db, user, conn_id)
    rows = db.query(E.ExternalImport).filter(
        E.ExternalImport.connection_id == c.id).order_by(
        E.ExternalImport.created_at.desc()).limit(limit).all()
    return [{"id": str(i.id), "kind": i.kind, "status": i.status,
             "external_id": i.external_id, "source_label": i.source_label,
             "verification_status": i.verification_status,
             "event_id": str(i.result_event_id) if i.result_event_id else None,
             "error": i.error,
             "created_at": i.created_at.isoformat() if i.created_at else None}
            for i in rows]


# ══════════════ LABS / DEVICES ══════════════

def _range_flag(value: Optional[str], ref_range: Optional[str]) -> dict:
    """Recorded-range comparison only. Unparseable -> no flag, never a finding."""
    if not value or not ref_range:
        return {"flag": None, "note": "no recorded value/range"}
    import re
    try:
        v = float(str(value).strip().split()[0])
    except (ValueError, IndexError):
        return {"flag": None, "note": "value not numeric — no comparison made"}
    m = re.search(r"(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)", ref_range or "")
    if not m:
        return {"flag": None, "note": "reference range not parseable — no comparison made"}
    lo, hi = float(m.group(1)), float(m.group(2))
    if v < lo:
        return {"flag": "BELOW_RECORDED_RANGE",
                "note": "Outside recorded reference range (display only — not a diagnosis)."}
    if v > hi:
        return {"flag": "ABOVE_RECORDED_RANGE",
                "note": "Outside recorded reference range (display only — not a diagnosis)."}
    return {"flag": "WITHIN_RECORDED_RANGE", "note": "Within the recorded range."}


@router.get("/pets/{pet_id}/labs/summary")
def lab_summary(pet_id: UUID,
                clerk_user_id: str = Depends(get_current_user),
                db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    results = db.query(F.LabResult).filter(
        F.LabResult.pet_id == pet_id, F.LabResult.is_archived == False).order_by(  # noqa: E712
        F.LabResult.created_at.desc()).limit(50).all()
    panels = db.query(E.LabPanel).filter(E.LabPanel.pet_id == pet_id).order_by(
        E.LabPanel.created_at.desc()).limit(20).all()
    return {
        "panels": [{"id": str(p.id), "panel_name": p.panel_name, "source": p.source,
                    "status": p.status} for p in panels],
        "results": [{"id": str(r.id), "test_name": r.test_name,
                     "result_value": r.result_value, "result_unit": r.result_unit,
                     "reference_range": r.reference_range,
                     "source": r.source, "verification_status": "imported"
                     if r.source == "lab" else "owner_reported",
                     **_range_flag(r.result_value, r.reference_range)} for r in results],
        "disclaimer": "Recorded values with recorded ranges. PAWPHILE does not "
                      "interpret results or diagnose — discuss with your veterinarian.",
    }


@router.post("/pets/{pet_id}/labs/panels", status_code=201)
def create_panel(pet_id: UUID, panel_name: str, source: str = "owner",
                 clerk_user_id: str = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if not panel_name.strip():
        raise HTTPException(status_code=422, detail="panel_name must not be blank.")
    if source not in ("owner", "vet", "lab"):
        raise HTTPException(status_code=422, detail="source must be owner|vet|lab.")
    p = E.LabPanel(pet_id=dog.id, panel_name=panel_name.strip(), source=source,
                   ordered_at=_utcnow(), status="RECORDED")
    db.add(p)
    db.commit()
    db.refresh(p)
    _audit(db, "lab_panel.created", user, dog.id, p.id, "lab_panel")
    db.commit()
    return {"id": str(p.id), "panel_name": p.panel_name, "source": p.source}


@router.get("/pets/{pet_id}/devices/readings")
def list_device_readings(pet_id: UUID, metric: Optional[str] = None,
                         limit: int = Query(100, le=200),
                         clerk_user_id: str = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(E.DeviceReading).filter(E.DeviceReading.pet_id == pet_id)
    if metric:
        q = q.filter(E.DeviceReading.metric_type == metric)
    rows = q.order_by(E.DeviceReading.measured_at.desc()).limit(limit).all()
    return {"readings": [{"id": str(r.id), "metric_type": r.metric_type,
                          "value": r.value, "unit": r.unit,
                          "measured_at": r.measured_at.isoformat()
                          if r.measured_at else None,
                          "source": "DEVICE"} for r in rows],
            "note": "Device readings are timeline observations. They are not fed "
                    "into personal baselines (BIN2 boundary preserved)."}


# ══════════════ EMERGENCY PACKET + EXPORT ══════════════

@router.post("/pets/{pet_id}/emergency-packets", status_code=201)
def create_emergency_packet(pet_id: UUID,
                            clerk_user_id: str = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Fast minimal freeze for urgent situations. Same review+share rules as
    every package: nothing is shared until the owner approves and shares."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    svc.require_sharing_consent(db, user)
    prof = db.query(M.OwnerProfile).filter(M.OwnerProfile.user_id == user.id).first()
    snapshot = partners.build_emergency_snapshot(
        db, dog, prof.phone if prof and prof.phone else None)
    row = C.VetHealthPackage(pet_id=dog.id, owner_id=user.id,
                             package_type="EMERGENCY_PACKET", status="DRAFT",
                             version=1, snapshot=snapshot,
                             snapshot_digest=svc.snapshot_digest(snapshot),
                             generated_by="PAWPHILE:bin4-emergency-v1",
                             reviewed_by_owner=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, "package.created", user, dog.id, row.id, "vet_package")
    db.commit()
    return {"id": str(row.id), "package_type": row.package_type,
            "status": row.status, "snapshot_digest": row.snapshot_digest,
            "sections": sorted(snapshot.keys())}


@router.get("/pets/{pet_id}/vet-packages/{package_id}/export")
def export_package(pet_id: UUID, package_id: UUID,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Structured JSON export of an owner package: provenance, digest,
    generated-by, disclaimer. No storage pointers, no unrelated records."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(C.VetHealthPackage).filter(
        C.VetHealthPackage.id == package_id,
        C.VetHealthPackage.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Package not found.")
    _audit(db, "export.requested", user, dog.id, row.id, "vet_package")
    db.commit()
    return {"format": "PAWPHILE-package-json-v1",
            "package_id": str(row.id), "package_type": row.package_type,
            "version": row.version, "status": row.status,
            "snapshot_digest": row.snapshot_digest,
            "generated_by": row.generated_by,
            "generated_at": row.created_at.isoformat() if row.created_at else None,
            "pet_id": str(dog.id),
            "snapshot": row.snapshot or {},
            "disclaimer": "Owner-approved continuity export. Not a veterinary "
                          "medical record. AI-derived sections are PAWPHILE-generated."}


# ══════════════ INTEROP MAP + KPIs ══════════════

@router.get("/interoperability/fhir-map")
def get_fhir_map(clerk_user_id: str = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    get_user_or_404(clerk_user_id, db)
    return fhir_maps.fhir_map()


@router.get("/metrics/ecosystem")
def get_kpis(clerk_user_id: str = Depends(get_current_user),
             db: Session = Depends(get_db)):
    get_user_or_404(clerk_user_id, db)
    return partners.ecosystem_kpis(db)


# ══════════════ PLANS / ENTITLEMENTS ══════════════

@router.post("/plans", status_code=201)
def create_plan(payload: ES.PlanCreate,
                clerk_user_id: str = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Operator-managed catalog (any signed-in user in this foundation build;
    production would restrict to operators)."""
    user = get_user_or_404(clerk_user_id, db)
    plan = E.Plan(name=payload.name.strip() or "plan", features=payload.features)
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="name must not be blank.")
    db.add(plan)
    db.commit()
    db.refresh(plan)
    _audit(db, "plan.created", user, None, plan.id, "plan")
    db.commit()
    return {"id": str(plan.id), "name": plan.name, "features": plan.features}


@router.get("/plans")
def list_plans(clerk_user_id: str = Depends(get_current_user),
               db: Session = Depends(get_db)):
    get_user_or_404(clerk_user_id, db)
    return [{"id": str(p.id), "name": p.name, "features": p.features or []}
            for p in db.query(E.Plan).all()]


@router.post("/entitlements", status_code=201)
def grant_entitlement(payload: ES.EntitlementGrant,
                      clerk_user_id: str = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    target_user = _user_by_email(db, payload.user_email) if payload.user_email else None
    if not target_user and not payload.org_id:
        raise HTTPException(status_code=422,
                            detail="Entitlement needs a user_email or org_id.")
    if payload.org_id:
        orgs.org_or_404(db, payload.org_id)
        orgs.require_org_role(db, payload.org_id, user, "OWNER", "ADMIN")
    row = E.Entitlement(user_id=target_user.id if target_user else None,
                        org_id=payload.org_id, plan_id=payload.plan_id,
                        features=payload.features, status="ACTIVE")
    db.add(row)
    db.commit()
    _audit(db, "entitlement.granted", user, None, row.id, "entitlement")
    db.commit()
    return {"id": str(row.id), "features": row.features}


@router.get("/entitlements/mine")
def my_entitlements(clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    feats: set[str] = set()
    for row in db.query(E.Entitlement).filter(
            E.Entitlement.user_id == user.id,
            E.Entitlement.status == "ACTIVE").all():
        feats.update(row.features or [])
        if row.plan_id:
            plan = db.query(E.Plan).filter(E.Plan.id == row.plan_id).first()
            feats.update((plan.features or []) if plan else [])
    return {"features": sorted(feats),
            "note": "Features unlock product functionality only — never health-data access."}


# ══════════════ PARTNER CLIENTS ══════════════

@router.post("/partner-clients", status_code=201)
def create_partner_client(payload: ES.PartnerClientCreate,
                          clerk_user_id: str = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Partner API access is a gated FEATURE (entitlement `partner_api`).
    Scopes are explicit; there is no `write_all`."""
    user = get_user_or_404(clerk_user_id, db)
    if not partners.feature_enabled(db, user=user, feature="partner_api"):
        raise HTTPException(status_code=403,
                            detail="Partner API requires the `partner_api` feature. "
                                   "Features unlock functionality only — pet access still "
                                   "needs an owner relationship per pet.")
    org_id = None
    if payload.org_id:
        orgs.org_or_404(db, payload.org_id)
        orgs.require_org_role(db, payload.org_id, user, "OWNER", "ADMIN")
        org_id = payload.org_id
    client = E.PartnerApiClient(org_id=org_id, name=payload.name,
                                scopes=payload.scopes, status="ACTIVE",
                                created_by=user.id)
    db.add(client)
    db.commit()
    db.refresh(client)
    _audit(db, "partner_client.created", user, None, client.id, "partner_api_client")
    db.commit()
    return {"id": str(client.id), "name": client.name, "scopes": client.scopes}


@router.post("/partner-clients/{client_id}/credentials", status_code=201)
def issue_client_credential(client_id: UUID,
                            clerk_user_id: str = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    client = db.query(E.PartnerApiClient).filter(
        E.PartnerApiClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Partner client not found.")
    if client.created_by != user.id:
        if not client.org_id:
            raise HTTPException(status_code=404, detail="Partner client not found.")
        orgs.require_org_role(db, client.org_id, user, "OWNER", "ADMIN")
    cred, raw = partners.issue_credential(db, client)
    _audit(db, "partner_credential.issued", user, None, cred.id, "api_credential")
    db.commit()
    return {"credential_id": str(cred.id), "key_prefix": cred.key_prefix,
            "api_key": raw,
            "warning": "Shown once. Store it securely; it cannot be retrieved again."}


@router.post("/partner-clients/{client_id}/revoke")
def revoke_partner_client(client_id: UUID,
                           clerk_user_id: str = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    client = db.query(E.PartnerApiClient).filter(
        E.PartnerApiClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Partner client not found.")
    if client.created_by != user.id:
        if not client.org_id:
            raise HTTPException(status_code=404, detail="Partner client not found.")
        orgs.require_org_role(db, client.org_id, user, "OWNER", "ADMIN")
    client.status = "REVOKED"
    for cred in db.query(E.ApiCredential).filter(
            E.ApiCredential.client_id == client.id).all():
        cred.status = "REVOKED"
    db.commit()
    _audit(db, "partner_client.revoked", user, None, client.id, "partner_api_client")
    db.commit()
    return {"id": str(client.id), "status": client.status}


# ══════════════ WEBHOOKS ══════════════

@router.post("/webhooks/subscriptions", status_code=201)
def create_subscription(payload: ES.WebhookSubCreate,
                        clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    bad = [e for e in payload.events if e not in webhooks.WEBHOOK_EVENTS]
    if bad:
        raise HTTPException(status_code=422, detail=f"Unknown events: {bad}. "
                            f"Subscribable: {sorted(webhooks.WEBHOOK_EVENTS)}.")
    if not payload.events:
        raise HTTPException(status_code=422, detail="At least one event is required.")
    client_id = None
    if payload.client_id:
        client = db.query(E.PartnerApiClient).filter(
            E.PartnerApiClient.id == payload.client_id).first()
        if not client or client.created_by != user.id:
            raise HTTPException(status_code=404, detail="Partner client not found.")
        client_id = client.id
    sub = E.WebhookSubscription(owner_id=user.id, client_id=client_id,
                                events=payload.events, url=payload.url,
                                secret=secrets.token_urlsafe(32), status="ACTIVE")
    db.add(sub)
    db.commit()
    db.refresh(sub)
    _audit(db, "webhook.created", user, None, sub.id, "webhook_subscription")
    db.commit()
    return {"id": str(sub.id), "events": sub.events, "url": sub.url,
            "signing_secret": sub.secret,
            "warning": "Signing secret shown once. Payloads carry IDs only."}


@router.get("/webhooks/subscriptions")
def list_subscriptions(clerk_user_id: str = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    rows = db.query(E.WebhookSubscription).filter(
        E.WebhookSubscription.owner_id == user.id).all()
    return [{"id": str(s.id), "events": s.events, "url": s.url,
             "status": s.status,
             "created_at": s.created_at.isoformat() if s.created_at else None}
            for s in rows]


@router.post("/webhooks/subscriptions/{sub_id}/revoke")
def revoke_subscription(sub_id: UUID,
                        clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    s = db.query(E.WebhookSubscription).filter(
        E.WebhookSubscription.id == sub_id,
        E.WebhookSubscription.owner_id == user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    s.status = "REVOKED"
    db.commit()
    _audit(db, "webhook.revoked", user, None, s.id, "webhook_subscription")
    db.commit()
    return {"id": str(s.id), "status": s.status}


@router.get("/webhooks/deliveries")
def list_deliveries(subscription_id: UUID, limit: int = Query(50, le=200),
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    s = db.query(E.WebhookSubscription).filter(
        E.WebhookSubscription.id == subscription_id,
        E.WebhookSubscription.owner_id == user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    rows = db.query(E.WebhookDelivery).filter(
        E.WebhookDelivery.subscription_id == s.id).order_by(
        E.WebhookDelivery.created_at.desc()).limit(limit).all()
    return [{"id": str(d.id), "event_type": d.event_type, "status": d.status,
             "attempts": d.attempts, "last_error": d.last_error,
             "payload_keys": sorted((d.payload or {}).keys())} for d in rows]


@router.post("/worker/webhooks/dispatch")
async def dispatch_webhooks(request: Request, limit: int = Query(50, ge=1, le=200),
                            db: Session = Depends(get_db),
                            clerk_user_id: str | None = Depends(get_optional_user)):
    """Deliver QUEUED webhook events. Cron-token global scope, else per-user.
    Bounded retries, idempotent re-runs, signed IDs-only payloads."""
    cron_token = request.headers.get("X-Cron-Token", "")
    configured = settings.WORKER_CRON_TOKEN or ""
    scope = "user"
    user_id = None
    if configured and cron_token and hmac.compare_digest(cron_token, configured):
        scope = "global"
        log_event(logging.INFO, "worker_cron_auth", scope="global")
    else:
        if clerk_user_id is None:
            raise HTTPException(status_code=401, detail="Not authenticated.")
        user = get_user_or_404(clerk_user_id, db)
        user_id = user.id
    result = webhooks.dispatch_queued(db, limit=min(limit, 200), owner_id=user_id)
    return {"status": "success", "scope": scope, **result}
