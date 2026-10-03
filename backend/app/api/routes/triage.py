from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User, DogProfile, SymptomTriageSession

router = APIRouter()


class TriageCreate(BaseModel):
    symptoms: list
    severity_level: Optional[str] = None
    triage_result: Optional[dict] = None


class TriageOut(BaseModel):
    id: UUID
    dog_id: UUID
    symptoms: list
    severity_level: Optional[str]
    triage_result: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


def _verify(dog_id: UUID, clerk_user_id: str, db: Session):
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    dog = db.query(DogProfile).filter(DogProfile.id == dog_id, DogProfile.user_id == user.id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found or not owned by this user.")
    return dog


@router.post("/{dog_id}/sessions", response_model=TriageOut, status_code=201)
def save_session(dog_id: UUID, payload: TriageCreate, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify(dog_id, clerk_user_id, db)
    if not payload.symptoms:
        raise HTTPException(status_code=422, detail="symptoms must not be empty.")
    if payload.severity_level and payload.severity_level not in {"Green", "Yellow", "Orange", "Red", "green", "yellow", "orange", "red", "mild", "moderate", "severe"}:
        raise HTTPException(status_code=422, detail="Invalid severity_level.")
    row = SymptomTriageSession(dog_id=dog_id, symptoms=payload.symptoms,
                               severity_level=payload.severity_level,
                               triage_result=payload.triage_result, created_at=datetime.utcnow())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{dog_id}/sessions", response_model=List[TriageOut])
def list_sessions(dog_id: UUID, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify(dog_id, clerk_user_id, db)
    return db.query(SymptomTriageSession).filter(SymptomTriageSession.dog_id == dog_id).order_by(SymptomTriageSession.created_at.desc()).limit(100).all()


@router.get("/{dog_id}/sessions/{session_id}", response_model=TriageOut)
def get_session(dog_id: UUID, session_id: UUID, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify(dog_id, clerk_user_id, db)
    row = db.query(SymptomTriageSession).filter(SymptomTriageSession.id == session_id, SymptomTriageSession.dog_id == dog_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Triage session not found.")
    return row
