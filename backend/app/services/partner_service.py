"""BIN4 partner API + entitlements + KPIs + emergency packet builder.

Partner credentials: `pk_<secret>` bearer tokens, sha256-hashed at rest, shown
once at issuance. Every partner request enforces credential -> client scope ->
pet relationship (ACTIVE, purpose/scope/expiry) -> resource. No `write_all`,
no unrestricted access. Entitlements gate FEATURES only.
"""
import hashlib
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import all_models as M
from app.models import foundation_models as F
from app.models import collaboration_models as C
from app.models import ecosystem_models as E
from app.services import collaboration_service as svc

KEY_PREFIX = "pk_"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Partner credentials ─────────────────────────────────────────

def issue_credential(db: Session, client: E.PartnerApiClient,
                     expires_at=None) -> tuple[E.ApiCredential, str]:
    raw = KEY_PREFIX + secrets.token_urlsafe(32)
    cred = E.ApiCredential(client_id=client.id,
                           key_hash=hashlib.sha256(raw.encode()).hexdigest(),
                           key_prefix=raw[:8], status="ACTIVE",
                           expires_at=expires_at)
    db.add(cred)
    db.commit()
    db.refresh(cred)
    return cred, raw


def resolve_client(db: Session, raw_key: str) -> tuple[E.PartnerApiClient, E.ApiCredential]:
    if not raw_key or not raw_key.startswith(KEY_PREFIX):
        raise HTTPException(status_code=401, detail="Invalid API credential.")
    digest = hashlib.sha256(raw_key.encode()).hexdigest()
    cred = db.query(E.ApiCredential).filter(
        E.ApiCredential.key_hash == digest).first()
    if not cred or cred.status != "ACTIVE":
        raise HTTPException(status_code=401, detail="Invalid API credential.")
    if cred.expires_at:
        exp = cred.expires_at
        exp_n = exp.replace(tzinfo=None) if getattr(exp, "tzinfo", None) else exp
        if exp_n < utcnow().replace(tzinfo=None):
            raise HTTPException(status_code=401, detail="API credential expired.")
    client = db.query(E.PartnerApiClient).filter(
        E.PartnerApiClient.id == cred.client_id).first()
    if not client or client.status != "ACTIVE":
        raise HTTPException(status_code=401, detail="API client is not active.")
    cred.last_used_at = utcnow()
    db.commit()
    return client, cred


def require_partner_scope(client: E.PartnerApiClient, scope: str) -> None:
    if scope not in (client.scopes or []):
        raise HTTPException(status_code=403,
                            detail=f"Client scope does not include {scope}.")


def partner_relationship(db: Session, client: E.PartnerApiClient,
                         pet_id: UUID) -> E.PetCareRelationship:
    """Pet access for a partner client: ACTIVE relationship to the client's
    org, unexpired, else 404 (no leakage) — the same semantics as the app."""
    if not client.org_id:
        raise HTTPException(status_code=404, detail="Pet not found.")
    rel = db.query(E.PetCareRelationship).filter(
        E.PetCareRelationship.pet_id == pet_id,
        E.PetCareRelationship.org_id == client.org_id,
        E.PetCareRelationship.status == "ACTIVE").first()
    if not rel:
        raise HTTPException(status_code=404, detail="Pet not found.")
    if rel.expires_at:
        exp = rel.expires_at
        exp_n = exp.replace(tzinfo=None) if getattr(exp, "tzinfo", None) else exp
        if exp_n < utcnow().replace(tzinfo=None):
            raise HTTPException(status_code=404, detail="Pet not found.")
    return rel


def relationship_allows(rel: E.PetCareRelationship, resource: str) -> bool:
    if rel.scope == "FULL_RECORD":
        return True
    if rel.scope == "REPORT_ONLY":
        return resource in ("reports", "package")
    if rel.scope == "SELECTED":
        return resource in ("timeline", "package")
    return False


# ── Entitlements (features only) ────────────────────────────────

def feature_enabled(db: Session, user=None, org_id=None, feature: str = "") -> bool:
    q = db.query(E.Entitlement).filter(E.Entitlement.status == "ACTIVE")
    if user is not None:
        q = q.filter(E.Entitlement.user_id == user.id)
    elif org_id is not None:
        q = q.filter(E.Entitlement.org_id == org_id)
    else:
        return False
    for row in q.all():
        feats = list(row.features or [])
        if row.plan_id:
            plan = db.query(E.Plan).filter(E.Plan.id == row.plan_id).first()
            feats += list((plan.features or []) if plan else [])
        if feature in feats:
            return True
    return False


# ── Ecosystem KPIs (workflow completion counts, no PHI) ──────────

def ecosystem_kpis(db: Session) -> dict:
    def _count(model, *filters):
        q = db.query(model)
        for f in filters:
            q = q.filter(f)
        return q.count()

    fu_total = _count(C.FollowUp)
    fu_done = _count(C.FollowUp, C.FollowUp.status == "COMPLETED")
    return {
        "generated_at": utcnow().isoformat(),
        "organizations": {
            "total": _count(E.Organization),
            "active": _count(E.Organization, E.Organization.status == "ACTIVE"),
        },
        "professionals": {
            "total": _count(E.VetProfessional),
            "verified": _count(E.VetProfessional,
                               E.VetProfessional.verification_state == "VERIFIED"),
            "pending": _count(E.VetProfessional,
                              E.VetProfessional.verification_state == "PENDING"),
        },
        "relationships": {
            "total": _count(E.PetCareRelationship),
            "active": _count(E.PetCareRelationship,
                             E.PetCareRelationship.status == "ACTIVE"),
        },
        "packages": {
            "shared": _count(C.VetHealthPackage, C.VetHealthPackage.status == "SHARED"),
            "approved_awaiting_share": _count(
                C.VetHealthPackage, C.VetHealthPackage.status == "APPROVED"),
        },
        "shares": {"active": _count(F.ShareGrant, F.ShareGrant.status == "ACTIVE")},
        "followups": {"total": fu_total, "completed": fu_done,
                      "completion_rate": (fu_done / fu_total) if fu_total else None},
        "connections": {
            "connected": _count(E.ExternalConnection,
                                E.ExternalConnection.status == "CONNECTED"),
            "total": _count(E.ExternalConnection),
        },
        "imports": {
            "imported": _count(E.ExternalImport, E.ExternalImport.status == "IMPORTED"),
            "rejected": _count(E.ExternalImport, E.ExternalImport.status == "REJECTED"),
        },
        "webhooks": {
            "subscriptions_active": _count(E.WebhookSubscription,
                                           E.WebhookSubscription.status == "ACTIVE"),
            "deliveries_sent": _count(E.WebhookDelivery,
                                      E.WebhookDelivery.status == "SENT"),
            "deliveries_failed": _count(E.WebhookDelivery,
                                        E.WebhookDelivery.status == "FAILED"),
        },
        "note": "Workflow-completion counts only. No clinical outcomes, no PHI.",
    }


# ── Supervisor context (read-only, minimum necessary) ─────────────

def eco_context_for_supervisor(db: Session, user_id, pet_id: UUID) -> dict:
    conns = db.query(E.ExternalConnection).filter(
        E.ExternalConnection.owner_id == user_id,
        E.ExternalConnection.pet_id == pet_id).order_by(
        E.ExternalConnection.created_at.desc()).limit(5).all()
    imports = db.query(E.ExternalImport).filter(
        E.ExternalImport.pet_id == pet_id).order_by(
        E.ExternalImport.created_at.desc()).limit(10).all()
    pkgs = db.query(C.VetHealthPackage).filter(
        C.VetHealthPackage.pet_id == pet_id).order_by(
        C.VetHealthPackage.created_at.desc()).limit(5).all()
    dev_rows = db.query(E.DeviceReading).filter(
        E.DeviceReading.pet_id == pet_id).all()
    by_metric: dict[str, int] = {}
    for r in dev_rows:
        by_metric[r.metric_type] = by_metric.get(r.metric_type, 0) + 1
    return {
        "connections": [{"provider_type": c.provider_type,
                         "provider_name": c.provider_name, "status": c.status,
                         "last_sync_at": c.last_sync_at.isoformat()
                         if c.last_sync_at else None} for c in conns],
        "recent_imports": [{"kind": i.kind, "status": i.status} for i in imports],
        "packages": [{"package_type": p.package_type, "version": p.version,
                      "status": p.status} for p in pkgs],
        "device_summary": {"count": len(dev_rows), "by_metric": by_metric},
    }


# ── Emergency packet (continuity aid, never a diagnosis) ─────────

def build_emergency_snapshot(db: Session, dog, owner_contact: str | None) -> dict:
    """Minimal safety-oriented freeze: identity, allergies, meds, recent
    events, measurements, symptoms, conditions, visits, files, contacts."""
    pid = dog.id

    def _take(q, n):
        return q.limit(n).all()

    events = _take(db.query(F.HealthEvent).filter(
        F.HealthEvent.pet_id == pid, F.HealthEvent.is_archived == False).order_by(  # noqa: E712
        F.HealthEvent.effective_at.desc()), 20)
    meds = _take(db.query(F.Medication).filter(
        F.Medication.pet_id == pid, F.Medication.status == "active"), 20)
    allergies = _take(db.query(F.Allergy).filter(
        F.Allergy.pet_id == pid, F.Allergy.is_archived == False), 20)  # noqa: E712
    symptoms = _take(db.query(F.Symptom).filter(
        F.Symptom.pet_id == pid, F.Symptom.is_archived == False).order_by(  # noqa: E712
        F.Symptom.created_at.desc()), 10)
    weights = _take(db.query(F.WeightMeasurement).filter(
        F.WeightMeasurement.pet_id == pid).order_by(
        F.WeightMeasurement.measured_at.desc()), 5)
    conditions = _take(db.query(M.MedicalHistory).filter(
        M.MedicalHistory.dog_id == pid), 20)
    visits = _take(db.query(M.VetVisitSummary).filter(
        M.VetVisitSummary.dog_id == pid).order_by(
        M.VetVisitSummary.visit_date.desc()), 5)
    files = _take(db.query(F.HealthFile).filter(
        F.HealthFile.pet_id == pid, F.HealthFile.is_archived == False), 10)  # noqa: E712

    def _iso(v):
        return v.isoformat() if v else None

    snapshot = {
        "package_rules": "bin4-emergency-v1",
        "package_type": "EMERGENCY_PACKET",
        "generated_at": utcnow().isoformat(),
        "pet": {"id": str(dog.id), "name": dog.name, "breed": dog.breed,
                "species": dog.species, "sex": dog.sex, "weight_kg": dog.weight_kg},
        "allergies": [{"allergen": a.allergen, "reaction": a.reaction,
                       "severity": a.severity, "verification": a.verification_status}
                      for a in allergies],
        "medications": [{"name": m.name, "dose": m.dose, "frequency": m.frequency,
                         "verification": m.verification_status} for m in meds],
        "recent_events": [{"event_type": e.event_type, "title": e.title,
                           "source": e.source, "source_label": svc._source_label(e.source),
                           "effective_at": _iso(e.effective_at),
                           "verification": e.verification_status} for e in events],
        "recent_measurements": [{"value": w.value, "unit": w.unit,
                                 "measured_at": _iso(w.measured_at)} for w in weights],
        "current_symptoms": [{"name": s.name, "severity": s.severity,
                              "verification": s.verification_status} for s in symptoms],
        "recorded_conditions": [{"condition": mh.condition_name, "status": mh.status,
                                 "notes": mh.notes} for mh in conditions],
        "recent_visits": [{"visit_date": _iso(v.visit_date), "vet_name": v.vet_name,
                           "clinic_name": v.clinic_name,
                           "reason": v.reason_for_visit} for v in visits],
        "files": [{"id": str(f.id), "file_name": f.file_name,
                   "category": f.category} for f in files],
        "emergency_contact": owner_contact,
        "disclaimer": ("Recorded information that may be relevant to a veterinarian. "
                       "Continuity packet only — not a diagnosis, not treatment advice. "
                       "AI-derived sections (if any) are PAWPHILE-generated, never veterinarian-verified."),
    }
    return snapshot
