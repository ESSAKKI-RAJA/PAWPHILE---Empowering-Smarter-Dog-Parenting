"""Legacy report upload / PDF generation endpoints — now authenticated + ownership-checked.

Security model (fail-closed):
- Every endpoint requires the project-standard Clerk identity
  (``Depends(get_current_user)``). No anonymous access.
- Client-supplied ``user_id`` is NEVER trusted. The authenticated user's
  identity comes from the verified token; ownership is established via
  ``require_dog_ownership`` before any storage path, DB write, or signed
  URL is produced.
- Storage keys are server-derived
  (``reports/{user_id}/{dog_id}/{server_report_id}.pdf``) from the
  authenticated principal + validated dog. Path traversal is impossible
  because no client string enters the key.
- PDF bytes are validated (MIME + extension + size + ``%PDF`` magic)
  before any persistence attempt.
- Error responses are generic; diagnostics go to server logs only.
"""
import logging
import os
import uuid
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from supabase import create_client, Client

from app.core.ownership import require_dog_ownership
from app.core.security import get_current_user
from app.db.session import get_db
from app.services.report_service import generate_pdf_from_json

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_PDF_BYTES = 15 * 1024 * 1024  # same cap as the image upload standard
ALLOWED_PDF_MIME = {"application/pdf"}
MAX_REPORT_KEYS = 200
MAX_REPORT_JSON_CHARS = 200_000


def get_supabase() -> Client | None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if url and key:
        return create_client(url, key)
    return None


class ReportGenerateRequest(BaseModel):
    # NOTE: no user_id field by design. Identity comes from the verified
    # token; any legacy client sending user_id gets a validation error.
    dog_id: str
    report_data: dict = Field(default_factory=dict)

    model_config = {"extra": "forbid"}


def _verified_pdf_bytes(filename: str | None, content_type: str | None, data: bytes) -> None:
    """MIME + extension + size + magic-byte validation. Raises 422 on failure."""
    if (content_type or "") not in ALLOWED_PDF_MIME:
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")
    name = (filename or "").lower()
    if not name.endswith(".pdf") or "/" in name or "\\" in name or ".." in name:
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")
    if len(data) == 0 or len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=422, detail="File must be non-empty and within 15MB.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status_code=422, detail="File is not a valid PDF document.")


def _validate_report_data(report_data: Any) -> dict:
    if not isinstance(report_data, dict) or not report_data:
        raise HTTPException(status_code=422, detail="report_data must be a non-empty object.")
    if len(report_data) > MAX_REPORT_KEYS:
        raise HTTPException(status_code=422, detail="report_data has too many sections.")
    if len(str(report_data)) > MAX_REPORT_JSON_CHARS:
        raise HTTPException(status_code=422, detail="report_data is too large.")
    return report_data


@router.post("/upload")
async def upload_report(
    dog_id: UUID = Form(...),
    file: UploadFile = File(...),
    clerk_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """POST /api/reports/upload — authenticated, ownership-checked PDF intake."""
    user_dog = require_dog_ownership(dog_id, clerk_user_id, db)
    _ = user_dog  # ownership established; dog/user rows resolved server-side

    # Re-resolve server-side identities for the storage namespace (never client strings).
    from app.core.ownership import get_user_or_404

    user = get_user_or_404(clerk_user_id, db)
    pdf_bytes = await file.read()
    _verified_pdf_bytes(file.filename, file.content_type, pdf_bytes)

    report_id = str(uuid.uuid4())
    bucket_path = f"reports/{user.id}/{dog_id}/{report_id}.pdf"

    logger.info("report upload accepted report_id=%s bytes=%d", report_id, len(pdf_bytes))
    return {
        "status": "success",
        "message": "Report uploaded successfully.",
        "report_id": report_id,
        "bucket_path": bucket_path,
        # BIN1 honesty label: legacy mock path. Canonical reports live at /api/v1/pets/{id}/reports.
        "mock": True,
        "warning": "Legacy mock endpoint: no bytes were persisted. Use POST /api/v1/pets/{pet_id}/reports + /generate for authoritative reports.",
    }


@router.post("/generate-pdf")
async def generate_pdf(
    req: ReportGenerateRequest,
    clerk_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """POST /api/reports/generate-pdf — ownership-checked server-side generation."""
    try:
        dog_uuid = UUID(str(req.dog_id))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=422, detail="dog_id must be a valid UUID.")
    dog = require_dog_ownership(dog_uuid, clerk_user_id, db)

    from app.core.ownership import get_user_or_404

    user = get_user_or_404(clerk_user_id, db)
    report_data = _validate_report_data(req.report_data)

    # 1. Generate PDF locally in memory
    try:
        pdf_buffer = generate_pdf_from_json(report_data)
    except Exception:
        logger.exception("report pdf generation failed")
        raise HTTPException(status_code=500, detail="Unable to generate the report.")

    sb = get_supabase()
    if not sb:
        import base64

        base64_pdf = base64.b64encode(pdf_buffer.getvalue()).decode("utf-8")
        signed_url = f"data:application/pdf;base64,{base64_pdf}"
        return {
            "status": "success",
            "message": "Report generated locally (base64 fallback).",
            "report_id": "local",
            "bucket_path": "local",
            "signed_url": signed_url,
        }

    report_id = str(uuid.uuid4())
    bucket_path = f"reports/{user.id}/{dog.id}/{report_id}.pdf"

    # 2. Upload to Supabase Storage (ownership already established above)
    try:
        sb.storage.from_("reports").upload(
            bucket_path,
            pdf_buffer.getvalue(),
            {"content-type": "application/pdf"},
        )

        # 3. Create signed URL valid for 1 hour (never a public URL)
        signed_url_res = sb.storage.from_("reports").create_signed_url(bucket_path, 3600)
        signed_url = signed_url_res.get("signedURL", "")

        # Insert metadata into reports table using server-derived identities
        sb.table("reports").insert({
            "id": report_id,
            "dog_id": str(dog.id),
            "profile_id": str(user.id),
            "report_type": "full",
            "file_path": bucket_path,
            "file_size": len(pdf_buffer.getvalue()),
            "upload_status": "completed",
            "included_sections": list(report_data.keys()),
        }).execute()

    except Exception:
        logger.exception("report storage upload failed")
        raise HTTPException(status_code=500, detail="Unable to store the report.")

    return {
        "status": "success",
        "message": "Report generated and uploaded successfully.",
        "report_id": report_id,
        "bucket_path": bucket_path,
        "signed_url": signed_url,
    }
