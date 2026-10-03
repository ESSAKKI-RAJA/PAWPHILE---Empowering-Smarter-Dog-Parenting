from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from io import BytesIO
from sqlalchemy.orm import Session
from uuid import UUID
from PIL import Image
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User, DogProfile
from app.services import cloudinary_service

router = APIRouter()

ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 15 * 1024 * 1024  # same cap as the BIN1 file registry


def _verified_image_bytes(image: UploadFile, image_bytes: bytes) -> None:
    """MIME allow-list + size cap + decodability. Raises 422 on any failure."""
    if (image.content_type or "") not in ALLOWED_IMAGE_MIME:
        raise HTTPException(status_code=422, detail="Only JPEG/PNG/WebP images are accepted.")
    if len(image_bytes) == 0 or len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=422, detail="Image must be non-empty and within 15MB.")
    try:
        with Image.open(BytesIO(image_bytes)) as img:
            img.verify()
    except Exception:
        raise HTTPException(status_code=422, detail="File is not a decodable image.")


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
    else:
        # Client-supplied folder paths are never trusted; unscoped uploads
        # go to the single general folder.
        folder = "pawphile/general"

    image_bytes = await image.read()
    _verified_image_bytes(image, image_bytes)
    try:
        result = cloudinary_service.upload_image(image_bytes, folder=folder)
    except ValueError as e:
        # Configuration problems are reported truthfully, never as success.
        raise HTTPException(status_code=503, detail=str(e)[:200])
    except Exception:
        raise HTTPException(status_code=500, detail="Upload failed.")

    return {
        "secure_url": result["secure_url"],
        "public_id": result["public_id"],
    }
