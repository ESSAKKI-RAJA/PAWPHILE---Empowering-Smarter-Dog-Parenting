from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User, DogProfile, DewormingRecord

router = APIRouter()


class DewormingCreate(BaseModel):
    product_name: Optional[str] = None
    date_given: Optional[datetime] = None
    next_due_date: Optional[datetime] = None
    weight_at_treatment: Optional[float] = None
    notes: Optional[str] = None


class DewormingOut(DewormingCreate):
    id: UUID
    dog_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


def _verify_dog_ownership(dog_id: UUID, clerk_user_id: str, db: Session) -> DogProfile:
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    dog = db.query(DogProfile).filter(DogProfile.id == dog_id, DogProfile.user_id == user.id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found or not owned by this user.")
    return dog


@router.get("/{dog_id}/deworming", response_model=List[DewormingOut])
def get_deworming(dog_id: UUID, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify_dog_ownership(dog_id, clerk_user_id, db)
    return db.query(DewormingRecord).filter(DewormingRecord.dog_id == dog_id).order_by(DewormingRecord.created_at.desc()).all()


@router.post("/{dog_id}/deworming", response_model=DewormingOut, status_code=201)
def create_deworming(dog_id: UUID, payload: DewormingCreate, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    dog = _verify_dog_ownership(dog_id, clerk_user_id, db)
    if payload.weight_at_treatment is not None and (payload.weight_at_treatment <= 0 or payload.weight_at_treatment > 250):
        raise HTTPException(status_code=422, detail="weight_at_treatment out of range.")
    record = DewormingRecord(dog_id=dog.id, created_at=datetime.utcnow(),
                             updated_at=datetime.utcnow(), **payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{dog_id}/deworming/{record_id}", response_model=DewormingOut)
def get_one(dog_id: UUID, record_id: UUID, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify_dog_ownership(dog_id, clerk_user_id, db)
    row = db.query(DewormingRecord).filter(DewormingRecord.id == record_id, DewormingRecord.dog_id == dog_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Deworming record not found.")
    return row


@router.put("/{dog_id}/deworming/{record_id}", response_model=DewormingOut)
def update_one(dog_id: UUID, record_id: UUID, payload: DewormingCreate, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify_dog_ownership(dog_id, clerk_user_id, db)
    row = db.query(DewormingRecord).filter(DewormingRecord.id == record_id, DewormingRecord.dog_id == dog_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Deworming record not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{dog_id}/deworming/{record_id}", status_code=204)
def delete_one(dog_id: UUID, record_id: UUID, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify_dog_ownership(dog_id, clerk_user_id, db)
    row = db.query(DewormingRecord).filter(DewormingRecord.id == record_id, DewormingRecord.dog_id == dog_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Deworming record not found.")
    db.delete(row)
    db.commit()
    return None
