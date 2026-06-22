from pydantic import BaseModel
from typing import Optional
from app.triage.triage import TriageLevel

class VisionRequest(BaseModel):
    image_base64: str
    body_area: str  # "skin", "eye", "ear"

class VisionResponse(BaseModel):
    predicted_class: str
    confidence_score: float
    triage_level: TriageLevel
    reason_text: str
    gradcam_url: Optional[str] = None
    disclaimer: str
