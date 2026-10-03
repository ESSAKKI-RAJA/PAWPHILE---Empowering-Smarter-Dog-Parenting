"""BIN2 supervisor API — context-aware health intelligence assistant.

Deterministic pipeline (no arbitrary DB access, no free-form LLM over records):
ask → ownership → consent → capability match → evidence packet → safety rules →
template composer → session/message/snapshot/safety persistence → response.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.security import get_current_user
from app.core.ownership import get_user_or_404, require_dog_ownership
from app.core.audit import log_audit
from app.db.session import get_db
from app.models import paw_ai_models as PAW
from app.services import intelligence_engine as eng
from app.services import paw_supervisor as sup

logger = logging.getLogger(__name__)
router = APIRouter()


class AskIn(BaseModel):
    question: str
    session_id: Optional[UUID] = None


class FeedbackIn(BaseModel):
    message_id: UUID
    rating: Optional[int] = None
    helpful: Optional[bool] = None
    comment: Optional[str] = None


@router.get("/supervisor/capabilities")
def capabilities():
    """Public capability ledger: what PAW AI may do; future items stay disabled."""
    return {"capabilities": sup.CAPABILITIES, "supervisor": sup.SUPERVISOR_VERSION,
            "safety_rules": sup.SAFETY_RULES_VERSION}


@router.post("/pets/{pet_id}/supervisor/ask")
def ask(pet_id: UUID, payload: AskIn, clerk_user_id: str = Depends(get_current_user),
        db: Session = Depends(get_db)):
    question = (payload.question or "").strip()
    if not question:
        raise HTTPException(status_code=422, detail="question must not be blank.")
    if len(question) > 2000:
        raise HTTPException(status_code=422, detail="question too long (max 2000 chars).")
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    eng.require_ai_consent(db, user)
    now = eng.utcnow()

    emergency_hit = sup.detect_emergency(question)[1] if sup.detect_emergency(question)[0] else None
    diagnostic = sup.detect_diagnostic_request(question)
    fabrication = sup.detect_fabrication_request(question)
    boundary = sup.detect_vet_boundary(question)
    capability = None if (diagnostic or fabrication or emergency_hit or boundary) else sup.match_capability(question)
    caps = [capability["id"]] if capability else []
    if not any([diagnostic, fabrication, emergency_hit]) and capability is None and boundary is None:
        caps = []  # composer lists available capabilities

    packet = sup.build_evidence_packet(db, dog.id, now, caps)
    safety = sup.assess_safety(db, dog.id, packet, emergency_hit)
    vet_ctx = None
    if capability is not None and capability["id"] in ("vet_prepare", "followup_explain", "visit_summary"):
        from app.services import collaboration_service as collab
        vet_ctx = collab.vet_context_for_supervisor(db, dog.id)
    eco_ctx = None
    if capability is not None and capability["id"] in ("integration_explain", "imported_record_explain",
                                                        "data_gap_explain", "vet_package_explain",
                                                        "external_record_summary"):
        from app.services import partner_service as bin4
        eco_ctx = bin4.eco_context_for_supervisor(db, user.id, dog.id)
    answer = sup.compose_answer(capability, packet, safety, dog.name, diagnostic, fabrication,
                                emergency_hit, vet_ctx, boundary, eco_ctx)
    session, msg = sup.persist_turn(db, user.id, dog.id,
                                    capability["id"] if capability else "unmatched",
                                    question, answer, safety, packet, payload.session_id)
    try:
        log_audit(db, action="paw_ai.request", user_id=user.id, dog_id=dog.id,
                  details={"resource_type": "paw_ai_message", "resource_id": str(msg.id)})
        db.commit()
    except Exception:
        pass
    return {"session_id": str(session.id), "message_id": str(msg.id),
            "answer": answer["text"], "safety_level": safety["level"],
            "safety_reason": safety["reason"],
            "capabilities_used": answer["capabilities_used"],
            "data_used": answer.get("data_used", []),
            "evidence_refs": sup._collect_refs(packet),
            "supervisor": sup.SUPERVISOR_VERSION}


@router.get("/pets/{pet_id}/supervisor/sessions")
def list_sessions(pet_id: UUID, clerk_user_id: str = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    eng.require_ai_consent(db, user)
    rows = db.query(PAW.PawAiSession).filter(
        PAW.PawAiSession.dog_id == dog.id, PAW.PawAiSession.user_id == user.id).order_by(
        PAW.PawAiSession.started_at.desc()).limit(20).all()
    return {"pet_id": str(dog.id),
            "sessions": [{"id": str(s.id), "intent": s.intent,
                          "started_at": s.started_at.isoformat() if s.started_at else None,
                          "message_count": db.query(PAW.PawAiMessage).filter(
                              PAW.PawAiMessage.session_id == s.id).count()} for s in rows]}


@router.get("/pets/{pet_id}/supervisor/sessions/{session_id}")
def get_session(pet_id: UUID, session_id: UUID, clerk_user_id: str = Depends(get_current_user),
                db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    eng.require_ai_consent(db, user)
    s = db.query(PAW.PawAiSession).filter(
        PAW.PawAiSession.id == session_id, PAW.PawAiSession.dog_id == dog.id,
        PAW.PawAiSession.user_id == user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    msgs = db.query(PAW.PawAiMessage).filter(
        PAW.PawAiMessage.session_id == s.id).order_by(PAW.PawAiMessage.created_at.asc()).all()
    return {"id": str(s.id), "intent": s.intent,
            "messages": [{"id": str(m.id), "role": m.role, "content": m.content,
                          "risk_level": m.risk_level,
                          "created_at": m.created_at.isoformat() if m.created_at else None}
                         for m in msgs]}


@router.post("/pets/{pet_id}/supervisor/feedback", status_code=201)
def feedback(pet_id: UUID, payload: FeedbackIn, clerk_user_id: str = Depends(get_current_user),
             db: Session = Depends(get_db)):
    dog = require_dog_ownership(pet_id, clerk_user_id, db)
    user = get_user_or_404(clerk_user_id, db)
    m = db.query(PAW.PawAiMessage).filter(PAW.PawAiMessage.id == payload.message_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Message not found.")
    s = db.query(PAW.PawAiSession).filter(
        PAW.PawAiSession.id == m.session_id, PAW.PawAiSession.dog_id == dog.id,
        PAW.PawAiSession.user_id == user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Message not found.")
    if payload.rating is not None and not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=422, detail="rating must be 1-5.")
    fb = PAW.PawAiFeedback(session_id=s.id, message_id=m.id, rating=payload.rating,
                           helpful=payload.helpful, comment=(payload.comment or "")[:1000])
    db.add(fb)
    db.commit()
    return {"status": "recorded"}
