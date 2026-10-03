"""BIN2 analytics API — descriptive longitudinal intelligence (non-diagnostic).

Every endpoint: Clerk auth + user→pet→resource ownership + `ai_analysis`
consent gate (403 blocked state when absent/withdrawn). Read endpoints compute
on demand (bounded indexed queries, no lineage writes); POST analyze writes
lineage to ai_analysis_records (GENERATED, superseding prior same-type rows).
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.ownership import get_user_or_404, require_dog_ownership
from app.core.audit import log_audit
from app.db.session import get_db
from app.models import foundation_models as F
from app.services import intelligence_engine as eng

logger = logging.getLogger(__name__)
router = APIRouter()


def _consent_or_block(db: Session, user) -> None:
    eng.require_ai_consent(db, user)


def _prep(pet_id: UUID, clerk_user_id: str, db: Session):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    _consent_or_block(db, user)
    return dog, user


@router.get("/pets/{pet_id}/analytics/overview")
def analytics_overview(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    now = eng.utcnow()
    metrics = {m: eng.analyze_metric(db, dog.id, m, now) for m in ("weight", "activity", "nutrition", "behavior")}
    symptoms = eng.analyze_symptoms(db, dog.id, now)
    changes = [ {"metric": m, **r["change"]} for m, r in metrics.items()
                if (r.get("change") or {}).get("flagged")]
    contexts = eng.multi_signal_context(db, dog.id, now, metrics)
    comp = eng.completeness(db, dog.id, now)
    return {"pet_id": str(dog.id), "metrics": metrics, "symptoms": symptoms,
            "flagged_changes": changes, "multi_signal": contexts,
            "completeness_pct": comp["record_completeness_pct"],
            "rules_version": eng.RULES_VERSION, "generated_at": now.isoformat(),
            "disclaimer": "Descriptive intelligence only — not a diagnosis."}


@router.get("/pets/{pet_id}/analytics/weight")
def analytics_weight(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    return eng.analyze_metric(db, dog.id, "weight", eng.utcnow())


@router.get("/pets/{pet_id}/analytics/activity")
def analytics_activity(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    return eng.analyze_metric(db, dog.id, "activity", eng.utcnow())


@router.get("/pets/{pet_id}/analytics/nutrition")
def analytics_nutrition(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    return eng.analyze_metric(db, dog.id, "nutrition", eng.utcnow())


@router.get("/pets/{pet_id}/analytics/behavior")
def analytics_behavior(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    return eng.analyze_metric(db, dog.id, "behavior", eng.utcnow())


@router.get("/pets/{pet_id}/analytics/symptoms")
def analytics_symptoms(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    return eng.analyze_symptoms(db, dog.id, eng.utcnow())


@router.get("/pets/{pet_id}/analytics/medications")
def analytics_medications(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    chrono = eng.medication_chronology(db, dog.id)
    active = [m for m in chrono if (m.get("status") or "active") == "active"]
    return {"pet_id": str(dog.id), "active": active, "chronology": chrono,
            "note": "Descriptive chronology only — effectiveness is never inferred.",
            "rules_version": eng.RULES_VERSION, "generated_at": eng.utcnow().isoformat()}


@router.get("/pets/{pet_id}/analytics/preventive")
def analytics_preventive(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    now = eng.utcnow()
    prev = eng.preventive_status(db, dog.id, now)
    return {"pet_id": str(dog.id), **prev,
            "note": "Overdue is deterministic (past next_due_date) — not a clinical judgment.",
            "rules_version": eng.RULES_VERSION, "generated_at": now.isoformat()}


@router.get("/pets/{pet_id}/analytics/baselines")
def analytics_baselines(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    now = eng.utcnow()
    out = {}
    for m in ("weight", "activity", "nutrition", "behavior"):
        res = eng.analyze_metric(db, dog.id, m, now)
        out[m] = {"baseline": res["baseline"], "latest": res.get("latest"),
                  "freshness": res.get("freshness"), "unit": res.get("unit"),
                  "status": res["baseline"].get("status")}
    return {"pet_id": str(dog.id), "baselines": out,
            "rules_version": eng.RULES_VERSION, "generated_at": now.isoformat()}


@router.get("/pets/{pet_id}/analytics/changes")
def analytics_changes(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    now = eng.utcnow()
    metrics = {m: eng.analyze_metric(db, dog.id, m, now) for m in ("weight", "activity", "nutrition", "behavior")}
    changes = [{"metric": m, "unit": r.get("unit"), **r["change"],
                "explanation": {"what": f"{m}: " + r["explanation"]["what"],
                                "why": r["explanation"]["why"]}}
               for m, r in metrics.items()]
    contexts = eng.multi_signal_context(db, dog.id, now, metrics)
    return {"pet_id": str(dog.id), "changes": changes, "multi_signal": contexts,
            "rules_version": eng.RULES_VERSION, "generated_at": now.isoformat(),
            "disclaimer": "Detected changes are descriptive, not diagnoses."}


@router.get("/pets/{pet_id}/analytics/completeness")
def analytics_completeness(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    return eng.completeness(db, dog.id, eng.utcnow())


@router.get("/pets/{pet_id}/analytics/freshness")
def analytics_freshness(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    now = eng.utcnow()
    metrics = {m: eng.analyze_metric(db, dog.id, m, now) for m in ("weight", "activity", "nutrition", "behavior")}
    return eng.freshness_all(db, dog.id, now, metrics)


@router.post("/pets/{pet_id}/intelligence/analyze", status_code=201)
def intelligence_analyze(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    dog, user = _prep(pet_id, clerk_user_id, db)
    now = eng.utcnow()
    try:
        metrics = {m: eng.analyze_metric(db, dog.id, m, now) for m in ("weight", "activity", "nutrition", "behavior")}
        symptoms = eng.analyze_symptoms(db, dog.id, now)
        comp = eng.completeness(db, dog.id, now)
        flagged = [m for m, r in metrics.items() if (r.get("change") or {}).get("flagged")]
        summary = (f"Intelligence overview for {dog.name}: "
                   f"{len(flagged)} flagged change(s) ({', '.join(flagged) or 'none'}); "
                   f"{symptoms['episodes_30d']} symptom episode(s, 30d); "
                   f"record completeness {comp['record_completeness_pct']}%. "
                   f"Descriptive only — not a diagnosis.")
        ev_ids: list[str] = []
        for r in metrics.values():
            ev_ids += [e.get("record_id") for e in r.get("evidence", []) if e.get("record_id")]
        ev_ids += [e.get("record_id") for e in symptoms.get("evidence", []) if e.get("record_id")]
        rec = eng.store_intelligence(db, dog.id, "intelligence_overview", summary, ev_ids,
                                     {"start": (now.isoformat()), "end": now.isoformat()},
                                     confidence=None)
        try:
            log_audit(db, action="analysis.generated", user_id=user.id, dog_id=dog.id,
                      details={"resource_type": "ai_analysis", "resource_id": str(rec.id)})
            db.commit()
        except Exception:
            pass
        return {"id": str(rec.id), "status": rec.status, "summary": summary,
                "evidence_count": len(ev_ids), "created_at": rec.created_at.isoformat()}
    except HTTPException:
        raise
    except Exception:
        try:
            eng.store_failure(db, dog.id, "intelligence_overview", "unexpected compute error")
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Analysis failed.")


@router.get("/pets/{pet_id}/intelligence/history")
def intelligence_history(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    dog, _ = _prep(pet_id, clerk_user_id, db)
    return {"pet_id": str(dog.id), "records": eng.list_intelligence(db, dog.id)}


@router.get("/pets/{pet_id}/intelligence/vet-summary")
def intelligence_vet_summary(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """Vet-ready preparation (not a diagnosis): owner reviews before sharing."""
    dog, _ = _prep(pet_id, clerk_user_id, db)
    now = eng.utcnow()
    metrics = {m: eng.analyze_metric(db, dog.id, m, now) for m in ("weight", "activity", "nutrition", "behavior")}
    symptoms = eng.analyze_symptoms(db, dog.id, now)
    meds = eng.medication_chronology(db, dog.id)
    prev = eng.preventive_status(db, dog.id, now)
    comp = eng.completeness(db, dog.id, now)
    contexts = eng.multi_signal_context(db, dog.id, now, metrics)
    questions = ["What should we watch for given these dated records?"]
    if symptoms["episodes_30d"]:
        questions.append(f"{symptoms['episodes_30d']} symptom episode(s) in 30d — what workup, if any, fits?")
    if prev["overdue"]:
        questions.append("Which overdue preventive items should be prioritized?")
    gaps = [k for k, v in comp["dimensions"].items() if v["score"] < 0.5]
    return {
        "pet_id": str(dog.id), "pet_name": dog.name, "generated_at": now.isoformat(),
        "recent_changes": [{"metric": m, **r["change"]} for m, r in metrics.items()],
        "trends": {m: r["trend"] for m, r in metrics.items()},
        "symptom_episodes_90d": symptoms["episodes_90d"],
        "symptom_evidence": symptoms["evidence"][:20],
        "medications": meds, "preventive": prev, "multi_signal": contexts,
        "data_gaps": gaps, "completeness_pct": comp["record_completeness_pct"],
        "questions_for_vet": questions,
        "review_note": "Review this summary before sharing — it reflects owner-entered records.",
        "rules_version": eng.RULES_VERSION,
        "disclaimer": "Preparation aid only — not a diagnosis.",
    }
