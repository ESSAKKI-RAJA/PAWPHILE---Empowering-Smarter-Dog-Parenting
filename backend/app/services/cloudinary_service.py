import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

def upload_image(file_bytes: bytes, folder: str = "pawphile", public_id: str = None) -> dict:
    """
    Upload an image to Cloudinary.
    Returns dict with secure_url, public_id, format, width, height.
    Raises on failure.
    """
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise ValueError("Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env")

    upload_options = {"folder": folder}
    if public_id:
        upload_options["public_id"] = public_id

    result = cloudinary.uploader.upload(file_bytes, **upload_options)
    return {
        "secure_url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "format": result.get("format"),
        "width": result.get("width"),
        "height": result.get("height"),
    }

def delete_image(public_id: str) -> bool:
    """Delete an image from Cloudinary by public_id."""
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception:
        return False
