from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User, DogProfile, MedicalHistory
from app.schemas.schemas import MedicalHistoryCreate, MedicalHistoryOut

router = APIRouter()

def _verify_dog_ownership(dog_id: UUID, clerk_user_id: str, db: Session) -> DogProfile:
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    dog = db.query(DogProfile).filter(DogProfile.id == dog_id, DogProfile.user_id == user.id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found or not owned by this user.")
    return dog

@router.get("/{dog_id}/medical-history", response_model=List[MedicalHistoryOut])
def get_medical_history(dog_id: UUID, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify_dog_ownership(dog_id, clerk_user_id, db)
    return db.query(MedicalHistory).filter(MedicalHistory.dog_id == dog_id).all()

@router.post("/{dog_id}/medical-history", response_model=MedicalHistoryOut, status_code=201)
def add_medical_history(dog_id: UUID, payload: MedicalHistoryCreate, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify_dog_ownership(dog_id, clerk_user_id, db)
    record = MedicalHistory(
        dog_id=dog_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        **payload.model_dump()
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
