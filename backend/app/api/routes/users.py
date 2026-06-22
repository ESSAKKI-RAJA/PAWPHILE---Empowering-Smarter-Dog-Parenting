from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User
from app.schemas.schemas import UserOut, UserCreate

router = APIRouter()

@router.post("/sync", response_model=UserOut)
def sync_user(payload: UserCreate, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create or update internal user record from Clerk identity."""
    # clerk_user_id from token is authoritative — never trust request body's clerk_user_id
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        user = User(
            clerk_user_id=clerk_user_id,
            email=payload.email,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(user)
    else:
        user.email = payload.email or user.email
        user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user
