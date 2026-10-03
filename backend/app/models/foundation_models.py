"""
BIN1 Foundation models — canonical longitudinal health record.

Extends (never replaces) all_models.py / paw_ai_models.py.
All tables enforce user -> pet -> resource ownership via dog_id -> dog_profiles -> users.

Design notes:
- HealthEvent is the canonical envelope: every clinically meaningful fact
  preserves effective_at (when it happened) vs recorded_at (when entered).
- Provenance: source / actor / verification_status on every event.
- Corrections: corrects_event_id + supersedes semantics; history is never
  silently rewritten. Hard deletes are reserved for owner-erased non-clinical
  data; clinical rows prefer archive (is_archived) or correction chains.
- Sync: SyncOperation gives operation-level idempotency (client_operation_id
  unique per user). Retried uploads return the original acknowledgement.
- Conflict: optimistic concurrency via version on mutable rows (medications,
  reminders). Mismatched version -> 409 with server state.
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer, Float, Text, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.db.database import Base


def _uuid():
    return uuid.uuid4()


# ── Canonical envelope ──────────────────────────────────────────────

class HealthEvent(Base):
    """Canonical health-event envelope aggregating timeline sources."""
    __tablename__ = "health_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    event_type = Column(String(60), index=True, nullable=False)
    # e.g. vet_visit | symptom | medication | vaccination | deworming | procedure
    #      | weight | activity | nutrition | behavior | lab_result | imaging
    #      | observation | condition | file | report | reminder | note
    source = Column(String(40), default="owner", index=True)  # owner|vet|clinic|import|system|device|ai|other
    actor = Column(String(120), nullable=True)  # free-text actor label, never PII-heavy
    effective_at = Column(DateTime, index=True, nullable=False)  # when it happened
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)  # when entered
    verification_status = Column(String(20), default="unverified", index=True)  # unverified|owner_reported|vet_verified|imported|system
    title = Column(String(300), nullable=True)
    summary = Column(Text, nullable=True)
    event_metadata = Column(JSON, default=dict)
    ref_table = Column(String(80), nullable=True)  # provenance pointer, e.g. "vet_visit_summaries"
    ref_id = Column(UUID(as_uuid=True), nullable=True)
    corrects_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Clinical detail tables ───────────────────────────────────────────

class Symptom(Base):
    __tablename__ = "symptoms"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    name = Column(String(200), nullable=False, index=True)
    severity = Column(String(20), default="mild")  # mild|moderate|severe
    onset_at = Column(DateTime, nullable=True)
    duration_hours = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(40), default="owner")
    verification_status = Column(String(20), default="owner_reported")
    is_archived = Column(Boolean, default=False, index=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Medication(Base):
    __tablename__ = "medications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    name = Column(String(200), nullable=False, index=True)
    dose = Column(String(120), nullable=True)
    dose_unit = Column(String(40), nullable=True)
    frequency = Column(String(120), nullable=True)
    route = Column(String(60), nullable=True)  # oral|topical|injectable|other
    start_at = Column(DateTime, nullable=True)
    end_at = Column(DateTime, nullable=True)
    prescribed_by = Column(String(200), nullable=True)
    status = Column(String(20), default="active", index=True)  # active|completed|stopped|archived
    notes = Column(Text, nullable=True)
    source = Column(String(40), default="owner")
    verification_status = Column(String(20), default="owner_reported")
    is_archived = Column(Boolean, default=False, index=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Allergy(Base):
    __tablename__ = "allergies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    allergen = Column(String(200), nullable=False, index=True)
    reaction = Column(Text, nullable=True)
    severity = Column(String(20), default="unknown")  # unknown|mild|moderate|severe
    source = Column(String(40), default="owner")
    verification_status = Column(String(20), default="owner_reported")
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Procedure(Base):
    __tablename__ = "procedures"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    name = Column(String(200), nullable=False, index=True)
    performed_at = Column(DateTime, nullable=True)
    clinic_name = Column(String(200), nullable=True)
    vet_name = Column(String(200), nullable=True)
    outcome = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(40), default="owner")
    verification_status = Column(String(20), default="owner_reported")
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LabResult(Base):
    __tablename__ = "lab_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    test_name = Column(String(200), nullable=False, index=True)
    result_value = Column(String(200), nullable=True)
    result_unit = Column(String(60), nullable=True)
    reference_range = Column(String(200), nullable=True)
    collected_at = Column(DateTime, nullable=True)
    lab_name = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(40), default="owner")
    verification_status = Column(String(20), default="owner_reported")
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ImagingStudy(Base):
    __tablename__ = "imaging_studies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    modality = Column(String(60), nullable=False, index=True)  # xray|ultrasound|ct|mri|other
    body_area = Column(String(120), nullable=True)
    performed_at = Column(DateTime, nullable=True)
    clinic_name = Column(String(200), nullable=True)
    findings = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(40), default="owner")
    verification_status = Column(String(20), default="owner_reported")
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Observation(Base):
    """Free-form structured health observation (owner note with provenance)."""
    __tablename__ = "observations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    category = Column(String(60), default="general", index=True)
    observed_at = Column(DateTime, nullable=True)
    note = Column(Text, nullable=False)
    source = Column(String(40), default="owner")
    verification_status = Column(String(20), default="owner_reported")
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Tracking / measurements ─────────────────────────────────────────

class WeightMeasurement(Base):
    __tablename__ = "weight_measurements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    value = Column(Float, nullable=False)
    unit = Column(String(20), default="kg")  # kg|g|lb
    measured_at = Column(DateTime, index=True, nullable=False)
    source = Column(String(40), default="owner")  # owner|vet|device|import
    context = Column(String(300), nullable=True)
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ActivityRecord(Base):
    __tablename__ = "activity_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    activity_type = Column(String(80), nullable=False, index=True)  # walk|run|play|rest|other
    duration_mins = Column(Integer, nullable=True)
    distance_km = Column(Float, nullable=True)
    occurred_at = Column(DateTime, index=True, nullable=False)
    source = Column(String(40), default="owner")
    notes = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NutritionEntry(Base):
    """Canonical nutrition entry (server-authoritative; v2 logs remain readable)."""
    __tablename__ = "nutrition_entries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    food_name = Column(String(200), nullable=False)
    amount_g = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    fed_at = Column(DateTime, index=True, nullable=False)
    source = Column(String(40), default="owner")
    notes = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BehaviorEntry(Base):
    """Canonical behavior entry (server-authoritative)."""
    __tablename__ = "behavior_entries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    behavior_type = Column(String(80), nullable=False, index=True)
    intensity = Column(String(20), nullable=True)
    duration_mins = Column(Integer, nullable=True)
    observed_at = Column(DateTime, index=True, nullable=False)
    source = Column(String(40), default="owner")
    notes = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Care team ───────────────────────────────────────────────────────

class Veterinarian(Base):
    __tablename__ = "veterinarians"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String(200), nullable=True)
    phone = Column(String(60), nullable=True)
    email = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Clinic(Base):
    __tablename__ = "clinics"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String(200), nullable=True)
    address = Column(String(400), nullable=True)
    phone = Column(String(60), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Files (private metadata; bytes live in Cloudinary/Supabase/local) ──

class HealthFile(Base):
    __tablename__ = "health_files"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    file_name = Column(String(300), nullable=False)
    mime_type = Column(String(120), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    storage_backend = Column(String(40), default="local")  # local|cloudinary|supabase
    storage_ref = Column(String(600), nullable=False)  # never a public URL by itself
    category = Column(String(60), default="general", index=True)  # photo|health_image|vet_document|report|other
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Reports / sharing / reminders / notifications ───────────────────

class ReportRecord(Base):
    """Server-authoritative report lifecycle: DRAFT->GENERATING->READY|FAILED."""
    __tablename__ = "report_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    report_type = Column(String(80), nullable=False, index=True)
    status = Column(String(20), default="DRAFT", index=True)  # DRAFT|GENERATING|READY|FAILED
    version = Column(Integer, default=1)
    storage_ref = Column(String(600), nullable=True)
    source_summary = Column(JSON, default=dict)  # {counts, generated_from, ...} for reproducibility
    error = Column(Text, nullable=True)
    generated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShareGrant(Base):
    __tablename__ = "share_grants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    recipient_label = Column(String(200), nullable=False)  # vet name / clinic, no open public links
    scope = Column(String(40), default="REPORT_ONLY", index=True)  # FULL_RECORD|REPORT_ONLY|SELECTED
    selected_types = Column(JSON, default=list)  # event_types included when scope=SELECTED
    status = Column(String(20), default="ACTIVE", index=True)  # ACTIVE|REVOKED|EXPIRED
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    access_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # BIN3 collaboration extensions (all nullable, backward-compatible).
    purpose = Column(String(40), nullable=True, index=True)  # VET_CONSULTATION|FOLLOW_UP|...
    grantee_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    consultation_id = Column(UUID(as_uuid=True), nullable=True)  # FK consultations.id (created later)
    package_id = Column(UUID(as_uuid=True), nullable=True)  # FK vet_health_packages.id


class ReminderV1(Base):
    """Server-authoritative reminder (supplements legacy reminders table)."""
    __tablename__ = "reminder_v1"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    reminder_type = Column(String(60), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    due_at = Column(DateTime, index=True, nullable=False)
    recurrence = Column(String(60), nullable=True)  # e.g. none|monthly|quarterly|yearly
    status = Column(String(20), default="SCHEDULED", index=True)  # SCHEDULED|COMPLETED|DISMISSED|CANCELLED
    completed_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    reminder_id = Column(UUID(as_uuid=True), ForeignKey("reminder_v1.id"), index=True, nullable=True)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    channel = Column(String(20), default="email")  # email|push
    status = Column(String(20), default="SCHEDULED", index=True)  # SCHEDULED|QUEUED|SENT|FAILED|SKIPPED
    attempt = Column(Integer, default=0)
    # Crash-safe worker claim token. NULL = unclaimed. Set atomically with a
    # status guard so duplicate scheduler invocations / restarts can't double-send.
    processing_lock = Column(String(80), nullable=True)
    failure_reason = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # BIN3 collaboration delivery (nullable, backward-compatible): exactly-once
    # creation key + truthful event subject/body (IDs/statuses, never payloads).
    dedupe_key = Column(String(120), nullable=True, index=True)
    subject = Column(String(200), nullable=True)
    body = Column(Text, nullable=True)


# ── Privacy / consent / sync / AI provenance ────────────────────────

class ConsentRecord(Base):
    __tablename__ = "consent_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    purpose = Column(String(120), nullable=False, index=True)  # care_reminders|ai_analysis|sharing|analytics
    status = Column(String(20), default="GRANTED", index=True)  # GRANTED|DENIED|WITHDRAWN
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SyncOperation(Base):
    """Idempotency ledger for offline operation sync."""
    __tablename__ = "sync_operations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    client_operation_id = Column(String(80), nullable=False, index=True)
    entity_type = Column(String(60), nullable=False)
    entity_id = Column(String(80), nullable=True)
    status = Column(String(20), default="ACKED", index=True)  # ACKED|REJECTED|CONFLICT
    payload_hash = Column(String(64), nullable=True)
    result = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("user_id", "client_operation_id", name="uq_syncop_user_clientop"),)


class AIAnalysisRecord(Base):
    """BIN1: provenance record for an analysis result. NOT a prediction engine.

    Stores what analysis ran, on which data version, and what it produced,
    so BIN2 analytics/ML/CV can build on trustworthy lineage.
    """
    __tablename__ = "ai_analysis_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    analysis_type = Column(String(80), nullable=False, index=True)  # e.g. triage_summary|data_quality|report_draft
    input_ref = Column(JSON, default=dict)  # {event_ids, data_version}
    output_summary = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    model_id = Column(String(120), nullable=True)  # rule id / model version; no hidden inference
    verification_status = Column(String(20), default="unverified")
    created_at = Column(DateTime, default=datetime.utcnow)
    # BIN2 intelligence lineage (all nullable/backward-compatible additions)
    status = Column(String(20), default="GENERATED", index=True)  # GENERATED|SUPERSEDED|FAILED|UNAVAILABLE
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    method = Column(String(120), nullable=True)
    rules_version = Column(String(40), nullable=True)
    evidence = Column(JSON, default=dict)  # {evidence_ids: [...]}
