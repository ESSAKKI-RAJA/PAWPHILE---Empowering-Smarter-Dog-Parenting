"""BIN4 ecosystem schemas — organizations, professionals, relationships,
connections, imports, labs/devices, partners, webhooks, entitlements."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from uuid import UUID
from datetime import datetime

from app.models.ecosystem_models import (
    ORG_TYPES, ORG_ROLES, MEMBER_STATUS, PROF_STATES, REL_STATUS,
    CONN_TYPES, CONN_STATUS, PARTNER_SCOPES,
)

ALLOWED_REL_SCOPE = {"FULL_RECORD", "REPORT_ONLY", "SELECTED"}
ALLOWED_PURPOSE = {"VET_CONSULTATION", "FOLLOW_UP", "SECOND_OPINION",
                   "EMERGENCY_REVIEW", "ROUTINE_REVIEW"}
ALLOWED_DEVICE_METRICS = {"activity", "sleep", "heart_rate", "movement",
                          "weight", "temperature"}


def _blank(v: Optional[str], field: str) -> Optional[str]:
    if v is not None and not v.strip():
        raise ValueError(f"{field} must not be blank")
    return v


# ── Organizations ──

class OrgCreate(BaseModel):
    name: str
    org_type: str = "CLINIC"
    contact: Optional[str] = None
    location: Optional[str] = None

    @field_validator("name")
    @classmethod
    def _n(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()

    @field_validator("org_type")
    @classmethod
    def _t(cls, v: str) -> str:
        if v not in ORG_TYPES:
            raise ValueError(f"org_type must be one of {sorted(ORG_TYPES)}")
        return v


class OrgOut(BaseModel):
    id: UUID
    name: str
    org_type: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MemberAdd(BaseModel):
    user_email: str
    role: str = "STAFF"

    @field_validator("role")
    @classmethod
    def _r(cls, v: str) -> str:
        if v not in ORG_ROLES:
            raise ValueError(f"role must be one of {sorted(ORG_ROLES)}")
        return v


class MemberUpdate(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None

    @field_validator("role")
    @classmethod
    def _r(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ORG_ROLES:
            raise ValueError(f"role must be one of {sorted(ORG_ROLES)}")
        return v

    @field_validator("status")
    @classmethod
    def _s(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in MEMBER_STATUS:
            raise ValueError(f"status must be one of {sorted(MEMBER_STATUS)}")
        return v


# ── Professionals ──

class ProfessionalCreate(BaseModel):
    display_name: str
    org_id: Optional[UUID] = None
    professional_role: Optional[str] = None
    professional_type: Optional[str] = None
    jurisdiction: Optional[str] = None
    location: Optional[str] = None

    @field_validator("display_name")
    @classmethod
    def _n(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("display_name must not be blank")
        return v.strip()


class VerificationRequest(BaseModel):
    license_no: str
    jurisdiction: str
    evidence_ref: str

    @field_validator("license_no", "jurisdiction", "evidence_ref")
    @classmethod
    def _nb(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("verification evidence fields must not be blank")
        return v.strip()


class VerificationReview(BaseModel):
    approve: bool
    notes: Optional[str] = None


# ── Relationships ──

class RelationshipCreate(BaseModel):
    professional_id: Optional[UUID] = None
    org_id: Optional[UUID] = None
    purpose: str = "VET_CONSULTATION"
    scope: str = "REPORT_ONLY"
    expires_at: Optional[datetime] = None

    @field_validator("purpose")
    @classmethod
    def _p(cls, v: str) -> str:
        if v not in ALLOWED_PURPOSE:
            raise ValueError(f"purpose must be one of {sorted(ALLOWED_PURPOSE)}")
        return v

    @field_validator("scope")
    @classmethod
    def _s(cls, v: str) -> str:
        if v not in ALLOWED_REL_SCOPE:
            raise ValueError("invalid scope")
        return v


class RelationshipUpdate(BaseModel):
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def _s(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in REL_STATUS:
            raise ValueError(f"status must be one of {sorted(REL_STATUS)}")
        return v


# ── Connections / imports ──

class ConnectionCreate(BaseModel):
    provider_type: str
    provider_name: str
    pet_id: Optional[UUID] = None
    scopes: list[str] = Field(default_factory=list)

    @field_validator("provider_type")
    @classmethod
    def _t(cls, v: str) -> str:
        if v not in CONN_TYPES:
            raise ValueError(f"provider_type must be one of {sorted(CONN_TYPES)}")
        return v

    @field_validator("provider_name")
    @classmethod
    def _n(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("provider_name must not be blank")
        return v.strip()


class ImportIn(BaseModel):
    kind: str  # lab|imaging|device|note
    records: list[dict] = Field(default_factory=list, max_length=50)

    @field_validator("kind")
    @classmethod
    def _k(cls, v: str) -> str:
        if v not in {"lab", "imaging", "device", "note"}:
            raise ValueError("kind must be lab|imaging|device|note")
        return v


class DeviceReadingIn(BaseModel):
    metric_type: str
    value: Optional[float] = None
    unit: Optional[str] = None
    measured_at: datetime

    @field_validator("metric_type")
    @classmethod
    def _m(cls, v: str) -> str:
        if v not in ALLOWED_DEVICE_METRICS:
            raise ValueError(f"metric_type must be one of {sorted(ALLOWED_DEVICE_METRICS)}")
        return v


# ── Partners / webhooks / entitlements ──

class PartnerClientCreate(BaseModel):
    name: str
    org_id: Optional[UUID] = None
    scopes: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def _n(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()

    @field_validator("scopes")
    @classmethod
    def _s(cls, v: list[str]) -> list[str]:
        bad = [s for s in v if s not in PARTNER_SCOPES]
        if bad:
            raise ValueError(f"unknown scopes: {bad}")
        if not v:
            raise ValueError("at least one scope is required")
        return v


class WebhookSubCreate(BaseModel):
    events: list[str] = Field(default_factory=list, max_length=20)
    url: str
    client_id: Optional[UUID] = None

    @field_validator("url")
    @classmethod
    def _u(cls, v: str) -> str:
        if not (v.startswith("https://") or v.startswith("http://localhost")):
            raise ValueError("url must be https (localhost allowed for testing)")
        return v.strip()


class PlanCreate(BaseModel):
    name: str
    features: list[str] = Field(default_factory=list)


class EntitlementGrant(BaseModel):
    user_email: Optional[str] = None
    org_id: Optional[UUID] = None
    plan_id: Optional[UUID] = None
    features: list[str] = Field(default_factory=list)


def org_out(row) -> dict:
    return {"id": str(row.id), "name": row.name, "org_type": row.org_type,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None}


def prof_out(row) -> dict:
    state_labels = {
        "UNVERIFIED": "Unverified — no verification performed",
        "PENDING": "Verification requested — under review",
        "VERIFIED": "Verified (organization-attested — license evidence on file, not an independent credential check)",
        "SUSPENDED": "Suspended — access disabled",
        "EXPIRED": "Verification expired — re-review required",
        "REVOKED": "Revoked — access disabled",
    }
    return {"id": str(row.id),
            "user_id": str(row.user_id) if row.user_id else None,
            "org_id": str(row.org_id) if row.org_id else None,
            "display_name": row.display_name,
            "professional_role": row.professional_role,
            "verification_state": row.verification_state,
            "verification_label": state_labels.get(row.verification_state, row.verification_state),
            "verification_source": row.verification_source,
            "verification_expires_at": row.verification_expires_at.isoformat()
            if row.verification_expires_at else None,
            "is_active": row.is_active,
            "created_at": row.created_at.isoformat() if row.created_at else None}


def rel_out(row) -> dict:
    return {"id": str(row.id), "pet_id": str(row.pet_id),
            "professional_id": str(row.professional_id) if row.professional_id else None,
            "org_id": str(row.org_id) if row.org_id else None,
            "purpose": row.purpose, "scope": row.scope, "status": row.status,
            "expires_at": row.expires_at.isoformat() if row.expires_at else None,
            "created_at": row.created_at.isoformat() if row.created_at else None}


def conn_out(row, consent_status: Optional[str] = None) -> dict:
    return {"id": str(row.id),
            "pet_id": str(row.pet_id) if row.pet_id else None,
            "provider_type": row.provider_type, "provider_name": row.provider_name,
            "status": row.status, "scopes": row.scopes or [],
            "consent_purpose": row.consent_purpose,
            "consent_status": consent_status,
            "last_sync_at": row.last_sync_at.isoformat() if row.last_sync_at else None,
            "created_at": row.created_at.isoformat() if row.created_at else None}
