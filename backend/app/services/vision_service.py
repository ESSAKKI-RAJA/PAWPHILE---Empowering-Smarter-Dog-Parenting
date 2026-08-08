import json
import logging
import asyncio
from io import BytesIO
from PIL import Image
from inference_sdk import InferenceHTTPClient
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize client globally if possible, but we can also instantiate per request.
# Initializing here to reuse the connection pool if the SDK supports it.
_client = None

def get_roboflow_client():
    global _client
    if _client is None:
        _client = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key=settings.ROBOFLOW_API_KEY
        )
    return _client

async def run_vision_scan(image_bytes: bytes, scan_type: str, filename: str) -> dict:
    """
    Call the Roboflow vision screening workflow using inference-sdk.
    """
    try:
        # Load image into PIL
        try:
            image = Image.open(BytesIO(image_bytes))
            if image.mode != "RGB":
                image = image.convert("RGB")
        except Exception as e:
            return {
                "error": f"Failed to process image format: {str(e)}",
                "prediction": None,
                "confidence": None,
                "explanation": "Image could not be read. Please upload a valid image file.",
                "recommendation": "Try uploading a clear, standard JPEG or PNG image.",
                "severity_level": "yellow"
            }

        client = get_roboflow_client()
        
        # Exponential backoff for up to 2 retries (3 attempts total)
        max_retries = 2
        result = None
        last_exception = None

        for attempt in range(max_retries + 1):
            try:
                # inference-sdk client.run_workflow is synchronous, so we run it in a thread
                result = await asyncio.to_thread(
                    client.run_workflow,
                    workspace_name="essakki-raja-t",
                    workflow_id="pawphile-screening-prototype-1786216219585",
                    images={"image": image},
                    use_cache=True
                )
                break
            except Exception as e:
                last_exception = e
                if attempt < max_retries:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise e

        # Parse Roboflow Result
        # The result is expected to be a list of dictionaries for each image
        if not result or not isinstance(result, list) or len(result) == 0:
            raise ValueError("Unexpected empty result from Roboflow workflow")

        first_result = result[0]
        screening_str = first_result.get("screening_result")
        if not screening_str:
            raise ValueError("No screening_result found in workflow output")
            
        screening_data = json.loads(screening_str)
        
        raw_triage = screening_data.get("triage", "Yellow")
        triage_lower = raw_triage.lower()
        
        # Normalize triage
        if triage_lower not in ["green", "yellow", "red"]:
            triage_lower = "yellow"

        concerns = screening_data.get("concerns", [])
        if concerns:
            prediction = concerns[0] if len(concerns) == 1 else "Multiple concerns detected"
        else:
            prediction = "No specific visual concern identified"

        return {
            "prediction": prediction,
            "confidence": screening_data.get("confidence"),
            "explanation": screening_data.get("summary", "No summary provided."),
            "recommendation": screening_data.get("disclaimer", "Consult a veterinarian."),
            "severity_level": triage_lower,
            "disclaimer": screening_data.get("disclaimer")
        }

    except Exception as e:
        logger.error(f"Vision service error: {str(e)}")
        return {
            "error": "Vision service unavailable. Please try again later.",
            "prediction": None,
            "confidence": None,
            "explanation": "The AI vision analysis service is currently unavailable.",
            "recommendation": "Please try again later or consult a veterinarian.",
            "severity_level": "yellow"
        }
