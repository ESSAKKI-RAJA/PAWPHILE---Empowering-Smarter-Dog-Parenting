"""PAW AI API routes — Phase 3 endpoints.

Access model (explicit allow-list):
- PUBLIC (no user data, no inference cost, static reference content):
  ``GET /breed-context/{breed}``, ``GET /breeds``, ``POST /food-safety``.
- PROTECTED (Clerk JWT required): ``/chat``, ``/stream``, ``/triage``,
  ``/vet-report``, ``/knowledge/ingest`` — these invoke paid AI inference
  and/or process caller-supplied pet/health context.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Any, Optional
from app.core.security import get_current_user
from app.services.paw_ai_engine import (
    paw_ai_supervisor, paw_ai_stream_supervisor, build_dog_context, get_breed_context,
    detect_emergency, BREED_RULES,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Request / Response schemas ────────────────────────────────

class GroqMessage(BaseModel):
    role: str = Field(max_length=20)
    content: str = Field(max_length=4000)


class GroqChatRequest(BaseModel):
    messages: list[GroqMessage] = Field(default_factory=list, max_length=50)
    userInput: Optional[str] = Field(default=None, max_length=4000)
    context: Optional[dict[str, Any]] = None


class ChatRequest(BaseModel):
    query: str = Field(max_length=2000)
    user_id: Optional[str] = Field(default=None, max_length=200)
    dog_id: Optional[str] = Field(default=None, max_length=200)
    dog_profile: Optional[dict[str, Any]] = None
    records: Optional[dict[str, Any]] = None


class TriageRequest(BaseModel):
    symptoms: list[str] = Field(max_length=20)
    additional_details: Optional[str] = Field(default=None, max_length=2000)
    food_type: Optional[str] = Field(default=None, max_length=200)
    vaccination_status: Optional[str] = Field(default=None, max_length=200)
    symptom_duration: Optional[str] = Field(default=None, max_length=200)
    tick_exposure: Optional[bool] = None
    diet_change: Optional[bool] = None
    boarding: Optional[bool] = None
    toxin_exposure: Optional[bool] = None
    dog_profile: Optional[dict[str, Any]] = None
    records: Optional[dict[str, Any]] = None


class FoodSafetyRequest(BaseModel):
    food_name: str = Field(max_length=200)
    dog_profile: Optional[dict[str, Any]] = None


class VetReportRequest(BaseModel):
    dog_profile: Optional[dict[str, Any]] = None
    records: Optional[dict[str, Any]] = None


class KnowledgeIngestRequest(BaseModel):
    title: str = Field(max_length=200)
    source: str = Field(max_length=500)
    content: str = Field(max_length=20000)
    topic_tags: Optional[list[str]] = Field(default=None, max_length=10)


# ── Toxic foods reference ─────────────────────────────────────
TOXIC_FOODS = {
    "chocolate": {"toxic": True, "severity": "high", "reason": "Theobromine toxicity — cardiac/neurological effects. Emergency at any dose."},
    "grapes": {"toxic": True, "severity": "high", "reason": "Acute kidney failure. Mechanism unknown. Even small amounts fatal."},
    "raisins": {"toxic": True, "severity": "high", "reason": "Same as grapes — acute renal failure."},
    "onion": {"toxic": True, "severity": "medium", "reason": "Haemolytic anaemia — destroys red blood cells."},
    "garlic": {"toxic": True, "severity": "medium", "reason": "Same as onion. Concentrated — more toxic per gram."},
    "xylitol": {"toxic": True, "severity": "high", "reason": "Severe hypoglycaemia and liver failure. Found in sugar-free gum/peanut butter."},
    "macadamia nuts": {"toxic": True, "severity": "medium", "reason": "Weakness, tremors, fever. Mechanism unknown."},
    "avocado": {"toxic": True, "severity": "medium", "reason": "Persin causes vomiting/diarrhoea. High-fat content causes pancreatitis."},
    "alcohol": {"toxic": True, "severity": "high", "reason": "CNS depression, hypoglycaemia, metabolic acidosis."},
    "caffeine": {"toxic": True, "severity": "high", "reason": "Cardiac arrhythmia, tremors, seizures."},
    "cooked bones": {"toxic": False, "safe": False, "severity": "medium", "reason": "Splinter risk — GI perforation. Raw meaty bones safer but always supervised."},
    "raw chicken": {"toxic": False, "safe": True, "severity": "low", "reason": "Generally safe in raw-fed dogs. Salmonella risk for immunocompromised dogs. Consult vet."},
    "rice": {"toxic": False, "safe": True, "severity": "none", "reason": "Safe and easily digestible. Good for upset stomach."},
    "carrots": {"toxic": False, "safe": True, "severity": "none", "reason": "Safe, low calorie, good dental benefit."},
    "eggs": {"toxic": False, "safe": True, "severity": "none", "reason": "Safe cooked. Raw egg whites contain avidin (biotin inhibitor) — limit raw."},
    "milk": {"toxic": False, "safe": False, "severity": "low", "reason": "Many dogs are lactose intolerant. Small amounts may cause diarrhoea."},
    "peanut butter": {"toxic": False, "safe": True, "severity": "low", "reason": "Safe if xylitol-free. Check label carefully."},
    "mango": {"toxic": False, "safe": True, "severity": "none", "reason": "Safe in small amounts without pit/skin. High sugar — limit in obese dogs."},
    "apple": {"toxic": False, "safe": True, "severity": "low", "reason": "Safe without seeds/core. Seeds contain amygdalin (cyanide precursor)."},
}


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/chat")
def paw_ai_chat(req: GroqChatRequest, clerk_user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    """POST /api/paw-ai/chat — protected: invokes the configured AI provider
    (Muse Glimmer 30 when configured, else Groq) behind PAW AI guardrails."""
    import json
    from app.services.ai_provider import (
        chat_complete, parse_provider_content,
        ProviderError, ProviderNotConfigured,
    )

    dog_ctx = req.context or {}
    system_prompt = (
        "You are PAW AI, an expert veterinary assistant. "
        "You MUST output ONLY valid JSON. Your JSON must exactly match this structure: "
        '{"message": "Your response here...", "severity": "Green/Orange/Red", "confidence": 0.85, '
        '"dataUsed": ["Query content"], "nextAction": "Monitor at home", "vetEscalation": "Consult if...", '
        '"followUpQuestions": ["How long has this been happening?"], "redFlags": []}. '
        "NEVER make a diagnosis. If there is a risk, err on the side of caution and advise seeing a vet. "
        "Keep the message friendly, ask clarifying questions, and provide evidence-based guidance. "
        f"Context: {json.dumps(dog_ctx)}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        messages.append({"role": m.role, "content": m.content})

    if req.userInput:
        messages.append({"role": "user", "content": req.userInput})

    try:
        result = chat_complete(messages)
        parsed = parse_provider_content(result.content)

        disclaimer = "\n\n*PAW AI is a decision-support tool, not a veterinarian. Always consult a licensed vet for diagnosis and treatment.*"
        if disclaimer not in parsed.get("message", ""):
            parsed["message"] = parsed.get("message", "") + disclaimer

        return parsed
    except ProviderNotConfigured:
        logger.warning("paw-ai provider not configured")
        raise HTTPException(status_code=502, detail="PAW AI is currently unavailable. Please try again later.")
    except ProviderError as e:
        if e.status is not None and e.status != 200:
            logger.warning("paw-ai provider upstream error status=%s", e.status)
        raise HTTPException(status_code=502, detail="PAW AI is currently unavailable. Please try again later.")
    except HTTPException:
        raise
    except Exception:
        logger.exception("paw-ai chat failed")
        return {
            "message": "Sorry, I am currently unavailable. Please try again later.",
            "severity": "Green",
            "confidence": 0.5,
            "dataUsed": [],
            "nextAction": "Try again later",
            "vetEscalation": "",
            "followUpQuestions": [],
            "redFlags": []
        }

@router.post("/stream")
async def paw_ai_stream(req: ChatRequest, clerk_user_id: str = Depends(get_current_user)):
    """POST /api/paw-ai/stream — protected SSE endpoint (auth before generation)."""
    """POST /api/paw-ai/stream — SSE Async Streaming endpoint."""
    dog_ctx = build_dog_context(req.dog_profile or {}, req.records or {})
    return StreamingResponse(
        paw_ai_stream_supervisor(req.query, dog_ctx),
        media_type="text/event-stream"
    )


@router.post("/triage")
def paw_ai_triage(req: TriageRequest, clerk_user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    """POST /api/paw-ai/triage — protected structured symptom triage."""
    """POST /api/paw-ai/triage — Structured symptom triage."""
    # Augment query with structured risk flags
    extra = []
    if req.toxin_exposure:  extra.append("toxin exposure")
    if req.tick_exposure:   extra.append("tick exposure")
    if req.boarding:        extra.append("recent boarding")

    query = f"Symptoms: {', '.join(req.symptoms)}. {req.additional_details or ''}. {' '.join(extra)}"
    dog_ctx = build_dog_context(req.dog_profile or {}, req.records or {})

    # Pass vaccination status into context
    if req.vaccination_status:
        dog_ctx["vaccine_status"] = req.vaccination_status

    result = paw_ai_supervisor(query, dog_ctx, symptoms=req.symptoms)

    # Inject triage metadata
    result["triage_metadata"] = {
        "symptoms_reported": req.symptoms,
        "duration": req.symptom_duration,
        "food_type": req.food_type,
        "vaccination_status": req.vaccination_status,
        "risk_factors": {
            "tick_exposure": req.tick_exposure,
            "diet_change": req.diet_change,
            "boarding": req.boarding,
            "toxin_exposure": req.toxin_exposure,
        },
    }
    return result


@router.get("/breed-context/{breed}")
def get_breed_info(breed: str) -> dict[str, Any]:
    """GET /api/paw-ai/breed-context/{breed}"""
    ctx = get_breed_context(breed)
    return {
        "breed": breed,
        "data_available": bool(ctx.get("notes") and "not yet available" not in ctx.get("notes", "")),
        "profile": ctx,
        "disclaimer": "Breed information is for general guidance only. Individual dogs may vary. Consult your veterinarian.",
    }


@router.post("/food-safety")
def check_food_safety(req: FoodSafetyRequest) -> dict[str, Any]:
    """POST /api/paw-ai/food-safety"""
    key = req.food_name.lower().strip()
    # Try partial match
    match = next((v for k, v in TOXIC_FOODS.items() if k in key or key in k), None)

    if match:
        is_toxic = match.get("toxic", False)
        is_safe  = match.get("safe", not is_toxic)
        severity = match.get("severity", "unknown")
        risk_level = "Red" if (is_toxic and severity == "high") else "Orange" if is_toxic else "Green"
        return {
            "food": req.food_name,
            "is_toxic": is_toxic,
            "is_safe": is_safe,
            "severity": severity,
            "risk_level": risk_level,
            "reason": match.get("reason", ""),
            "action": "Seek emergency vet care immediately." if risk_level == "Red" else
                      "Consult your vet if large quantity consumed." if risk_level == "Orange" else
                      "Safe in normal amounts. Ensure no other toxic ingredients.",
            "disclaimer": "PAWPHILE does not replace veterinary advice. If your dog has consumed something potentially toxic, contact a vet immediately.",
        }

    return {
        "food": req.food_name,
        "is_toxic": None,
        "is_safe": None,
        "severity": "unknown",
        "risk_level": "Orange",
        "reason": "Food not found in PAWPHILE database. Caution advised.",
        "action": "Research this food or ask your vet before feeding it to your dog.",
        "disclaimer": "PAWPHILE does not replace veterinary advice.",
    }


@router.post("/vet-report")
def generate_vet_report(req: VetReportRequest, clerk_user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    """POST /api/paw-ai/vet-report — protected structured health summary."""
    """POST /api/paw-ai/vet-report — Structured health summary."""
    dog_ctx = build_dog_context(req.dog_profile or {}, req.records or {})
    vaccines = dog_ctx.get("vaccine_records", [])
    deworming = dog_ctx.get("deworming_records", [])

    return {
        "report_type": "owner_generated_summary",
        "dog": {
            "name": dog_ctx.get("name"),
            "breed": dog_ctx.get("breed"),
            "age_years": dog_ctx.get("age_years"),
            "weight_kg": dog_ctx.get("weight_kg"),
            "gender": dog_ctx.get("gender"),
            "neutered": dog_ctx.get("neutered"),
        },
        "vaccine_count": len(vaccines),
        "deworming_count": len(deworming),
        "chronic_conditions": dog_ctx.get("chronic_conditions", []),
        "allergies": dog_ctx.get("allergies", []),
        "current_medications": dog_ctx.get("medications", []),
        "disclaimer": "This is an owner-generated health summary, not a certified veterinary document. Always confirm health decisions with a licensed veterinarian.",
        "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
    }


@router.get("/breeds")
def list_breeds() -> dict[str, Any]:
    """GET /api/breeds — List all breed profiles."""
    return {
        "breeds": list(BREED_RULES.keys()),
        "count": len(BREED_RULES),
        "note": "20 core breeds seeded. Additional breeds return basic guidance.",
    }


@router.post("/knowledge/ingest")
def ingest_knowledge(req: KnowledgeIngestRequest, clerk_user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    """POST /api/knowledge/ingest — protected stub (not publicly writable)."""
    """POST /api/knowledge/ingest — Stub for RAG ingestion pipeline."""
    # In production: chunk → embed via sentence-transformers → store in pgvector
    return {
        "status": "accepted",
        "title": req.title,
        "source": req.source,
        "chunk_count_estimate": max(1, len(req.content) // 500),
        "note": "RAG ingestion pipeline ready. Connect sentence-transformers + pgvector to activate.",
    }
