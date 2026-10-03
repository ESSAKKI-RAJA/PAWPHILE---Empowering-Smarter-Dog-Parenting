"""BIN3 collaboration service — package snapshots, vet access resolution,
scope enforcement, follow-up -> reminder loop, collaboration notifications.

All access decisions are server-side. The frontend role, share ID, package ID,
pet ID, or veterinarian ID alone never grants access.
"""
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import all_models as M
from app.models import foundation_models as F
from app.models import collaboration_models as C
from app.services import intelligence_engine as eng

logger = logging.getLogger(__name__)

PACKAGE_RULES = "bin3-package-v1"
SHARING_CONSENT_PURPOSE = "veterinary_sharing"

# Product rule (documented, safest owner-controlled behavior): withdrawing
# `veterinary_sharing` consent blocks NEW packages/shares. Existing ACTIVE
# shares stay until they expire or the owner explicitly revokes them — the
# access-history endpoint keeps them visible so nothing is silent.
CONSENT_WITHDRAWAL_RULE = (
    "Withdrawing veterinary-sharing consent blocks new packages and shares; "
    "existing ACTIVE shares remain until expiry or explicit revocation."
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def require_sharing_consent(db: Session, user) -> None:
    row = db.query(F.ConsentRecord).filter(
        F.ConsentRecord.user_id == user.id,
        F.ConsentRecord.purpose == SHARING_CONSENT_PURPOSE).order_by(
        F.ConsentRecord.created_at.desc()).first()
    if not row or row.status != "GRANTED":
        raise HTTPException(
            status_code=403,
            detail="Veterinary sharing requires granted `veterinary_sharing` consent. "
                   "Grant it in Consent Center to continue.")


# ── Share helpers ──

def active_share(db: Session, share_id: UUID, pet_id: UUID) -> F.ShareGrant:
    """Fetch a usable share or fail safe: 404 unknown, 410 expired/revoked."""
    row = db.query(F.ShareGrant).filter(
        F.ShareGrant.id == share_id, F.ShareGrant.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Share not found.")
    _ensure_usable(row)
    return row


def _ensure_usable(row: F.ShareGrant) -> None:
    now = utcnow().replace(tzinfo=None)
    if row.status in ("REVOKED", "EXPIRED"):
        raise HTTPException(status_code=410, detail=f"Share is {row.status}.")
    exp = row.expires_at
    if exp is not None:
        exp_naive = exp.replace(tzinfo=None) if getattr(exp, "tzinfo", None) else exp
        if exp_naive < now:
            raise HTTPException(status_code=410, detail="Share is EXPIRED.")
    if row.status != "ACTIVE":
        raise HTTPException(status_code=410, detail=f"Share is {row.status}.")


def _expired(row: F.ShareGrant, now) -> bool:
    exp = row.expires_at
    exp_naive = exp.replace(tzinfo=None) if exp is not None and getattr(exp, "tzinfo", None) else exp
    return exp_naive is not None and exp_naive < now


def grant_state(db: Session, vet_user_id, pet_id: UUID):
    """(usable_share_or_None, gone_status_or_None). ACTIVE-but-past-expiry
    counts as gone/EXPIRED even before lazy expiry flips the stored status."""
    now = utcnow().replace(tzinfo=None)
    rows = db.query(F.ShareGrant).filter(
        F.ShareGrant.pet_id == pet_id,
        F.ShareGrant.grantee_user_id == vet_user_id).all()
    for r in rows:
        if r.status == "ACTIVE" and not _expired(r, now):
            return r, None
    for r in rows:
        if r.status in ("REVOKED", "EXPIRED"):
            return None, r.status
        if r.status == "ACTIVE" and _expired(r, now):
            return None, "EXPIRED"
    return None, None


def vet_share_for(db: Session, vet_user_id, pet_id: UUID) -> Optional[F.ShareGrant]:
    """The ACTIVE, unexpired grant giving this vet user access to this pet."""
    share, _ = grant_state(db, vet_user_id, pet_id)
    return share


def scope_allows(share: F.ShareGrant, resource: str) -> bool:
    """Server-side scope gate. resource: timeline|files|reports|package|summary."""
    if share.scope == "FULL_RECORD":
        return True
    if share.scope == "REPORT_ONLY":
        return resource in ("reports", "package", "summary")
    if share.scope == "SELECTED":
        return resource in ("timeline", "package", "summary")  # files gated per-item below
    return False


def file_allowed(share: F.ShareGrant, health_file: F.HealthFile) -> bool:
    if share.scope == "FULL_RECORD":
        return True
    if share.scope == "REPORT_ONLY":
        return False
    if share.scope == "SELECTED":
        selected = share.selected_types or []
        return "file" in selected or (health_file.category or "") in selected
    return False


# ── Package snapshot ──

def _prov(entity: str, rid, date, actor: Optional[str], verification: Optional[str]) -> dict:
    return {"entity": entity, "id": str(rid) if rid else None,
            "date": date.isoformat() if hasattr(date, "isoformat") else (str(date) if date else None),
            "actor": actor, "verification": verification}


def build_snapshot(db: Session, dog, package_type: str,
                   selected_types: list, owner_questions: list[dict]) -> dict:
    """Freeze a versioned snapshot of the live record. Bounded queries only."""
    if package_type == "EMERGENCY_PACKET":
        # Emergency continuity uses the minimal BIN4 freeze (identity,
        # allergies, meds, recents). Review+share rules are unchanged.
        from app.services import partner_service as _ps
        from app.models import all_models as _M
        owner = db.query(_M.User).filter(_M.User.id == dog.user_id).first()
        prof = db.query(_M.OwnerProfile).filter(
            _M.OwnerProfile.user_id == owner.id).first() if owner else None
        snap = _ps.build_emergency_snapshot(
            db, dog, prof.phone if prof and prof.phone else None)
        snap["owner_questions"] = owner_questions
        return snap
    now = eng.utcnow()
    pid = dog.id
    selected = set(selected_types or [])

    def _take(q, n=50):
        return q.limit(n).all()

    # Recent timeline (provenance-rich backbone)
    events = _take(db.query(F.HealthEvent).filter(
        F.HealthEvent.pet_id == pid, F.HealthEvent.is_archived == False).order_by(  # noqa: E712
        F.HealthEvent.effective_at.desc()))
    if package_type == "SELECTED_RECORDS" and selected:
        events = [e for e in events if e.event_type in selected]
    timeline = [{"id": str(e.id), "event_type": e.event_type, "title": e.title,
                 "summary": e.summary, "source": e.source,
                 "source_label": _source_label(e.source),
                 "effective_at": e.effective_at.isoformat() if e.effective_at else None,
                 "recorded_at": e.recorded_at.isoformat() if e.recorded_at else None,
                 "verification": e.verification_status,
                 "provenance": _prov(e.ref_table or "health_events", e.ref_id or e.id,
                                    e.effective_at, e.actor, e.verification_status)}
                for e in events[:50]]

    meds = _take(db.query(F.Medication).filter(
        F.Medication.pet_id == pid, F.Medication.is_archived == False))  # noqa: E712
    medications = [{"name": m.name, "dose": m.dose, "frequency": m.frequency,
                    "status": m.status, "prescribed_by": m.prescribed_by,
                    "provenance": _prov("medications", m.id, m.start_at, None,
                                       m.verification_status)} for m in meds[:30]]

    allergies = _take(db.query(F.Allergy).filter(
        F.Allergy.pet_id == pid, F.Allergy.is_archived == False))  # noqa: E712
    allergy_list = [{"allergen": a.allergen, "reaction": a.reaction,
                     "severity": a.severity,
                     "provenance": _prov("allergies", a.id, a.created_at, None,
                                        a.verification_status)} for a in allergies[:30]]

    symptoms = _take(db.query(F.Symptom).filter(
        F.Symptom.pet_id == pid, F.Symptom.is_archived == False).order_by(  # noqa: E712
        F.Symptom.created_at.desc()))
    if package_type == "SELECTED_RECORDS" and selected and "symptom" not in selected:
        symptoms = []
    symptom_list = [{"name": s.name, "severity": s.severity,
                     "onset_at": s.onset_at.isoformat() if s.onset_at else None,
                     "notes": s.notes,
                     "provenance": _prov("symptoms", s.id, s.onset_at or s.created_at,
                                        None, s.verification_status)} for s in symptoms[:30]]

    weights = _take(db.query(F.WeightMeasurement).filter(
        F.WeightMeasurement.pet_id == pid).order_by(
        F.WeightMeasurement.measured_at.desc()))
    measurements = {"weight": [
        {"value": w.value, "unit": w.unit,
         "measured_at": w.measured_at.isoformat() if w.measured_at else None,
         "provenance": _prov("weight_measurements", w.id, w.measured_at,
                            None, w.source)} for w in weights[:30]]}

    visits = _take(db.query(M.VetVisitSummary).filter(
        M.VetVisitSummary.dog_id == pid).order_by(M.VetVisitSummary.visit_date.desc()))
    visit_list = [{"visit_date": v.visit_date.isoformat() if v.visit_date else None,
                   "vet_name": v.vet_name, "clinic_name": v.clinic_name,
                   "reason_for_visit": v.reason_for_visit, "vet_remarks": v.vet_remarks,
                   "follow_up_date": v.follow_up_date.isoformat() if v.follow_up_date else None,
                   "provenance": _prov("vet_visit_summaries", v.id, v.visit_date,
                                      v.vet_name, "vet_verified" if v.vet_name else "owner_reported")}
                  for v in visits[:20]]

    files = _take(db.query(F.HealthFile).filter(
        F.HealthFile.pet_id == pid, F.HealthFile.is_archived == False).order_by(  # noqa: E712
        F.HealthFile.created_at.desc()))
    if package_type == "SELECTED_RECORDS" and selected and "file" not in selected:
        files = []
    # Metadata only — storage_ref (internal backend pointer) is NEVER frozen
    # into a shared snapshot.
    file_list = [{"id": str(f.id), "file_name": f.file_name,
                  "mime_type": f.mime_type, "category": f.category,
                  "created_at": f.created_at.isoformat() if f.created_at else None,
                  "provenance": _prov("health_files", f.id, f.created_at, None, None)}
                 for f in files[:20]]

    reports = _take(db.query(F.ReportRecord).filter(
        F.ReportRecord.pet_id == pid, F.ReportRecord.status == "READY").order_by(
        F.ReportRecord.created_at.desc()))
    report_list = [{"id": str(r.id), "report_type": r.report_type,
                    "version": r.version,
                    "generated_at": r.generated_at.isoformat() if r.generated_at else None,
                    "source_summary": r.source_summary or {}}
                   for r in reports[:10]]

    # Descriptive intelligence (BIN2, evidence-linked, non-diagnostic)
    try:
        metrics = {m: eng.analyze_metric(db, pid, m, now)
                   for m in ("weight", "activity", "nutrition", "behavior")}
        comp = eng.completeness(db, pid, now)
        changes = [{"metric": m, **(r.get("change") or {})} for m, r in metrics.items()]
        gaps = [k for k, v in (comp.get("dimensions") or {}).items() if v.get("score", 0) < 0.5]
        intelligence = {
            "origin": "PAWPHILE-generated — descriptive only, not veterinarian-verified",
            "flagged_changes": changes,
            "completeness_pct": comp.get("record_completeness_pct"),
            "data_gaps": gaps,
            "rules_version": eng.RULES_VERSION,
        }
    except Exception:
        intelligence = {"origin": "PAWPHILE-generated — unavailable for this snapshot",
                        "flagged_changes": [], "data_gaps": []}

    snapshot = {
        "package_rules": PACKAGE_RULES,
        "package_type": package_type,
        "generated_at": utcnow().isoformat(),
        "pet": {"id": str(dog.id), "name": dog.name, "breed": dog.breed,
                "species": dog.species},
        "reason_for_visit": None,  # set by owner at share time via consultation purpose
        "timeline": timeline,
        "medications": medications,
        "allergies": allergy_list,
        "symptoms": symptom_list,
        "measurements": measurements,
        "vet_visits": visit_list,
        "files": file_list,
        "reports": report_list,
        "intelligence": intelligence,
        "owner_questions": owner_questions,
        "disclaimer": ("PAWPHILE preparation aid from owner-entered records — "
                       "not a diagnosis, not a veterinary medical record. "
                       "AI-derived sections are PAWPHILE-generated, never veterinarian-verified."),
    }
    return snapshot


def snapshot_digest(snapshot: dict) -> str:
    canonical = json.dumps(snapshot, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _source_label(source: Optional[str]) -> str:
    return {"owner": "OWNER-RECORDED", "vet": "VET-RECORDED",
            "clinic": "CLINIC-RECORDED", "import": "IMPORTED",
            "system": "SYSTEM-DERIVED", "device": "SYSTEM-DERIVED",
            "ai": "AI-DERIVED"}.get(source or "", "OWNER-RECORDED")


# ── Notifications (exactly-once creation; delivery via existing worker) ──

def notify(db: Session, recipient_id, dedupe_key: str, subject: str, body: str,
           reminder_id=None) -> bool:
    """Queue a collaboration notification unless an equivalent one is already
    pending/sent. Returns True when a new row was queued. Body carries IDs and
    statuses only — never medical payloads."""
    existing = db.query(F.Notification).filter(
        F.Notification.recipient_id == recipient_id,
        F.Notification.dedupe_key == dedupe_key,
        F.Notification.status.in_(["SCHEDULED", "QUEUED", "SENT"])).first()
    if existing:
        return False
    db.add(F.Notification(recipient_id=recipient_id, reminder_id=reminder_id,
                          channel="email", status="QUEUED",
                          dedupe_key=dedupe_key, subject=subject[:200],
                          body=body[:2000]))
    db.flush()
    return True


# ── Follow-up -> reminder loop ──

def followup_to_reminder(db: Session, dog, owner, followup: C.FollowUp) -> F.ReminderV1:
    """Create the canonical BIN1 reminder for a vet follow-up (no second engine)."""
    rem = F.ReminderV1(pet_id=dog.id, owner_id=owner.id,
                       reminder_type="vet_follow_up",
                       title=f"Vet follow-up: {(followup.recommendation or '')[:120]}",
                       due_at=followup.due_at or utcnow(),
                       recurrence=None, status="SCHEDULED")
    db.add(rem)
    db.flush()
    db.add(F.Notification(reminder_id=rem.id, recipient_id=owner.id,
                          channel="email", status="SCHEDULED",
                          dedupe_key=f"bin3:followup:{followup.id}"))
    db.flush()
    return rem


def vet_context_for_supervisor(db: Session, pet_id: UUID) -> dict:
    """Read-only consultation context for PAW AI continuity answers."""
    notes = db.query(C.VetNote).filter(C.VetNote.pet_id == pet_id).order_by(
        C.VetNote.created_at.desc()).limit(5).all()
    followups = db.query(C.FollowUp).filter(C.FollowUp.pet_id == pet_id).order_by(
        C.FollowUp.created_at.desc()).limit(5).all()
    questions = db.query(C.VetQuestion).filter(
        C.VetQuestion.pet_id == pet_id,
        C.VetQuestion.status.in_(["OPEN", "ANSWERED"])).order_by(
        C.VetQuestion.created_at.desc()).limit(5).all()
    return {
        "recent_notes": [{"effective_at": n.effective_at.isoformat() if n.effective_at else None,
                          "author": n.author_label, "has_follow_up": bool(n.follow_up_text)}
                         for n in notes],
        "open_followups": [{"recommendation": f.recommendation[:200],
                            "due_at": f.due_at.isoformat() if f.due_at else None,
                            "status": f.status} for f in followups if f.status in ("OPEN", "ACKNOWLEDGED")],
        "open_questions": [q.question_text[:200] for q in questions],
    }


def consultation_detail(db: Session, c: C.Consultation) -> dict:
    questions = db.query(C.VetQuestion).filter(
        C.VetQuestion.consultation_id == c.id).order_by(
        C.VetQuestion.created_at.asc()).all()
    notes = db.query(C.VetNote).filter(
        C.VetNote.consultation_id == c.id).order_by(
        C.VetNote.created_at.asc()).all()
    followups = db.query(C.FollowUp).filter(
        C.FollowUp.consultation_id == c.id).order_by(
        C.FollowUp.created_at.asc()).all()
    from app.schemas import collaboration_schemas as CS
    return {"id": str(c.id), "pet_id": str(c.pet_id), "purpose": c.purpose,
            "status": c.status,
            "care_member_id": str(c.care_member_id) if c.care_member_id else None,
            "share_id": str(c.share_id) if c.share_id else None,
            "package_id": str(c.package_id) if c.package_id else None,
            "vet_user_id": str(c.vet_user_id) if c.vet_user_id else None,
            "started_at": c.started_at.isoformat() if c.started_at else None,
            "ended_at": c.ended_at.isoformat() if c.ended_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "questions": [CS.question_out(q) for q in questions],
            "notes": [CS.note_out(n) for n in notes],
            "follow_ups": [CS.followup_out(f) for f in followups]}
