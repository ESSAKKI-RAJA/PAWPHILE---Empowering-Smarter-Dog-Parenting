"""BIN4 org service — membership/role enforcement and provider-status blocks.

Hard rule repeated everywhere: organization membership NEVER implies pet
access. These helpers answer "may this user administer this org?" and
"is this provider currently blocked?". Pet access stays with grants/
relationships in the route layer.
"""
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import ecosystem_models as E


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def membership(db: Session, org_id: UUID, user_id) -> Optional[E.OrgMembership]:
    return db.query(E.OrgMembership).filter(
        E.OrgMembership.org_id == org_id,
        E.OrgMembership.user_id == user_id).first()


def require_org_role(db: Session, org_id: UUID, user, *roles: str) -> E.OrgMembership:
    """Org administration gate: member + ACTIVE + one of roles (404/403 safe)."""
    m = membership(db, org_id, user.id)
    if not m:
        raise HTTPException(status_code=404, detail="Organization not found.")
    if m.status != "ACTIVE":
        raise HTTPException(status_code=403, detail=f"Membership is {m.status}.")
    if m.role not in roles:
        raise HTTPException(status_code=403,
                            detail="This action requires an organization administrator role.")
    return m


def org_or_404(db: Session, org_id: UUID) -> E.Organization:
    org = db.query(E.Organization).filter(E.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    if org.status != "ACTIVE":
        raise HTTPException(status_code=410, detail=f"Organization is {org.status}.")
    return org


def provider_block_reason(db: Session, user_id) -> Optional[str]:
    """Why this provider account must be denied vet access right now, if any.

    Covers: professional SUSPENDED/REVOKED/EXPIRED (incl. lazy expiry),
    inactive flag, and suspended org membership/org. Returns None when clear.
    Professionals who never entered verification stay UNVERIFIED (BIN3 behavior:
    access flows through explicit owner grants, unaffected here).
    """
    now = utcnow().replace(tzinfo=None)
    for p in db.query(E.VetProfessional).filter(E.VetProfessional.user_id == user_id).all():
        if not p.is_active:
            return "Professional profile is inactive."
        if p.verification_state in ("SUSPENDED", "REVOKED"):
            return f"Professional verification is {p.verification_state}."
        if p.verification_state == "VERIFIED" and p.verification_expires_at:
            exp = p.verification_expires_at
            exp_n = exp.replace(tzinfo=None) if getattr(exp, "tzinfo", None) else exp
            if exp_n < now:
                return "Professional verification is EXPIRED."
    for m in db.query(E.OrgMembership).filter(E.OrgMembership.user_id == user_id).all():
        if m.role in ("VETERINARIAN", "TECHNICIAN", "CARE_COORDINATOR", "STAFF", "VIEWER") \
                and m.status in ("SUSPENDED", "REVOKED"):
            return f"Organization membership is {m.status}."
        org = db.query(E.Organization).filter(E.Organization.id == m.org_id).first()
        if org is not None and org.status != "ACTIVE":
            return f"Organization is {org.status}."
    return None


def is_org_admin(db: Session, org_id: UUID, user_id) -> bool:
    m = membership(db, org_id, user_id)
    return bool(m and m.status == "ACTIVE" and m.role in ("OWNER", "ADMIN"))
