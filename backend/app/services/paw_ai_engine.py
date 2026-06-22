"""
PAW AI Engine — Phase 3
Rule-based supervisor with Ollama/LLM fallback.
No paid APIs required.
"""
from __future__ import annotations
import re
import json
import httpx
from typing import AsyncGenerator
EMERGENCY_KEYWORDS = [
    "collapse", "collapsed", "seizure", "fitting", "convulsion",
    "breathing difficulty", "can't breathe", "labored breathing",
    "pale gums", "blue gums", "white gums", "bloody stool",
    "blood in stool", "blood in vomit", "vomiting blood",
    "repeated vomiting", "swollen belly", "bloated belly",
    "poison", "poisoning", "toxin", "ate something toxic",
    "heatstroke", "heat stroke", "severe weakness",
    "can't stand", "unable to stand", "cannot stand",
    "severe injury", "puppy vomiting", "puppy diarrhea",
    "senior dog sudden weakness", "not breathing", "unconscious",
    "extreme lethargy", "unable to walk",
]

# ── Intent map ────────────────────────────────────────────────
INTENT_KEYWORDS: dict[str, list[str]] = {
    "triage":      ["symptom", "vomiting", "diarrhea", "limping", "not eating", "lethargic", "sick", "unwell", "pain"],
    "breed":       ["breed", "labrador", "pomeranian", "pug", "golden", "husky", "rajapalayam", "kombai", "mudhol"],
    "nutrition":   ["food", "feed", "diet", "calorie", "kibble", "eat", "can eat", "safe to eat"],
    "vaccine":     ["vaccine", "vaccination", "rabies", "dhpp", "booster"],
    "deworming":   ["deworm", "deworming", "worm", "parasite"],
    "bcs":         ["weight", "fat", "obese", "bcs", "bmi", "body condition"],
    "behavior":    ["behavior", "behaviour", "barking", "aggression", "anxiety", "fear"],
    "emergency":   EMERGENCY_KEYWORDS,
    "vet_report":  ["report", "summary", "history", "records"],
}

# ── Breed rule-base ───────────────────────────────────────────
BREED_RULES: dict[str, dict[str, Any]] = {
    "labrador retriever": {
        "obesity_risk": "high", "joint_risk": "high", "exercise_mins": 60,
        "red_flags": ["Rapid weight gain", "Joint swelling", "Exercise intolerance"],
        "notes": "Prone to obesity and hip dysplasia. Weight management is critical.",
    },
    "pomeranian": {
        "obesity_risk": "medium", "joint_risk": "low", "exercise_mins": 30,
        "red_flags": ["Tracheal collapse signs (honking cough)", "Hypoglycaemia in puppies"],
        "notes": "Luxating patella common. Watch for tracheal issues.",
    },
    "pug": {
        "obesity_risk": "high", "joint_risk": "medium", "exercise_mins": 20,
        "red_flags": ["Any breathing difficulty", "Eye prolapse", "Overheating"],
        "notes": "Brachycephalic — highly heat sensitive. Limit exercise in heat.",
    },
    "german shepherd": {
        "obesity_risk": "low", "joint_risk": "high", "exercise_mins": 60,
        "red_flags": ["Bloat/GDV signs", "Hind-leg weakness", "Degenerative myelopathy"],
        "notes": "GDV is life-threatening in this breed — bloated belly = emergency.",
    },
    "golden retriever": {
        "obesity_risk": "medium", "joint_risk": "high", "exercise_mins": 60,
        "red_flags": ["Lumps/masses", "Pale gums", "Exercise intolerance"],
        "notes": "Higher cancer risk vs other breeds. Annual vet check critical.",
    },
    "indian pariah dog": {
        "obesity_risk": "low", "joint_risk": "low", "exercise_mins": 45,
        "red_flags": ["Tick fever signs", "Mange lesions spreading"],
        "notes": "Hardy breed. Watch for tick-borne diseases in India.",
    },
    "rajapalayam": {
        "obesity_risk": "low", "joint_risk": "medium", "exercise_mins": 60,
        "red_flags": ["Deafness (white coat gene)", "Skin infection in heat"],
        "notes": "Indian sighthound. Needs high exercise. White coat — sun sensitivity.",
    },
    "kombai": {
        "obesity_risk": "low", "joint_risk": "low", "exercise_mins": 60,
        "red_flags": ["Aggression if under-socialised"],
        "notes": "Native Tamil Nadu breed. Independent temperament. Regular socialisation needed.",
    },
    "mudhol hound": {
        "obesity_risk": "low", "joint_risk": "medium", "exercise_mins": 75,
        "red_flags": ["Thin skin — wound infections", "Sensitivity to anaesthesia (sighthound)"],
        "notes": "Sighthound — low body fat means anaesthesia requires specialist vet.",
    },
    "dachshund": {
        "obesity_risk": "high", "joint_risk": "high", "exercise_mins": 30,
        "red_flags": ["Back pain", "Paralysis signs", "IVDD warning"],
        "notes": "IVDD (intervertebral disc disease) is the #1 risk. Avoid stairs/jumping.",
    },
    "siberian husky": {
        "obesity_risk": "low", "joint_risk": "medium", "exercise_mins": 90,
        "red_flags": ["Overheating in India", "Eye conditions (cataracts)"],
        "notes": "Extreme heat sensitivity in Indian climate. Keep indoors in summer.",
    },
    "great dane": {
        "obesity_risk": "medium", "joint_risk": "high", "exercise_mins": 45,
        "red_flags": ["Bloat/GDV", "Cardiomyopathy", "Wobbler syndrome"],
        "notes": "GDV emergency risk. Short lifespan (7-10 yrs). Cardiac screening advised.",
    },
    "chihuahua": {
        "obesity_risk": "medium", "joint_risk": "low", "exercise_mins": 20,
        "red_flags": ["Hypoglycaemia", "Luxating patella", "Tracheal collapse"],
        "notes": "Tiny size — easily injured. Cold sensitive. Small meal frequency important.",
    },
}


# ── Toxic food keywords (deterministic guardrail — pre-LLM) ──
TOXIC_FOOD_KEYWORDS = [
    "chocolate", "grape", "raisin", "onion", "garlic", "xylitol",
    "alcohol", "caffeine", "macadamia", "cooked bone", "spoiled food",
    "ate something", "poisonous", "toxic food", "toxic to dogs",
]


def detect_toxic_food(text: str) -> bool:
    """Deterministic toxic food check — runs before any LLM."""
    t = text.lower()
    return any(kw in t for kw in TOXIC_FOOD_KEYWORDS)


def detect_emergency(text: str) -> bool:
    """Deterministic emergency check — runs before any LLM."""
    t = text.lower()
    return any(kw in t for kw in EMERGENCY_KEYWORDS)


def detect_intent(text: str) -> str:
    t = text.lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(k in t for k in keywords):
            return intent
    return "general"


def get_breed_context(breed: str) -> dict[str, Any]:
    key = breed.lower().strip()
    return BREED_RULES.get(key, {
        "notes": "Breed-specific data not yet available. Consult your veterinarian.",
        "red_flags": [],
    })


def build_dog_context(dog: dict[str, Any], records: dict[str, Any] | None = None) -> dict[str, Any]:
    """Phase 2 — Dog Context Loader."""
    records = records or {}
    from datetime import datetime, date
    dob = dog.get("dateOfBirth") or dog.get("dob")
    age_years = None
    if dob:
        try:
            bd = datetime.fromisoformat(str(dob)).date()
            age_years = round((date.today() - bd).days / 365.25, 1)
        except Exception:
            age_years = dog.get("age")

    return {
        "name":          dog.get("name", "Unknown"),
        "breed":         dog.get("breed", "Unknown"),
        "age_years":     age_years or dog.get("age"),
        "gender":        dog.get("sex") or dog.get("gender"),
        "neutered":      dog.get("neutered"),
        "weight_kg":     dog.get("weight") or dog.get("weightKg"),
        "weight_unit":   dog.get("weightUnit", "kg"),
        "diet_type":     dog.get("dietType"),
        "health_goal":   dog.get("healthGoal"),
        "allergies":     dog.get("allergies", []),
        "past_illnesses":dog.get("pastIllnesses", []),
        "medications":   dog.get("currentMedications", []),
        "vaccine_status":dog.get("vaccineStatus"),
        "deworming_status": dog.get("dewormingStatus"),
        "chronic_conditions": dog.get("chronicConditions", []),
        "vaccine_records": records.get("vaccines", []),
        "deworming_records": records.get("deworming", []),
        "breed_context": get_breed_context(dog.get("breed", "")),
    }


# ── Response schema builder ───────────────────────────────────
def build_response(
    summary: str,
    risk_level: str,
    possible_concern: str,
    reasoning: str,
    data_used: list[str],
    next_action: str,
    what_not_to_do: str,
    vet_escalation_warning: str,
    confidence_score: float,
    source_context_used: list[str] | None = None,
) -> dict[str, Any]:
    """Phase 5 — Mandatory output schema."""
    return {
        "summary": summary,
        "risk_level": risk_level,                     # Green / Orange / Red
        "possible_concern": possible_concern,
        "reasoning": reasoning,
        "data_used": data_used,
        "next_action": next_action,
        "what_not_to_do": what_not_to_do,
        "vet_escalation_warning": vet_escalation_warning,
        "confidence_score": round(confidence_score, 2),
        "source_context_used": source_context_used or ["PAWPHILE Rule Engine v1.0"],
        "disclaimer": (
            "PAWPHILE is a decision-support tool and does NOT replace a veterinarian. "
            "This output is algorithmic guidance only. Always consult a licensed veterinarian "
            "for diagnosis, treatment, or any medical decision regarding your dog."
        ),
    }


# ═══════════════════════════════════════════════════════════════
#  PAW AI SUPERVISOR — Main entry point
# ═══════════════════════════════════════════════════════════════

def paw_ai_supervisor(
    query: str,
    dog_context: dict[str, Any],
    symptoms: list[str] | None = None,
) -> dict[str, Any]:
    """
    Routes request through:
    1. Emergency classifier (deterministic)
    2. Toxic food guardrail (deterministic — pre-LLM)
    3. Intent detector
    4. Specialized rule engine
    5. Safety guardrails
    6. Response formatter
    Falls back gracefully if Ollama unavailable.
    """
    symptoms = symptoms or []
    full_text = f"{query} {' '.join(symptoms)}"

    # ── 1. Emergency classifier ────────────────────────────────
    if detect_emergency(full_text):
        return _emergency_response(dog_context, full_text)

    # ── 2. Toxic food guardrail (deterministic, pre-LLM) ──────
    if detect_toxic_food(full_text):
        return _toxic_food_response(dog_context, full_text)

    # ── 3. Intent ─────────────────────────────────────────────
    intent = detect_intent(full_text)

    # ── 4. Route to engine ────────────────────────────────────
    if intent == "triage":
        return _symptom_triage_engine(query, symptoms, dog_context)
    elif intent == "breed":
        return _breed_intelligence_engine(query, dog_context)
    elif intent == "nutrition":
        return _nutrition_engine(query, dog_context)
    elif intent == "vaccine":
        return _vaccine_guidance_engine(dog_context)
    elif intent == "deworming":
        return _deworming_guidance_engine(dog_context)
    elif intent == "bcs":
        return _bcs_bmi_engine(dog_context)
    elif intent == "behavior":
        return _behavior_engine(query, dog_context)
    else:
        return _general_engine(query, dog_context)


async def paw_ai_stream_supervisor(query: str, dog_context: dict[str, Any], symptoms: list[str] | None = None) -> AsyncGenerator[str, None]:
    """Phase 9 async streaming generator (SSE) connecting to Ollama REST API."""
    symptoms = symptoms or []
    full_text = f"{query} {' '.join(symptoms)}"

    # ── Guardrails (Always intercept stream)
    if detect_emergency(full_text):
        res = _emergency_response(dog_context, full_text)
        yield json.dumps(res)
        return
        
    if detect_toxic_food(full_text):
        res = _toxic_food_response(dog_context, full_text)
        yield json.dumps(res)
        return

    # Prompt Engineering with ContextLoader
    system_prompt = (
        "You are PAWPHILE AI, an expert veterinary assistant. "
        "You MUST output ONLY valid JSON in chunks, or stream text that will be parsed by the client. "
        "We are streaming your response. "
        "NEVER make a diagnosis. If there is a risk, err on the side of caution and advise seeing a vet. "
        f"Context: Name:{dog_context.get('name')} | Breed:{dog_context.get('breed')} | Age:{dog_context.get('age_years')} | "
        f"Weight:{dog_context.get('weight_kg')}kg | Allergies:{dog_context.get('allergies', [])} | "
        f"Past Illness:{dog_context.get('past_illnesses', [])} | Vaccine:{dog_context.get('vaccine_status')} | "
        f"Medications:{dog_context.get('medications', [])}."
    )
    
    try:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", 
                "http://localhost:11434/api/generate",
                json={
                    "model": "llama3",
                    "prompt": query,
                    "system": system_prompt,
                    "stream": True
                },
                timeout=15.0
            ) as response:
                if response.status_code != 200:
                    yield json.dumps(_general_engine(query, dog_context))
                    return
                
                async for chunk in response.aiter_bytes():
                    if chunk:
                        # Ollama sends NDJSON: {"model":"llama3", "response":"...", "done":false}
                        try:
                            data = json.loads(chunk.decode("utf-8"))
                            token = data.get("response", "")
                            if token:
                                yield f"data: {json.dumps({'token': token})}\n\n"
                        except Exception:
                            pass
    except Exception as e:
        yield json.dumps(_general_engine(query, dog_context))



# ── Engine implementations ────────────────────────────────────

def _emergency_response(ctx: dict, text: str) -> dict:
    return build_response(
        summary="🚨 EMERGENCY — Seek immediate veterinary care.",
        risk_level="Red",
        possible_concern="Life-threatening condition detected based on reported symptoms.",
        reasoning="One or more reported symptoms match known emergency red-flag criteria (e.g. collapse, seizure, breathing difficulty, bloody vomit, pale/blue gums, suspected poisoning).",
        data_used=["Emergency keyword classifier", "PAWPHILE Safety Rules v1.0"],
        next_action="Go to the nearest emergency veterinary clinic IMMEDIATELY. Do NOT wait. Call ahead if possible.",
        what_not_to_do="Do NOT offer food or water. Do NOT attempt home treatment. Do NOT wait to see if symptoms improve.",
        vet_escalation_warning="This is a veterinary emergency. Delay can be fatal. Contact your vet or emergency clinic NOW.",
        confidence_score=0.97,
        source_context_used=["PAWPHILE Emergency Classifier", "AVMA Emergency Guidelines"],
    )


def _toxic_food_response(ctx: dict, text: str) -> dict:
    """Deterministic toxic food guardrail — fires before any LLM call."""
    return build_response(
        summary="🚨 TOXIC FOOD ALERT — Dangerous items identified.",
        risk_level="Red",
        possible_concern=(
            "Potential ingestion of highly toxic food. Dogs must NEVER eat: "
            "chocolate, grapes/raisins, onion/garlic, xylitol (artificial sweetener), "
            "alcohol, caffeine, macadamia nuts, cooked bones, or high-fat/spoiled foods."
        ),
        reasoning=(
            "These items can cause acute kidney failure, liver damage, fatal red blood cell "
            "destruction, or severe GI blockage/pancreatitis. This guardrail fired deterministically "
            "before any LLM processing."
        ),
        data_used=["Toxic Foods Guardrail", "Veterinary Emergency Guidelines", "PAWPHILE Safety Rules v1.0"],
        next_action=(
            "If your dog ingested any of these, contact an emergency vet or Pet Poison Helpline "
            "immediately. Know the amount ingested and time of ingestion."
        ),
        what_not_to_do=(
            "Do NOT induce vomiting without explicit veterinary instruction — some toxins cause more "
            "damage coming back up. Do NOT wait for symptoms to appear."
        ),
        vet_escalation_warning=(
            "Time is critical. Treatment within the first 1-2 hours drastically improves prognosis. "
            "Contact your vet NOW."
        ),
        confidence_score=0.99,
        source_context_used=["PAWPHILE Toxic Foods Guardrail", "ASPCA Animal Poison Control"],
    )


def _symptom_triage_engine(query: str, symptoms: list[str], ctx: dict) -> dict:
    breed_ctx = ctx.get("breed_context", {})
    breed_flags = breed_ctx.get("red_flags", [])
    sym_text = ", ".join(symptoms) if symptoms else query

    # Check if any reported symptom matches breed-specific red flags
    breed_match = [f for f in breed_flags if any(w in f.lower() for w in sym_text.lower().split())]

    risk = "Green"
    concern = "Mild or self-limiting condition"
    next_act = "Monitor at home for 24-48 hours. Ensure fresh water. If symptoms persist or worsen, contact your vet."
    what_not = "Do not give human medications (ibuprofen, paracetamol) — they are toxic to dogs."
    esc_warn = "If symptoms worsen, persist beyond 48 hours, or new symptoms appear, consult a veterinarian promptly."

    if any(w in sym_text.lower() for w in ["vomiting", "diarrhea", "not eating", "lethargy"]):
        risk = "Orange"
        concern = "Gastrointestinal disturbance or systemic illness possible"
        next_act = "Withhold food for 6-12 hours (not water). If vomiting/diarrhoea persists beyond 24 hours or dog is very young/old, see a vet within 24 hours."
        esc_warn = "Seek vet care within 24 hours if: no improvement, blood present, puppy/senior dog, or dog is unable to keep water down."

    if breed_match:
        esc_warn += f" Breed-specific alert for {ctx.get('breed','this breed')}: {'; '.join(breed_match)}."

    return build_response(
        summary=f"Symptoms assessed: {sym_text}. Risk level: {risk}.",
        risk_level=risk,
        possible_concern=concern,
        reasoning=f"Assessment based on reported symptoms ({sym_text}), dog profile (breed: {ctx.get('breed')}, age: {ctx.get('age_years')} yrs), and PAWPHILE rule engine. {breed_ctx.get('notes','')}",
        data_used=["Reported symptoms", "Dog profile", "PAWPHILE Symptom Rules", "Breed context"],
        next_action=next_act,
        what_not_to_do=what_not,
        vet_escalation_warning=esc_warn,
        confidence_score=0.72,
    )


def _breed_intelligence_engine(query: str, ctx: dict) -> dict:
    breed = ctx.get("breed", "Unknown")
    bc = ctx.get("breed_context", {})
    return build_response(
        summary=f"Breed profile: {breed}.",
        risk_level="Green",
        possible_concern="No active concern — informational query.",
        reasoning=bc.get("notes", "Breed-specific data not available. Consult your vet."),
        data_used=["Breed profile database", "PAWPHILE Breed Intelligence Engine"],
        next_action=f"Regular vet check-ups recommended. Exercise: ~{bc.get('exercise_mins', 30)} mins/day for this breed.",
        what_not_to_do="Do not ignore breed-specific red flags: " + "; ".join(bc.get("red_flags", ["None documented"])),
        vet_escalation_warning="Annual wellness checks are recommended for all breeds.",
        confidence_score=0.80,
        source_context_used=["PAWPHILE Breed Database", "WSAVA Breed Guidelines"],
    )


def _nutrition_engine(query: str, ctx: dict) -> dict:
    weight = ctx.get("weight_kg") or "unknown"
    rer = round(70 * (float(weight) ** 0.75), 0) if weight != "unknown" else None
    daily = round(rer * 1.6, 0) if rer else None
    return build_response(
        summary=f"Nutrition guidance for {ctx.get('name','your dog')}.",
        risk_level="Green",
        possible_concern="Nutritional imbalance if diet is not matched to breed/age/activity.",
        reasoning=f"Based on weight ({weight} kg): RER ≈ {rer} kcal/day, estimated daily target ≈ {daily} kcal. Adjust for activity level and neutered status.",
        data_used=["Dog weight", "RER formula (70 × W^0.75)", "Activity multiplier"],
        next_action="Feed a complete, balanced commercial dog food or vet-approved home diet. Avoid toxic foods (chocolate, grapes, onions, xylitol).",
        what_not_to_do="Do not feed human junk food, cooked bones, or any toxic foods. Do not change diet abruptly.",
        vet_escalation_warning="Consult your vet before major diet changes, especially for puppies, seniors, or dogs with health conditions.",
        confidence_score=0.75,
    )


def _vaccine_guidance_engine(ctx: dict) -> dict:
    status = ctx.get("vaccine_status", "unknown")
    records = ctx.get("vaccine_records", [])
    return build_response(
        summary=f"Vaccine status: {status}. {len(records)} record(s) on file.",
        risk_level="Green" if status == "up_to_date" else "Orange",
        possible_concern="Incomplete vaccination increases risk of preventable disease.",
        reasoning="Core vaccines for Indian dogs: Rabies (annual), DHPP (annual booster after primary series), Leptospirosis. Timelines per WSAVA/AAHA guidelines.",
        data_used=["Vaccine records", "Dog profile", "WSAVA Vaccination Guidelines"],
        next_action="Schedule a vaccination review with your vet. Keep digital records in PAWPHILE.",
        what_not_to_do="Do not skip core vaccines. Do not administer vaccines without vet supervision.",
        vet_escalation_warning="Overdue vaccines should be addressed promptly — especially Rabies (legally mandated in India) and DHPP.",
        confidence_score=0.85,
        source_context_used=["WSAVA Vaccination Guidelines 2022", "AAHA Canine Vaccination Guidelines"],
    )


def _deworming_guidance_engine(ctx: dict) -> dict:
    return build_response(
        summary="Deworming guidance for your dog.",
        risk_level="Green",
        possible_concern="Parasite burden if deworming is delayed.",
        reasoning="WSAVA recommends deworming every 3 months for adult dogs in India (high parasite exposure). Puppies need more frequent treatment.",
        data_used=["Dog profile", "Deworming records", "WSAVA Parasite Guidelines"],
        next_action="Deworm every 3 months with a vet-recommended broad-spectrum product. Log dates in PAWPHILE.",
        what_not_to_do="Do not use over-the-counter dewormers without vet guidance. Do not skip deworming in high-exposure environments.",
        vet_escalation_warning="If you notice worms in stool, weight loss, or pot-bellied appearance, consult a vet promptly.",
        confidence_score=0.82,
        source_context_used=["WSAVA Parasite Control Guidelines", "AAHA Parasite Prevention Guidelines"],
    )


def _bcs_bmi_engine(ctx: dict) -> dict:
    weight = ctx.get("weight_kg")
    breed_ctx = ctx.get("breed_context", {})
    obesity_risk = breed_ctx.get("obesity_risk", "unknown")
    return build_response(
        summary=f"Body condition assessment for {ctx.get('name','your dog')} ({weight} kg).",
        risk_level="Orange" if obesity_risk == "high" else "Green",
        possible_concern="Obesity risk" if obesity_risk == "high" else "Normal weight range likely.",
        reasoning=f"Breed obesity risk: {obesity_risk}. Use the BCS tool in PAWPHILE for a 9-point scale assessment. Ideal BCS is 4-5/9.",
        data_used=["Dog weight", "Breed obesity risk profile", "BCS scale (WSAVA 1-9)"],
        next_action="Use the BCS / BMI Calculator in PAWPHILE. Confirm BCS with your vet at next check-up.",
        what_not_to_do="Do not restrict food severely without vet guidance. Gradual weight loss (1-2% per week) is safest.",
        vet_escalation_warning="If BCS is 7+/9, consult a vet for a weight management plan. Obesity reduces lifespan significantly.",
        confidence_score=0.70,
        source_context_used=["WSAVA Body Condition Score Guidelines", "AAHA Weight Management Guidelines"],
    )


def _behavior_engine(query: str, ctx: dict) -> dict:
    return build_response(
        summary="Behaviour guidance — informational response.",
        risk_level="Green",
        possible_concern="Behavioural issues may indicate anxiety, pain, or training needs.",
        reasoning="Common dog behaviour issues (barking, aggression, anxiety) often respond well to positive reinforcement training. Sudden behaviour change may signal pain.",
        data_used=["Query content", "Dog profile"],
        next_action="Consult a certified dog trainer or veterinary behaviourist. Rule out medical causes first.",
        what_not_to_do="Do not use punishment-based training. Do not ignore sudden aggression — it may indicate pain.",
        vet_escalation_warning="Sudden behaviour changes (especially aggression or anxiety) should be evaluated by a vet to rule out pain or neurological issues.",
        confidence_score=0.65,
    )


def _general_engine(query: str, ctx: dict) -> dict:
    import json
    import httpx
    
    # Pre-LLM Guardrails have already passed (not emergency, not strict triage)
    
    # Try calling local Ollama LLM
    try:
        system_prompt = (
            "You are PAWPHILE AI, an expert veterinary assistant. "
            "You MUST output ONLY valid JSON. Do not include markdown formatting or extra text. "
            "Your JSON must exactly match this structure: "
            '{"summary": "...", "risk_level": "Green/Orange/Red", "possible_concern": "...", '
            '"reasoning": "...", "data_used": ["..."], "next_action": "...", "what_not_to_do": "...", '
            '"vet_escalation_warning": "...", "confidence_score": 0.85}. '
            "NEVER make a diagnosis. If there is a risk, err on the side of caution and advise seeing a vet. "
            f"Context: Dog Name: {ctx.get('name')}, Breed: {ctx.get('breed')}, Age: {ctx.get('age_years')}, Weight: {ctx.get('weight_kg')}kg."
        )
        
        response = httpx.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3", # or mistral, depending on local setup
                "prompt": query,
                "system": system_prompt,
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.3
                }
            },
            timeout=10.0
        )
        
        if response.status_code == 200:
            llm_res = response.json().get("response", "{}")
            try:
                parsed = json.loads(llm_res)
                return build_response(
                    summary=parsed.get("summary", "LLM Analysis Complete"),
                    risk_level=parsed.get("risk_level", "Green"),
                    possible_concern=parsed.get("possible_concern", "Unknown"),
                    reasoning=parsed.get("reasoning", "Generated by local LLM"),
                    data_used=parsed.get("data_used", ["Query content", "Dog profile"]),
                    next_action=parsed.get("next_action", "Monitor and consult vet."),
                    what_not_to_do=parsed.get("what_not_to_do", "Do not ignore worsening symptoms."),
                    vet_escalation_warning=parsed.get("vet_escalation_warning", "Consult your veterinarian if unsure."),
                    confidence_score=float(parsed.get("confidence_score", 0.75)),
                    source_context_used=["Ollama Local LLM"]
                )
            except json.JSONDecodeError:
                pass # Fall through to fallback
                
    except Exception:
        pass # Fallback to deterministic if Ollama is not running
        
    return build_response(
        summary="PAW AI general guidance.",
        risk_level="Green",
        possible_concern="No specific concern detected from query.",
        reasoning="Query did not match a specific health concern and local LLM is unreachable. Providing general dog wellness guidance.",
        data_used=["Query content", "Dog profile"],
        next_action="Maintain regular vet check-ups, balanced nutrition, daily exercise, and preventive care (vaccines, deworming).",
        what_not_to_do="Do not delay vet visits when symptoms are present. Do not rely solely on AI for health decisions.",
        vet_escalation_warning="When in doubt, always consult your veterinarian.",
        confidence_score=0.55,
        source_context_used=["PAWPHILE Local Fallback"]
    )
