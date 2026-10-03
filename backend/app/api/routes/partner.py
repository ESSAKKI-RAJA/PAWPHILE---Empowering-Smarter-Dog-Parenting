"""BIN4 Partner API — scoped third-party reads with first-party semantics.

Auth: `Authorization: Bearer pk_...` (hashed at rest). Every request enforces
credential -> ACTIVE client -> declared scope -> ACTIVE org relationship for
the pet (purpose/scope/expiry) -> resource. SELECTED relationships are NOT
honored here (insufficient granularity for API access — 403, honestly).
Responses carry the same minimum-necessary shapes as the vet portal, minus
storage pointers. All access is audited.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.audit import log_audit
from app.db.session import get_db
from app.models import all_models as M
from app.models import foundation_models as F
from app.models import collaboration_models as C
from app.services import partner_service as partners
from app.services import collaboration_service as svc

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)


def _client(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
            db: Session = Depends(get_db)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing API credential.")
    client, _cred = partners.resolve_client(db, credentials.credentials)
    return client


def _rel(db: Session, client, pet_id: UUID, scope: str, resource: str):
    partners.require_partner_scope(client, scope)
    rel = partners.partner_relationship(db, client, pet_id)
    if rel.scope == "SELECTED":
        raise HTTPException(status_code=403,
                            detail="SELECTED relationships are not honored by the "
                                   "partner API. Ask the owner for FULL_RECORD or "
                                   "REPORT_ONLY access for this organization.")
    if not partners.relationship_allows(rel, resource):
        raise HTTPException(status_code=403,
                            detail="Relationship scope does not include this resource.")
    try:
        log_audit(db, action="partner.access", user_id=None, dog_id=pet_id,
                  details={"resource_type": "partner_api_client",
                           "resource_id": str(client.id), "scope": scope})
        db.commit()
    except Exception:
        pass
    return rel


@router.get("/partner/v1/pets/{pet_id}/timeline")
def partner_timeline(pet_id: UUID, limit: int = 50,
                     client=Depends(_client), db: Session = Depends(get_db)):
    _rel(db, client, pet_id, "timeline.read", "timeline")
    if limit > 200:
        limit = 200
    rows = db.query(F.HealthEvent).filter(
        F.HealthEvent.pet_id == pet_id, F.HealthEvent.is_archived == False).order_by(  # noqa: E712
        F.HealthEvent.effective_at.desc()).limit(limit).all()
    return {"pet_id": str(pet_id),
            "items": [{"id": str(e.id), "event_type": e.event_type,
                       "title": e.title, "source": e.source,
                       "effective_at": e.effective_at.isoformat()
                       if e.effective_at else None,
                       "verification": e.verification_status} for e in rows]}


@router.get("/partner/v1/pets/{pet_id}/reports")
def partner_reports(pet_id: UUID,
                    client=Depends(_client), db: Session = Depends(get_db)):
    _rel(db, client, pet_id, "reports.read", "reports")
    rows = db.query(F.ReportRecord).filter(
        F.ReportRecord.pet_id == pet_id,
        F.ReportRecord.status == "READY").order_by(
        F.ReportRecord.created_at.desc()).limit(10).all()
    return {"pet_id": str(pet_id),
            "reports": [{"id": str(r.id), "report_type": r.report_type,
                         "version": r.version} for r in rows]}


@router.get("/partner/v1/packages/{package_id}")
def partner_package(package_id: UUID,
                    client=Depends(_client), db: Session = Depends(get_db)):
    pkg = db.query(C.VetHealthPackage).filter(
        C.VetHealthPackage.id == package_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found.")
    _rel(db, client, pkg.pet_id, "package.read", "package")
    return {"id": str(pkg.id), "version": pkg.version,
            "snapshot_digest": pkg.snapshot_digest,
            "generated_by": pkg.generated_by,
            "snapshot": pkg.snapshot or {}}


@router.get("/partner/v1/pets/{pet_id}/followups")
def partner_followups(pet_id: UUID,
                      client=Depends(_client), db: Session = Depends(get_db)):
    _rel(db, client, pet_id, "followup.read", "followup")
    rows = db.query(C.FollowUp).filter(C.FollowUp.pet_id == pet_id).order_by(
        C.FollowUp.created_at.desc()).limit(50).all()
    from app.schemas import collaboration_schemas as CS
    return {"pet_id": str(pet_id), "follow_ups": [CS.followup_out(f) for f in rows]}
