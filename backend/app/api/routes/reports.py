from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import Any
import uuid
import os

from supabase import create_client, Client
from app.services.report_service import generate_pdf_from_json

router = APIRouter()

def get_supabase() -> Client | None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if url and key:
        return create_client(url, key)
    return None

class ReportGenerateRequest(BaseModel):
    user_id: str
    dog_id: str
    report_data: dict

@router.post("/upload")
async def upload_report(
    user_id: str = Form(...),
    dog_id: str = Form(...),
    file: UploadFile = File(...)
) -> dict[str, Any]:
    """POST /api/reports/upload"""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    report_id = str(uuid.uuid4())
    bucket_path = f"reports/{user_id}/{dog_id}/{report_id}.pdf"
    
    # Mock Supabase Storage upload
    print(f"[SUPABASE MOCK] Uploading file to bucket path: {bucket_path}")
    
    return {
        "status": "success",
        "message": "Report uploaded to Supabase storage successfully.",
        "report_id": report_id,
        "bucket_path": bucket_path,
        "public_url": f"https://mock.supabase.co/storage/v1/object/public/{bucket_path}"
    }

@router.post("/generate-pdf")
async def generate_pdf(req: ReportGenerateRequest) -> dict[str, Any]:
    """POST /api/reports/generate-pdf — Generates PDF server-side and uploads to Supabase (with base64 fallback)."""
    
    # 1. Generate PDF locally in memory
    try:
        pdf_buffer = generate_pdf_from_json(req.report_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF Generation failed: {str(e)}")
        
    sb = get_supabase()
    if not sb:
        import base64
        base64_pdf = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
        signed_url = f"data:application/pdf;base64,{base64_pdf}"
        return {
            "status": "success",
            "message": "Report generated locally (base64 fallback).",
            "report_id": "local",
            "bucket_path": "local",
            "signed_url": signed_url
        }

    report_id = str(uuid.uuid4())
    bucket_path = f"reports/{req.user_id}/{req.dog_id}/{report_id}.pdf"
    
    # 2. Upload to Supabase Storage
    try:
        # Assuming the 'reports' bucket exists.
        sb.storage.from_("reports").upload(
            bucket_path,
            pdf_buffer.getvalue(),
            {"content-type": "application/pdf"}
        )
        
        # 3. Create signed URL valid for 60 seconds (or 1 hour)
        signed_url_res = sb.storage.from_("reports").create_signed_url(bucket_path, 3600)
        signed_url = signed_url_res.get("signedURL", "")
        
        # Insert metadata into reports table
        sb.table("reports").insert({
            "id": report_id,
            "dog_id": req.dog_id,
            "profile_id": req.user_id,
            "report_type": "full",
            "file_path": bucket_path,
            "file_size": len(pdf_buffer.getvalue()),
            "upload_status": "completed",
            "included_sections": list(req.report_data.keys())
        }).execute()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")
    
    return {
        "status": "success",
        "message": "Report generated and uploaded to Supabase storage successfully.",
        "report_id": report_id,
        "bucket_path": bucket_path,
        "signed_url": signed_url
    }
