"""BIN2 PAW AI Supervisor — orchestration + safety layer (NOT just an LLM).

Pipeline: request → auth → ownership → consent → context retrieval →
sufficiency check → capability registry → deterministic analytical tools →
safety rules → evidence selection → deterministic response composition →
persistence (session/message/snapshot/safety-log) → final response.

The composer is template-driven over canonical analytics outputs, so stored
record text is always DATA, never instructions: embedded instructions in
records cannot alter behavior. No external LLM is called in this path
(LLM use stays in the legacy stateless /api/paw-ai routes, unchanged).
"""
import logging
import re
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import paw_ai_models as PAW
from app.services import intelligence_engine as eng
from app.services.paw_ai_engine import EMERGENCY_KEYWORDS, TOXIC_FOOD_KEYWORDS

logger = logging.getLogger(__name__)

SUPERVISOR_VERSION = "bin2-supervisor-v1"
SAFETY_RULES_VERSION = "bin2-safety-v1-heuristic"  # heuristic safety rules, NOT clinical thresholds

# Phrases the composer must never emit (enforced + tested).
BANNED_PHRASES = ("your dog has", "definitely", "this proves", "this means you",
                  "diagnosed with", "i diagnose")

DIAGNOSTIC_PATTERNS = (
    "what disease", "which disease", "diagnose", "diagnosis", "does my dog have",
    "is it cancer", "is this cancer", "what's wrong with my dog", "what is wrong",
    "disease does", "illness does",
)
FABRICATION_PATTERNS = ("invent", "make up", "fabricat", "assume data", "fill in",
                        "guess the missing", "pretend")
EMERGENCY_EXTRA = ("not breathing", "unconscious", "seizure", " Profuse".lower().strip(),
                   "poison", "heatstroke", "bloat")


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ── Capability registry ─────────────────────────────────────────────

CAPABILITIES: list[dict[str, Any]] = [
    {"id": "weight_stability", "enabled": True,
     "description": "Has my dog's weight been stable?",
     "triggers": ("weight", "weigh", "grown", "gaining", "losing", "stable")},
    {"id": "month_changes", "enabled": True,
     "description": "What changed in my dog's health recently?",
     "triggers": ("changed", "change", "this month", "recently", "new", "lately", "different")},
    {"id": "symptom_summary", "enabled": True,
     "description": "Summarize my dog's recent symptoms.",
     "triggers": ("symptom", "vomit", "cough", "diarrhea", "itch", "limp", "episode")},
    {"id": "activity_trend", "enabled": True,
     "description": "Explain the activity trend.",
     "triggers": ("activ", "walk", "exercise", "play", "energy")},
    {"id": "nutrition_trend", "enabled": True,
     "description": "Explain the nutrition trend.",
     "triggers": ("food", "eat", "nutrition", "meal", "diet", "calorie")},
    {"id": "behavior_trend", "enabled": True,
     "description": "Explain the behavior trend.",
     "triggers": ("behavior", "behaviour", "mood", "anxious", "sleep")},
    {"id": "missing_data", "enabled": True,
     "description": "What information is missing from the record?",
     "triggers": ("missing", "incomplete", "gaps", "enough data", "sufficient")},
    {"id": "baseline_explain", "enabled": True,
     "description": "Why did PAWPHILE flag this?",
     "triggers": ("why", "flag", "baseline", "normal for")},
    {"id": "vet_prepare", "enabled": True,
     "description": "Help me prepare for a vet visit (records, questions, gaps).",
     "triggers": ("prepare for", "before the vet", "questions for", "what should i ask",
                  "vet visit prep", "upcoming appointment")},
    {"id": "followup_explain", "enabled": True,
     "description": "Explain a veterinarian follow-up schedule.",
     "triggers": ("follow-up", "follow up", "recheck", "when should i return",
                  "when do we go back", "return visit")},
    {"id": "visit_summary", "enabled": True,
     "description": "Summarize what was recorded at a vet consultation.",
     "triggers": ("summarize the visit", "summarize my vet visit", "what was recorded",
                  "explain the vet note", "what did the vet say", "visit summary")},
    {"id": "integration_explain", "enabled": True,
     "description": "Explain connected external sources and their status.",
     "triggers": ("connected source", "integration", "connected device", "connected lab",
                  "what is connected", "external source")},
    {"id": "imported_record_explain", "enabled": True,
     "description": "Explain an imported external record and its provenance.",
     "triggers": ("imported record", "imported lab", "imported data", "external record",
                  "where did this import", "lab import")},
    {"id": "data_gap_explain", "enabled": True,
     "description": "Explain what is missing before sharing or connecting.",
     "triggers": ("what is missing", "data gap", "ready to share", "complete enough",
                  "what else should i record")},
    {"id": "vet_package_explain", "enabled": True,
     "description": "Explain a vet package's contents and version.",
     "triggers": ("what is in the package", "package contain", "package version",
                  "which package", "explain the package")},
    {"id": "external_record_summary", "enabled": True,
     "description": "Summarize device/imported observations on record.",
     "triggers": ("device data", "device reading", "wearable", "tracker data",
                  "summarize device", "sensor")},
    {"id": "timeline_summary", "enabled": True,
     "description": "Summarize the health timeline.",
     "triggers": ("timeline", "history", "overview", "summar")},
    {"id": "vet_brief", "enabled": True,
     "description": "What should I tell my vet?",
     "triggers": ("vet", "veterinarian", "appointment", "bring", "tell my")},
    # Future capabilities — registered but disabled; requesting them is truthfully refused.
    {"id": "disease_risk", "enabled": False,
     "description": "Predict disease risk (FUTURE — not available).", "triggers": ()},
    {"id": "diagnosis", "enabled": False,
     "description": "Diagnose a condition (NOT AVAILABLE — never claimed).", "triggers": ()},
    {"id": "image_diagnosis", "enabled": False,
     "description": "Diagnose from images (FUTURE — not available).", "triggers": ()},
    {"id": "treatment_advice", "enabled": False,
     "description": "Prescribe treatment (NOT AVAILABLE — never claimed).", "triggers": ()},
]

MEDICATION_WORDS = ("medication", "medicine", "drug", "pill", "dose", "antibiotic")


def match_capability(question: str) -> dict | None:
    q = question.lower()
    if any(w in q for w in MEDICATION_WORDS):
        return {"id": "medication_summary", "enabled": True,
                "description": "Summarize medications.", "triggers": ()}
    best, best_hits = None, 0
    for cap in CAPABILITIES:
        if not cap["enabled"]:
            continue
        hits = sum(1 for t in cap["triggers"] if t and t in q)
        if hits > best_hits:
            best, best_hits = cap, hits
    return best


def detect_diagnostic_request(question: str) -> bool:
    q = question.lower()
    return any(p in q for p in DIAGNOSTIC_PATTERNS)


def detect_fabrication_request(question: str) -> bool:
    q = question.lower()
    return any(p in q for p in FABRICATION_PATTERNS)


def detect_emergency(question: str) -> tuple[bool, str | None]:
    q = question.lower()
    for kw in list(EMERGENCY_KEYWORDS) + [k for k in EMERGENCY_EXTRA if k]:
        if kw and kw.lower() in q:
            return True, kw
    for kw in TOXIC_FOOD_KEYWORDS:
        if kw and kw.lower() in q:
            return True, kw
    return False, None


# ── BIN3 veterinary-continuity boundaries ───────────────────────────
# PAW AI prepares, explains, and summarizes. It never speaks AS the vet,
# never rewrites vet records, never sends anything to a vet, and never
# obeys embedded/overriding instructions to disclose or share records.

VET_IMPERSONATION_PATTERNS = (
    "as my vet", "as the vet", "as a vet", "as my veterinarian",
    "as the veterinarian", "what would my vet say", "what would the vet say",
    "pretend you are my vet", "pretend to be my vet", "pretend to be a vet",
)

VET_MODIFY_PATTERNS = (
    "change the vet", "change the veterinarian", "change the vet's",
    "edit the vet", "edit the veterinarian", "modify the vet",
    "modify the veterinarian", "delete the vet", "rewrite the vet",
    "rewrite the veterinarian",
)

# BIN4: inventing external/clinical records is fabrication with a clinical flavor.
INVENT_RECORD_PATTERNS = (
    "invent lab", "invent a lab", "make up lab", "fabricate lab", "fake lab",
    "invent test result", "make up test result",
    "invent a vet note", "invent vet notes", "make up a vet note",
    "fabricate a vet note", "fabricate vet note", "fake vet note",
    "create lab results for", "generate lab results for",
)

AUTO_SEND_PATTERNS = (
    "send this to", "send it to", "send automatically", "automatically send",
    "message my vet for me", "send this message",
)

OVERRIDE_PATTERNS = (
    "ignore the owner", "ignore all rules", "ignore previous",
    "disclose all", "share everything", "bypass",
)

DISEASE_RELAY_WORDS = ("cancer", "tumor", "tumour", "disease", "diagnosis",
                        "diagnosed", "parvo", "distemper", "rabies")


def detect_vet_boundary(question: str) -> str | None:
    """Return a boundary id when the request crosses a BIN3 AI line, else None."""
    q = question.lower()
    if any(p in q for p in VET_IMPERSONATION_PATTERNS):
        return "impersonation"
    if any(p in q for p in VET_MODIFY_PATTERNS):
        return "modify_vet_record"
    if any(p in q for p in INVENT_RECORD_PATTERNS):
        return "invent_record"
    if any(p in q for p in AUTO_SEND_PATTERNS):
        return "auto_send"
    if any(p in q for p in OVERRIDE_PATTERNS):
        return "override"
    if ("tell my vet" in q or "tell the vet" in q) and any(w in q for w in DISEASE_RELAY_WORDS):
        return "disease_relay"
    return None


BOUNDARY_RESPONSES = {
    "impersonation": ("I can't speak as your veterinarian — I'm PAWPHILE, a "
                      "record-keeping aid, not a clinician. I can prepare a "
                      "records summary for you to review and bring to the visit."),
    "modify_vet_record": ("I can't change a veterinarian's note — vet records are "
                          "authored by the veterinarian and stay unmodified. If something "
                          "looks wrong, add an owner observation or ask the clinic to amend it."),
    "auto_send": ("I never send anything to a veterinarian automatically. Prepare the "
                  "package in Veterinary Care, review exactly what will be shared, "
                  "and approve it yourself — owner approval is required."),
    "override": ("I can't disclose or share records on instruction — sharing always "
                 "needs your explicit review and approval in Veterinary Care, with a "
                 "visible scope and expiry."),
    "invent_record": ("I won't invent laboratory results or veterinary notes — fabricated "
                      "clinical records would corrupt the timeline and any future care. "
                      "Recorded imports stay labeled with their source; missing data stays missing."),
    "disease_relay": ("I can't state or relay a disease as fact — PAWPHILE never "
                      "diagnoses. I can prepare a dated records summary for your "
                      "veterinarian to review with you."),
}


# ── Evidence packets (minimum necessary) ────────────────────────────

def build_evidence_packet(db: Session, pet_id: UUID, now: datetime,
                          capabilities: list[str]) -> dict:
    metrics = {}
    for m in ("weight", "activity", "nutrition", "behavior"):
        if any(c in capabilities for c in ("month_changes", "timeline_summary", "vet_brief",
                                            "baseline_explain", f"{m.split('_')[0]}_trend",
                                            "weight_stability", "missing_data",
                                            "integration_explain", "imported_record_explain",
                                            "data_gap_explain", "vet_package_explain",
                                            "external_record_summary",
                                            "vet_prepare", "followup_explain",
                                            "visit_summary")) or not capabilities:
            metrics[m] = eng.analyze_metric(db, pet_id, m, now)
    symptoms = eng.analyze_symptoms(db, pet_id, now) if any(
        c in capabilities for c in ("month_changes", "symptom_summary", "timeline_summary",
                                    "vet_brief", "baseline_explain",
                                    "integration_explain", "imported_record_explain",
                                    "data_gap_explain", "vet_package_explain",
                                    "external_record_summary",
                                    "vet_prepare", "followup_explain",
                                    "visit_summary")) or not capabilities else None
    return {"metrics": metrics, "symptoms": symptoms,
            "completeness": eng.completeness(db, pet_id, now)}


# ── Safety escalation (deterministic, heuristic — not clinical) ──────

def assess_safety(db: Session, pet_id: UUID, packet: dict, emergency_hit: str | None) -> dict:
    if emergency_hit:
        return {"level": "URGENT_VET",
                "reason": f"Emergency language detected ('{emergency_hit}'). Immediate veterinary attention may be needed.",
                "action": "escalated"}
    sev_eps = [e for e in (packet.get("symptoms") or {}).get("evidence", [])
               if "severe" in str(e).lower()]
    sym = packet.get("symptoms") or {}
    if sym.get("severe_recent_30d", 0) >= 3:
        return {"level": "VET_DISCUSSION",
                "reason": f"{sym['severe_recent_30d']} severe symptom episodes in 30 days — worth discussing with your veterinarian.",
                "action": "warned"}
    for m, res in (packet.get("metrics") or {}).items():
        ch = (res or {}).get("change") or {}
        if ch.get("flagged") and m == "weight" and abs(ch.get("delta_pct") or 0) >= 15:
            return {"level": "VET_DISCUSSION",
                    "reason": f"Weight moved {ch['delta_pct']:+.1f}% vs personal baseline — worth discussing with your veterinarian.",
                    "action": "warned"}
    flagged = [m for m, res in (packet.get("metrics") or {}).items()
               if ((res or {}).get("change") or {}).get("flagged")]
    if flagged:
        return {"level": "MONITOR",
                "reason": f"Descriptive change(s) in: {', '.join(flagged)}. Keep recording and watch.",
                "action": "noted"}
    if sev_eps or sym.get("episodes_30d"):
        return {"level": "OBSERVATION",
                "reason": "Recent symptom episodes on record — observe and keep logging.",
                "action": "noted"}
    return {"level": "INFORMATION", "reason": "No concerning patterns in the available records.",
            "action": "none"}


# ── Deterministic composer (templates over analytics — never free text over records) ──

def compose_answer(capability: dict | None, packet: dict, safety: dict,
                   pet_name: str, diagnostic: bool, fabrication: bool,
                   emergency_hit: str | None, vet_context: dict | None = None,
                   boundary: str | None = None,
                   eco_context: dict | None = None) -> dict:
    comp = packet.get("completeness") or {}
    missing = [k for k, v in (comp.get("dimensions") or {}).items() if v.get("score", 0) < 0.5]

    if boundary:
        text = (f"{BOUNDARY_RESPONSES[boundary]} For {pet_name}, record completeness "
                f"is {comp.get('record_completeness_pct', '?')}% "
                f"(coverage, not health). Safety: {safety['reason']}")
        for banned in BANNED_PHRASES:
            assert banned not in text.lower(), f"composer emitted banned phrase: {banned}"
        return {"text": f"{text}\nLabel: PAWPHILE-generated — not veterinarian-verified.",
                "safety_level": safety["level"], "capabilities_used": [],
                "data_used": ["completeness assessment"]}

    if emergency_hit:
        text = (f"This sounds urgent ({emergency_hit}). PAWPHILE cannot assess emergencies — "
                f"please contact your veterinarian or an emergency clinic right away for {pet_name}. "
                "Bring the recent timeline records with you.")
        return {"text": text, "safety_level": "URGENT_VET", "capabilities_used": [],
                "data_used": ["emergency keyword scan of your question"]}

    if diagnostic:
        ev = _evidence_lines(packet)
        text = (f"I can't diagnose {pet_name} — PAWPHILE never states diseases from records. "
                f"Here is what the available records show:\n{ev}\n"
                f"Safety note: {safety['reason']} "
                "If you are worried, discuss these specific dated records with your veterinarian.")
        return {"text": text, "safety_level": safety["level"],
                "capabilities_used": ["symptom_summary"],
                "data_used": ["symptom episodes", "personal baselines"]}

    if fabrication:
        return {"text": ("I won't invent or fill in missing health data — fabricated records would make "
                         f"future intelligence untrustworthy. For {pet_name}, the honest state is: "
                         f"record completeness {comp.get('record_completeness_pct', '?')}% with gaps in "
                         f"{', '.join(missing) or 'none noted'}. Keep recording and the baselines will strengthen."),
                "safety_level": safety["level"], "capabilities_used": [],
                "data_used": ["completeness assessment"]}

    if capability is None:
        avail = [c["description"] for c in CAPABILITIES if c["enabled"]]
        return {"text": ("I can help with these health-intelligence tasks: " + "; ".join(avail) + ". "
                         "Ask about weight stability, recent changes, symptoms, trends, missing data, or a vet brief."),
                "safety_level": safety["level"], "capabilities_used": [],
                "data_used": []}

    cid = capability["id"]
    used = [cid]
    if cid == "weight_stability":
        w = (packet.get("metrics") or {}).get("weight") or {}
        text = _metric_text("Weight", w, pet_name)
    elif cid == "month_changes":
        text = _changes_text(packet, pet_name)
    elif cid == "symptom_summary":
        text = _symptom_text(packet, pet_name)
    elif cid in ("activity_trend", "nutrition_trend", "behavior_trend"):
        m = cid.split("_")[0]
        text = _metric_text(m.capitalize(), (packet.get("metrics") or {}).get(m) or {}, pet_name)
    elif cid == "missing_data":
        text = (f"For {pet_name}, record completeness is {comp.get('record_completeness_pct', '?')}% "
                f"(record coverage, not health). Gaps: {', '.join(missing) or 'none major'}. "
                f"{comp.get('explanation', '')}")
    elif cid == "baseline_explain":
        text = _baseline_text(packet, pet_name)
    elif cid == "timeline_summary":
        text = _timeline_text(packet, pet_name)
    elif cid == "vet_brief":
        text = _vetbrief_text(packet, pet_name)
    elif cid == "medication_summary":
        text = ("Medication chronology is available under Analytics → Medications. "
                "PAWPHILE describes start/end dates and active items; it never infers effectiveness.")
    elif cid == "vet_prepare":
        text = _vet_prepare_text(packet, pet_name, vet_context)
    elif cid == "followup_explain":
        text = _followup_text(packet, pet_name, vet_context)
    elif cid == "visit_summary":
        text = _visit_summary_text(packet, pet_name, vet_context)
    elif cid == "integration_explain":
        text = _integration_text(packet, pet_name, eco_context)
    elif cid == "imported_record_explain":
        text = _imported_text(packet, pet_name, eco_context)
    elif cid == "data_gap_explain":
        text = _datagap_text(packet, pet_name, eco_context)
    elif cid == "vet_package_explain":
        text = _package_text(packet, pet_name, eco_context)
    elif cid == "external_record_summary":
        text = _device_text(packet, pet_name, eco_context)
    else:
        text = "That capability is registered but not yet available."
        used = []
    text = f"{text}\nSafety: {safety['reason']}"
    for banned in BANNED_PHRASES:
        assert banned not in text.lower(), f"composer emitted banned phrase: {banned}"
    return {"text": text, "safety_level": safety["level"], "capabilities_used": used,
            "data_used": ["personal baselines", "trends", "symptom episodes", "completeness"]}


def _metric_text(label: str, res: dict, pet_name: str) -> str:
    if not res or res.get("status") == "INSUFFICIENT_DATA":
        return (f"There is not enough {label.lower()} data for {pet_name} yet "
                f"({res.get('reason', 'no observations') if res else 'no observations'}). "
                "Keep recording and a personal baseline will form.")
    ex = res.get("explanation", {})
    ch = res.get("change", {})
    flag = " This move was flagged for review." if ch.get("flagged") else ""
    return (f"{ex.get('what', '')} {ex.get('why', '')}{flag} "
            f"{ex.get('comparison', '')} Limitation: {ex.get('limitation', '')}")


def _changes_text(packet: dict, pet_name: str) -> str:
    flagged = []
    for m, res in (packet.get("metrics") or {}).items():
        ch = (res or {}).get("change") or {}
        if ch.get("flagged"):
            flagged.append(f"{m} ({ch.get('delta_pct'):+.1f}% vs baseline)")
    sym = packet.get("symptoms") or {}
    parts = [f"For {pet_name}:"]
    parts.append(f"Flagged changes: {', '.join(flagged)}." if flagged else "No flagged metric changes vs personal baselines.")
    parts.append(f"Symptom episodes (30d): {sym.get('episodes_30d', 0)}; recurring: "
                f"{', '.join(f'{k}×{v}' for k, v in (sym.get('recurrence') or {}).items()) or 'none'}.")
    return " ".join(parts) + " All descriptive — not diagnoses."


def _symptom_text(packet: dict, pet_name: str) -> str:
    sym = packet.get("symptoms") or {}
    if sym.get("status") == "INSUFFICIENT_DATA":
        return f"No symptom episodes on record for {pet_name} in the last 90 days."
    return (f"{pet_name}: {sym.get('episodes_30d', 0)} episode(s) in 30 days "
            f"({sym.get('episodes_90d', 0)} in 90 days, ~{sym.get('rate_per_30d', 0)}/30d). "
            f"Recurring: {', '.join(f'{k}×{v}' for k, v in (sym.get('recurrence') or {}).items()) or 'none'}. "
            f"Severe (30d): {sym.get('severe_recent_30d', 0)}. "
            "Counts only — not a diagnosis.")


def _baseline_text(packet: dict, pet_name: str) -> str:
    lines = []
    for m, res in (packet.get("metrics") or {}).items():
        b = (res or {}).get("baseline") or {}
        if b.get("status") == "AVAILABLE":
            lines.append(f"{m}: median {b.get('median')} over {b.get('window_days')}d from {b.get('observations')} obs "
                         f"(latest {((res or {}).get('latest') or {}).get('value')})")
        else:
            lines.append(f"{m}: no baseline yet ({b.get('reason', 'insufficient data')})")
    return f"Personal baselines for {pet_name} (this dog's own history, not breed averages): " + "; ".join(lines) + "."


def _timeline_text(packet: dict, pet_name: str) -> str:
    sym = packet.get("symptoms") or {}
    ev = (sym.get("evidence") or [])[-5:]
    if not ev:
        return f"The recent timeline for {pet_name} has no symptom episodes; metric trends are in the Trends section."
    items = "; ".join(f"{e.get('name')} ({str(e.get('effective_at'))[:10]})" for e in ev)
    return f"Recent timeline for {pet_name}: {items}. Full chronology is on the Timeline page."


def _vetbrief_text(packet: dict, pet_name: str) -> str:
    return (_changes_text(packet, pet_name)
            + " Bring these dated records and the vet-summary export to the appointment. "
              "Review it first — it reflects owner-entered records.")


def _vet_prepare_text(packet: dict, pet_name: str, vet_context: dict | None) -> str:
    comp = packet.get("completeness") or {}
    missing = [k for k, v in (comp.get("dimensions") or {}).items() if v.get("score", 0) < 0.5]
    ctx = vet_context or {}
    open_q = ctx.get("open_questions") or []
    parts = [f"To prepare for {pet_name}'s visit: bring the recent timeline and "
             f"the vet-summary export ({comp.get('record_completeness_pct', '?')}% record coverage)."]
    if open_q:
        shown = "; ".join(f"Record states a question: {x[:120]}" for x in open_q[:3])
        parts.append(f"Your open questions for the vet: {shown}. I will not answer them — they are for the veterinarian.")
    else:
        parts.append("No open questions on file — add yours in Veterinary Care so they travel with the package.")
    if missing:
        parts.append(f"Gaps to fill before sharing (your call): {', '.join(missing)}.")
    parts.append("Review the package before approving — nothing is shared automatically.")
    return " ".join(parts) + " Label: PAWPHILE-generated — not veterinarian-verified."


def _followup_text(packet: dict, pet_name: str, vet_context: dict | None) -> str:
    ctx = vet_context or {}
    items = ctx.get("open_followups") or []
    if not items:
        return (f"No open veterinarian follow-ups on file for {pet_name}. "
                "When the vet recommends one, it appears here with its due date and a reminder. "
                "Label: PAWPHILE-generated — not veterinarian-verified.")
    lines = "; ".join(
        f"Record states a recommendation: {x.get('recommendation', '')[:160]}"
        f"{' (due ' + str(x.get('due_at'))[:10] + ')' if x.get('due_at') else ' (no due date)'} "
        f"[{x.get('status')}]" for x in items[:3])
    return (f"Open follow-ups for {pet_name}: {lines}. "
            "These are the veterinarian's words, recorded — PAWPHILE did not author them. "
            "Acknowledge each in Veterinary Care and record the outcome when done. "
            "Label: PAWPHILE-generated — not veterinarian-verified.")


def _visit_summary_text(packet: dict, pet_name: str, vet_context: dict | None) -> str:
    ctx = vet_context or {}
    notes = ctx.get("recent_notes") or []
    if not notes:
        return (f"No veterinarian notes on file for {pet_name} yet. Owner-entered visits "
                "appear on the Timeline. Label: PAWPHILE-generated — not veterinarian-verified.")
    lines = "; ".join(
        f"Vet note recorded {str(n.get('effective_at'))[:10]}"
        f"{' by ' + n['author'] if n.get('author') else ''}"
        f"{' (includes follow-up guidance)' if n.get('has_follow_up') else ''}"
        for n in notes[:3])
    return (f"What was recorded for {pet_name}: {lines}. "
            "Open the consultation to read the full note in the veterinarian's own words — "
            "this summary never replaces it. "
            "Label: PAWPHILE-generated — not veterinarian-verified.")


_AI_LABEL = "Label: PAWPHILE-generated — not veterinarian-verified."


def _eco(eco_context: dict | None) -> dict:
    return eco_context or {}


def _integration_text(packet: dict, pet_name: str, eco_context: dict | None) -> str:
    conns = _eco(eco_context).get("connections") or []
    if not conns:
        return (f"No external sources are connected for {pet_name}. Connections are "
                f"explicit, consent-gated, and revocable in Connections. {_AI_LABEL}")
    parts = "; ".join(
        f"{c.get('provider_type')}: {c.get('provider_name')} [{c.get('status')}]"
        f"{', last sync ' + str(c.get('last_sync_at'))[:10] if c.get('last_sync_at') else ', never synced'}"
        for c in conns[:5])
    return (f"Connected sources for {pet_name}: {parts}. Each connection names what it "
            f"shares and why; revoke any of them in Connections. {_AI_LABEL}")


def _imported_text(packet: dict, pet_name: str, eco_context: dict | None) -> str:
    imports = _eco(eco_context).get("recent_imports") or []
    if not imports:
        return (f"No imported records on file for {pet_name}. Imports arrive through the "
                f"ingestion pipeline with source labels and stay labeled IMPORTED/LAB/DEVICE — "
                f"never silently converted into verified facts. {_AI_LABEL}")
    kinds = {}
    for i in imports:
        kinds[i.get("kind")] = kinds.get(i.get("kind"), 0) + 1
    summ = ", ".join(f"{v} {k}" for k, v in kinds.items())
    return (f"Imported records for {pet_name}: {summ} (latest statuses: "
            f"{', '.join(i.get('status', '?') for i in imports[:3])}). Every import keeps its "
            f"source, external id, and verification state; rejected rows name a reason. {_AI_LABEL}")


def _datagap_text(packet: dict, pet_name: str, eco_context: dict | None) -> str:
    comp = packet.get("completeness") or {}
    missing = [k for k, v in (comp.get("dimensions") or {}).items() if v.get("score", 0) < 0.5]
    eco = _eco(eco_context)
    parts = [f"For {pet_name}, record completeness is {comp.get('record_completeness_pct', '?')}% "
             f"(coverage, not health)."]
    parts.append(f"Gaps: {', '.join(missing) or 'none major'}.")
    if not (eco.get("connections") or []):
        parts.append("No external sources connected — owner-entered records are the whole picture.")
    parts.append("Sharing is never blocked by gaps; you decide whether to proceed.")
    return " ".join(parts) + f" {_AI_LABEL}"


def _package_text(packet: dict, pet_name: str, eco_context: dict | None) -> str:
    pkgs = _eco(eco_context).get("packages") or []
    if not pkgs:
        return (f"No vet packages prepared for {pet_name} yet. Prepare one in Veterinary Care, "
                f"review exactly what it contains, then approve — nothing is shared automatically. {_AI_LABEL}")
    lines = "; ".join(
        f"{p.get('package_type')} v{p.get('version')} [{p.get('status')}]" for p in pkgs[:5])
    return (f"Vet packages for {pet_name}: {lines}. Shared versions are immutable snapshots — "
            f"new information means a new version, never a silent edit. {_AI_LABEL}")


def _device_text(packet: dict, pet_name: str, eco_context: dict | None) -> str:
    dev = _eco(eco_context).get("device_summary") or {}
    total = dev.get("count", 0)
    if not total:
        return (f"No device readings on file for {pet_name}. Device data enters as labeled "
                f"timeline observations and is not fed into personal baselines. {_AI_LABEL}")
    by_metric = ", ".join(f"{k}×{v}" for k, v in (dev.get("by_metric") or {}).items())
    return (f"Device readings for {pet_name}: {total} on record ({by_metric}). "
            f"These are imported observations with device provenance — descriptive only, not diagnoses. {_AI_LABEL}")


def _evidence_lines(packet: dict) -> str:
    sym = packet.get("symptoms") or {}
    ev = (sym.get("evidence") or [])[-5:]
    if not ev:
        return "No symptom episodes in the last 90 days."
    return "Recent episodes: " + "; ".join(
        f"Record states: {e.get('name')} ({str(e.get('effective_at'))[:10]})" for e in ev) + "."


# ── Persistence (existing tables — sessions, messages, snapshots, safety) ──

def persist_turn(db: Session, user_id, pet_id, intent: str | None, question: str,
                 answer: dict, safety: dict, packet: dict,
                 session_id=None) -> tuple:
    session = None
    if session_id is not None:
        session = db.query(PAW.PawAiSession).filter(
            PAW.PawAiSession.id == session_id,
            PAW.PawAiSession.user_id == user_id).first()
    if session is None:
        session = PAW.PawAiSession(user_id=user_id, dog_id=pet_id, intent=intent,
                                   session_meta={"supervisor": SUPERVISOR_VERSION})
        db.add(session)
        db.flush()
    q_msg = PAW.PawAiMessage(session_id=session.id, role="user", content=question[:2000],
                             intent=intent)
    # NOTE: user content is stored verbatim for audit; it is NEVER executed.
    db.add(q_msg)
    db.flush()
    a_msg = PAW.PawAiMessage(session_id=session.id, role="assistant",
                             content=answer["text"][:4000], intent=intent,
                             risk_level={"URGENT_VET": "Red", "VET_DISCUSSION": "Orange"}.get(
                                 safety["level"], "Green"))
    db.add(a_msg)
    db.flush()
    # Snapshot holds the EVIDENCE PACKET ONLY (minimum necessary — no full record dumps).
    db.add(PAW.PawAiContextSnapshot(
        session_id=session.id,
        snapshot={"supervisor": SUPERVISOR_VERSION,
                  "safety_level": safety["level"],
                  "capabilities_used": answer.get("capabilities_used", []),
                  "evidence_refs": _collect_refs(packet),
                  "completeness_pct": (packet.get("completeness") or {}).get("record_completeness_pct")}))
    if safety.get("action") in ("escalated", "warned"):
        db.add(PAW.PawAiSafetyLog(session_id=session.id, dog_id=pet_id,
                                  trigger_type="emergency_keyword" if safety["level"] == "URGENT_VET" else "guardrail_block",
                                  trigger_content=safety.get("reason", "")[:500],
                                  action_taken=safety["action"]))
    db.commit()
    db.refresh(a_msg)
    return session, a_msg


def _collect_refs(packet: dict) -> list:
    refs: list = []
    for res in (packet.get("metrics") or {}).values():
        refs += [e.get("record_id") for e in (res or {}).get("evidence", []) if e.get("record_id")]
    refs += [e.get("record_id") for e in ((packet.get("symptoms") or {}).get("evidence", []) or [])
             if e.get("record_id")]
    return refs[:100]
