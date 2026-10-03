"""
BIN3 Veterinary Continuity & Collaboration models.

Extends (never replaces) all_models.py / foundation_models.py / paw_ai_models.py.
Ownership rule: every row resolves via user -> pet -> resource. Veterinary
access NEVER flows from an ID alone — it requires an ACTIVE, unexpired,
non-revoked ShareGrant (or an ACTIVE CareTeamMember link resolved through one).

Design notes:
- CareTeamMember links a pet to a care provider. `vet_user_id` is set ONLY
  when the provider holds a real PAWPHILE account that the owner explicitly
  linked (no fake clinicians). `verification_state` defaults to UNVERIFIED and
  is only ever raised by a genuine verification the product can support — the
  UI labels it honestly ("Unverified profile").
- VetHealthPackage rows become IMMUTABLE once SHARED: the service layer never
  UPDATEs a SHARED row. New information means a new row (parent_package_id +
  version + 1). What the veterinarian saw can always be reconstructed.
- VetNote / FollowUp / VetQuestion are consultation-scoped and pet-scoped.
- Notification gains nullable dedupe_key/subject/body so collaboration events
  (share viewed, feedback received, follow-up due) flow through the existing
  BIN1 worker with exactly-once creation AND delivery. No new worker infra.
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.db.database import Base


def _uuid():
    return uuid.uuid4()


# ── Allowed value sets (mirrored in schemas for request validation) ──

CARE_ROLES = {"PRIMARY_VET", "SPECIALIST", "EMERGENCY_CLINIC", "SECONDARY_VET",
              "OTHER_CARE_PROVIDER"}
CARE_STATUS = {"ACTIVE", "ENDED"}
VERIFICATION_STATES = {"UNVERIFIED", "PENDING_VERIFICATION", "VERIFIED",
                       "SUSPENDED", "REVOKED"}
SHARE_PURPOSES = {"VET_CONSULTATION", "FOLLOW_UP", "SECOND_OPINION",
                  "EMERGENCY_REVIEW", "ROUTINE_REVIEW"}
PACKAGE_TYPES = {"QUICK_SUMMARY", "FULL_REVIEW", "SELECTED_RECORDS",
                 "EMERGENCY_PACKET"}
PACKAGE_STATUS = {"DRAFT", "APPROVED", "SHARED", "SUPERSEDED"}
CONSULTATION_STATUS = {"REQUESTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED",
                       "CANCELLED"}
QUESTION_STATUS = {"OPEN", "ANSWERED", "RESOLVED", "DISMISSED"}
FOLLOWUP_STATUS = {"OPEN", "ACKNOWLEDGED", "COMPLETED", "DISMISSED", "EXPIRED"}
NOTE_VISIBILITY = {"OWNER_VISIBLE"}  # clinical-only records are NOT supported;
# keeping every veterinary note owner-visible is the honest privacy model.


class CareTeamMember(Base):
    """Owner-controlled pet <-> provider relationship (pet-specific)."""
    __tablename__ = "care_team_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    display_name = Column(String(200), nullable=False)  # e.g. "Dr. X" — a label, not a credential
    clinic_name = Column(String(200), nullable=True)
    role = Column(String(40), default="OTHER_CARE_PROVIDER", index=True)
    status = Column(String(20), default="ACTIVE", index=True)  # ACTIVE|ENDED
    # Set ONLY when the provider's real PAWPHILE account was explicitly linked.
    vet_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)
    # Honest verification state. No credential check exists in-product, so rows
    # are created UNVERIFIED and the UI must label them as such.
    verification_state = Column(String(30), default="UNVERIFIED", index=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VetHealthPackage(Base):
    """Immutable-after-sharing veterinary health package (versioned snapshot)."""
    __tablename__ = "vet_health_packages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=True)
    package_type = Column(String(40), default="QUICK_SUMMARY", index=True)
    status = Column(String(20), default="DRAFT", index=True)  # DRAFT|APPROVED|SHARED|SUPERSEDED
    version = Column(Integer, default=1)
    parent_package_id = Column(UUID(as_uuid=True), ForeignKey("vet_health_packages.id"), nullable=True)
    # Frozen snapshot: sections with per-section provenance
    # {entity, id, date, actor, verification}. Canonical JSON, digest below.
    snapshot = Column(JSON, default=dict)
    snapshot_digest = Column(String(64), nullable=True)
    selected_types = Column(JSON, default=list)  # event_types when SELECTED_RECORDS
    generated_by = Column(String(120), default="PAWPHILE:bin3-package-v1")
    reviewed_by_owner = Column(Boolean, default=False)
    reviewed_at = Column(DateTime, nullable=True)
    shared_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Consultation(Base):
    """Record of a collaboration loop (not an appointment marketplace)."""
    __tablename__ = "consultations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    care_member_id = Column(UUID(as_uuid=True), ForeignKey("care_team_members.id"), nullable=True)
    share_id = Column(UUID(as_uuid=True), ForeignKey("share_grants.id"), nullable=True)
    package_id = Column(UUID(as_uuid=True), ForeignKey("vet_health_packages.id"), nullable=True)
    vet_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    purpose = Column(String(40), default="VET_CONSULTATION", index=True)
    status = Column(String(20), default="REQUESTED", index=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VetQuestion(Base):
    """Owner question for the veterinarian — timestamped, scoped, answerable."""
    __tablename__ = "vet_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), index=True, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    question_text = Column(Text, nullable=False)
    status = Column(String(20), default="OPEN", index=True)  # OPEN|ANSWERED|RESOLVED|DISMISSED
    answer_text = Column(Text, nullable=True)
    answered_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    answered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class VetNote(Base):
    """Veterinary feedback as a separate canonical source (never overwrites
    owner history). Always OWNER_VISIBLE — no hidden clinical records."""
    __tablename__ = "vet_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), index=True, nullable=False)
    author_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    author_label = Column(String(200), nullable=True)
    note_text = Column(Text, nullable=False)  # called a "note", never an "assessment"
    follow_up_text = Column(Text, nullable=True)
    effective_at = Column(DateTime, nullable=False)  # actual consultation time
    visibility = Column(String(20), default="OWNER_VISIBLE", index=True)
    source = Column(String(40), default="vet")
    verification_status = Column(String(20), default="vet_verified")
    health_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FollowUp(Base):
    """Veterinary follow-up recommendation with owner acknowledgement loop."""
    __tablename__ = "follow_ups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), index=True, nullable=False)
    originating_vet_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    recommendation = Column(Text, nullable=False)  # recorded as the vet's words, not PAWPHILE's
    due_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="OPEN", index=True)
    owner_ack_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    resulting_event_id = Column(UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True)
    reminder_id = Column(UUID(as_uuid=True), ForeignKey("reminder_v1.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
