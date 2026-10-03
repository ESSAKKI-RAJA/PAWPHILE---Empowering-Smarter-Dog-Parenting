"""BIN3 Veterinary Continuity API — owner-controlled collaboration loop.

Owner paths enforce user -> pet -> resource (404 on cross-user, no leakage).
Vet paths enforce authenticated user -> ACTIVE share grant -> pet -> resource
(404 when no grant exists, 410 when the grant expired/was revoked).

Immutability: a SHARED VetHealthPackage row is never UPDATE'd. New information
means a new version row. The snapshot the veterinarian saw is reconstructable.
"""
from datetime import datetime, timezone
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.ownership import get_user_or_404, require_dog_ownership
from app.core.audit import log_audit
from app.core.observability import log_event
from app.db.session import get_db
from app.models import all_models as M
from app.models import foundation_models as F
from app.models import collaboration_models as C
from app.schemas import collaboration_schemas as CS
from app.services import collaboration_service as svc
from app.services import intelligence_engine as eng
from app.services import org_service as orgs
from app.services import webhook_service as webhooks

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _audit(db: Session, action: str, user, dog_id=None, rid=None, rtype: str = ""):
    try:
        log_audit(db, action=action, user_id=user.id, dog_id=dog_id,
                  details={"resource_type": rtype, "resource_id": str(rid) if rid else None})
    except Exception:
        pass


def _mk_event(db: Session, pet_id: UUID, event_type: str, effective_at: datetime,
              title: Optional[str] = None, summary: Optional[str] = None,
              source: str = "owner", actor: Optional[str] = None,
              verification: str = "owner_reported",
              ref_table: Optional[str] = None, ref_id=None) -> F.HealthEvent:
    ev = F.HealthEvent(pet_id=pet_id, event_type=event_type, source=source,
                       actor=actor, effective_at=effective_at,
                       recorded_at=_utcnow(), verification_status=verification,
                       title=title, summary=summary, event_metadata={},
                       ref_table=ref_table, ref_id=ref_id)
    db.add(ev)
    db.flush()
    return ev


def _resolve_grantee(db: Session, email: str):
    want = email.strip().lower()
    user = db.query(M.User).filter(func.lower(M.User.email) == want).first()
    if not user:
        raise HTTPException(
            status_code=422,
            detail="No PAWPHILE account for that email. Ask the veterinarian to "
                   "sign in to PAWPHILE first, then link the share.")
    return user


def _get_consultation(db: Session, cid: UUID) -> C.Consultation:
    c = db.query(C.Consultation).filter(C.Consultation.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found.")
    return c


def _provider_gate(db: Session, user) -> None:
    """Suspended/revoked/expired providers lose vet access immediately (410).
    Owner access is never affected. BIN3 grants + BIN4 verification compose."""
    reason = orgs.provider_block_reason(db, user.id)
    if reason:
        raise HTTPException(status_code=410, detail=f"Provider access disabled: {reason}")


def _vet_actor(db: Session, clerk_user_id: str, pet_id: UUID):
    """Vet side: needs a usable share grant for this pet (404/410 otherwise)."""
    user = get_user_or_404(clerk_user_id, db)
    try:
        require_dog_ownership(pet_id, clerk_user_id, db)
        return user, None  # owner acting on own pet — not a vet context
    except HTTPException:
        pass
    share = svc.vet_share_for(db, user.id, pet_id)
    if share is None:
        # Distinguish revoked/expired (410) from never-granted (404).
        _, gone = svc.grant_state(db, user.id, pet_id)
        if gone:
            raise HTTPException(status_code=410, detail=f"Share is {gone}.")
        raise HTTPException(status_code=404, detail="Consultation not found.")
    _provider_gate(db, user)
    return user, share


def _consultation_actor(db: Session, clerk_user_id: str, c: C.Consultation):
    """Return (role, user, dog_or_None, share_or_None) for a consultation."""
    user = get_user_or_404(clerk_user_id, db)
    try:
        dog = require_dog_ownership(c.pet_id, clerk_user_id, db)
        return "owner", user, dog, None
    except HTTPException:
        pass
    share = svc.vet_share_for(db, user.id, c.pet_id)
    if share is not None and (c.vet_user_id is None or c.vet_user_id == user.id):
        # Consultation-scoped communication: a REPORT_ONLY grant alone does
        # not open consultations — the share must be linked to this
        # consultation (explicit invite) or carry timeline-level scope.
        linked = (getattr(share, "consultation_id", None) == c.id
                  or svc.scope_allows(share, "timeline"))
        if linked:
            _provider_gate(db, user)
            return "vet", user, None, share
    # Linked care-team account without a usable share still cannot read.
    _, gone = svc.grant_state(db, user.id, c.pet_id)
    if gone:
        raise HTTPException(status_code=410, detail=f"Share is {gone}.")
    raise HTTPException(status_code=404, detail="Consultation not found.")


# ══════════════ CARE TEAM (owner-controlled, pet-specific) ══════════════

@router.get("/pets/{pet_id}/care-team")
def list_care_team(pet_id: UUID,
                   clerk_user_id: str = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    rows = db.query(C.CareTeamMember).filter(
        C.CareTeamMember.pet_id == pet_id).order_by(
        C.CareTeamMember.created_at.desc()).all()
    return [CS.care_out(r) for r in rows]


@router.post("/pets/{pet_id}/care-team", status_code=201)
def add_care_member(pet_id: UUID, payload: CS.CareMemberCreate,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    vet_user_id = None
    if payload.vet_email:
        vet_user_id = _resolve_grantee(db, payload.vet_email).id
    row = C.CareTeamMember(pet_id=dog.id, owner_id=user.id,
                           display_name=payload.display_name,
                           clinic_name=payload.clinic_name, role=payload.role,
                           status="ACTIVE", vet_user_id=vet_user_id,
                           verification_state="UNVERIFIED")
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, "care_member.created", user, dog.id, row.id, "care_team_member")
    db.commit()
    return CS.care_out(row)


@router.patch("/pets/{pet_id}/care-team/{member_id}")
def update_care_member(pet_id: UUID, member_id: UUID, payload: CS.CareMemberUpdate,
                       clerk_user_id: str = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(C.CareTeamMember).filter(
        C.CareTeamMember.id == member_id, C.CareTeamMember.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Care team member not found.")
    if payload.verification_state == "VERIFIED":
        # No in-product credential check exists — self-asserting VERIFIED would
        # be a fake credential.
        raise HTTPException(
            status_code=422,
            detail="VERIFIED cannot be self-asserted: no credential check exists "
                   "in-product. The profile remains UNVERIFIED.")
    if payload.display_name is not None:
        if not payload.display_name.strip():
            raise HTTPException(status_code=422, detail="display_name must not be blank.")
        row.display_name = payload.display_name.strip()
    if payload.clinic_name is not None:
        row.clinic_name = payload.clinic_name
    if payload.role is not None:
        row.role = payload.role
    if payload.verification_state is not None:
        row.verification_state = payload.verification_state
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "care_member.updated", user, dog.id, row.id, "care_team_member")
    db.commit()
    return CS.care_out(row)


@router.post("/pets/{pet_id}/care-team/{member_id}/end")
def end_care_member(pet_id: UUID, member_id: UUID,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(C.CareTeamMember).filter(
        C.CareTeamMember.id == member_id, C.CareTeamMember.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Care team member not found.")
    row.status = "ENDED"
    row.ended_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "care_member.ended", user, dog.id, row.id, "care_team_member")
    db.commit()
    return CS.care_out(row)


# ══════════════ VET PACKAGES (draft -> owner review -> immutable share) ══════════════

def _package_or_404(db: Session, pet_id: UUID, package_id: UUID) -> C.VetHealthPackage:
    row = db.query(C.VetHealthPackage).filter(
        C.VetHealthPackage.id == package_id,
        C.VetHealthPackage.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Package not found.")
    return row


@router.post("/pets/{pet_id}/vet-packages", status_code=201)
def create_package(pet_id: UUID, payload: CS.PackageCreate,
                   clerk_user_id: str = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Prepare a draft package. Nothing is shared — the owner reviews first."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    svc.require_sharing_consent(db, user)
    if payload.package_type == "SELECTED_RECORDS" and not payload.selected_types:
        raise HTTPException(status_code=422,
                            detail="selected_types required when package_type=SELECTED_RECORDS.")
    consultation_id = None
    if payload.consultation_id:
        c = _get_consultation(db, payload.consultation_id)
        if c.pet_id != dog.id:
            raise HTTPException(status_code=404, detail="Consultation not found.")
        consultation_id = c.id
    open_q = db.query(C.VetQuestion).filter(
        C.VetQuestion.pet_id == dog.id,
        C.VetQuestion.status.in_(["OPEN", "ANSWERED"])).order_by(
        C.VetQuestion.created_at.asc()).limit(20).all()
    owner_questions = [{"id": str(q.id), "question": q.question_text,
                        "status": q.status,
                        "answer": q.answer_text} for q in open_q]
    snapshot = svc.build_snapshot(db, dog, payload.package_type,
                                  payload.selected_types, owner_questions)
    row = C.VetHealthPackage(pet_id=dog.id, owner_id=user.id,
                             consultation_id=consultation_id,
                             package_type=payload.package_type, status="DRAFT",
                             version=1, snapshot=snapshot,
                             snapshot_digest=svc.snapshot_digest(snapshot),
                             selected_types=payload.selected_types,
                             generated_by=f"PAWPHILE:{svc.PACKAGE_RULES}",
                             reviewed_by_owner=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, "package.created", user, dog.id, row.id, "vet_package")
    db.commit()
    return {"id": str(row.id), "status": row.status, "version": row.version,
            "snapshot_digest": row.snapshot_digest,
            "sections": sorted(snapshot.keys())}


@router.get("/pets/{pet_id}/vet-packages")
def list_packages(pet_id: UUID,
                  clerk_user_id: str = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    rows = db.query(C.VetHealthPackage).filter(
        C.VetHealthPackage.pet_id == pet_id).order_by(
        C.VetHealthPackage.created_at.desc()).all()
    return [{"id": str(r.id), "package_type": r.package_type, "status": r.status,
             "version": r.version,
             "parent_package_id": str(r.parent_package_id) if r.parent_package_id else None,
             "snapshot_digest": r.snapshot_digest,
             "reviewed_by_owner": r.reviewed_by_owner,
             "shared_at": r.shared_at.isoformat() if r.shared_at else None,
             "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in rows]


@router.get("/pets/{pet_id}/vet-packages/{package_id}")
def get_package(pet_id: UUID, package_id: UUID,
                clerk_user_id: str = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Owner review view: the EXACT sections that will be shared. SHOW this
    before approval — review-before-share is mandatory."""
    require_dog_ownership(pet_id, clerk_user_id, db)
    row = _package_or_404(db, pet_id, package_id)
    return {"id": str(row.id), "package_type": row.package_type,
            "status": row.status, "version": row.version,
            "snapshot_digest": row.snapshot_digest,
            "generated_by": row.generated_by,
            "reviewed_by_owner": row.reviewed_by_owner,
            "snapshot": row.snapshot or {}}


@router.post("/pets/{pet_id}/vet-packages/{package_id}/approve")
def approve_package(pet_id: UUID, package_id: UUID,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = _package_or_404(db, pet_id, package_id)
    if row.status != "DRAFT":
        raise HTTPException(status_code=409,
                            detail=f"Only DRAFT packages can be approved (is {row.status}).")
    row.status = "APPROVED"
    row.reviewed_by_owner = True
    row.reviewed_at = _utcnow()
    db.commit()
    _audit(db, "package.approved", user, dog.id, row.id, "vet_package")
    webhooks.emit(db, "PACKAGE_APPROVED", owner_id=user.id,
                  ref={"id": str(row.id)})
    db.commit()
    return {"id": str(row.id), "status": row.status, "reviewed_by_owner": True}


@router.post("/pets/{pet_id}/vet-packages/{package_id}/new-version", status_code=201)
def new_package_version(pet_id: UUID, package_id: UUID,
                        clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Owner changed something after sharing: freeze a NEW version. The old
    row's snapshot is never touched (status-only transition to SUPERSEDED)."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    svc.require_sharing_consent(db, user)
    old = _package_or_404(db, pet_id, package_id)
    if old.status not in ("APPROVED", "SHARED"):
        raise HTTPException(status_code=409,
                            detail="Only APPROVED/SHARED packages can be versioned.")
    open_q = db.query(C.VetQuestion).filter(
        C.VetQuestion.pet_id == dog.id,
        C.VetQuestion.status.in_(["OPEN", "ANSWERED"])).order_by(
        C.VetQuestion.created_at.asc()).limit(20).all()
    owner_questions = [{"id": str(q.id), "question": q.question_text,
                        "status": q.status, "answer": q.answer_text} for q in open_q]
    snapshot = svc.build_snapshot(db, dog, old.package_type,
                                  old.selected_types or [], owner_questions)
    new = C.VetHealthPackage(pet_id=dog.id, owner_id=user.id,
                             consultation_id=old.consultation_id,
                             package_type=old.package_type, status="DRAFT",
                             version=(old.version or 1) + 1,
                             parent_package_id=old.id, snapshot=snapshot,
                             snapshot_digest=svc.snapshot_digest(snapshot),
                             selected_types=old.selected_types or [],
                             generated_by=f"PAWPHILE:{svc.PACKAGE_RULES}",
                             reviewed_by_owner=False)
    db.add(new)
    if old.status == "SHARED":
        old.status = "SUPERSEDED"  # status only — snapshot bytes untouched
    db.commit()
    db.refresh(new)
    _audit(db, "package.created", user, dog.id, new.id, "vet_package")
    db.commit()
    return {"id": str(new.id), "status": new.status, "version": new.version,
            "parent_package_id": str(old.id),
            "snapshot_digest": new.snapshot_digest}


@router.post("/pets/{pet_id}/vet-packages/{package_id}/share", status_code=201)
def share_package(pet_id: UUID, package_id: UUID, payload: CS.PackageShareIn,
                  clerk_user_id: str = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """Owner approval -> ACTIVE share. Requires an APPROVED package (review
    first) and granted veterinary_sharing consent. Online only by nature:
    the server authorizes; nothing is ever shown as 'Shared' before this ACK."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    svc.require_sharing_consent(db, user)
    row = _package_or_404(db, pet_id, package_id)
    if row.status != "APPROVED" or not row.reviewed_by_owner:
        raise HTTPException(status_code=409,
                            detail="Package must be owner-approved before sharing. "
                                   "Review it first — PAWPHILE never auto-shares.")
    if payload.scope == "SELECTED" and not payload.selected_types:
        raise HTTPException(status_code=422,
                            detail="selected_types required when scope=SELECTED.")
    grantee = _resolve_grantee(db, payload.grantee_email) if payload.grantee_email else None
    consultation = None
    if payload.consultation_id:
        consultation = _get_consultation(db, payload.consultation_id)
        if consultation.pet_id != dog.id:
            raise HTTPException(status_code=404, detail="Consultation not found.")
    grant = F.ShareGrant(pet_id=dog.id, owner_id=user.id,
                         recipient_label=payload.recipient_label,
                         scope=payload.scope, selected_types=payload.selected_types,
                         status="ACTIVE", expires_at=payload.expires_at,
                         purpose=payload.purpose,
                         grantee_user_id=grantee.id if grantee else None,
                         consultation_id=consultation.id if consultation else None,
                         package_id=row.id)
    db.add(grant)
    db.flush()
    row.status = "SHARED"  # terminal for this row: never UPDATE'd again
    row.shared_at = _utcnow()
    if consultation:
        consultation.share_id = grant.id
        consultation.package_id = row.id
        if grantee:
            consultation.vet_user_id = grantee.id
        if consultation.status == "REQUESTED":
            consultation.status = "SCHEDULED"
    db.commit()
    db.refresh(grant)
    _audit(db, "package.shared", user, dog.id, row.id, "vet_package")
    _audit(db, "share.created", user, dog.id, grant.id, "share_grant")
    webhooks.emit(db, "PACKAGE_SHARED", owner_id=user.id,
                  ref={"id": str(row.id), "version": row.version})
    webhooks.emit(db, "SHARE_CREATED", owner_id=user.id,
                  ref={"id": str(grant.id), "scope": grant.scope})
    if grantee:
        svc.notify(db, grantee.id, f"bin3:share:{grant.id}:created",
                   f"PAWPHILE: {dog.name} health package shared with you",
                   f"A health package for {dog.name} was shared for {payload.purpose}. "
                   f"Open your vet portal to review. Share id {grant.id}.")
    db.commit()
    return {"share_id": str(grant.id), "package_id": str(row.id),
            "package_status": row.status, "scope": grant.scope,
            "purpose": grant.purpose, "status": grant.status}


@router.post("/pets/{pet_id}/shares/{share_id}/link")
def link_share(pet_id: UUID, share_id: UUID, payload: CS.ShareLinkIn,
               clerk_user_id: str = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """Attach a real PAWPHILE account to a profile-level share so the vet
    portal can resolve access. Unknown email -> truthful 422, never a stub."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.ShareGrant).filter(
        F.ShareGrant.id == share_id, F.ShareGrant.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Share not found.")
    grantee = _resolve_grantee(db, payload.grantee_email)
    row.grantee_user_id = grantee.id
    if row.consultation_id:
        c = db.query(C.Consultation).filter(
            C.Consultation.id == row.consultation_id).first()
        if c and c.vet_user_id is None:
            c.vet_user_id = grantee.id
    db.commit()
    _audit(db, "share.linked", user, dog.id, row.id, "share_grant")
    db.commit()
    return {"share_id": str(row.id), "grantee_linked": True}


# ══════════════ CONSULTATIONS ══════════════

@router.post("/pets/{pet_id}/consultations", status_code=201)
def create_consultation(pet_id: UUID, payload: CS.ConsultationCreate,
                        clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    member = None
    if payload.care_member_id:
        member = db.query(C.CareTeamMember).filter(
            C.CareTeamMember.id == payload.care_member_id,
            C.CareTeamMember.pet_id == pet_id).first()
        if not member:
            raise HTTPException(status_code=404, detail="Care team member not found.")
    c = C.Consultation(pet_id=dog.id, owner_id=user.id,
                       care_member_id=member.id if member else None,
                       vet_user_id=member.vet_user_id if member else None,
                       purpose=payload.purpose, status="REQUESTED")
    db.add(c)
    db.commit()
    db.refresh(c)
    _audit(db, "consultation.created", user, dog.id, c.id, "consultation")
    db.commit()
    return {"id": str(c.id), "status": c.status, "purpose": c.purpose}


@router.get("/pets/{pet_id}/consultations")
def list_consultations(pet_id: UUID,
                       clerk_user_id: str = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    rows = db.query(C.Consultation).filter(
        C.Consultation.pet_id == pet_id).order_by(
        C.Consultation.created_at.desc()).all()
    return [{"id": str(c.id), "purpose": c.purpose, "status": c.status,
             "share_id": str(c.share_id) if c.share_id else None,
             "package_id": str(c.package_id) if c.package_id else None,
             "created_at": c.created_at.isoformat() if c.created_at else None}
            for c in rows]


@router.get("/consultations/{consultation_id}")
def get_consultation(consultation_id: UUID,
                     clerk_user_id: str = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    c = _get_consultation(db, consultation_id)
    role, user, dog, share = _consultation_actor(db, clerk_user_id, c)
    if role == "vet" and share is not None and not svc.scope_allows(share, "summary"):
        raise HTTPException(status_code=404, detail="Consultation not found.")
    return svc.consultation_detail(db, c)


@router.post("/consultations/{consultation_id}/complete")
def complete_consultation(consultation_id: UUID,
                          clerk_user_id: str = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    c = _get_consultation(db, consultation_id)
    role, user, dog, share = _consultation_actor(db, clerk_user_id, c)
    if c.status == "COMPLETED":
        return {"id": str(c.id), "status": c.status}  # idempotent
    if c.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Consultation is CANCELLED.")
    c.status = "COMPLETED"
    c.ended_at = _utcnow()
    pet_id = c.pet_id
    if role == "owner":
        owner = user
        ev = _mk_event(db, pet_id, "vet_visit", c.started_at or _utcnow(),
                       title="Consultation completed",
                       source="owner", verification="owner_reported",
                       ref_table="consultations", ref_id=c.id)
    else:
        dog_row = db.query(M.DogProfile).filter(M.DogProfile.id == pet_id).first()
        owner = db.query(M.User).filter(M.User.id == c.owner_id).first()
        ev = _mk_event(db, pet_id, "vet_visit", c.started_at or _utcnow(),
                       title="Consultation completed",
                       source="vet", verification="vet_verified",
                       ref_table="consultations", ref_id=c.id)
    db.commit()
    _audit(db, "consultation.completed", user, pet_id, c.id, "consultation")
    webhooks.emit(db, "CONSULTATION_COMPLETED", owner_id=c.owner_id,
                  ref={"id": str(c.id)})
    if owner is not None and owner.id != user.id:
        svc.notify(db, owner.id, f"bin3:consult:{c.id}:done",
                   f"PAWPHILE: consultation for your pet completed",
                   f"Consultation {c.id} is COMPLETED. Review the feedback. "
                   f"Timeline event {ev.id} recorded.")
    db.commit()
    return {"id": str(c.id), "status": c.status, "event_id": str(ev.id)}


# ══════════════ QUESTIONS (owner asks, vet answers, owner resolves) ══════════════

@router.post("/pets/{pet_id}/questions", status_code=201)
def create_question(pet_id: UUID, payload: CS.QuestionCreate,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    cid = None
    if payload.consultation_id:
        c = _get_consultation(db, payload.consultation_id)
        if c.pet_id != dog.id:
            raise HTTPException(status_code=404, detail="Consultation not found.")
        cid = c.id
    q = C.VetQuestion(pet_id=dog.id, consultation_id=cid, owner_id=user.id,
                      question_text=payload.question_text, status="OPEN")
    db.add(q)
    db.commit()
    db.refresh(q)
    _audit(db, "question.created", user, dog.id, q.id, "vet_question")
    db.commit()
    return CS.question_out(q)


@router.get("/pets/{pet_id}/questions")
def list_questions(pet_id: UUID,
                   clerk_user_id: str = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    rows = db.query(C.VetQuestion).filter(
        C.VetQuestion.pet_id == pet_id).order_by(
        C.VetQuestion.created_at.desc()).all()
    return [CS.question_out(q) for q in rows]


@router.get("/consultations/{consultation_id}/questions")
def list_consultation_questions(consultation_id: UUID,
                                clerk_user_id: str = Depends(get_current_user),
                                db: Session = Depends(get_db)):
    c = _get_consultation(db, consultation_id)
    _consultation_actor(db, clerk_user_id, c)
    rows = db.query(C.VetQuestion).filter(
        C.VetQuestion.consultation_id == c.id).order_by(
        C.VetQuestion.created_at.asc()).all()
    return [CS.question_out(q) for q in rows]


@router.post("/questions/{question_id}/answer")
def answer_question(question_id: UUID, payload: CS.AnswerIn,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Vet-only: the answer is recorded as the veterinarian's words. PAW AI
    never answers on the vet's behalf (no route for that exists)."""
    q = db.query(C.VetQuestion).filter(C.VetQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")
    user, share = _vet_actor(db, clerk_user_id, q.pet_id)
    if share is None:
        raise HTTPException(status_code=404, detail="Question not found.")
    # Same linkage rule as consultation reads: a bare REPORT_ONLY grant does
    # not confer answering rights — the share must be linked to the
    # question's consultation (or carry timeline-level scope).
    if q.consultation_id is not None:
        c = _get_consultation(db, q.consultation_id)
        assigned = c.vet_user_id is None or c.vet_user_id == user.id
        linked = (getattr(share, "consultation_id", None) == c.id
                  or svc.scope_allows(share, "timeline"))
        if not (assigned and linked):
            raise HTTPException(status_code=404, detail="Question not found.")
    elif not svc.scope_allows(share, "timeline"):
        raise HTTPException(status_code=404, detail="Question not found.")
    if q.status not in ("OPEN", "ANSWERED"):
        raise HTTPException(status_code=409,
                            detail=f"Question is {q.status}; only OPEN questions can be answered.")
    q.answer_text = payload.answer_text
    q.answered_by_user_id = user.id
    q.answered_at = _utcnow()
    q.status = "ANSWERED"
    db.commit()
    _audit(db, "question.answered", user, q.pet_id, q.id, "vet_question")
    webhooks.emit(db, "QUESTION_ANSWERED", owner_id=q.owner_id,
                  ref={"id": str(q.id)})
    owner = db.query(M.User).filter(M.User.id == q.owner_id).first()
    if owner is not None:
        svc.notify(db, owner.id, f"bin3:q:{q.id}:answered",
                   "PAWPHILE: your veterinarian answered your question",
                   f"Question {q.id} was ANSWERED. Open the consultation to review.")
    db.commit()
    return CS.question_out(q)


@router.patch("/questions/{question_id}")
def update_question(question_id: UUID, payload: CS.QuestionUpdate,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Owner resolves/dismisses, or attaches the question to a consultation."""
    q = db.query(C.VetQuestion).filter(C.VetQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")
    dog = require_dog_ownership(q.pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if payload.consultation_id is not None:
        c = _get_consultation(db, payload.consultation_id)
        if c.pet_id != dog.id:
            raise HTTPException(status_code=404, detail="Consultation not found.")
        q.consultation_id = c.id
    if payload.status is not None:
        q.status = payload.status
    db.commit()
    _audit(db, "question.resolved", user, dog.id, q.id, "vet_question")
    db.commit()
    return CS.question_out(q)


# ══════════════ VET NOTES (feedback -> canonical event -> timeline) ══════════════

@router.post("/consultations/{consultation_id}/notes", status_code=201)
def create_vet_note(consultation_id: UUID, payload: CS.VetNoteCreate,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    c = _get_consultation(db, consultation_id)
    role, user, dog, share = _consultation_actor(db, clerk_user_id, c)
    if role != "vet":
        raise HTTPException(status_code=404, detail="Consultation not found.")
    if c.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(status_code=409,
                            detail=f"Consultation is {c.status}; notes are closed.")
    label = None
    if c.care_member_id:
        m = db.query(C.CareTeamMember).filter(
            C.CareTeamMember.id == c.care_member_id).first()
        label = m.display_name if m else None
    note = C.VetNote(pet_id=c.pet_id, consultation_id=c.id,
                     author_user_id=user.id, author_label=label,
                     note_text=payload.note_text,
                     follow_up_text=payload.follow_up_text,
                     effective_at=payload.effective_at or _utcnow(),
                     visibility="OWNER_VISIBLE", source="vet",
                     verification_status="vet_verified")
    db.add(note)
    db.flush()
    # Canonical envelope: appended, never overwriting owner history.
    ev = _mk_event(db, c.pet_id, "note", note.effective_at,
                   title="Veterinary note",
                   summary=(payload.note_text or "")[:500],
                   source="vet", actor=label,
                   verification="vet_verified",
                   ref_table="vet_notes", ref_id=note.id)
    note.health_event_id = ev.id
    db.commit()
    db.refresh(note)
    _audit(db, "vet_note.created", user, c.pet_id, note.id, "vet_note")
    webhooks.emit(db, "VET_NOTE_CREATED", owner_id=c.owner_id,
                  ref={"id": str(note.id)})
    owner = db.query(M.User).filter(M.User.id == c.owner_id).first()
    if owner is not None:
        svc.notify(db, owner.id, f"bin3:note:{note.id}",
                   "PAWPHILE: veterinarian feedback received",
                   f"Veterinary feedback was recorded for your pet. "
                   f"Consultation {c.id}. Timeline event {ev.id}.")
    db.commit()
    return CS.note_out(note)


# ══════════════ FOLLOW-UPS (vet recommends -> reminder -> owner outcome) ══════════════

@router.post("/consultations/{consultation_id}/follow-ups", status_code=201)
def create_followup(consultation_id: UUID, payload: CS.FollowUpCreate,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    c = _get_consultation(db, consultation_id)
    role, user, dog, share = _consultation_actor(db, clerk_user_id, c)
    if role != "vet":
        raise HTTPException(status_code=404, detail="Consultation not found.")
    if c.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(status_code=409,
                            detail=f"Consultation is {c.status}; follow-ups are closed.")
    f = C.FollowUp(pet_id=c.pet_id, consultation_id=c.id,
                   originating_vet_user_id=user.id,
                   recommendation=payload.recommendation,
                   due_at=payload.due_at, status="OPEN")
    db.add(f)
    db.flush()
    owner = db.query(M.User).filter(M.User.id == c.owner_id).first()
    pet = db.query(M.DogProfile).filter(M.DogProfile.id == c.pet_id).first()
    rem = svc.followup_to_reminder(db, pet, owner, f)  # BIN1 reminder, no second engine
    f.reminder_id = rem.id
    _mk_event(db, c.pet_id, "note", _utcnow(),
              title="Follow-up recommendation",
              summary=(payload.recommendation or "")[:500],
              source="vet", verification="vet_verified",
              ref_table="follow_ups", ref_id=f.id)
    db.commit()
    db.refresh(f)
    _audit(db, "followup.created", user, c.pet_id, f.id, "follow_up")
    webhooks.emit(db, "FOLLOWUP_CREATED", owner_id=c.owner_id,
                  ref={"id": str(f.id)})
    svc.notify(db, owner.id, f"bin3:fu:{f.id}",
               "PAWPHILE: veterinarian follow-up received",
               f"A follow-up was recommended for your pet. Reminder {rem.id} scheduled. "
               f"Follow-up {f.id} is OPEN.")
    db.commit()
    return CS.followup_out(f)


@router.get("/pets/{pet_id}/follow-ups")
def list_followups(pet_id: UUID,
                   clerk_user_id: str = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    rows = db.query(C.FollowUp).filter(
        C.FollowUp.pet_id == pet_id).order_by(
        C.FollowUp.created_at.desc()).all()
    # Lazy expiry: past-due OPEN items surface as EXPIRED (history preserved).
    now = _utcnow().replace(tzinfo=None)
    changed = False
    for f in rows:
        if f.status == "OPEN" and f.due_at:
            due = f.due_at.replace(tzinfo=None) if getattr(f.due_at, "tzinfo", None) else f.due_at
            if due < now:
                f.status = "EXPIRED"
                changed = True
    if changed:
        db.commit()
    from app.schemas import collaboration_schemas as _CS
    return [_CS.followup_out(f) for f in rows]


@router.patch("/follow-ups/{followup_id}")
def update_followup(followup_id: UUID, payload: CS.FollowUpUpdate,
                    clerk_user_id: str = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Owner acknowledgement loop. COMPLETED with an outcome note records a
    new owner HealthEvent (the outcome) — history grows, nothing is rewritten."""
    f = db.query(C.FollowUp).filter(C.FollowUp.id == followup_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found.")
    dog = require_dog_ownership(f.pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if payload.status == "ACKNOWLEDGED":
        if f.status != "OPEN":
            raise HTTPException(status_code=409, detail=f"Follow-up is {f.status}.")
        f.status = "ACKNOWLEDGED"
        f.owner_ack_at = _utcnow()
    elif payload.status == "COMPLETED":
        if f.status not in ("OPEN", "ACKNOWLEDGED"):
            raise HTTPException(status_code=409, detail=f"Follow-up is {f.status}.")
        f.status = "COMPLETED"
        f.completed_at = _utcnow()
        if payload.outcome_note and payload.outcome_note.strip():
            ev = _mk_event(db, dog.id, "note", _utcnow(),
                           title="Follow-up outcome recorded",
                           summary=payload.outcome_note.strip()[:500],
                           source="owner", verification="owner_reported",
                           ref_table="follow_ups", ref_id=f.id)
            f.resulting_event_id = ev.id
        if f.reminder_id:
            rem = db.query(F.ReminderV1).filter(F.ReminderV1.id == f.reminder_id).first()
            if rem and rem.status == "SCHEDULED":
                rem.status = "COMPLETED"
                rem.completed_at = _utcnow()
    elif payload.status == "DISMISSED":
        f.status = "DISMISSED"
    elif payload.status is not None:
        raise HTTPException(status_code=422, detail="Invalid status.")
    f.updated_at = _utcnow()
    db.commit()
    _audit(db, "followup.updated", user, dog.id, f.id, "follow_up")
    if f.status == "COMPLETED":
        webhooks.emit(db, "FOLLOWUP_COMPLETED", owner_id=dog.user_id,
                      ref={"id": str(f.id)})
    db.commit()
    from app.schemas import collaboration_schemas as _CS
    return _CS.followup_out(f)


# ══════════════ ACCESS HISTORY (owner sees who accessed what, when) ══════════════

@router.get("/pets/{pet_id}/collaboration/access-history")
def access_history(pet_id: UUID, limit: int = Query(100, le=200),
                   clerk_user_id: str = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    shares = db.query(F.ShareGrant).filter(
        F.ShareGrant.pet_id == pet_id).order_by(
        F.ShareGrant.created_at.desc()).all()
    audits = db.query(M.AuditLog).filter(
        M.AuditLog.dog_id == pet_id,
        M.AuditLog.action.in_(["share.created", "share.accessed", "share.revoked",
                               "package.created", "package.approved", "package.shared",
                               "package.accessed", "share.linked", "share.file_accessed",
                               "consultation.created", "consultation.completed",
                               "question.created", "question.answered",
                               "vet_note.created", "followup.created",
                               "followup.updated", "consent.changed",
                               "relationship.created", "relationship.changed",
                               "connection.created", "connection.revoked",
                               "import.completed", "export.requested",
                               "professional.created",
                               "professional.verification_requested",
                               "professional.verification_changed"])).order_by(
        M.AuditLog.created_at.desc()).limit(limit).all()
    return {
        "shares": [{"id": str(s.id), "recipient_label": s.recipient_label,
                    "scope": s.scope, "purpose": getattr(s, "purpose", None),
                    "status": s.status,
                    "access_count": s.access_count or 0,
                    "last_accessed_at": s.last_accessed_at.isoformat()
                    if s.last_accessed_at else None,
                    "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                    "revoked_at": s.revoked_at.isoformat() if s.revoked_at else None,
                    "grantee_linked": bool(getattr(s, "grantee_user_id", None)),
                    "package_id": str(getattr(s, "package_id", None))
                    if getattr(s, "package_id", None) else None,
                    "created_at": s.created_at.isoformat() if s.created_at else None}
                   for s in shares],
        "events": [{"action": a.action, "details": a.details,
                    "created_at": a.created_at.isoformat() if a.created_at else None}
                   for a in audits],
        "consent_rule": svc.CONSENT_WITHDRAWAL_RULE,
    }


# ══════════════ VET PORTAL (server-authorized, scope-enforced) ══════════════

def _vet_pet_or_404(db: Session, clerk_user_id: str, pet_id: UUID):
    user = get_user_or_404(clerk_user_id, db)
    try:
        require_dog_ownership(pet_id, clerk_user_id, db)
        return user, None  # owner previewing own pet
    except HTTPException:
        pass
    share = svc.vet_share_for(db, user.id, pet_id)
    if share is None:
        _, gone = svc.grant_state(db, user.id, pet_id)
        if gone:
            raise HTTPException(status_code=410, detail=f"Share is {gone}.")
        raise HTTPException(status_code=404, detail="Pet not found.")
    _provider_gate(db, user)
    return user, share


@router.get("/vet/pets")
def vet_pets(clerk_user_id: str = Depends(get_current_user),
             db: Session = Depends(get_db)):
    """Pets this account may access: ACTIVE, unexpired grants linked to me.
    Pet-specific: a grant for Pet A never lists Pet B."""
    user = get_user_or_404(clerk_user_id, db)
    now = _utcnow().replace(tzinfo=None)
    rows = db.query(F.ShareGrant).filter(
        F.ShareGrant.grantee_user_id == user.id,
        F.ShareGrant.status == "ACTIVE").all()
    out = []
    for s in rows:
        exp = s.expires_at
        exp_n = exp.replace(tzinfo=None) if exp is not None and getattr(exp, "tzinfo", None) else exp
        if exp_n is not None and exp_n < now:
            continue
        pet = db.query(M.DogProfile).filter(M.DogProfile.id == s.pet_id).first()
        if not pet:
            continue
        out.append({"pet_id": str(pet.id), "pet_name": pet.name,
                    "breed": pet.breed, "share_id": str(s.id),
                    "scope": s.scope, "purpose": getattr(s, "purpose", None),
                    "expires_at": s.expires_at.isoformat() if s.expires_at else None})
    return {"pets": out}


@router.get("/vet/pets/{pet_id}")
def vet_pet_view(pet_id: UUID,
                 clerk_user_id: str = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Scoped clinical view. REPORT_ONLY callers cannot reach timeline/files
    (404, no leakage); SELECTED callers see only selected event types."""
    user, share = _vet_pet_or_404(db, clerk_user_id, pet_id)
    pet = db.query(M.DogProfile).filter(M.DogProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found.")
    if share is None:
        # Owner preview — full detail, same shape, owner provenance.
        share_scope, purpose = "FULL_RECORD", None
    else:
        share_scope, purpose = share.scope, getattr(share, "purpose", None)
    header = {"pet_id": str(pet.id), "pet_name": pet.name, "breed": pet.breed,
              "species": pet.species, "share_scope": share_scope,
              "share_purpose": purpose,
              "access_expires_at": share.expires_at.isoformat()
              if share is not None and share.expires_at else None}
    if share is not None and not svc.scope_allows(share, "summary"):
        raise HTTPException(status_code=404, detail="Pet not found.")
    body: dict = {"header": header}
    if share is not None and not svc.scope_allows(share, "timeline"):
        # REPORT_ONLY: summary + reports + shared package only.
        body["reports"] = [{"id": str(r.id), "report_type": r.report_type}
                           for r in db.query(F.ReportRecord).filter(
            F.ReportRecord.pet_id == pet_id,
            F.ReportRecord.status == "READY").order_by(
            F.ReportRecord.created_at.desc()).limit(10).all()]
        if getattr(share, "package_id", None):
            pkg = db.query(C.VetHealthPackage).filter(
                C.VetHealthPackage.id == share.package_id).first()
            if pkg:
                body["shared_package_digest"] = pkg.snapshot_digest
        if share is not None:
            share.access_count = (share.access_count or 0) + 1
            share.last_accessed_at = _utcnow()
            db.commit()
            _audit(db, "share.accessed", user, pet_id, share.id, "share_grant")
            db.commit()
        return body
    # Timeline (scope-filtered server-side — never trust the frontend).
    q = db.query(F.HealthEvent).filter(
        F.HealthEvent.pet_id == pet_id, F.HealthEvent.is_archived == False)  # noqa: E712
    if share is not None and share.scope == "SELECTED":
        q = q.filter(F.HealthEvent.event_type.in_(share.selected_types or []))
    events = q.order_by(F.HealthEvent.effective_at.desc()).limit(50).all()
    body["timeline"] = [{"id": str(e.id), "event_type": e.event_type,
                         "title": e.title, "source": e.source,
                         "source_label": svc._source_label(e.source),
                         "effective_at": e.effective_at.isoformat()
                         if e.effective_at else None,
                         "verification": e.verification_status} for e in events]
    meds = db.query(F.Medication).filter(
        F.Medication.pet_id == pet_id, F.Medication.is_archived == False).limit(30).all()  # noqa: E712
    body["medications"] = [{"name": m.name, "dose": m.dose,
                            "frequency": m.frequency, "status": m.status,
                            "verification": m.verification_status} for m in meds]
    syms = db.query(F.Symptom).filter(
        F.Symptom.pet_id == pet_id, F.Symptom.is_archived == False).order_by(  # noqa: E712
        F.Symptom.created_at.desc()).limit(20).all()
    body["symptoms"] = [{"name": s.name, "severity": s.severity,
                         "verification": s.verification_status} for s in syms]
    files = db.query(F.HealthFile).filter(
        F.HealthFile.pet_id == pet_id, F.HealthFile.is_archived == False).limit(20).all()  # noqa: E712
    if share is not None:
        files = [f for f in files if svc.file_allowed(share, f)]
    # Metadata only — storage_ref never leaves the server on vet paths.
    body["files"] = [{"id": str(f.id), "file_name": f.file_name,
                      "mime_type": f.mime_type, "category": f.category} for f in files]
    # Intelligence WITH evidence (never unexplained conclusions).
    try:
        owner = db.query(M.User).filter(M.User.id == pet.user_id).first()
        consent_ok = owner is not None and db.query(F.ConsentRecord).filter(
            F.ConsentRecord.user_id == owner.id,
            F.ConsentRecord.purpose == "ai_analysis").order_by(
            F.ConsentRecord.created_at.desc()).first()
        if consent_ok is not None and consent_ok.status == "GRANTED":
            now = eng.utcnow()
            metrics = {m: eng.analyze_metric(db, pet_id, m, now)
                       for m in ("weight", "activity", "nutrition", "behavior")}
            body["intelligence"] = {
                "origin": "PAWPHILE-generated — descriptive only, not veterinarian-verified",
                "flagged_changes": [{"metric": m, **(r.get("change") or {})}
                                    for m, r in metrics.items()],
                "evidence_refs": [e.get("record_id") for r in metrics.values()
                                  for e in r.get("evidence", []) if e.get("record_id")][:50],
                "rules_version": eng.RULES_VERSION}
        else:
            body["intelligence"] = {"blocked": True,
                                    "reason": "Owner has not granted AI analysis consent."}
    except HTTPException:
        raise
    except Exception:
        body["intelligence"] = {"blocked": True, "reason": "Intelligence unavailable."}
    # Owner questions for this pet (consultation context included).
    qs = db.query(C.VetQuestion).filter(
        C.VetQuestion.pet_id == pet_id,
        C.VetQuestion.status.in_(["OPEN", "ANSWERED"])).order_by(
        C.VetQuestion.created_at.asc()).limit(20).all()
    body["owner_questions"] = [CS.question_out(x) for x in qs]
    if share is not None:
        share.access_count = (share.access_count or 0) + 1
        share.last_accessed_at = _utcnow()
        db.commit()
        _audit(db, "share.accessed", user, pet_id, share.id, "share_grant")
        db.commit()
        log_event(logging.INFO, "vet_pet_viewed", share_id=str(share.id))
    return body


@router.get("/vet/packages/{package_id}")
def vet_package_view(package_id: UUID,
                     clerk_user_id: str = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """The EXACT snapshot the owner shared — frozen bytes, never live data."""
    user = get_user_or_404(clerk_user_id, db)
    pkg = db.query(C.VetHealthPackage).filter(
        C.VetHealthPackage.id == package_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found.")
    try:
        require_dog_ownership(pkg.pet_id, clerk_user_id, db)
        return {"id": str(pkg.id), "status": pkg.status, "version": pkg.version,
                "snapshot_digest": pkg.snapshot_digest,
                "snapshot": pkg.snapshot or {}}
    except HTTPException:
        pass
    share = svc.vet_share_for(db, user.id, pkg.pet_id)
    if share is None:
        _, gone = svc.grant_state(db, user.id, pkg.pet_id)
        if gone:
            raise HTTPException(status_code=410, detail=f"Share is {gone}.")
        raise HTTPException(status_code=404, detail="Package not found.")
    _provider_gate(db, user)
    if getattr(share, "package_id", None) != pkg.id and share.scope != "FULL_RECORD":
        raise HTTPException(status_code=404, detail="Package not found.")
    if not svc.scope_allows(share, "package"):
        raise HTTPException(status_code=404, detail="Package not found.")
    share.access_count = (share.access_count or 0) + 1
    share.last_accessed_at = _utcnow()
    db.commit()
    _audit(db, "package.accessed", user, pkg.pet_id, pkg.id, "vet_package")
    owner = db.query(M.User).filter(M.User.id == pkg.owner_id).first()
    if owner is not None:
        svc.notify(db, owner.id, f"bin3:pkg:{pkg.id}:opened",
                   f"PAWPHILE: veterinarian opened {pkg.package_type} package",
                   f"Shared package {pkg.id} (digest {pkg.snapshot_digest}) was opened. "
                   f"Share {share.id}.")
    db.commit()
    return {"id": str(pkg.id), "status": pkg.status, "version": pkg.version,
            "snapshot_digest": pkg.snapshot_digest,
            "generated_by": pkg.generated_by,
            "snapshot": pkg.snapshot or {}}


@router.get("/vet/consultations")
def vet_consultations(clerk_user_id: str = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    rows = db.query(C.Consultation).filter(
        C.Consultation.vet_user_id == user.id).order_by(
        C.Consultation.created_at.desc()).all()
    out = []
    for c in rows:
        # Only surface consultations whose share is still usable.
        if svc.vet_share_for(db, user.id, c.pet_id) is None:
            continue
        pet = db.query(M.DogProfile).filter(M.DogProfile.id == c.pet_id).first()
        out.append({"id": str(c.id), "pet_id": str(c.pet_id),
                    "pet_name": pet.name if pet else None,
                    "purpose": c.purpose, "status": c.status})
    return {"consultations": out}


@router.get("/shares/{share_id}/files/{file_id}")
def share_file(share_id: UUID, file_id: UUID,
               clerk_user_id: str = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """Server-mediated file metadata inside a share. Scope, expiry, and
    revocation are enforced here — storage_ref never leaves the server."""
    user = get_user_or_404(clerk_user_id, db)
    share = db.query(F.ShareGrant).filter(F.ShareGrant.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found.")
    try:
        require_dog_ownership(share.pet_id, clerk_user_id, db)
    except HTTPException:
        usable = svc.vet_share_for(db, user.id, share.pet_id)
        if usable is None or usable.id != share.id:
            gone = share.status in ("REVOKED", "EXPIRED")
            if gone:
                raise HTTPException(status_code=410, detail=f"Share is {share.status}.")
            raise HTTPException(status_code=404, detail="Share not found.")
    svc._ensure_usable(share)
    f = db.query(F.HealthFile).filter(
        F.HealthFile.id == file_id, F.HealthFile.pet_id == share.pet_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found.")
    try:
        require_dog_ownership(share.pet_id, clerk_user_id, db)
    except HTTPException:
        if not svc.file_allowed(share, f):
            raise HTTPException(status_code=404, detail="File not found.")
    _audit(db, "share.file_accessed", user, share.pet_id, f.id, "health_file")
    db.commit()
    return {"id": str(f.id), "file_name": f.file_name,
            "mime_type": f.mime_type, "category": f.category,
            "created_at": f.created_at.isoformat() if f.created_at else None}
