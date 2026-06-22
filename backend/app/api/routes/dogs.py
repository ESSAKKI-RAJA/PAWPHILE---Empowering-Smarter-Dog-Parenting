from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User, DogProfile
from app.schemas.schemas import DogCreate, DogUpdate, DogOut

router = APIRouter()

def _get_user(clerk_user_id: str, db: Session) -> User:
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Call POST /api/users/sync first.")
    return user

def _get_dog_owned_by(dog_id: UUID, user: User, db: Session) -> DogProfile:
    dog = db.query(DogProfile).filter(DogProfile.id == dog_id, DogProfile.user_id == user.id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found or not owned by this user.")
    return dog

@router.get("", response_model=List[DogOut])
def get_dogs(clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(clerk_user_id, db)
    return db.query(DogProfile).filter(DogProfile.user_id == user.id).all()

@router.post("", response_model=DogOut, status_code=201)
def create_dog(payload: DogCreate, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(clerk_user_id, db)
    dog = DogProfile(
        user_id=user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        **payload.model_dump()
    )
    db.add(dog)
    db.commit()
    db.refresh(dog)
    return dog

@router.get("/{dog_id}", response_model=DogOut)
def get_dog(dog_id: UUID, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(clerk_user_id, db)
    return _get_dog_owned_by(dog_id, user, db)

@router.put("/{dog_id}", response_model=DogOut)
def update_dog(dog_id: UUID, payload: DogUpdate, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(clerk_user_id, db)
    dog = _get_dog_owned_by(dog_id, user, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(dog, field, value)
    dog.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(dog)
    return dog

@router.delete("/{dog_id}", status_code=204)
def delete_dog(dog_id: UUID, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(clerk_user_id, db)
    dog = _get_dog_owned_by(dog_id, user, db)
    db.delete(dog)
    db.commit()
