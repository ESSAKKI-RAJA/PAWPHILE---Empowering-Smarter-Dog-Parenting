from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User, DogProfile
from app.services import cloudinary_service

router = APIRouter()

@router.post("/image")
async def upload_image(
    image: UploadFile = File(...),
    dog_id: UUID = Form(None),
    folder: str = Form("pawphile/general"),
    clerk_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload image to Cloudinary. Backend handles all Cloudinary secrets.
    Frontend never receives CLOUDINARY_API_SECRET.
    """
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if dog_id:
        dog = db.query(DogProfile).filter(DogProfile.id == dog_id, DogProfile.user_id == user.id).first()
        if not dog:
            raise HTTPException(status_code=403, detail="Dog not owned by this user.")
        folder = f"pawphile/dogs/{dog_id}"

    image_bytes = await image.read()
    try:
        result = cloudinary_service.upload_image(image_bytes, folder=folder)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    return {
        "secure_url": result["secure_url"],
        "public_id": result["public_id"],
    }
