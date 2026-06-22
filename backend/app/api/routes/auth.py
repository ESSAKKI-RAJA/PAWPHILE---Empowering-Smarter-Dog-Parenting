from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User
from app.schemas.schemas import UserOut

router = APIRouter()

@router.get("/me", response_model=UserOut)
def get_me(clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found. Please call POST /api/users/sync first.")
    return user
