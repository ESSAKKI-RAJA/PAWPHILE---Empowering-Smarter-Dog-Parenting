from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User, AppSettings, NotificationPreferences

router = APIRouter()


class SettingsIn(BaseModel):
    theme: Optional[str] = None
    encrypt_health_data: Optional[bool] = None
    consent_for_ai: Optional[bool] = None


class SettingsOut(SettingsIn):
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class NotifIn(BaseModel):
    email_enabled: Optional[bool] = None
    reminder_email: Optional[str] = None
    vaccines: Optional[bool] = None
    deworming: Optional[bool] = None
    vet_visits: Optional[bool] = None
    nutrition: Optional[bool] = None


def _user(clerk_user_id: str, db: Session) -> User:
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Call POST /api/users/sync first.")
    return user


@router.get("", response_model=SettingsOut)
def read_settings(clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _user(clerk_user_id, db)
    row = db.query(AppSettings).filter(AppSettings.user_id == user.id).first()
    if not row:
        return SettingsOut(theme="system")
    return row


@router.put("", response_model=SettingsOut)
def write_settings(payload: SettingsIn, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _user(clerk_user_id, db)
    if payload.theme and payload.theme not in {"light", "dark", "system"}:
        raise HTTPException(status_code=422, detail="Invalid theme.")
    row = db.query(AppSettings).filter(AppSettings.user_id == user.id).first()
    if not row:
        row = AppSettings(user_id=user.id, **payload.model_dump(exclude_none=True))
        db.add(row)
    else:
        for k, v in payload.model_dump(exclude_none=True).items():
            setattr(row, k, v)
        row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


@router.get("/notifications")
def read_notif(clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _user(clerk_user_id, db)
    row = db.query(NotificationPreferences).filter(NotificationPreferences.user_id == user.id).first()
    if not row:
        return {"email_enabled": True, "vaccines": True, "deworming": True, "vet_visits": True, "nutrition": True}
    return {"email_enabled": row.email_enabled, "reminder_email": row.reminder_email,
            "vaccines": row.vaccines, "deworming": row.deworming,
            "vet_visits": row.vet_visits, "nutrition": row.nutrition}


@router.put("/notifications")
def write_notif(payload: NotifIn, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _user(clerk_user_id, db)
    row = db.query(NotificationPreferences).filter(NotificationPreferences.user_id == user.id).first()
    if not row:
        row = NotificationPreferences(user_id=user.id, **payload.model_dump(exclude_none=True))
        db.add(row)
    else:
        for k, v in payload.model_dump(exclude_none=True).items():
            setattr(row, k, v)
        row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return {"status": "success"}
