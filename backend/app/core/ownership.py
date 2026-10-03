"""BIN1 ownership / authorization helpers.

Every pet-owned resource must resolve via: user (clerk_user_id) -> pet -> resource.
Never trust an ID alone.
"""
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.all_models import User, DogProfile


def get_user_or_404(clerk_user_id: str, db: Session) -> User:
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found. Call POST /api/users/sync first.",
        )
    return user


def require_dog_ownership(dog_id: UUID, clerk_user_id: str, db: Session) -> DogProfile:
    """Return DogProfile iff owned by the authenticated user, else 404.

    Deliberately 404 (not 403) to avoid leaking existence of other users' pets.
    """
    user = get_user_or_404(clerk_user_id, db)
    dog = (
        db.query(DogProfile)
        .filter(DogProfile.id == dog_id, DogProfile.user_id == user.id)
        .first()
    )
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found or not owned by this user.")
    return dog


def require_owned_query(model, dog_id: UUID, clerk_user_id: str, db: Session):
    """Verify dog ownership, return (user, dog) for resource queries."""
    user = get_user_or_404(clerk_user_id, db)
    dog = (
        db.query(DogProfile)
        .filter(DogProfile.id == dog_id, DogProfile.user_id == user.id)
        .first()
    )
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found or not owned by this user.")
    return user, dog
