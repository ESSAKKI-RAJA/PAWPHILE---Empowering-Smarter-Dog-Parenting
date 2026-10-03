"""BIN3 collaboration schemas — request validation for care team, packages,
consultations, questions, notes, follow-ups, and vet access."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from uuid import UUID
from datetime import datetime

from app.models.collaboration_models import (
    CARE_ROLES, VERIFICATION_STATES, SHARE_PURPOSES, PACKAGE_TYPES,
    CONSULTATION_STATUS, QUESTION_STATUS, FOLLOWUP_STATUS,
)

ALLOWED_CARE_STATUS = {"ACTIVE", "ENDED"}
ALLOWED_PACKAGE_STATUS = {"DRAFT", "APPROVED", "SHARED", "SUPERSEDED"}
ALLOWED_SHARE_SCOPE = {"FULL_RECORD", "REPORT_ONLY", "SELECTED"}


def _no_blank(v: Optional[str], field: str) -> Optional[str]:
    if v is not None and not v.strip():
        raise ValueError(f"{field} must not be blank")
    return v


# ── Care team ──

class CareMemberCreate(BaseModel):
    display_name: str
    clinic_name: Optional[str] = None
    role: str = "OTHER_CARE_PROVIDER"
    vet_email: Optional[str] = None  # link a REAL account; unknown email -> 422

    @field_validator("display_name")
    @classmethod
    def _name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("display_name must not be blank")
        return v.strip()

    @field_validator("role")
    @classmethod
    def _role(cls, v: str) -> str:
        if v not in CARE_ROLES:
            raise ValueError(f"role must be one of {sorted(CARE_ROLES)}")
        return v


class CareMemberUpdate(BaseModel):
    display_name: Optional[str] = None
    clinic_name: Optional[str] = None
    role: Optional[str] = None
    verification_state: Optional[str] = None

    @field_validator("role")
    @classmethod
    def _role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in CARE_ROLES:
            raise ValueError(f"role must be one of {sorted(CARE_ROLES)}")
        return v

    @field_validator("verification_state")
    @classmethod
    def _ver(cls, v: Optional[str]) -> Optional[str]:
        # Only truthful transitions the product can support. Credential checks
        # do not exist in-product, so VERIFIED cannot be self-asserted here —
        # the route rejects it (see collaboration.py).
        if v is not None and v not in VERIFICATION_STATES:
            raise ValueError(f"verification_state must be one of {sorted(VERIFICATION_STATES)}")
        return v


class CareMemberOut(BaseModel):
    id: UUID
    pet_id: UUID
    display_name: str
    clinic_name: Optional[str]
    role: str
    status: str
    vet_user_id: Optional[UUID]
    verification_state: str
    verification_label: str
    ended_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Packages ──

class PackageCreate(BaseModel):
    package_type: str = "QUICK_SUMMARY"
    selected_types: list[str] = Field(default_factory=list)
    consultation_id: Optional[UUID] = None

    @field_validator("package_type")
    @classmethod
    def _t(cls, v: str) -> str:
        if v not in PACKAGE_TYPES:
            raise ValueError(f"package_type must be one of {sorted(PACKAGE_TYPES)}")
        return v


class PackageOut(BaseModel):
    id: UUID
    pet_id: UUID
    package_type: str
    status: str
    version: int
    parent_package_id: Optional[UUID]
    snapshot_digest: Optional[str]
    generated_by: str
    reviewed_by_owner: bool
    shared_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class PackageShareIn(BaseModel):
    recipient_label: str
    purpose: str = "VET_CONSULTATION"
    scope: str = "REPORT_ONLY"
    selected_types: list[str] = Field(default_factory=list)
    expires_at: Optional[datetime] = None
    grantee_email: Optional[str] = None  # vet's PAWPHILE account; must exist
    consultation_id: Optional[UUID] = None

    @field_validator("recipient_label")
    @classmethod
    def _r(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("recipient_label must not be blank")
        return v.strip()

    @field_validator("purpose")
    @classmethod
    def _p(cls, v: str) -> str:
        if v not in SHARE_PURPOSES:
            raise ValueError(f"purpose must be one of {sorted(SHARE_PURPOSES)}")
        return v

    @field_validator("scope")
    @classmethod
    def _s(cls, v: str) -> str:
        if v not in ALLOWED_SHARE_SCOPE:
            raise ValueError("invalid scope")
        return v


# ── Consultations ──

class ConsultationCreate(BaseModel):
    purpose: str = "VET_CONSULTATION"
    care_member_id: Optional[UUID] = None

    @field_validator("purpose")
    @classmethod
    def _p(cls, v: str) -> str:
        if v not in SHARE_PURPOSES:
            raise ValueError(f"purpose must be one of {sorted(SHARE_PURPOSES)}")
        return v


class ConsultationOut(BaseModel):
    id: UUID
    pet_id: UUID
    purpose: str
    status: str
    care_member_id: Optional[UUID]
    share_id: Optional[UUID]
    package_id: Optional[UUID]
    vet_user_id: Optional[UUID]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Questions / notes / follow-ups ──

class QuestionCreate(BaseModel):
    question_text: str
    consultation_id: Optional[UUID] = None

    @field_validator("question_text")
    @classmethod
    def _q(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("question_text must not be blank")
        if len(v) > 2000:
            raise ValueError("question_text too long (max 2000 chars)")
        return v.strip()


class QuestionOut(BaseModel):
    id: UUID
    pet_id: UUID
    consultation_id: Optional[UUID]
    question_text: str
    status: str
    answer_text: Optional[str]
    answered_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class AnswerIn(BaseModel):
    answer_text: str

    @field_validator("answer_text")
    @classmethod
    def _a(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("answer_text must not be blank")
        if len(v) > 4000:
            raise ValueError("answer_text too long (max 4000 chars)")
        return v.strip()


class QuestionUpdate(BaseModel):
    status: Optional[str] = None  # RESOLVED|DISMISSED (owner)
    consultation_id: Optional[UUID] = None  # attach to a consultation

    @field_validator("status")
    @classmethod
    def _s(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"RESOLVED", "DISMISSED"}:
            raise ValueError("status must be RESOLVED|DISMISSED")
        return v


class VetNoteCreate(BaseModel):
    note_text: str = Field(min_length=1, max_length=4000)
    follow_up_text: Optional[str] = Field(default=None, max_length=2000)
    effective_at: Optional[datetime] = None

    @field_validator("note_text")
    @classmethod
    def _n(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("note_text must not be blank")
        return v.strip()


class VetNoteOut(BaseModel):
    id: UUID
    pet_id: UUID
    consultation_id: UUID
    author_label: Optional[str]
    note_text: str
    follow_up_text: Optional[str]
    effective_at: datetime
    visibility: str
    source: str
    verification_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FollowUpCreate(BaseModel):
    recommendation: str = Field(min_length=1, max_length=2000)
    due_at: Optional[datetime] = None

    @field_validator("recommendation")
    @classmethod
    def _r(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("recommendation must not be blank")
        return v.strip()


class FollowUpOut(BaseModel):
    id: UUID
    pet_id: UUID
    consultation_id: UUID
    recommendation: str
    due_at: Optional[datetime]
    status: str
    owner_ack_at: Optional[datetime]
    completed_at: Optional[datetime]
    reminder_id: Optional[UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


class FollowUpUpdate(BaseModel):
    status: Optional[str] = None  # ACKNOWLEDGED|COMPLETED|DISMISSED (owner)
    outcome_note: Optional[str] = None  # recorded as a HealthEvent on COMPLETED

    @field_validator("status")
    @classmethod
    def _s(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"ACKNOWLEDGED", "COMPLETED", "DISMISSED"}:
            raise ValueError("status must be ACKNOWLEDGED|COMPLETED|DISMISSED")
        return v


# ── Vet-scoped reads ──

class ShareLinkIn(BaseModel):
    grantee_email: str

    @field_validator("grantee_email")
    @classmethod
    def _e(cls, v: str) -> str:
        if not v.strip() or "@" not in v:
            raise ValueError("grantee_email must be a valid email")
        return v.strip().lower()


def verification_label(state: str) -> str:
    return {
        "UNVERIFIED": "Unverified profile — no credential check performed",
        "PENDING_VERIFICATION": "Verification pending",
        "VERIFIED": "Verified veterinarian",
        "SUSPENDED": "Suspended — access disabled",
        "REVOKED": "Revoked — access disabled",
    }.get(state, state)


def question_out(row) -> dict:
    return {"id": str(row.id), "pet_id": str(row.pet_id),
            "consultation_id": str(row.consultation_id) if row.consultation_id else None,
            "question_text": row.question_text, "status": row.status,
            "answer_text": row.answer_text,
            "answered_at": row.answered_at.isoformat() if row.answered_at else None,
            "created_at": row.created_at.isoformat() if row.created_at else None}


def note_out(row) -> dict:
    return {"id": str(row.id), "pet_id": str(row.pet_id),
            "consultation_id": str(row.consultation_id),
            "author_label": row.author_label, "note_text": row.note_text,
            "follow_up_text": row.follow_up_text,
            "effective_at": row.effective_at.isoformat() if row.effective_at else None,
            "visibility": row.visibility, "source": row.source,
            "verification_status": row.verification_status,
            "created_at": row.created_at.isoformat() if row.created_at else None}


def followup_out(row) -> dict:
    return {"id": str(row.id), "pet_id": str(row.pet_id),
            "consultation_id": str(row.consultation_id),
            "recommendation": row.recommendation,
            "due_at": row.due_at.isoformat() if row.due_at else None,
            "status": row.status,
            "owner_ack_at": row.owner_ack_at.isoformat() if row.owner_ack_at else None,
            "completed_at": row.completed_at.isoformat() if row.completed_at else None,
            "reminder_id": str(row.reminder_id) if row.reminder_id else None,
            "created_at": row.created_at.isoformat() if row.created_at else None}


def care_out(row) -> dict:
    return {"id": str(row.id), "pet_id": str(row.pet_id),
            "display_name": row.display_name, "clinic_name": row.clinic_name,
            "role": row.role, "status": row.status,
            "vet_user_id": str(row.vet_user_id) if row.vet_user_id else None,
            "verification_state": row.verification_state,
            "verification_label": verification_label(row.verification_state),
            "ended_at": row.ended_at.isoformat() if row.ended_at else None,
            "created_at": row.created_at.isoformat() if row.created_at else None}
