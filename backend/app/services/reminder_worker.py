"""BIN1 reminder worker — DB-backed, idempotent, retry-safe dispatch.

Scheduler
→ find due reminders (per-user or global cron scope)
→ create notification rows (exactly-one: never duplicate SCHEDULED|QUEUED|SENT)
→ atomically claim QUEUED rows via processing_lock
→ dispatch through configured provider
→ record SENT | FAILED | SKIPPED with reason
→ stale-lock reclaim after WORKER_STALE_MINUTES (crash recovery)

Duplicate scheduler invocation, process restart, provider timeout, and
partial failure are all safe: only the claim winner dispatches; every
outcome is recorded; retries are bounded by WORKER_MAX_ATTEMPTS.
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.observability import log_event
from app.models import all_models as M
from app.models import foundation_models as F
from app.services import delivery_service

logger = logging.getLogger(__name__)


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _recipient_email(db: Session, user_id) -> str | None:
    """Delivery address: explicit preference first, account email second."""
    pref = db.query(M.NotificationPreferences).filter(
        M.NotificationPreferences.user_id == user_id).first()
    if pref and getattr(pref, "reminder_email", None):
        return pref.reminder_email
    if pref is not None and getattr(pref, "email_enabled", True) is False:
        return None
    user = db.query(M.User).filter(M.User.id == user_id).first()
    return user.email if user and user.email else None


def sweep_due(db: Session, user_id=None, now: datetime | None = None) -> dict:
    """Create/promote QUEUED notifications for due SCHEDULED reminders.

    Exactly-one: skips any reminder that already has a QUEUED|SENT
    notification. A stale SCHEDULED row for a due reminder is promoted to
    QUEUED (not duplicated). Safe to call repeatedly.
    """
    now = now or _utcnow_naive()
    q = db.query(F.ReminderV1).filter(
        F.ReminderV1.status == "SCHEDULED",
        F.ReminderV1.due_at <= now,
    )
    if user_id is not None:
        q = q.filter(F.ReminderV1.owner_id == user_id)
    due = q.all()
    queued = 0
    for r in due:
        in_flight = db.query(F.Notification).filter(
            F.Notification.reminder_id == r.id,
            F.Notification.status.in_(["QUEUED", "SENT"])).first()
        if in_flight:
            continue
        stale = db.query(F.Notification).filter(
            F.Notification.reminder_id == r.id,
            F.Notification.status == "SCHEDULED").first()
        if stale:
            stale.status = "QUEUED"
            stale.updated_at = _utcnow_naive()
        else:
            db.add(F.Notification(reminder_id=r.id, recipient_id=r.owner_id,
                                  channel="email", status="QUEUED"))
        queued += 1
    db.commit()
    log_event(logging.INFO, "worker_sweep", due=len(due), queued=queued,
              scope="global" if user_id is None else "user")
    return {"due_count": len(due), "queued_count": queued}


def reclaim_stale_locks(db: Session, stale_minutes: int | None = None) -> int:
    """Release claims held longer than the stale threshold (worker crash recovery)."""
    stale_minutes = stale_minutes if stale_minutes is not None else settings.WORKER_STALE_MINUTES
    cutoff = _utcnow_naive() - timedelta(minutes=stale_minutes)
    rows = db.query(F.Notification).filter(
        F.Notification.processing_lock.isnot(None),
        F.Notification.status == "QUEUED",
        F.Notification.updated_at <= cutoff,
    ).all()
    for n in rows:
        n.processing_lock = None
        n.updated_at = _utcnow_naive()
    db.commit()
    if rows:
        log_event(logging.WARNING, "worker_stale_reclaim", reclaimed=len(rows))
    return len(rows)


def deliver_queued(db: Session, user_id=None, limit: int | None = None,
                   retry_failed: bool = False) -> dict:
    """Claim and dispatch due notifications. Returns truthful outcome counts."""
    limit = limit or settings.WORKER_BATCH_LIMIT
    reclaimed = reclaim_stale_locks(db)

    if retry_failed:
        failed = db.query(F.Notification).filter(F.Notification.status == "FAILED")
        if user_id is not None:
            failed = failed.filter(F.Notification.recipient_id == user_id)
        for n in failed.all():
            if (n.attempt or 0) < settings.WORKER_MAX_ATTEMPTS:
                n.status = "QUEUED"
                n.failure_reason = None
        db.commit()

    q = db.query(F.Notification).filter(F.Notification.status == "QUEUED")
    if user_id is not None:
        q = q.filter(F.Notification.recipient_id == user_id)
    candidates = q.order_by(F.Notification.created_at.asc()).limit(limit).all()

    attempted = sent = failed_count = skipped = 0
    token = uuid.uuid4().hex
    for n in candidates:
        # Atomic claim: only one worker wins even under concurrent invocation.
        claimed = db.query(F.Notification).filter(
            F.Notification.id == n.id,
            F.Notification.status == "QUEUED",
            F.Notification.processing_lock.is_(None),
        ).update({"processing_lock": token, "updated_at": _utcnow_naive()},
                   synchronize_session=False)
        db.commit()
        if not claimed:
            continue
        attempted += 1
        db.refresh(n)
        if (n.attempt or 0) >= settings.WORKER_MAX_ATTEMPTS:
            n.status = "FAILED"
            n.failure_reason = "delivery_failed: max attempts exceeded"
            n.processing_lock = None
            n.updated_at = _utcnow_naive()
            db.commit()
            failed_count += 1
            continue

        to_email = _recipient_email(db, n.recipient_id)
        if not to_email:
            n.status = "SKIPPED"
            n.failure_reason = "skipped: no recipient email on file"
            n.processing_lock = None
            n.updated_at = _utcnow_naive()
            db.commit()
            skipped += 1
            continue

        subject, body = _render(n, db)
        n.attempt = (n.attempt or 0) + 1
        n.updated_at = _utcnow_naive()
        db.commit()
        result = delivery_service.send_email(to_email, subject, body)
        if result.delivered:
            n.status = "SENT"
            n.sent_at = _utcnow_naive()
            n.failure_reason = None
            sent += 1
        else:
            n.status = "FAILED"
            n.failure_reason = (result.reason or "delivery_failed")[:500]
            failed_count += 1
        n.processing_lock = None
        n.updated_at = _utcnow_naive()
        db.commit()

    log_event(logging.INFO, "worker_deliver", attempted=attempted, sent=sent,
              failed=failed_count, skipped=skipped, reclaimed=reclaimed,
              scope="global" if user_id is None else "user")
    return {"attempted": attempted, "sent": sent, "failed": failed_count,
            "skipped": skipped, "reclaimed": reclaimed}


def _render(n: F.Notification, db: Session) -> tuple[str, str]:
    # BIN3 collaboration events carry their own truthful subject/body
    # (IDs/statuses only, never medical payloads). Reminder path unchanged.
    if getattr(n, "subject", None) or getattr(n, "body", None):
        return (
            n.subject or "PAWPHILE update",
            (n.body or "You have a PAWPHILE collaboration update.")
            + "\n\nOpen PAWPHILE to review. This is not a diagnosis.",
        )
    title = "PAWPHILE reminder"
    due = ""
    if n.reminder_id:
        r = db.query(F.ReminderV1).filter(F.ReminderV1.id == n.reminder_id).first()
        if r:
            title = r.title or title
            if r.due_at:
                due = f" (due {r.due_at.isoformat()})"
    return (
        f"PAWPHILE: {title}",
        f"Hi from PAWPHILE.\n\nReminder: {title}{due}\n\n"
        "This is a calm, preventive reminder. Please verify with your veterinarian.\n",
    )
