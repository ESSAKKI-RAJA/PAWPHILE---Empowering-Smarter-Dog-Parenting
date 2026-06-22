import httpx
import base64
from app.core.config import settings

VISION_API_URL = settings.VISION_API_URL

async def run_vision_scan(image_bytes: bytes, scan_type: str, filename: str) -> dict:
    """
    Call the Vision FastAPI service with image bytes converted to base64.
    Returns prediction dict or raises on error.
    """
    try:
        # Convert bytes to base64 string for the Vision API
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        
        # Map frontend scan types to vision body areas
        body_area_map = {
            "Skin": "skin",
            "Paws": "skin",
            "Eyes": "eye",
            "Ears": "ear",
            "Injury/Wound": "skin"
        }
        body_area = body_area_map.get(scan_type, "skin")

        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "image_base64": image_base64,
                "body_area": body_area
            }
            response = await client.post(
                f"{VISION_API_URL}/api/v1/analyze",
                json=payload
            )
            response.raise_for_status()
            vision_data = response.json()
            
            # Map vision response to backend schema
            return {
                "prediction": vision_data.get("predicted_class"),
                "confidence": vision_data.get("confidence_score"),
                "explanation": vision_data.get("reason_text"),
                "recommendation": vision_data.get("disclaimer"),
                "severity_level": vision_data.get("triage_level"),
                "disclaimer": vision_data.get("disclaimer")
            }

    except httpx.ConnectError:
        return {
            "error": "Vision service unavailable. Please try again later.",
            "prediction": None,
            "confidence": None,
            "explanation": "The AI vision analysis service is currently offline.",
            "recommendation": "Please consult a veterinarian directly for image-based assessments.",
            "severity_level": "yellow"
        }
    except Exception as e:
        return {
            "error": f"Vision service error: {str(e)}",
            "prediction": None,
            "confidence": None,
            "explanation": "An unexpected error occurred with vision analysis.",
            "recommendation": "Please consult a veterinarian.",
            "severity_level": "yellow"
        }
