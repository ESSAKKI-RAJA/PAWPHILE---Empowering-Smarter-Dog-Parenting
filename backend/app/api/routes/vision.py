from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
import logging
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.all_models import User, DogProfile, VisionScanRecord
from app.schemas.schemas import VisionScanOut
from app.services import cloudinary_service, vision_service
from app.api.routes.uploads import _verified_image_bytes

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_SCAN_TYPE_CHARS = 80

def _verify_dog_ownership(dog_id: UUID, clerk_user_id: str, db: Session) -> DogProfile:
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    dog = db.query(DogProfile).filter(DogProfile.id == dog_id, DogProfile.user_id == user.id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found or not owned by this user.")
    return dog

@router.post("/scan", response_model=VisionScanOut, status_code=201)
async def run_vision_scan(
    dog_id: UUID = Form(...),
    scan_type: str = Form(...),
    image: UploadFile = File(...),
    clerk_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload image to Cloudinary, call Vision service, save result to Neon."""
    _verify_dog_ownership(dog_id, clerk_user_id, db)

    scan_type_clean = (scan_type or "").strip()
    if not scan_type_clean or len(scan_type_clean) > MAX_SCAN_TYPE_CHARS:
        raise HTTPException(status_code=422, detail="scan_type must be 1-80 characters.")

    image_bytes = await image.read()
    # Same policy as /api/uploads/image: MIME allow-list + 15MB cap +
    # decodability, validated BEFORE any Cloudinary/ML call.
    _verified_image_bytes(image, image_bytes)

    # Upload to Cloudinary (backend only — secret stays server-side)
    try:
        upload_result = cloudinary_service.upload_image(
            image_bytes,
            folder=f"pawphile/vision/{dog_id}",
        )
        image_url = upload_result["secure_url"]
        public_id = upload_result["public_id"]
    except Exception:
        logger.exception("vision image upload failed")
        raise HTTPException(status_code=500, detail="Unable to process the image.")

    # Call Vision service
    vision_result = await vision_service.run_vision_scan(image_bytes, scan_type, image.filename or "scan.jpg")

    # Save to Neon
    record = VisionScanRecord(
        dog_id=dog_id,
        scan_type=scan_type,
        image_url=image_url,
        public_id=public_id,
        prediction=vision_result.get("prediction"),
        confidence=vision_result.get("confidence"),
        explanation=vision_result.get("explanation"),
        recommendation=vision_result.get("recommendation"),
        severity_level=vision_result.get("severity_level"),
        created_at=datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/scans/{dog_id}", response_model=List[VisionScanOut])
def get_vision_scans(dog_id: UUID, clerk_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify_dog_ownership(dog_id, clerk_user_id, db)
    return db.query(VisionScanRecord).filter(VisionScanRecord.dog_id == dog_id).order_by(VisionScanRecord.created_at.desc()).all()
