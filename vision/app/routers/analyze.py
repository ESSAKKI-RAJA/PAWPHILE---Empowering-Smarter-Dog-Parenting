from fastapi import APIRouter, HTTPException
from app.schemas.api_models import VisionRequest, VisionResponse
from app.services.skin_service import skin_service

from app.services.eye_service import eye_service
from app.services.ear_service import ear_service

router = APIRouter()

@router.post("/analyze", response_model=VisionResponse)
async def analyze_image(request: VisionRequest):
    try:
        if request.body_area.lower() == "skin":
            result = skin_service.analyze(request.image_base64)
            return VisionResponse(**result)
            
        elif request.body_area.lower() == "eye":
            result = eye_service.analyze(request.image_base64)
            return VisionResponse(**result)
            
        elif request.body_area.lower() == "ear":
            result = ear_service.analyze(request.image_base64)
            return VisionResponse(**result)
            
        else:
            raise HTTPException(status_code=400, detail="Invalid body_area parameter. Must be 'skin', 'eye', or 'ear'.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
