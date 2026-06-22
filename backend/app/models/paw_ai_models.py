"""
PAW AI Models — Phase 1
Breed Intelligence + AI System State + RAG Knowledge Base
Added to existing all_models.py via separate module.
"""
from sqlalchemy import (
    Column, String, Boolean, ForeignKey, DateTime, Integer, Float,
    Text, JSON, Index, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.database import Base

# ── Try pgvector; fall back to Text if extension not installed ──
try:
    from pgvector.sqlalchemy import Vector
    VECTOR_TYPE = Vector(1536)
except Exception:
    VECTOR_TYPE = Text  # graceful degradation


# ═══════════════════════════════════════════════════════════════
#  BREED INTELLIGENCE
# ═══════════════════════════════════════════════════════════════

class BreedProfile(Base):
    __tablename__ = "breed_profiles"

    breed_id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    breed_name          = Column(String(120), unique=True, nullable=False, index=True)
    aliases             = Column(JSON, default=list)          # list[str]
    origin_country      = Column(String(80), nullable=True)
    india_commonness_level = Column(String(20), default="common")  # common/moderate/rare

    # Physical
    size_group          = Column(String(20), nullable=True)   # toy/small/medium/large/giant
    life_expectancy_range = Column(String(20), nullable=True) # "10-13"
    male_weight_range_kg  = Column(String(20), nullable=True)
    female_weight_range_kg= Column(String(20), nullable=True)
    height_range_cm     = Column(String(20), nullable=True)
    coat_type           = Column(String(60), nullable=True)
    shedding_level      = Column(String(20), nullable=True)   # low/medium/high
    grooming_need       = Column(String(20), nullable=True)

    # Activity
    activity_level            = Column(String(20), nullable=True)
    exercise_need_minutes_per_day = Column(Integer, default=30)
    apartment_suitability     = Column(String(20), nullable=True)   # good/moderate/poor

    # Climate
    heat_sensitivity    = Column(String(20), default="needs_vet_review")
    cold_sensitivity    = Column(String(20), default="needs_vet_review")

    # Health risks (low/medium/high/needs_vet_review)
    obesity_risk        = Column(String(20), default="needs_vet_review")
    joint_risk          = Column(String(20), default="needs_vet_review")
    skin_risk           = Column(String(20), default="needs_vet_review")
    ear_risk            = Column(String(20), default="needs_vet_review")
    eye_risk            = Column(String(20), default="needs_vet_review")
    respiratory_risk    = Column(String(20), default="needs_vet_review")
    heart_risk          = Column(String(20), default="needs_vet_review")
    dental_risk         = Column(String(20), default="needs_vet_review")
    digestive_sensitivity = Column(String(20), default="needs_vet_review")

    # Behaviour
    behavior_tendency   = Column(JSON, default=list)   # ["gentle","loyal"]
    training_difficulty = Column(String(20), nullable=True)

    # Nutrition
    food_cautions       = Column(JSON, default=list)
    nutrition_notes     = Column(Text, nullable=True)
    ideal_bcs_target    = Column(String(10), default="4-5")
    bcs_interpretation_notes = Column(Text, nullable=True)

    # Life-stage notes
    puppy_care_notes    = Column(Text, nullable=True)
    adult_care_notes    = Column(Text, nullable=True)
    senior_care_notes   = Column(Text, nullable=True)

    # Preventive care
    vaccination_context = Column(Text, nullable=True)
    deworming_context   = Column(Text, nullable=True)

    # AI safety
    emergency_red_flags_for_breed = Column(JSON, default=list)
    common_owner_questions        = Column(JSON, default=list)
    safe_ai_response_rules        = Column(JSON, default=list)
    vet_escalation_rules          = Column(JSON, default=list)

    # Provenance
    source_references   = Column(JSON, default=list)
    confidence_level    = Column(String(20), default="medium")
    vet_review_status   = Column(String(30), default="needs_vet_review")
    last_reviewed_date  = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    health_risks  = relationship("BreedHealthRisk",     back_populates="breed", cascade="all, delete-orphan")
    nutrition_rules = relationship("BreedNutritionRule", back_populates="breed", cascade="all, delete-orphan")
    activity_rules  = relationship("BreedActivityRule",  back_populates="breed", cascade="all, delete-orphan")


class BreedHealthRisk(Base):
    __tablename__ = "breed_health_risks"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    breed_id    = Column(UUID(as_uuid=True), ForeignKey("breed_profiles.breed_id"), index=True)
    risk_name   = Column(String(120), nullable=False)
    severity    = Column(String(20), default="medium")
    notes       = Column(Text, nullable=True)
    source      = Column(String(200), nullable=True)
    breed       = relationship("BreedProfile", back_populates="health_risks")


class BreedNutritionRule(Base):
    __tablename__ = "breed_nutrition_rules"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    breed_id    = Column(UUID(as_uuid=True), ForeignKey("breed_profiles.breed_id"), index=True)
    rule_type   = Column(String(60), nullable=False)  # avoid/prefer/portion
    description = Column(Text, nullable=False)
    breed       = relationship("BreedProfile", back_populates="nutrition_rules")


class BreedActivityRule(Base):
    __tablename__ = "breed_activity_rules"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    breed_id        = Column(UUID(as_uuid=True), ForeignKey("breed_profiles.breed_id"), index=True)
    activity_type   = Column(String(60), nullable=False)
    recommendation  = Column(Text, nullable=False)
    breed           = relationship("BreedProfile", back_populates="activity_rules")


# ═══════════════════════════════════════════════════════════════
#  PAW AI SESSION & MESSAGES
# ═══════════════════════════════════════════════════════════════

class PawAiSession(Base):
    __tablename__ = "paw_ai_sessions"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)
    dog_id      = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True, nullable=True)
    intent      = Column(String(60), nullable=True)   # triage/breed/nutrition/etc
    started_at  = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at    = Column(DateTime, nullable=True)
    session_meta = Column(JSON, default=dict)

    messages    = relationship("PawAiMessage", back_populates="session", cascade="all, delete-orphan")
    snapshots   = relationship("PawAiContextSnapshot", back_populates="session", cascade="all, delete-orphan")


class PawAiMessage(Base):
    __tablename__ = "paw_ai_messages"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id  = Column(UUID(as_uuid=True), ForeignKey("paw_ai_sessions.id"), index=True)
    role        = Column(String(20), nullable=False)   # user/assistant/system
    content     = Column(Text, nullable=False)
    intent      = Column(String(60), nullable=True)
    risk_level  = Column(String(10), nullable=True)    # Green/Orange/Red
    created_at  = Column(DateTime, default=datetime.utcnow)

    session     = relationship("PawAiSession", back_populates="messages")


class PawAiContextSnapshot(Base):
    __tablename__ = "paw_ai_context_snapshots"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id  = Column(UUID(as_uuid=True), ForeignKey("paw_ai_sessions.id"), index=True)
    snapshot    = Column(JSON, nullable=False)   # full dog context at time of query
    created_at  = Column(DateTime, default=datetime.utcnow)

    session     = relationship("PawAiSession", back_populates="snapshots")


class PawAiSafetyLog(Base):
    __tablename__ = "paw_ai_safety_logs"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id      = Column(UUID(as_uuid=True), ForeignKey("paw_ai_sessions.id"), nullable=True)
    dog_id          = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), nullable=True)
    trigger_type    = Column(String(60), nullable=False)   # emergency_keyword / guardrail_block
    trigger_content = Column(Text, nullable=True)
    action_taken    = Column(String(60), nullable=True)    # escalated / blocked / warned
    created_at      = Column(DateTime, default=datetime.utcnow)


class PawAiFeedback(Base):
    __tablename__ = "paw_ai_feedback"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id  = Column(UUID(as_uuid=True), ForeignKey("paw_ai_sessions.id"), nullable=True)
    message_id  = Column(UUID(as_uuid=True), ForeignKey("paw_ai_messages.id"), nullable=True)
    rating      = Column(Integer, nullable=True)       # 1-5
    helpful     = Column(Boolean, nullable=True)
    visited_vet = Column(Boolean, nullable=True)
    comment     = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════
#  RAG KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════════

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title       = Column(String(300), nullable=False)
    source      = Column(String(100), nullable=True)  # AAHA/WSAVA/Merck/AVMA
    url         = Column(String(500), nullable=True)
    doc_type    = Column(String(60), nullable=True)   # guideline/article/textbook
    topic_tags  = Column(JSON, default=list)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    chunks      = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_documents.id"), index=True)
    chunk_index = Column(Integer, nullable=False)
    content     = Column(Text, nullable=False)
    topic_tags  = Column(JSON, default=list)
    created_at  = Column(DateTime, default=datetime.utcnow)

    document    = relationship("KnowledgeDocument", back_populates="chunks")
    embedding   = relationship("KnowledgeEmbedding", back_populates="chunk", uselist=False, cascade="all, delete-orphan")


class KnowledgeEmbedding(Base):
    __tablename__ = "knowledge_embeddings"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id    = Column(UUID(as_uuid=True), ForeignKey("knowledge_chunks.id"), unique=True, index=True)
    # pgvector column — falls back to Text if extension unavailable
    embedding   = Column(VECTOR_TYPE, nullable=True)
    model_name  = Column(String(100), default="sentence-transformers/all-MiniLM-L6-v2")
    created_at  = Column(DateTime, default=datetime.utcnow)

    chunk       = relationship("KnowledgeChunk", back_populates="embedding")


# ═══════════════════════════════════════════════════════════════
#  EXTENDED HEALTH RECORDS
# ═══════════════════════════════════════════════════════════════

class BcsBmiRecord(Base):
    __tablename__ = "bcs_bmi_records"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dog_id          = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    weight_kg       = Column(Float, nullable=True)
    height_cm       = Column(Float, nullable=True)
    length_cm       = Column(Float, nullable=True)
    chest_cm        = Column(Float, nullable=True)
    bcs_score       = Column(Integer, nullable=True)   # 1-9
    bmi_value       = Column(Float, nullable=True)
    category        = Column(String(30), nullable=True)
    rer_kcal        = Column(Float, nullable=True)
    daily_cal_estimate = Column(Integer, nullable=True)
    recorded_by     = Column(String(20), default="owner")
    created_at      = Column(DateTime, default=datetime.utcnow)


class NutritionLog(Base):
    __tablename__ = "nutrition_logs_v2"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dog_id          = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    food_name       = Column(String(200), nullable=False)
    amount_g        = Column(Float, nullable=True)
    calories        = Column(Float, nullable=True)
    protein_g       = Column(Float, nullable=True)
    fat_g           = Column(Float, nullable=True)
    carbs_g         = Column(Float, nullable=True)
    is_safe         = Column(Boolean, nullable=True)
    safety_notes    = Column(Text, nullable=True)
    logged_at       = Column(DateTime, default=datetime.utcnow, index=True)
    created_at      = Column(DateTime, default=datetime.utcnow)


class BehaviorLog(Base):
    __tablename__ = "behavior_logs_v2"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dog_id          = Column(UUID(as_uuid=True), ForeignKey("dog_profiles.id"), index=True)
    behavior_type   = Column(String(80), nullable=False)
    intensity       = Column(String(20), nullable=True)   # mild/moderate/severe
    duration_mins   = Column(Integer, nullable=True)
    trigger         = Column(String(200), nullable=True)
    notes           = Column(Text, nullable=True)
    logged_at       = Column(DateTime, default=datetime.utcnow, index=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
