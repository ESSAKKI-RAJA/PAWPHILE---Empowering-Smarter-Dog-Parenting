from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer, Float, Text, JSON, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    clerk_user_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner_profile = relationship("OwnerProfile", back_populates="user", uselist=False)
    dogs = relationship("DogProfile", back_populates="user")
    app_settings = relationship("AppSettings", back_populates="user", uselist=False)
    notification_preferences = relationship("NotificationPreferences", back_populates="user", uselist=False)

class OwnerProfile(Base):
    __tablename__ = "owner_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    language = Column(String, default="en")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="owner_profile")

class DogProfile(Base):
    __tablename__ = "dog_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    name = Column(String, nullable=False)
    breed = Column(String, nullable=True)
    breed_type = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    neutered = Column(Boolean, default=False)
    weight_kg = Column(Float, nullable=True)
    body_condition_status = Column(String, nullable=True)
    diet_type = Column(String, nullable=True)
    activity_level = Column(String, nullable=True)
    health_goal = Column(String, nullable=True)
    allergies = Column(JSON, nullable=True)
    past_illnesses = Column(JSON, nullable=True)
    medical_history = Column(Text, nullable=True)
    vaccine_status = Column(String, nullable=True)
    deworming_status = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="dogs")
    vaccines = relationship("VaccineRecord", back_populates="dog")
    deworming_records = relationship("DewormingRecord", back_populates="dog")
    medical_history = relationship("MedicalHistory", back_populates="dog")
    vet_visits = relationship("VetVisitSummary", back_populates="dog")
    vision_scans = relationship("VisionScanRecord", back_populates="dog")
    reports = relationship("Report", back_populates="dog")
    triage_sessions = relationship("SymptomTriageSession", back_populates="dog")

class VetProfile(Base):
    __tablename__ = "vet_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    clinic_name = Column(String, nullable=True)
    vet_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class VaccineRecord(Base):
    __tablename__ = "vaccine_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    name = Column(String, nullable=False)
    date_given = Column(DateTime, nullable=True)
    next_due_date = Column(DateTime, index=True, nullable=True)
    clinic_name = Column(String, nullable=True)
    batch_number = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dog = relationship("DogProfile", back_populates="vaccines")

class DewormingRecord(Base):
    __tablename__ = "deworming_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    product_name = Column(String, nullable=True)
    date_given = Column(DateTime, nullable=True)
    next_due_date = Column(DateTime, index=True, nullable=True)
    weight_at_treatment = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dog = relationship("DogProfile", back_populates="deworming_records")

class MedicalHistory(Base):
    __tablename__ = "medical_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    condition_name = Column(String, nullable=False)
    diagnosed_date = Column(DateTime, nullable=True)
    status = Column(String, nullable=True) # active, resolved
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dog = relationship("DogProfile", back_populates="medical_history")

class VetVisitSummary(Base):
    __tablename__ = "vet_visit_summaries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    visit_date = Column(DateTime, nullable=False)
    vet_name = Column(String, nullable=True)
    clinic_name = Column(String, nullable=True)
    reason_for_visit = Column(String, nullable=True)
    vet_remarks = Column(Text, nullable=True)
    diagnosis = Column(String, nullable=True)
    medicines_prescribed = Column(Text, nullable=True)
    follow_up_date = Column(DateTime, nullable=True)
    attachment_urls = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dog = relationship("DogProfile", back_populates="vet_visits")

class SymptomTriageSession(Base):
    __tablename__ = "symptom_triage_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    symptoms = Column(JSON, nullable=False)
    severity_level = Column(String, index=True, nullable=True)
    triage_result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    dog = relationship("DogProfile", back_populates="triage_sessions")

class EmergencyClassification(Base):
    __tablename__ = "emergency_classifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("symptom_triage_sessions.id"))
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"))
    classification = Column(String, nullable=False)
    action_required = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class VisionScanRecord(Base):
    __tablename__ = "vision_scan_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    scan_type = Column(String, index=True, nullable=False)
    image_url = Column(String, nullable=False)
    public_id = Column(String, nullable=True)
    prediction = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    explanation = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    severity_level = Column(String, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    dog = relationship("DogProfile", back_populates="vision_scans")

class Report(Base):
    __tablename__ = "reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    report_type = Column(String, nullable=False)
    pdf_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    dog = relationship("DogProfile", back_populates="reports")

class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), nullable=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    due_date = Column(DateTime, index=True, nullable=False)
    status = Column(String, default="upcoming")
    created_at = Column(DateTime, default=datetime.utcnow)

class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    email_enabled = Column(Boolean, default=True)
    reminder_email = Column(String, nullable=True)
    vaccines = Column(Boolean, default=True)
    deworming = Column(Boolean, default=True)
    vet_visits = Column(Boolean, default=True)
    nutrition = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="notification_preferences")

class AppSettings(Base):
    __tablename__ = "app_settings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    theme = Column(String, default="system")
    encrypt_health_data = Column(Boolean, default=False)
    consent_for_ai = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="app_settings")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
