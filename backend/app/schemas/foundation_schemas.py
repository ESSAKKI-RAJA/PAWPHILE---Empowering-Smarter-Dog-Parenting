"""BIN1 foundation schemas — backend validation for every entity."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from uuid import UUID
from datetime import datetime

ALLOWED_EVENT_TYPES = {
    "vet_visit", "symptom", "medication", "vaccination", "deworming",
    "procedure", "weight", "activity", "nutrition", "behavior",
    "lab_result", "imaging", "observation", "condition", "file",
    "report", "reminder", "note",
}
ALLOWED_SOURCES = {"owner", "vet", "clinic", "import", "system", "device", "ai", "other"}
ALLOWED_VERIFICATION = {"unverified", "owner_reported", "vet_verified", "imported", "system"}
ALLOWED_SEVERITY = {"mild", "moderate", "severe", "unknown"}
ALLOWED_SHARE_SCOPE = {"FULL_RECORD", "REPORT_ONLY", "SELECTED"}
ALLOWED_REPORT_STATUS = {"DRAFT", "GENERATING", "READY", "FAILED"}
ALLOWED_REMINDER_STATUS = {"SCHEDULED", "COMPLETED", "DISMISSED", "CANCELLED"}
ALLOWED_NOTIF_STATUS = {"SCHEDULED", "QUEUED", "SENT", "FAILED", "SKIPPED"}
ALLOWED_CONSENT_STATUS = {"GRANTED", "DENIED", "WITHDRAWN"}


def _no_blank(v: Optional[str], field: str) -> Optional[str]:
    if v is not None and not v.strip():
        raise ValueError(f"{field} must not be blank")
    return v


# ── HealthEvent ──

class HealthEventCreate(BaseModel):
    event_type: str
    effective_at: datetime
    recorded_at: Optional[datetime] = None
    source: str = "owner"
    actor: Optional[str] = None
    verification_status: str = "owner_reported"
    title: Optional[str] = None
    summary: Optional[str] = None
    event_metadata: dict[str, Any] = Field(default_factory=dict)
    ref_table: Optional[str] = None
    ref_id: Optional[UUID] = None
    corrects_event_id: Optional[UUID] = None

    @field_validator("event_type")
    @classmethod
    def _ev(cls, v: str) -> str:
        if v not in ALLOWED_EVENT_TYPES:
            raise ValueError(f"event_type must be one of {sorted(ALLOWED_EVENT_TYPES)}")
        return v

    @field_validator("source")
    @classmethod
    def _src(cls, v: str) -> str:
        if v not in ALLOWED_SOURCES:
            raise ValueError(f"source must be one of {sorted(ALLOWED_SOURCES)}")
        return v

    @field_validator("verification_status")
    @classmethod
    def _ver(cls, v: str) -> str:
        if v not in ALLOWED_VERIFICATION:
            raise ValueError("invalid verification_status")
        return v


class HealthEventOut(HealthEventCreate):
    id: UUID
    pet_id: UUID
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Symptom ──

class SymptomCreate(BaseModel):
    name: str
    severity: str = "mild"
    onset_at: Optional[datetime] = None
    duration_hours: Optional[float] = None
    notes: Optional[str] = None
    source: str = "owner"

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return _no_blank(v, "name")  # type: ignore[return-value]

    @field_validator("severity")
    @classmethod
    def _sev(cls, v: str) -> str:
        if v not in ALLOWED_SEVERITY:
            raise ValueError("invalid severity")
        return v

    @field_validator("duration_hours")
    @classmethod
    def _dur(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 0 or v > 24 * 365):
            raise ValueError("duration_hours out of range")
        return v


class SymptomOut(SymptomCreate):
    id: UUID
    pet_id: UUID
    health_event_id: Optional[UUID]
    verification_status: str
    is_archived: bool
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SymptomUpdate(BaseModel):
    name: Optional[str] = None
    severity: Optional[str] = None
    onset_at: Optional[datetime] = None
    duration_hours: Optional[float] = None
    notes: Optional[str] = None
    version: Optional[int] = None  # optimistic concurrency


# ── Medication ──

class MedicationCreate(BaseModel):
    name: str
    dose: Optional[str] = None
    dose_unit: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    prescribed_by: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None
    source: str = "owner"

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return _no_blank(v, "name")  # type: ignore[return-value]

    @field_validator("status")
    @classmethod
    def _st(cls, v: str) -> str:
        if v not in {"active", "completed", "stopped", "archived"}:
            raise ValueError("invalid medication status")
        return v


class MedicationOut(MedicationCreate):
    id: UUID
    pet_id: UUID
    health_event_id: Optional[UUID]
    verification_status: str
    is_archived: bool
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dose: Optional[str] = None
    dose_unit: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    prescribed_by: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    version: Optional[int] = None


# ── Vet visit ──

class VetVisitCreate(BaseModel):
    visit_date: datetime
    vet_name: Optional[str] = None
    clinic_name: Optional[str] = None
    reason_for_visit: Optional[str] = None
    vet_remarks: Optional[str] = None
    diagnosis: Optional[str] = None
    medicines_prescribed: Optional[str] = None
    follow_up_date: Optional[datetime] = None


class VetVisitOut(VetVisitCreate):
    id: UUID
    dog_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Measurements ──

class WeightCreate(BaseModel):
    value: float
    unit: str = "kg"
    measured_at: datetime
    source: str = "owner"
    context: Optional[str] = None

    @field_validator("value")
    @classmethod
    def _w(cls, v: float) -> float:
        if v <= 0 or v > 250:
            raise ValueError("weight value out of plausible range (0, 250] kg-equivalent")
        return v

    @field_validator("unit")
    @classmethod
    def _u(cls, v: str) -> str:
        if v not in {"kg", "g", "lb"}:
            raise ValueError("unit must be kg|g|lb")
        return v


class WeightOut(WeightCreate):
    id: UUID
    pet_id: UUID
    health_event_id: Optional[UUID]
    is_archived: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityCreate(BaseModel):
    activity_type: str
    duration_mins: Optional[int] = None
    distance_km: Optional[float] = None
    occurred_at: datetime
    notes: Optional[str] = None

    @field_validator("activity_type")
    @classmethod
    def _t(cls, v: str) -> str:
        if v not in {"walk", "run", "play", "rest", "other"}:
            raise ValueError("invalid activity_type")
        return v

    @field_validator("duration_mins")
    @classmethod
    def _d(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 0 or v > 24 * 60):
            raise ValueError("duration_mins out of range")
        return v


class ActivityOut(ActivityCreate):
    id: UUID
    pet_id: UUID
    health_event_id: Optional[UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


class NutritionCreate(BaseModel):
    food_name: str
    amount_g: Optional[float] = None
    calories: Optional[float] = None
    fed_at: datetime
    notes: Optional[str] = None

    @field_validator("amount_g")
    @classmethod
    def _a(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v <= 0 or v > 5000):
            raise ValueError("amount_g out of range")
        return v


class NutritionOut(NutritionCreate):
    id: UUID
    pet_id: UUID
    health_event_id: Optional[UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


class BehaviorCreate(BaseModel):
    behavior_type: str
    intensity: Optional[str] = None
    duration_mins: Optional[int] = None
    observed_at: datetime
    notes: Optional[str] = None


class BehaviorOut(BehaviorCreate):
    id: UUID
    pet_id: UUID
    health_event_id: Optional[UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Labs / imaging / allergies / procedures / observations ──

class LabCreate(BaseModel):
    test_name: str
    result_value: Optional[str] = None
    result_unit: Optional[str] = None
    reference_range: Optional[str] = None
    collected_at: Optional[datetime] = None
    lab_name: Optional[str] = None
    notes: Optional[str] = None


class LabOut(LabCreate):
    id: UUID
    pet_id: UUID
    health_event_id: Optional[UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


class ImagingCreate(BaseModel):
    modality: str
    body_area: Optional[str] = None
    performed_at: Optional[datetime] = None
    clinic_name: Optional[str] = None
    findings: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("modality")
    @classmethod
    def _m(cls, v: str) -> str:
        if v not in {"xray", "ultrasound", "ct", "mri", "other"}:
            raise ValueError("invalid modality")
        return v


class ImagingOut(ImagingCreate):
    id: UUID
    pet_id: UUID
    health_event_id: Optional[UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


class AllergyCreate(BaseModel):
    allergen: str
    reaction: Optional[str] = None
    severity: str = "unknown"


class AllergyOut(AllergyCreate):
    id: UUID
    pet_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ProcedureCreate(BaseModel):
    name: str
    performed_at: Optional[datetime] = None
    clinic_name: Optional[str] = None
    vet_name: Optional[str] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None


class ProcedureOut(ProcedureCreate):
    id: UUID
    pet_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ObservationCreate(BaseModel):
    category: str = "general"
    observed_at: Optional[datetime] = None
    note: str


class ObservationOut(ObservationCreate):
    id: UUID
    pet_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Files ──

class HealthFileCreate(BaseModel):
    file_name: str
    mime_type: str
    size_bytes: int
    storage_ref: str
    category: str = "general"

    @field_validator("mime_type")
    @classmethod
    def _mime(cls, v: str) -> str:
        allowed = {
            "image/jpeg", "image/png", "image/webp",
            "application/pdf", "text/plain",
        }
        if v not in allowed:
            raise ValueError(f"mime_type must be one of {sorted(allowed)}")
        return v

    @field_validator("size_bytes")
    @classmethod
    def _size(cls, v: int) -> int:
        if v <= 0 or v > 15 * 1024 * 1024:
            raise ValueError("size_bytes must be within (0, 15MB]")
        return v


class HealthFileOut(HealthFileCreate):
    id: UUID
    pet_id: UUID
    storage_backend: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Reports / sharing / reminders / consent ──

class ReportCreate(BaseModel):
    report_type: str
    source_summary: dict = Field(default_factory=dict)


class ReportOut(BaseModel):
    id: UUID
    pet_id: UUID
    report_type: str
    status: str
    version: int
    storage_ref: Optional[str]
    error: Optional[str]
    generated_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class ShareCreate(BaseModel):
    recipient_label: str
    scope: str = "REPORT_ONLY"
    selected_types: list[str] = Field(default_factory=list)
    expires_at: Optional[datetime] = None

    @field_validator("scope")
    @classmethod
    def _s(cls, v: str) -> str:
        if v not in ALLOWED_SHARE_SCOPE:
            raise ValueError("invalid scope")
        return v


class ShareOut(ShareCreate):
    id: UUID
    pet_id: UUID
    status: str
    access_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReminderCreate(BaseModel):
    reminder_type: str
    title: str
    due_at: datetime
    recurrence: Optional[str] = None


class ReminderOut(ReminderCreate):
    id: UUID
    pet_id: UUID
    status: str
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    due_at: Optional[datetime] = None
    recurrence: Optional[str] = None
    status: Optional[str] = None
    version: Optional[int] = None


class ConsentCreate(BaseModel):
    purpose: str
    status: str = "GRANTED"
    explanation: Optional[str] = None


class ConsentOut(ConsentCreate):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Sync ──

class SyncOpIn(BaseModel):
    client_operation_id: str = Field(min_length=8, max_length=80)
    entity_type: str
    entity_id: Optional[str] = None
    payload: dict[str, Any] = Field(default_factory=dict)
    payload_hash: Optional[str] = None


class SyncOpOut(BaseModel):
    client_operation_id: str
    status: str
    entity_id: Optional[str]
    result: dict

    model_config = {"from_attributes": True}
