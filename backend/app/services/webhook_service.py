"""BIN4 webhook service — explicit subscriptions, signed IDs-only payloads,
bounded retries, idempotent dispatch, revocation-aware.

Payloads carry event type + resource IDs + status + timestamp. Never health
content, never storage pointers. Receivers fetch authorized data via the API.
"""
import hashlib
import hmac
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.observability import log_event
from app.models import ecosystem_models as E

logger = logging.getLogger(__name__)

WEBHOOK_EVENTS = {"SHARE_CREATED", "SHARE_REVOKED", "PACKAGE_APPROVED",
                  "PACKAGE_SHARED", "CONSULTATION_COMPLETED", "FOLLOWUP_CREATED",
                  "FOLLOWUP_COMPLETED", "QUESTION_ANSWERED", "VET_NOTE_CREATED",
                  "RELATIONSHIP_CHANGED", "CONNECTION_CHANGED", "IMPORT_COMPLETED"}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def sign(secret: str, body: str) -> str:
    return hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()


def emit(db: Session, event_type: str, owner_id=None, client_id=None,
         ref: dict | None = None) -> int:
    """Queue deliveries for matching ACTIVE subscriptions. Never raises."""
    try:
        if event_type not in WEBHOOK_EVENTS:
            return 0
        # JSON containment differs per backend; filter in Python for portability.
        q = db.query(E.WebhookSubscription).filter(
            E.WebhookSubscription.status == "ACTIVE")
        subs = [s for s in q.all() if event_type in (s.events or [])]
        matched = [s for s in subs
                   if (owner_id is not None and s.owner_id == owner_id)
                   or (client_id is not None and s.client_id == client_id)]
        payload = {"event": event_type,
                   "at": utcnow().isoformat(),
                   "ref": ref or {}}
        n = 0
        for s in matched:
            key = f"{event_type}:{(ref or {}).get('id', '')}:{s.id}"
            dup = db.query(E.WebhookDelivery).filter(
                E.WebhookDelivery.idempotency_key == key,
                E.WebhookDelivery.status.in_(["QUEUED", "SENT"])).first()
            if dup:
                continue
            db.add(E.WebhookDelivery(subscription_id=s.id, event_type=event_type,
                                     idempotency_key=key, payload=payload,
                                     status="QUEUED"))
            n += 1
        db.commit()
        return n
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return 0


def _post(url: str, payload: dict, secret: str, timeout_s: float) -> tuple[bool, str]:
    import json as _json
    import httpx
    body = _json.dumps(payload, sort_keys=True, default=str)
    try:
        r = httpx.post(url, content=body,
                       headers={"Content-Type": "application/json",
                                "X-Pawphile-Signature": sign(secret, body),
                                "X-Pawphile-Event": str(payload.get("event", ""))},
                       timeout=timeout_s)
        if 200 <= r.status_code < 300:
            return True, ""
        return False, f"delivery_failed: http {r.status_code}"
    except Exception as exc:
        return False, f"delivery_failed: {type(exc).__name__}"[:200]


def dispatch_queued(db: Session, limit: int = 50, owner_id=None) -> dict:
    """Attempt QUEUED deliveries with bounded retries. Idempotent re-runs."""
    max_attempts = getattr(settings, "WEBHOOK_MAX_ATTEMPTS", 5)
    timeout_s = float(getattr(settings, "WEBHOOK_TIMEOUT_S", 10))
    q = db.query(E.WebhookDelivery).filter(
        E.WebhookDelivery.status == "QUEUED")
    if owner_id is not None:
        q = q.join(E.WebhookSubscription,
                   E.WebhookDelivery.subscription_id == E.WebhookSubscription.id).filter(
            E.WebhookSubscription.owner_id == owner_id)
    rows = q.order_by(E.WebhookDelivery.created_at.asc()).limit(limit).all()
    attempted = sent = failed = 0
    for d in rows:
        sub = db.query(E.WebhookSubscription).filter(
            E.WebhookSubscription.id == d.subscription_id).first()
        if not sub or sub.status != "ACTIVE":
            d.status = "FAILED"
            d.last_error = "delivery_failed: subscription inactive or revoked"
            db.commit()
            failed += 1
            continue
        if (d.attempts or 0) >= max_attempts:
            d.status = "FAILED"
            d.last_error = "delivery_failed: max attempts exceeded"
            db.commit()
            failed += 1
            continue
        attempted += 1
        d.attempts = (d.attempts or 0) + 1
        db.commit()
        ok, err = _post(sub.url, d.payload or {}, sub.secret or "", timeout_s)
        if ok:
            d.status = "SENT"
            d.last_error = None
            sent += 1
        else:
            d.last_error = err
            if (d.attempts or 0) >= max_attempts:
                d.status = "FAILED"
                failed += 1
        db.commit()
    log_event(logging.INFO, "webhook_dispatch", attempted=attempted,
              sent=sent, failed=failed)
    return {"attempted": attempted, "sent": sent, "failed": failed}
