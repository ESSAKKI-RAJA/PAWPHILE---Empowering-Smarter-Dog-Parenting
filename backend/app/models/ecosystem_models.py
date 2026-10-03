"""
BIN4 Ecosystem & Platform models.

Layers (never collapsed into one table):
  User Identity (users, BIN1) -> Organization Identity -> Membership/Role ->
  Veterinary Professional Identity -> PetCareRelationship -> ShareGrant (BIN1/3).

Rules honored here:
- Organization membership NEVER implies pet access. Pet access still requires
  an ACTIVE relationship/grant with scope/expiry, resolved server-side.
- Verification is NEVER self-asserted: VERIFIED requires org-admin review +
  recorded evidence. States UNVERIFIED/PENDING/VERIFIED/SUSPENDED/EXPIRED/REVOKED.
- External data enters ONLY through the ingestion pipeline (external_imports)
  with provenance; nothing external mutates canonical rows directly.
- Partner/webhook layers carry IDs and statuses, never health payloads.
- Entitlements gate FEATURES, never health-data access.
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer, Float, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.db.database import Base


def _uuid():
    return uuid.uuid4()


ORG_TYPES = {"CLINIC", "PARTNER", "LAB", "IMAGING", "DEVICE", "OTHER"}
ORG_STATUS = {"ACTIVE", "SUSPENDED", "REVOKED"}
ORG_ROLES = {"OWNER", "ADMIN", "VETERINARIAN", "TECHNICIAN", "CARE_COORDINATOR",
             "STAFF", "VIEWER"}
MEMBER_STATUS = {"ACTIVE", "SUSPENDED", "REVOKED"}
PROF_STATES = {"UNVERIFIED", "PENDING", "VERIFIED", "SUSPENDED", "EXPIRED", "REVOKED"}
REL_STATUS = {"REQUESTED", "ACTIVE", "PAUSED", "ENDED", "REVOKED"}
CONN_TYPES = {"LAB", "IMAGING", "DEVICE", "PIMS", "PARTNER"}
CONN_STATUS = {"CONNECTED", "REVOKED", "EXPIRED"}
IMPORT_STATUS = {"RAW", "VALIDATED", "NORMALIZED", "IMPORTED", "REJECTED"}
CLIENT_STATUS = {"ACTIVE", "SUSPENDED", "REVOKED"}
SUB_STATUS = {"ACTIVE", "SUSPENDED", "REVOKED"}
DELIVERY_STATUS = {"QUEUED", "SENT", "FAILED"}
PARTNER_SCOPES = {"pet.read", "timeline.read", "reports.read", "package.read",
                  "followup.read"}


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    name = Column(String(200), nullable=False)
    org_type = Column(String(20), default="CLINIC", index=True)
    contact = Column(String(200), nullable=True)
    location = Column(String(300), nullable=True)
    status = Column(String(20), default="ACTIVE", index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OrgMembership(Base):
    __tablename__ = "org_memberships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), index=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String(30), default="STAFF", index=True)
    status = Column(String(20), default="ACTIVE", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VetProfessional(Base):
    """Professional identity: a CLAIM about a person, verified only by review."""
    __tablename__ = "vet_professionals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    display_name = Column(String(200), nullable=False)
    professional_role = Column(String(80), nullable=True)  # veterinarian|technician|...
    professional_type = Column(String(80), nullable=True)  # small_animal|surgery|...
    jurisdiction = Column(String(120), nullable=True)
    location = Column(String(300), nullable=True)
    verification_state = Column(String(20), default="UNVERIFIED", index=True)
    verification_source = Column(String(80), nullable=True)  # org_attestation|...
    verification_evidence_ref = Column(String(300), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_expires_at = Column(DateTime, nullable=True)
    reviewed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    professional_metadata = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PetCareRelationship(Base):
    """Owner-controlled link: pet <-> professional/org with purpose/scope/expiry."""
    __tablename__ = "pet_care_relationships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    professional_id = Column(UUID(as_uuid=True), ForeignKey("vet_professionals.id"), nullable=True, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    care_member_id = Column(UUID(as_uuid=True), nullable=True)  # BIN3 link (optional)
    purpose = Column(String(40), default="VET_CONSULTATION", index=True)
    scope = Column(String(40), default="REPORT_ONLY", index=True)
    status = Column(String(20), default="REQUESTED", index=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExternalConnection(Base):
    """Consent-aware connection to an external source (no silent sharing)."""
    __tablename__ = "external_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=True)
    provider_type = Column(String(20), index=True, nullable=False)
    provider_name = Column(String(200), nullable=False)
    status = Column(String(20), default="CONNECTED", index=True)
    scopes = Column(JSON, default=list)  # data categories, explicit
    consent_purpose = Column(String(120), nullable=True)
    last_sync_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExternalImport(Base):
    """One ingested external record with full pipeline provenance."""
    __tablename__ = "external_imports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("external_connections.id"), index=True, nullable=False)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    external_id = Column(String(200), nullable=True, index=True)
    kind = Column(String(40), index=True, nullable=False)  # lab|imaging|device|note
    status = Column(String(20), default="RAW", index=True)
    raw = Column(JSON, default=dict)  # original representation (bounded)
    normalized = Column(JSON, default=dict)
    result_event_id = Column(UUID(as_uuid=True), nullable=True)  # canonical HealthEvent
    source_label = Column(String(40), default="IMPORTED")
    verification_status = Column(String(20), default="imported")
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LabPanel(Base):
    __tablename__ = "lab_panels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    panel_name = Column(String(200), nullable=False)
    ordered_at = Column(DateTime, nullable=True)
    source = Column(String(40), default="owner")  # owner|vet|lab(imported)
    source_ref = Column(String(200), nullable=True)  # external panel id
    status = Column(String(20), default="RECORDED", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DeviceReading(Base):
    """Generic device metric (kept OUT of BIN2 baselines by design)."""
    __tablename__ = "device_readings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    pet_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=False)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("external_connections.id"), nullable=True, index=True)
    metric_type = Column(String(60), index=True, nullable=False)
    value = Column(Float, nullable=True)
    unit = Column(String(40), nullable=True)
    measured_at = Column(DateTime, index=True, nullable=False)
    device_meta = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class PartnerApiClient(Base):
    __tablename__ = "partner_api_clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    scopes = Column(JSON, default=list)
    status = Column(String(20), default="ACTIVE", index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ApiCredential(Base):
    """Hashed bearer credential. The raw secret is shown ONCE at issuance."""
    __tablename__ = "api_credentials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("partner_api_clients.id"), index=True, nullable=False)
    key_hash = Column(String(64), nullable=False, index=True)
    key_prefix = Column(String(16), nullable=True)
    status = Column(String(20), default="ACTIVE", index=True)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("partner_api_clients.id"), nullable=True, index=True)
    events = Column(JSON, default=list)  # explicit subscription, e.g. SHARE_CREATED
    url = Column(String(600), nullable=False)
    secret = Column(String(120), nullable=False)  # HMAC key (server-side only)
    status = Column(String(20), default="ACTIVE", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("webhook_subscriptions.id"), index=True, nullable=False)
    event_type = Column(String(60), index=True, nullable=False)
    idempotency_key = Column(String(120), nullable=True, index=True)
    payload = Column(JSON, default=dict)  # IDs + statuses only, never health data
    status = Column(String(20), default="QUEUED", index=True)
    attempts = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Plan(Base):
    __tablename__ = "plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    name = Column(String(120), nullable=False)
    features = Column(JSON, default=list)  # feature keys this plan enables
    created_at = Column(DateTime, default=datetime.utcnow)


class Entitlement(Base):
    """Feature access for a user/org. NEVER confers health-data access."""
    __tablename__ = "entitlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=True)
    features = Column(JSON, default=list)
    status = Column(String(20), default="ACTIVE", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
