"""BIN1 Foundation API (v1) — canonical longitudinal health record + care management.

Mounts under /api/v1. All routes require Clerk auth (get_current_user) and
enforce user -> pet -> resource ownership. No public endpoints.

Covers: health-events, symptoms, medications, vet visits, deworming, triage
sessions, weight/activity/nutrition/behavior, labs, imaging, allergies,
procedures, observations, files, timeline, reports, sharing, reminders +
notifications, consent, export, audit, sync (idempotent), completeness.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4
import hashlib
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.security import get_current_user
from app.core.ownership import get_user_or_404, require_dog_ownership
from app.core.audit import log_audit
from app.core.observability import log_event
from app.db.session import get_db
from app.models import all_models as M
from app.models import foundation_models as F
from app.schemas import foundation_schemas as S
from app.services import webhook_service as webhooks

logger = logging.getLogger(__name__)

router = APIRouter()


def _conflict(event: str, **fields) -> None:
    """Sync/version conflict telemetry: IDs and types only, never health content."""
    log_event(logging.WARNING, event, **fields)


# ── helpers ──────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _mk_event(
    db: Session,
    pet_id: UUID,
    event_type: str,
    effective_at: datetime,
    title: Optional[str] = None,
    summary: Optional[str] = None,
    source: str = "owner",
    verification_status: str = "owner_reported",
    ref_table: Optional[str] = None,
    ref_id: Optional[UUID] = None,
) -> F.HealthEvent:
    ev = F.HealthEvent(
        pet_id=pet_id,
        event_type=event_type,
        source=source,
        effective_at=effective_at,
        recorded_at=_utcnow(),
        verification_status=verification_status,
        title=title,
        summary=summary,
        event_metadata={},
        ref_table=ref_table,
        ref_id=ref_id,
    )
    db.add(ev)
    db.flush()  # populate id for ref linkage
    return ev


def _audit(db: Session, action: str, user, dog_id: UUID | None = None, rid: UUID | str | None = None, rtype: str = ""):
    try:
        log_audit(db, action=action, user_id=user.id, dog_id=dog_id,
                  details={"resource_type": rtype, "resource_id": str(rid) if rid else None})
    except Exception:
        pass


def _paginate(q, limit: int, offset: int):
    return q.offset(offset).limit(limit).all()


# ══════════════ HEALTH EVENTS ══════════════

@router.post("/pets/{pet_id}/health-events", response_model=S.HealthEventOut, status_code=201)
def create_health_event(pet_id: UUID, payload: S.HealthEventCreate,
                        clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    ev = F.HealthEvent(pet_id=dog.id, recorded_at=payload.recorded_at or _utcnow(), **payload.model_dump())
    db.add(ev)
    db.commit()
    db.refresh(ev)
    _audit(db, "health_event.created", user, dog.id, ev.id, "health_event")
    db.commit()
    return ev


@router.get("/pets/{pet_id}/health-events", response_model=list[S.HealthEventOut])
def list_health_events(pet_id: UUID,
                       event_type: Optional[str] = None,
                       date_from: Optional[datetime] = None,
                       date_to: Optional[datetime] = None,
                       include_archived: bool = False,
                       limit: int = Query(50, le=200), offset: int = 0,
                       clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.HealthEvent).filter(F.HealthEvent.pet_id == pet_id)
    if event_type:
        q = q.filter(F.HealthEvent.event_type == event_type)
    if date_from:
        q = q.filter(F.HealthEvent.effective_at >= date_from)
    if date_to:
        q = q.filter(F.HealthEvent.effective_at <= date_to)
    if not include_archived:
        q = q.filter(F.HealthEvent.is_archived == False)  # noqa: E712
    q = q.order_by(F.HealthEvent.effective_at.desc())
    return _paginate(q, limit, offset)


@router.get("/pets/{pet_id}/health-events/{event_id}", response_model=S.HealthEventOut)
def get_health_event(pet_id: UUID, event_id: UUID,
                     clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    ev = db.query(F.HealthEvent).filter(F.HealthEvent.id == event_id, F.HealthEvent.pet_id == pet_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Health event not found.")
    return ev


@router.post("/pets/{pet_id}/health-events/{event_id}/archive", response_model=S.HealthEventOut)
def archive_health_event(pet_id: UUID, event_id: UUID,
                         clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    ev = db.query(F.HealthEvent).filter(F.HealthEvent.id == event_id, F.HealthEvent.pet_id == pet_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Health event not found.")
    ev.is_archived = True
    ev.updated_at = _utcnow()
    db.commit()
    db.refresh(ev)
    _audit(db, "health_event.archived", user, dog.id, ev.id, "health_event")
    db.commit()
    return ev


# ══════════════ SYMPTOMS ══════════════

@router.post("/pets/{pet_id}/symptoms", response_model=S.SymptomOut, status_code=201)
def create_symptom(pet_id: UUID, payload: S.SymptomCreate,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    ev = _mk_event(db, dog.id, "symptom", payload.onset_at or _utcnow(),
                   title=f"Symptom: {payload.name}", summary=payload.notes,
                   source=payload.source, ref_table="symptoms")
    row = F.Symptom(pet_id=dog.id, health_event_id=ev.id, verification_status="owner_reported",
                    **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "symptom.created", user, dog.id, row.id, "symptom")
    db.commit()
    return row


@router.get("/pets/{pet_id}/symptoms", response_model=list[S.SymptomOut])
def list_symptoms(pet_id: UUID, include_archived: bool = False,
                  limit: int = Query(50, le=200), offset: int = 0,
                  clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.Symptom).filter(F.Symptom.pet_id == pet_id)
    if not include_archived:
        q = q.filter(F.Symptom.is_archived == False)  # noqa: E712
    q = q.order_by(F.Symptom.created_at.desc())
    return _paginate(q, limit, offset)


@router.get("/pets/{pet_id}/symptoms/{symptom_id}", response_model=S.SymptomOut)
def get_symptom(pet_id: UUID, symptom_id: UUID,
                clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    row = db.query(F.Symptom).filter(F.Symptom.id == symptom_id, F.Symptom.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Symptom not found.")
    return row


@router.put("/pets/{pet_id}/symptoms/{symptom_id}", response_model=S.SymptomOut)
def update_symptom(pet_id: UUID, symptom_id: UUID, payload: S.SymptomUpdate,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.Symptom).filter(F.Symptom.id == symptom_id, F.Symptom.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Symptom not found.")
    if payload.version is not None and payload.version != row.version:
        _conflict("version_conflict"); raise HTTPException(status_code=409, detail="Version conflict. Reload and retry.")
    data = payload.model_dump(exclude_none=True, exclude={"version"})
    for k, v in data.items():
        setattr(row, k, v)
    row.version = (row.version or 1) + 1
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "symptom.updated", user, dog.id, row.id, "symptom")
    db.commit()
    return row


@router.post("/pets/{pet_id}/symptoms/{symptom_id}/archive", response_model=S.SymptomOut)
def archive_symptom(pet_id: UUID, symptom_id: UUID,
                    clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.Symptom).filter(F.Symptom.id == symptom_id, F.Symptom.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Symptom not found.")
    row.is_archived = True
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "symptom.archived", user, dog.id, row.id, "symptom")
    db.commit()
    return row


# ══════════════ MEDICATIONS ══════════════

@router.post("/pets/{pet_id}/medications", response_model=S.MedicationOut, status_code=201)
def create_medication(pet_id: UUID, payload: S.MedicationCreate,
                      clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    ev = _mk_event(db, dog.id, "medication", payload.start_at or _utcnow(),
                   title=f"Medication: {payload.name}", summary=payload.notes,
                   source=payload.source, ref_table="medications")
    row = F.Medication(pet_id=dog.id, health_event_id=ev.id, verification_status="owner_reported",
                       **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "medication.created", user, dog.id, row.id, "medication")
    db.commit()
    return row


@router.get("/pets/{pet_id}/medications", response_model=list[S.MedicationOut])
def list_medications(pet_id: UUID, status: Optional[str] = None, include_archived: bool = False,
                     limit: int = Query(50, le=200), offset: int = 0,
                     clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.Medication).filter(F.Medication.pet_id == pet_id)
    if status:
        q = q.filter(F.Medication.status == status)
    if not include_archived:
        q = q.filter(F.Medication.is_archived == False)  # noqa: E712
    q = q.order_by(F.Medication.created_at.desc())
    return _paginate(q, limit, offset)


@router.get("/pets/{pet_id}/medications/{med_id}", response_model=S.MedicationOut)
def get_medication(pet_id: UUID, med_id: UUID,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    row = db.query(F.Medication).filter(F.Medication.id == med_id, F.Medication.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Medication not found.")
    return row


@router.put("/pets/{pet_id}/medications/{med_id}", response_model=S.MedicationOut)
def update_medication(pet_id: UUID, med_id: UUID, payload: S.MedicationUpdate,
                      clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.Medication).filter(F.Medication.id == med_id, F.Medication.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Medication not found.")
    if payload.version is not None and payload.version != row.version:
        _conflict("version_conflict"); raise HTTPException(status_code=409, detail="Version conflict. Reload and retry.")
    data = payload.model_dump(exclude_none=True, exclude={"version"})
    if "status" in data and data["status"] not in {"active", "completed", "stopped", "archived"}:
        raise HTTPException(status_code=422, detail="Invalid medication status.")
    for k, v in data.items():
        setattr(row, k, v)
    row.version = (row.version or 1) + 1
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "medication.updated", user, dog.id, row.id, "medication")
    db.commit()
    return row


@router.post("/pets/{pet_id}/medications/{med_id}/archive", response_model=S.MedicationOut)
def archive_medication(pet_id: UUID, med_id: UUID,
                       clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.Medication).filter(F.Medication.id == med_id, F.Medication.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Medication not found.")
    row.is_archived = True
    row.status = "archived"
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "medication.archived", user, dog.id, row.id, "medication")
    db.commit()
    return row


# ══════════════ VET VISITS (existing table, completed CRUD) ══════════════

@router.post("/pets/{pet_id}/visits", response_model=S.VetVisitOut, status_code=201)
def create_visit(pet_id: UUID, payload: S.VetVisitCreate,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = M.VetVisitSummary(dog_id=dog.id, **payload.model_dump())
    db.add(row)
    db.flush()
    _mk_event(db, dog.id, "vet_visit", payload.visit_date,
              title=f"Vet visit: {payload.reason_for_visit or 'checkup'}",
              summary=payload.diagnosis, ref_table="vet_visit_summaries", ref_id=row.id)
    db.commit()
    db.refresh(row)
    _audit(db, "visit.created", user, dog.id, row.id, "vet_visit")
    db.commit()
    return row


@router.get("/pets/{pet_id}/visits", response_model=list[S.VetVisitOut])
def list_visits(pet_id: UUID, limit: int = Query(50, le=200), offset: int = 0,
                clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(M.VetVisitSummary).filter(M.VetVisitSummary.dog_id == pet_id).order_by(M.VetVisitSummary.visit_date.desc())
    return _paginate(q, limit, offset)


@router.get("/pets/{pet_id}/visits/{visit_id}", response_model=S.VetVisitOut)
def get_visit(pet_id: UUID, visit_id: UUID,
              clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    row = db.query(M.VetVisitSummary).filter(M.VetVisitSummary.id == visit_id, M.VetVisitSummary.dog_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Visit not found.")
    return row


@router.put("/pets/{pet_id}/visits/{visit_id}", response_model=S.VetVisitOut)
def update_visit(pet_id: UUID, visit_id: UUID, payload: S.VetVisitCreate,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(M.VetVisitSummary).filter(M.VetVisitSummary.id == visit_id, M.VetVisitSummary.dog_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Visit not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "visit.updated", user, dog.id, row.id, "vet_visit")
    db.commit()
    return row


@router.delete("/pets/{pet_id}/visits/{visit_id}", status_code=204)
def delete_visit(pet_id: UUID, visit_id: UUID,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(M.VetVisitSummary).filter(M.VetVisitSummary.id == visit_id, M.VetVisitSummary.dog_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Visit not found.")
    db.delete(row)
    db.commit()
    _audit(db, "visit.deleted", user, dog.id, visit_id, "vet_visit")
    db.commit()
    return None


# ══════════════ MEASUREMENTS: weight / activity / nutrition / behavior ══════════════

@router.post("/pets/{pet_id}/measurements/weight", response_model=S.WeightOut, status_code=201)
def create_weight(pet_id: UUID, payload: S.WeightCreate,
                  clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    ev = _mk_event(db, dog.id, "weight", payload.measured_at,
                   title=f"Weight: {payload.value} {payload.unit}", summary=payload.context,
                   source=payload.source, ref_table="weight_measurements")
    row = F.WeightMeasurement(pet_id=dog.id, health_event_id=ev.id, **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "weight.created", user, dog.id, row.id, "weight")
    db.commit()
    return row


@router.get("/pets/{pet_id}/measurements/weight", response_model=list[S.WeightOut])
def list_weights(pet_id: UUID, limit: int = Query(100, le=200), offset: int = 0,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.WeightMeasurement).filter(
        F.WeightMeasurement.pet_id == pet_id,
        F.WeightMeasurement.is_archived == False,  # noqa: E712
    ).order_by(F.WeightMeasurement.measured_at.desc())
    return _paginate(q, limit, offset)


@router.post("/pets/{pet_id}/measurements/activity", response_model=S.ActivityOut, status_code=201)
def create_activity(pet_id: UUID, payload: S.ActivityCreate,
                    clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    ev = _mk_event(db, dog.id, "activity", payload.occurred_at,
                   title=f"Activity: {payload.activity_type}", ref_table="activity_records")
    row = F.ActivityRecord(pet_id=dog.id, health_event_id=ev.id, source="owner", **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "activity.created", user, dog.id, row.id, "activity")
    db.commit()
    return row


@router.get("/pets/{pet_id}/measurements/activity", response_model=list[S.ActivityOut])
def list_activity(pet_id: UUID, limit: int = Query(100, le=200), offset: int = 0,
                  clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.ActivityRecord).filter(
        F.ActivityRecord.pet_id == pet_id,
        F.ActivityRecord.is_archived == False,  # noqa: E712
    ).order_by(F.ActivityRecord.occurred_at.desc())
    return _paginate(q, limit, offset)


@router.post("/pets/{pet_id}/nutrition", response_model=S.NutritionOut, status_code=201)
def create_nutrition(pet_id: UUID, payload: S.NutritionCreate,
                     clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    ev = _mk_event(db, dog.id, "nutrition", payload.fed_at,
                   title=f"Meal: {payload.food_name}", ref_table="nutrition_entries")
    row = F.NutritionEntry(pet_id=dog.id, health_event_id=ev.id, source="owner", **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "nutrition.created", user, dog.id, row.id, "nutrition")
    db.commit()
    return row


@router.get("/pets/{pet_id}/nutrition", response_model=list[S.NutritionOut])
def list_nutrition(pet_id: UUID, limit: int = Query(100, le=200), offset: int = 0,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.NutritionEntry).filter(
        F.NutritionEntry.pet_id == pet_id,
        F.NutritionEntry.is_archived == False,  # noqa: E712
    ).order_by(F.NutritionEntry.fed_at.desc())
    return _paginate(q, limit, offset)


@router.post("/pets/{pet_id}/behavior", response_model=S.BehaviorOut, status_code=201)
def create_behavior(pet_id: UUID, payload: S.BehaviorCreate,
                    clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    ev = _mk_event(db, dog.id, "behavior", payload.observed_at,
                   title=f"Behavior: {payload.behavior_type}", ref_table="behavior_entries")
    row = F.BehaviorEntry(pet_id=dog.id, health_event_id=ev.id, source="owner", **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "behavior.created", user, dog.id, row.id, "behavior")
    db.commit()
    return row


@router.get("/pets/{pet_id}/behavior", response_model=list[S.BehaviorOut])
def list_behavior(pet_id: UUID, limit: int = Query(100, le=200), offset: int = 0,
                  clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.BehaviorEntry).filter(
        F.BehaviorEntry.pet_id == pet_id,
        F.BehaviorEntry.is_archived == False,  # noqa: E712
    ).order_by(F.BehaviorEntry.observed_at.desc())
    return _paginate(q, limit, offset)


# ══════════════ LABS / IMAGING / ALLERGIES / PROCEDURES / OBSERVATIONS ══════════════

@router.post("/pets/{pet_id}/labs", response_model=S.LabOut, status_code=201)
def create_lab(pet_id: UUID, payload: S.LabCreate,
               clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if not payload.test_name.strip():
        raise HTTPException(status_code=422, detail="test_name must not be blank.")
    ev = _mk_event(db, dog.id, "lab_result", payload.collected_at or _utcnow(),
                   title=f"Lab: {payload.test_name}", ref_table="lab_results")
    row = F.LabResult(pet_id=dog.id, health_event_id=ev.id, source="owner",
                      verification_status="owner_reported", **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "lab.created", user, dog.id, row.id, "lab_result")
    db.commit()
    return row


@router.get("/pets/{pet_id}/labs", response_model=list[S.LabOut])
def list_labs(pet_id: UUID, limit: int = Query(50, le=200), offset: int = 0,
              clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.LabResult).filter(F.LabResult.pet_id == pet_id,
                                     F.LabResult.is_archived == False).order_by(F.LabResult.created_at.desc())  # noqa: E712
    return _paginate(q, limit, offset)


@router.post("/pets/{pet_id}/imaging", response_model=S.ImagingOut, status_code=201)
def create_imaging(pet_id: UUID, payload: S.ImagingCreate,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    ev = _mk_event(db, dog.id, "imaging", payload.performed_at or _utcnow(),
                   title=f"Imaging: {payload.modality}", ref_table="imaging_studies")
    row = F.ImagingStudy(pet_id=dog.id, health_event_id=ev.id, source="owner",
                         verification_status="owner_reported", **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "imaging.created", user, dog.id, row.id, "imaging")
    db.commit()
    return row


@router.get("/pets/{pet_id}/imaging", response_model=list[S.ImagingOut])
def list_imaging(pet_id: UUID, limit: int = Query(50, le=200), offset: int = 0,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.ImagingStudy).filter(F.ImagingStudy.pet_id == pet_id,
                                        F.ImagingStudy.is_archived == False).order_by(F.ImagingStudy.created_at.desc())  # noqa: E712
    return _paginate(q, limit, offset)


@router.post("/pets/{pet_id}/allergies", response_model=S.AllergyOut, status_code=201)
def create_allergy(pet_id: UUID, payload: S.AllergyCreate,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if not payload.allergen.strip():
        raise HTTPException(status_code=422, detail="allergen must not be blank.")
    ev = _mk_event(db, dog.id, "condition", _utcnow(),
                   title=f"Allergy: {payload.allergen}", ref_table="allergies")
    row = F.Allergy(pet_id=dog.id, health_event_id=ev.id, source="owner",
                    verification_status="owner_reported", **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "allergy.created", user, dog.id, row.id, "allergy")
    db.commit()
    return row


@router.get("/pets/{pet_id}/allergies", response_model=list[S.AllergyOut])
def list_allergies(pet_id: UUID, limit: int = Query(50, le=200), offset: int = 0,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.Allergy).filter(F.Allergy.pet_id == pet_id,
                                   F.Allergy.is_archived == False).order_by(F.Allergy.created_at.desc())  # noqa: E712
    return _paginate(q, limit, offset)


@router.post("/pets/{pet_id}/procedures", response_model=S.ProcedureOut, status_code=201)
def create_procedure(pet_id: UUID, payload: S.ProcedureCreate,
                     clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="name must not be blank.")
    ev = _mk_event(db, dog.id, "procedure", payload.performed_at or _utcnow(),
                   title=f"Procedure: {payload.name}", ref_table="procedures")
    row = F.Procedure(pet_id=dog.id, health_event_id=ev.id, source="owner",
                      verification_status="owner_reported", **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "procedure.created", user, dog.id, row.id, "procedure")
    db.commit()
    return row


@router.get("/pets/{pet_id}/procedures", response_model=list[S.ProcedureOut])
def list_procedures(pet_id: UUID, limit: int = Query(50, le=200), offset: int = 0,
                    clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.Procedure).filter(F.Procedure.pet_id == pet_id,
                                     F.Procedure.is_archived == False).order_by(F.Procedure.created_at.desc())  # noqa: E712
    return _paginate(q, limit, offset)


@router.post("/pets/{pet_id}/observations", response_model=S.ObservationOut, status_code=201)
def create_observation(pet_id: UUID, payload: S.ObservationCreate,
                       clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if not payload.note.strip():
        raise HTTPException(status_code=422, detail="note must not be blank.")
    ev = _mk_event(db, dog.id, "observation", payload.observed_at or _utcnow(),
                   title=f"Observation: {payload.category}", summary=payload.note[:200],
                   ref_table="observations")
    row = F.Observation(pet_id=dog.id, health_event_id=ev.id, source="owner",
                        verification_status="owner_reported", **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "observation.created", user, dog.id, row.id, "observation")
    db.commit()
    return row


@router.get("/pets/{pet_id}/observations", response_model=list[S.ObservationOut])
def list_observations(pet_id: UUID, limit: int = Query(50, le=200), offset: int = 0,
                      clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.Observation).filter(F.Observation.pet_id == pet_id,
                                       F.Observation.is_archived == False).order_by(F.Observation.created_at.desc())  # noqa: E712
    return _paginate(q, limit, offset)


# ══════════════ CANONICAL TIMELINE ══════════════

@router.get("/pets/{pet_id}/timeline")
def get_timeline(pet_id: UUID,
                 event_type: Optional[str] = None,
                 date_from: Optional[datetime] = None,
                 date_to: Optional[datetime] = None,
                 limit: int = Query(100, le=200), offset: int = 0,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """One canonical chronological timeline aggregating health_events + legacy rows."""
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.HealthEvent).filter(F.HealthEvent.pet_id == pet_id,
                                       F.HealthEvent.is_archived == False)  # noqa: E712
    if event_type:
        q = q.filter(F.HealthEvent.event_type == event_type)
    if date_from:
        q = q.filter(F.HealthEvent.effective_at >= date_from)
    if date_to:
        q = q.filter(F.HealthEvent.effective_at <= date_to)
    total = q.count()
    events = q.order_by(F.HealthEvent.effective_at.desc()).offset(offset).limit(limit).all()

    # Backfill legacy rows that predate the envelope (vaccines, visits, triage, scans).
    items = [{
        "id": str(e.id),
        "event_type": e.event_type,
        "effective_at": e.effective_at.isoformat() if e.effective_at else None,
        "recorded_at": e.recorded_at.isoformat() if e.recorded_at else None,
        "source": e.source,
        "verification_status": e.verification_status,
        "title": e.title,
        "summary": e.summary,
    } for e in events]

    if offset == 0 and not event_type:  # only enrich first page of unfiltered view
        dog_uuid = pet_id
        for v in db.query(M.VaccineRecord).filter(M.VaccineRecord.dog_id == dog_uuid).order_by(M.VaccineRecord.created_at.desc()).limit(20).all():
            items.append({"id": str(v.id), "event_type": "vaccination",
                          "effective_at": v.date_given.isoformat() if v.date_given else (v.created_at.isoformat() if v.created_at else None),
                          "recorded_at": v.created_at.isoformat() if v.created_at else None,
                          "source": "owner", "verification_status": "owner_reported",
                          "title": f"Vaccination: {v.name}", "summary": v.notes})
        for t in db.query(M.SymptomTriageSession).filter(M.SymptomTriageSession.dog_id == dog_uuid).order_by(M.SymptomTriageSession.created_at.desc()).limit(20).all():
            items.append({"id": str(t.id), "event_type": "symptom",
                          "effective_at": t.created_at.isoformat() if t.created_at else None,
                          "recorded_at": t.created_at.isoformat() if t.created_at else None,
                          "source": "owner", "verification_status": "owner_reported",
                          "title": f"Triage: {t.severity_level or 'recorded'}", "summary": None})
        items.sort(key=lambda x: x.get("effective_at") or "", reverse=True)
        items = items[:limit]

    return {"pet_id": str(pet_id), "total_envelope_events": total, "items": items,
            "limit": limit, "offset": offset}


# ══════════════ FILES (private metadata) ══════════════

@router.post("/pets/{pet_id}/files", response_model=S.HealthFileOut, status_code=201)
def register_file(pet_id: UUID, payload: S.HealthFileCreate,
                  clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if ".." in payload.storage_ref or payload.storage_ref.startswith("http"):
        raise HTTPException(status_code=422, detail="storage_ref must be an internal reference, not a public URL.")
    ev = _mk_event(db, dog.id, "file", _utcnow(), title=f"File: {payload.file_name}", ref_table="health_files")
    row = F.HealthFile(pet_id=dog.id, health_event_id=ev.id, storage_backend="local", **payload.model_dump())
    db.add(row)
    db.flush()
    ev.ref_id = row.id
    db.commit()
    db.refresh(row)
    _audit(db, "file.registered", user, dog.id, row.id, "health_file")
    db.commit()
    return row


@router.get("/pets/{pet_id}/files", response_model=list[S.HealthFileOut])
def list_files(pet_id: UUID, limit: int = Query(50, le=200), offset: int = 0,
               clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.HealthFile).filter(F.HealthFile.pet_id == pet_id,
                                      F.HealthFile.is_archived == False).order_by(F.HealthFile.created_at.desc())  # noqa: E712
    return _paginate(q, limit, offset)


@router.get("/pets/{pet_id}/files/{file_id}", response_model=S.HealthFileOut)
def get_file(pet_id: UUID, file_id: UUID,
             clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Authorized metadata access. Download itself is mediated server-side;
    this endpoint never redirects to a predictable public URL."""
    require_dog_ownership(pet_id, clerk_user_id, db)
    row = db.query(F.HealthFile).filter(F.HealthFile.id == file_id, F.HealthFile.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="File not found.")
    return row


@router.post("/pets/{pet_id}/files/{file_id}/archive", response_model=S.HealthFileOut)
def archive_file(pet_id: UUID, file_id: UUID,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.HealthFile).filter(F.HealthFile.id == file_id, F.HealthFile.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="File not found.")
    row.is_archived = True
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "file.archived", user, dog.id, row.id, "health_file")
    db.commit()
    return row


# ══════════════ REPORTS (DRAFT->GENERATING->READY|FAILED) ══════════════

def _report_counts(db: Session, pet_id: UUID) -> dict:
    return {
        "health_events": db.query(F.HealthEvent).filter(F.HealthEvent.pet_id == pet_id).count(),
        "symptoms": db.query(F.Symptom).filter(F.Symptom.pet_id == pet_id).count(),
        "medications": db.query(F.Medication).filter(F.Medication.pet_id == pet_id).count(),
        "weights": db.query(F.WeightMeasurement).filter(F.WeightMeasurement.pet_id == pet_id).count(),
        "visits": db.query(M.VetVisitSummary).filter(M.VetVisitSummary.dog_id == pet_id).count(),
        "vaccines": db.query(M.VaccineRecord).filter(M.VaccineRecord.dog_id == pet_id).count(),
    }


@router.post("/pets/{pet_id}/reports", response_model=S.ReportOut, status_code=201)
def create_report(pet_id: UUID, payload: S.ReportCreate,
                  clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if not payload.report_type.strip():
        raise HTTPException(status_code=422, detail="report_type must not be blank.")
    row = F.ReportRecord(pet_id=dog.id, report_type=payload.report_type.strip(),
                         status="DRAFT", source_summary=payload.source_summary)
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, "report.created", user, dog.id, row.id, "report")
    db.commit()
    return row


@router.get("/pets/{pet_id}/reports", response_model=list[S.ReportOut])
def list_reports(pet_id: UUID, limit: int = Query(50, le=200), offset: int = 0,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.ReportRecord).filter(F.ReportRecord.pet_id == pet_id).order_by(F.ReportRecord.created_at.desc())
    return _paginate(q, limit, offset)


@router.get("/pets/{pet_id}/reports/{report_id}", response_model=S.ReportOut)
def get_report(pet_id: UUID, report_id: UUID,
               clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    row = db.query(F.ReportRecord).filter(F.ReportRecord.id == report_id, F.ReportRecord.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found.")
    return row


@router.post("/pets/{pet_id}/reports/{report_id}/generate", response_model=S.ReportOut)
def generate_report(pet_id: UUID, report_id: UUID,
                    clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Truthful server-side generation: builds a reproducible text summary from
    actual stored counts. Never fabricates clinical content."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.ReportRecord).filter(F.ReportRecord.id == report_id, F.ReportRecord.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found.")
    if row.status == "GENERATING":
        raise HTTPException(status_code=409, detail="Report generation already in progress.")
    try:
        row.status = "GENERATING"
        db.commit()
        counts = _report_counts(db, dog.id)
        lines = [f"PAWPHILE Health Summary — {dog.name}",
                 f"Generated: {_utcnow().isoformat()}",
                 f"Report type: {row.report_type} (v{row.version})",
                 "",
                 "Source counts (reproducible):"]
        lines += [f"- {k}: {v}" for k, v in counts.items()]
        lines += ["",
                  "Note: decision-support summary only; not a diagnosis.",
                  "Verify with your veterinarian."]
        content = "\n".join(lines)
        digest = hashlib.sha256(content.encode()).hexdigest()[:16]
        row.storage_ref = f"local://reports/{dog.id}/{row.id}-v{row.version}-{digest}.txt"
        row.source_summary = {"counts": counts, "generated_from": "server", "digest": digest}
        row.status = "READY"
        row.generated_at = _utcnow()
        row.updated_at = _utcnow()
        db.commit()
        db.refresh(row)
        _mk_event(db, dog.id, "report", _utcnow(), title=f"Report ready: {row.report_type}",
                  ref_table="report_records", ref_id=row.id)
        _audit(db, "report.generated", user, dog.id, row.id, "report")
        db.commit()
        return row
    except Exception:
        db.rollback()
        log_event(logging.ERROR, "report_generation_failed", report_id=str(report_id))
        row = db.query(F.ReportRecord).filter(F.ReportRecord.id == report_id).first()
        if row:
            row.status = "FAILED"
            row.error = "Report generation failed."
            db.commit()
            db.refresh(row)
        raise HTTPException(status_code=500, detail="Report generation failed.")


# ══════════════ SHARING ══════════════

@router.post("/pets/{pet_id}/shares", response_model=S.ShareOut, status_code=201)
def create_share(pet_id: UUID, payload: S.ShareCreate,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if not payload.recipient_label.strip():
        raise HTTPException(status_code=422, detail="recipient_label must not be blank.")
    if payload.scope == "SELECTED" and not payload.selected_types:
        raise HTTPException(status_code=422, detail="selected_types required when scope=SELECTED.")
    row = F.ShareGrant(pet_id=dog.id, owner_id=user.id,
                       recipient_label=payload.recipient_label.strip(),
                       scope=payload.scope, selected_types=payload.selected_types,
                       expires_at=payload.expires_at, status="ACTIVE")
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, "share.created", user, dog.id, row.id, "share_grant")
    webhooks.emit(db, "SHARE_CREATED", owner_id=user.id,
                  ref={"id": str(row.id), "scope": row.scope})
    db.commit()
    return row


@router.get("/pets/{pet_id}/shares", response_model=list[S.ShareOut])
def list_shares(pet_id: UUID,
                clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    now = _utcnow()
    rows = db.query(F.ShareGrant).filter(F.ShareGrant.pet_id == pet_id).order_by(F.ShareGrant.created_at.desc()).all()
    # Lazy expiry (explicit semantics, no silent overwrite of history)
    changed = False
    for r in rows:
        if r.status == "ACTIVE" and r.expires_at and r.expires_at < now.replace(tzinfo=None):
            r.status = "EXPIRED"
            changed = True
    if changed:
        db.commit()
    return rows


@router.post("/pets/{pet_id}/shares/{share_id}/revoke", response_model=S.ShareOut)
def revoke_share(pet_id: UUID, share_id: UUID,
                 clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.ShareGrant).filter(F.ShareGrant.id == share_id, F.ShareGrant.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Share not found.")
    row.status = "REVOKED"
    row.revoked_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "share.revoked", user, dog.id, row.id, "share_grant")
    webhooks.emit(db, "SHARE_REVOKED", owner_id=user.id,
                  ref={"id": str(row.id)})
    db.commit()
    return row


@router.get("/pets/{pet_id}/shares/{share_id}/view")
def view_share(pet_id: UUID, share_id: UUID,
               clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Owner-mediated shared snapshot with access logging. No anonymous public links."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.ShareGrant).filter(F.ShareGrant.id == share_id, F.ShareGrant.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Share not found.")
    if row.status != "ACTIVE":
        raise HTTPException(status_code=410, detail=f"Share is {row.status}.")
    row.access_count = (row.access_count or 0) + 1
    row.last_accessed_at = _utcnow()
    db.commit()
    _audit(db, "share.accessed", user, dog.id, row.id, "share_grant")
    db.commit()
    if row.scope == "FULL_RECORD":
        return {"share_id": str(row.id), "scope": row.scope, "counts": _report_counts(db, dog.id),
                "access_count": row.access_count}
    if row.scope == "SELECTED":
        q = db.query(F.HealthEvent).filter(F.HealthEvent.pet_id == dog.id,
                                           F.HealthEvent.event_type.in_(row.selected_types or [])).order_by(
            F.HealthEvent.effective_at.desc()).limit(100).all()
        return {"share_id": str(row.id), "scope": row.scope,
                "items": [{"id": str(e.id), "event_type": e.event_type,
                           "effective_at": e.effective_at.isoformat() if e.effective_at else None,
                           "title": e.title} for e in q],
                "access_count": row.access_count}
    reports = db.query(F.ReportRecord).filter(F.ReportRecord.pet_id == dog.id,
                                              F.ReportRecord.status == "READY").order_by(
        F.ReportRecord.created_at.desc()).limit(10).all()
    return {"share_id": str(row.id), "scope": row.scope,
            "reports": [{"id": str(r.id), "report_type": r.report_type} for r in reports],
            "access_count": row.access_count}


# ══════════════ REMINDERS + NOTIFICATIONS (server-authoritative) ══════════════

@router.post("/pets/{pet_id}/reminders", response_model=S.ReminderOut, status_code=201)
def create_reminder(pet_id: UUID, payload: S.ReminderCreate,
                    clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="title must not be blank.")
    row = F.ReminderV1(pet_id=dog.id, owner_id=user.id, reminder_type=payload.reminder_type,
                       title=payload.title.strip(), due_at=payload.due_at,
                       recurrence=payload.recurrence, status="SCHEDULED")
    db.add(row)
    db.flush()
    db.add(F.Notification(reminder_id=row.id, recipient_id=user.id, channel="email", status="SCHEDULED"))
    db.commit()
    db.refresh(row)
    _audit(db, "reminder.created", user, dog.id, row.id, "reminder")
    db.commit()
    return row


@router.get("/pets/{pet_id}/reminders", response_model=list[S.ReminderOut])
def list_reminders(pet_id: UUID, status: Optional[str] = None,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    q = db.query(F.ReminderV1).filter(F.ReminderV1.pet_id == pet_id)
    if status:
        q = q.filter(F.ReminderV1.status == status)
    return q.order_by(F.ReminderV1.due_at.asc()).all()


@router.put("/pets/{pet_id}/reminders/{reminder_id}", response_model=S.ReminderOut)
def update_reminder(pet_id: UUID, reminder_id: UUID, payload: S.ReminderUpdate,
                    clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = db.query(F.ReminderV1).filter(F.ReminderV1.id == reminder_id, F.ReminderV1.pet_id == pet_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    if payload.version is not None and payload.version != row.version:
        _conflict("version_conflict"); raise HTTPException(status_code=409, detail="Version conflict. Reload and retry.")
    data = payload.model_dump(exclude_none=True, exclude={"version"})
    if "status" in data and data["status"] not in S.ALLOWED_REMINDER_STATUS:
        raise HTTPException(status_code=422, detail="Invalid reminder status.")
    for k, v in data.items():
        setattr(row, k, v)
    if data.get("status") in {"COMPLETED", "DISMISSED"}:
        row.completed_at = _utcnow()
    row.version = (row.version or 1) + 1
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    _audit(db, "reminder.updated", user, dog.id, row.id, "reminder")
    db.commit()
    return row


@router.get("/pets/{pet_id}/reminders/{reminder_id}/notifications")
def list_notifications(pet_id: UUID, reminder_id: UUID,
                       clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    rem = db.query(F.ReminderV1).filter(F.ReminderV1.id == reminder_id, F.ReminderV1.pet_id == pet_id).first()
    if not rem:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    rows = db.query(F.Notification).filter(F.Notification.reminder_id == reminder_id).order_by(
        F.Notification.created_at.desc()).all()
    return [{"id": str(n.id), "status": n.status, "attempt": n.attempt,
             "failure_reason": n.failure_reason,
             "sent_at": n.sent_at.isoformat() if n.sent_at else None} for n in rows]


@router.post("/reminders/process-due")
def process_due_reminders(clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Idempotent due-reminder sweep. Promotes one SCHEDULED notification to
    QUEUED per due reminder (or creates one if missing); retries never
    duplicate QUEUED/SENT notifications."""
    user = get_user_or_404(clerk_user_id, db)
    now = _utcnow().replace(tzinfo=None)
    due = db.query(F.ReminderV1).filter(F.ReminderV1.owner_id == user.id,
                                        F.ReminderV1.status == "SCHEDULED",
                                        F.ReminderV1.due_at <= now).all()
    queued = 0
    for r in due:
        in_flight = db.query(F.Notification).filter(
            F.Notification.reminder_id == r.id,
            F.Notification.status.in_(["QUEUED", "SENT"])).first()
        if in_flight:
            continue
        stale = db.query(F.Notification).filter(
            F.Notification.reminder_id == r.id,
            F.Notification.status == "SCHEDULED").first()
        if stale:
            stale.status = "QUEUED"
        else:
            db.add(F.Notification(reminder_id=r.id, recipient_id=user.id, channel="email", status="QUEUED"))
        queued += 1
    db.commit()
    _audit(db, "reminders.process_due", user, None, None, "reminder")
    db.commit()
    return {"status": "success", "due_count": len(due), "queued_count": queued}


# ══════════════ CONSENT / AUDIT / EXPORT / COMPLETENESS ══════════════

@router.post("/consent", response_model=S.ConsentOut, status_code=201)
def upsert_consent(payload: S.ConsentCreate,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    if payload.status not in S.ALLOWED_CONSENT_STATUS:
        raise HTTPException(status_code=422, detail="Invalid consent status.")
    row = db.query(F.ConsentRecord).filter(F.ConsentRecord.user_id == user.id,
                                           F.ConsentRecord.purpose == payload.purpose).order_by(
        F.ConsentRecord.created_at.desc()).first()
    if row:
        row.status = payload.status
        row.explanation = payload.explanation
        row.updated_at = _utcnow()
    else:
        row = F.ConsentRecord(user_id=user.id, purpose=payload.purpose,
                              status=payload.status, explanation=payload.explanation)
        db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, "consent.changed", user, None, row.id, "consent")
    db.commit()
    return row


@router.get("/consent", response_model=list[S.ConsentOut])
def list_consent(clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = get_user_or_404(clerk_user_id, db)
    return db.query(F.ConsentRecord).filter(F.ConsentRecord.user_id == user.id).order_by(
        F.ConsentRecord.created_at.desc()).all()


@router.get("/pets/{pet_id}/audit")
def list_audit(pet_id: UUID, limit: int = Query(100, le=200),
               clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    rows = db.query(M.AuditLog).filter(M.AuditLog.dog_id == pet_id).order_by(
        M.AuditLog.created_at.desc()).limit(limit).all()
    return [{"id": str(r.id), "action": r.action, "details": r.details,
             "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]


@router.get("/pets/{pet_id}/export")
def export_pet(pet_id: UUID,
               clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Owner data export — structured JSON, only this user's pet. No cross-user leakage."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)

    def _dump(rows):
        out = []
        for r in rows:
            d = {}
            for c in r.__table__.columns:
                try:
                    v = getattr(r, c.key)
                except Exception:
                    continue
                # Never leak SQLAlchemy internals (e.g. MetaData) into export.
                if isinstance(v, str) or isinstance(v, (int, float, bool)) or v is None:
                    d[c.name] = v
                elif isinstance(v, datetime):
                    d[c.name] = v.isoformat()
                elif isinstance(v, UUID):
                    d[c.name] = str(v)
                elif isinstance(v, (dict, list)):
                    d[c.name] = v
                else:
                    d[c.name] = str(v) if v is not None else None
            out.append(d)
        return out

    payload = {
        "exported_at": _utcnow().isoformat(),
        "pet": {"id": str(dog.id), "name": dog.name, "breed": dog.breed,
                "dob": dog.dob, "gender": dog.gender, "weight_kg": dog.weight_kg},
        "health_events": _dump(db.query(F.HealthEvent).filter(F.HealthEvent.pet_id == dog.id).all()),
        "symptoms": _dump(db.query(F.Symptom).filter(F.Symptom.pet_id == dog.id).all()),
        "medications": _dump(db.query(F.Medication).filter(F.Medication.pet_id == dog.id).all()),
        "weights": _dump(db.query(F.WeightMeasurement).filter(F.WeightMeasurement.pet_id == dog.id).all()),
        "activities": _dump(db.query(F.ActivityRecord).filter(F.ActivityRecord.pet_id == dog.id).all()),
        "nutrition": _dump(db.query(F.NutritionEntry).filter(F.NutritionEntry.pet_id == dog.id).all()),
        "behavior": _dump(db.query(F.BehaviorEntry).filter(F.BehaviorEntry.pet_id == dog.id).all()),
        "labs": _dump(db.query(F.LabResult).filter(F.LabResult.pet_id == dog.id).all()),
        "imaging": _dump(db.query(F.ImagingStudy).filter(F.ImagingStudy.pet_id == dog.id).all()),
        "visits": _dump(db.query(M.VetVisitSummary).filter(M.VetVisitSummary.dog_id == dog.id).all()),
        "vaccines": _dump(db.query(M.VaccineRecord).filter(M.VaccineRecord.dog_id == dog.id).all()),
        "reports": _dump(db.query(F.ReportRecord).filter(F.ReportRecord.pet_id == dog.id).all()),
    }
    try:
        # BIN3 continuity: owner-controlled collaboration records travel with export.
        from app.models import collaboration_models as C
        payload["care_team"] = _dump(db.query(C.CareTeamMember).filter(C.CareTeamMember.pet_id == dog.id).all())
        payload["vet_packages"] = _dump(db.query(C.VetHealthPackage).filter(C.VetHealthPackage.pet_id == dog.id).all())
        payload["consultations"] = _dump(db.query(C.Consultation).filter(C.Consultation.pet_id == dog.id).all())
        payload["vet_questions"] = _dump(db.query(C.VetQuestion).filter(C.VetQuestion.pet_id == dog.id).all())
        payload["vet_notes"] = _dump(db.query(C.VetNote).filter(C.VetNote.pet_id == dog.id).all())
        payload["follow_ups"] = _dump(db.query(C.FollowUp).filter(C.FollowUp.pet_id == dog.id).all())
    except Exception:
        pass
    _audit(db, "export.requested", user, dog.id, dog.id, "export")
    db.commit()
    return payload


@router.get("/pets/{pet_id}/completeness")
def pet_completeness(pet_id: UUID,
                     clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Non-diagnostic data-completeness indicators (no health score)."""
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    last_weight = db.query(F.WeightMeasurement).filter(
        F.WeightMeasurement.pet_id == dog.id).order_by(F.WeightMeasurement.measured_at.desc()).first()
    last_event = db.query(F.HealthEvent).filter(
        F.HealthEvent.pet_id == dog.id).order_by(F.HealthEvent.effective_at.desc()).first()
    last_vax = db.query(M.VaccineRecord).filter(
        M.VaccineRecord.dog_id == dog.id).order_by(M.VaccineRecord.created_at.desc()).first()
    profile_fields = [dog.name, dog.breed, dog.dob, dog.gender, dog.weight_kg]
    filled = sum(1 for f in profile_fields if f not in (None, "", []))
    return {
        "pet_id": str(pet_id),
        "profile_completeness": {"filled": filled, "of": len(profile_fields)},
        "last_health_update": last_event.effective_at.isoformat() if last_event and last_event.effective_at else None,
        "last_weight": {"value": last_weight.value, "unit": last_weight.unit,
                        "measured_at": last_weight.measured_at.isoformat()} if last_weight else None,
        "last_vaccination_record": last_vax.created_at.isoformat() if last_vax and last_vax.created_at else None,
        "timeline_events": db.query(F.HealthEvent).filter(F.HealthEvent.pet_id == dog.id).count(),
    }


# ══════════════ SYNC (idempotent operation queue) ══════════════

_SYNC_HANDLERS = {"symptom", "medication", "weight", "activity", "nutrition",
                  "behavior", "observation", "health_event", "vet_visit", "reminder",
                  "vaccine", "deworming"}


def _apply_sync_op(db: Session, user, pet: UUID | None, entity_type: str, payload: dict):
    """Apply one synced operation transactionally. Returns (entity_id, result)."""
    if entity_type == "symptom":
        p = S.SymptomCreate(**payload)
        ev = _mk_event(db, pet, "symptom", p.onset_at or _utcnow(), title=f"Symptom: {p.name}")
        row = F.Symptom(pet_id=pet, health_event_id=ev.id, verification_status="owner_reported", **p.model_dump())
        db.add(row)
        db.flush()
        ev.ref_id = row.id
        return str(row.id), {"id": str(row.id)}
    if entity_type == "medication":
        p = S.MedicationCreate(**payload)
        ev = _mk_event(db, pet, "medication", p.start_at or _utcnow(), title=f"Medication: {p.name}")
        row = F.Medication(pet_id=pet, health_event_id=ev.id, verification_status="owner_reported", **p.model_dump())
        db.add(row)
        db.flush()
        ev.ref_id = row.id
        return str(row.id), {"id": str(row.id)}
    if entity_type == "weight":
        p = S.WeightCreate(**payload)
        ev = _mk_event(db, pet, "weight", p.measured_at, title=f"Weight: {p.value} {p.unit}")
        row = F.WeightMeasurement(pet_id=pet, health_event_id=ev.id, **p.model_dump())
        db.add(row)
        db.flush()
        ev.ref_id = row.id
        return str(row.id), {"id": str(row.id)}
    if entity_type == "activity":
        p = S.ActivityCreate(**payload)
        ev = _mk_event(db, pet, "activity", p.occurred_at, title=f"Activity: {p.activity_type}")
        row = F.ActivityRecord(pet_id=pet, health_event_id=ev.id, source="owner", **p.model_dump())
        db.add(row)
        db.flush()
        ev.ref_id = row.id
        return str(row.id), {"id": str(row.id)}
    if entity_type == "nutrition":
        p = S.NutritionCreate(**payload)
        ev = _mk_event(db, pet, "nutrition", p.fed_at, title=f"Meal: {p.food_name}")
        row = F.NutritionEntry(pet_id=pet, health_event_id=ev.id, source="owner", **p.model_dump())
        db.add(row)
        db.flush()
        ev.ref_id = row.id
        return str(row.id), {"id": str(row.id)}
    if entity_type == "behavior":
        p = S.BehaviorCreate(**payload)
        ev = _mk_event(db, pet, "behavior", p.observed_at, title=f"Behavior: {p.behavior_type}")
        row = F.BehaviorEntry(pet_id=pet, health_event_id=ev.id, source="owner", **p.model_dump())
        db.add(row)
        db.flush()
        ev.ref_id = row.id
        return str(row.id), {"id": str(row.id)}
    if entity_type == "observation":
        p = S.ObservationCreate(**payload)
        ev = _mk_event(db, pet, "observation", p.observed_at or _utcnow(), title=f"Observation: {p.category}")
        row = F.Observation(pet_id=pet, health_event_id=ev.id, source="owner",
                            verification_status="owner_reported", **p.model_dump())
        db.add(row)
        db.flush()
        ev.ref_id = row.id
        return str(row.id), {"id": str(row.id)}
    if entity_type == "health_event":
        p = S.HealthEventCreate(**payload)
        ev = F.HealthEvent(pet_id=pet, recorded_at=p.recorded_at or _utcnow(), **p.model_dump())
        db.add(ev)
        db.flush()
        return str(ev.id), {"id": str(ev.id)}
    if entity_type == "vet_visit":
        p = S.VetVisitCreate(**payload)
        row = M.VetVisitSummary(dog_id=pet, **p.model_dump())
        db.add(row)
        db.flush()
        _mk_event(db, pet, "vet_visit", p.visit_date, title="Vet visit (synced)",
                  ref_table="vet_visit_summaries", ref_id=row.id)
        return str(row.id), {"id": str(row.id)}
    if entity_type == "reminder":
        p = S.ReminderCreate(**payload)
        row = F.ReminderV1(pet_id=pet, owner_id=user.id, reminder_type=p.reminder_type,
                           title=p.title, due_at=p.due_at, recurrence=p.recurrence, status="SCHEDULED")
        db.add(row)
        db.flush()
        return str(row.id), {"id": str(row.id)}
    if entity_type == "vaccine":
        name = (payload.get("name") or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Vaccine name must not be blank.")
        row = M.VaccineRecord(dog_id=pet, name=name,
                              clinic_name=payload.get("clinic_name"),
                              batch_number=payload.get("batch_number"),
                              notes=payload.get("notes"))
        for f in ("date_given", "next_due_date"):
            if payload.get(f):
                try:
                    setattr(row, f, datetime.fromisoformat(str(payload[f]).replace("Z", "+00:00")))
                except ValueError:
                    raise HTTPException(status_code=422, detail=f"Invalid {f}.")
        db.add(row)
        db.flush()
        _mk_event(db, pet, "vaccination", row.date_given or _utcnow(),
                  title=f"Vaccination: {name} (synced)",
                  ref_table="vaccine_records", ref_id=row.id)
        return str(row.id), {"id": str(row.id)}
    if entity_type == "deworming":
        row = M.DewormingRecord(dog_id=pet, product_name=payload.get("product_name"),
                                weight_at_treatment=payload.get("weight_at_treatment"),
                                notes=payload.get("notes"))
        for f in ("date_given", "next_due_date"):
            if payload.get(f):
                try:
                    setattr(row, f, datetime.fromisoformat(str(payload[f]).replace("Z", "+00:00")))
                except ValueError:
                    raise HTTPException(status_code=422, detail=f"Invalid {f}.")
        db.add(row)
        db.flush()
        _mk_event(db, pet, "deworming", row.date_given or _utcnow(),
                  title="Deworming (synced)",
                  ref_table="deworming_records", ref_id=row.id)
        return str(row.id), {"id": str(row.id)}
    raise HTTPException(status_code=422, detail=f"Unsupported entity_type: {entity_type}")


@router.post("/pets/{pet_id}/sync/operations", response_model=S.SyncOpOut, status_code=201)
def sync_operation(pet_id: UUID, payload: S.SyncOpIn,
                   clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Operation-level sync with idempotency.

    Same (user, client_operation_id) retried -> original ACK returned,
    no duplicate record. This is the server acknowledgement the client
    must wait for before showing 'saved'.
    """
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    if payload.entity_type not in _SYNC_HANDLERS:
        raise HTTPException(status_code=422, detail=f"Unsupported entity_type: {payload.entity_type}")

    # Idempotency check first — duplicate retry returns original ack.
    existing = db.query(F.SyncOperation).filter(
        F.SyncOperation.user_id == user.id,
        F.SyncOperation.client_operation_id == payload.client_operation_id).first()
    if existing:
        return S.SyncOpOut(client_operation_id=existing.client_operation_id,
                           status=existing.status, entity_id=existing.entity_id,
                           result=existing.result or {})

    payload_hash = payload.payload_hash or hashlib.sha256(
        json.dumps(payload.payload, sort_keys=True, default=str).encode()).hexdigest()
    try:
        entity_id, result = _apply_sync_op(db, user, dog.id, payload.entity_type, payload.payload)
        op = F.SyncOperation(user_id=user.id, client_operation_id=payload.client_operation_id,
                             entity_type=payload.entity_type, entity_id=entity_id,
                             status="ACKED", payload_hash=payload_hash, result=result)
        db.add(op)
        db.commit()
        _audit(db, "sync.acked", user, dog.id, entity_id, payload.entity_type)
        db.commit()
        return S.SyncOpOut(client_operation_id=payload.client_operation_id, status="ACKED",
                           entity_id=entity_id, result=result)
    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        # Race: another request won — return the winner's ack.
        winner = db.query(F.SyncOperation).filter(
            F.SyncOperation.user_id == user.id,
            F.SyncOperation.client_operation_id == payload.client_operation_id).first()
        if winner:
            return S.SyncOpOut(client_operation_id=winner.client_operation_id,
                               status=winner.status, entity_id=winner.entity_id,
                               result=winner.result or {})
        _conflict("sync_conflict"); raise HTTPException(status_code=409, detail="Sync conflict. Retry with a new operation id.")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=422, detail="Sync payload failed validation.")


@router.get("/pets/{pet_id}/sync/operations/{client_operation_id}", response_model=S.SyncOpOut)
def get_sync_operation(pet_id: UUID, client_operation_id: str,
                       clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    op = db.query(F.SyncOperation).filter(
        F.SyncOperation.user_id == user.id,
        F.SyncOperation.client_operation_id == client_operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found.")
    return S.SyncOpOut(client_operation_id=op.client_operation_id, status=op.status,
                       entity_id=op.entity_id, result=op.result or {})


# ══════════════ CARE TEAM (minimal BIN1 structure for future vet collab) ══════════════

@router.post("/care-team/vets/{pet_id}", status_code=201)
def add_vet(pet_id: UUID, name: Optional[str] = None, phone: Optional[str] = None,
            email: Optional[str] = None,
            clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = F.Veterinarian(user_id=user.id, name=name, phone=phone, email=email)
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, "vet.added", user, dog.id, row.id, "veterinarian")
    db.commit()
    return {"id": str(row.id), "name": row.name}


@router.post("/care-team/clinics/{pet_id}", status_code=201)
def add_clinic(pet_id: UUID, name: Optional[str] = None, address: Optional[str] = None,
               phone: Optional[str] = None,
               clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = F.Clinic(user_id=user.id, name=name, address=address, phone=phone)
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, "clinic.added", user, dog.id, row.id, "clinic")
    db.commit()
    return {"id": str(row.id), "name": row.name}


# ══════════════ AI ANALYSIS PROVENANCE (record-only in BIN1) ══════════════

@router.post("/pets/{pet_id}/ai-analyses", status_code=201)
def record_ai_analysis(pet_id: UUID, analysis_type: str, output_summary: Optional[str] = None,
                       model_id: Optional[str] = None,
                       clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Provenance ledger for analyses. BIN1 performs no predictive inference here."""
    from app.models.foundation_models import AIAnalysisRecord
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    row = AIAnalysisRecord(pet_id=dog.id, analysis_type=analysis_type[:80],
                           output_summary=(output_summary or "")[:2000],
                           model_id=(model_id or "rule:bin1-foundation-v1")[:120],
                           input_ref={"pet_id": str(dog.id)}, verification_status="unverified")
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, "ai_analysis.recorded", user, dog.id, row.id, "ai_analysis")
    db.commit()
    return {"id": str(row.id), "analysis_type": row.analysis_type}


@router.get("/sync/health")
def sync_health():
    return {"status": "ok", "idempotency": "client_operation_id", "conflict": "409-with-server-state"}
