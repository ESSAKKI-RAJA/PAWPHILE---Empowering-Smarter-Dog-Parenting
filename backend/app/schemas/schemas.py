from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

# ─── User Schemas ─────────────────────────────
class UserBase(BaseModel):
    email: Optional[str] = None

class UserCreate(UserBase):
    clerk_user_id: str

class UserOut(UserBase):
    id: UUID
    clerk_user_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Dog Profile Schemas ───────────────────────
class DogCreate(BaseModel):
    name: str
    breed: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    neutered: Optional[bool] = False
    weight_kg: Optional[float] = None
    body_condition_status: Optional[str] = None
    diet_type: Optional[str] = None
    activity_level: Optional[str] = None
    health_goal: Optional[str] = None
    allergies: Optional[list] = []
    past_illnesses: Optional[list] = []
    medical_history: Optional[str] = None
    photo_url: Optional[str] = None

class DogUpdate(DogCreate):
    name: Optional[str] = None

class DogOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    breed: Optional[str]
    dob: Optional[str]
    gender: Optional[str]
    neutered: Optional[bool]
    weight_kg: Optional[float]
    body_condition_status: Optional[str]
    diet_type: Optional[str]
    activity_level: Optional[str]
    health_goal: Optional[str]
    allergies: Optional[list]
    past_illnesses: Optional[list]
    medical_history: Optional[str]
    photo_url: Optional[str]
    vaccine_status: Optional[str]
    deworming_status: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ─── Vaccine Schemas ───────────────────────────
class VaccineCreate(BaseModel):
    name: str
    date_given: Optional[str] = None
    next_due_date: Optional[str] = None
    clinic_name: Optional[str] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None

class VaccineOut(VaccineCreate):
    id: UUID
    dog_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Medical History Schemas ───────────────────
class MedicalHistoryCreate(BaseModel):
    condition_name: str
    diagnosed_date: Optional[str] = None
    status: Optional[str] = "active"
    notes: Optional[str] = None

class MedicalHistoryOut(MedicalHistoryCreate):
    id: UUID
    dog_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Vision Scan Schemas ───────────────────────
class VisionScanOut(BaseModel):
    id: UUID
    dog_id: UUID
    scan_type: str
    image_url: str
    prediction: Optional[str]
    confidence: Optional[float]
    explanation: Optional[str]
    recommendation: Optional[str]
    severity_level: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
