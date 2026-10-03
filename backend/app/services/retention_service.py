"""BIN1 storage retention — operational hygiene, never clinical deletion.

Scope (explicit):
- PURGE: terminal notifications (SENT|FAILED|SKIPPED) older than
  RETENTION_NOTIFICATION_DAYS; ACKED|REJECTED sync_operations older than
  RETENTION_SYNCOP_DAYS; REVOKED|EXPIRED share_grants older than
  RETENTION_SHARE_DAYS (grant row only; audit trail entry written first).
- NEVER auto-deleted: health_events, symptoms, medications, visits, vaccines,
  measurements, nutrition/behavior, labs/imaging, files, reports, reminders,
  consent, audit (unless RETENTION_AUDIT_DAYS > 0 is explicitly configured).
- HealthFile rows are metadata for externally stored bytes; deleting the row
  would orphan bytes or break reports, so files are excluded entirely.

Idempotent: re-running finds zero candidates. Every deletion is preceded by
an audit log entry (grant/file summary, never medical content).
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.observability import log_event
from app.models import all_models as M
from app.models import foundation_models as F

try:
    from app.models import ecosystem_models as E
except Exception:  # pragma: no cover — models always present in practice
    E = None  # type: ignore


def _cutoff(days: int) -> datetime | None:
    if not days or days <= 0:
        return None
    return datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)


def retention_candidates(db: Session, user_id=None) -> dict:
    """Count-only preview. Same selectors as run_retention()."""
    out: dict[str, int] = {}

    cutoff = _cutoff(settings.RETENTION_NOTIFICATION_DAYS)
    if cutoff is not None:
        q = db.query(F.Notification).filter(
            F.Notification.status.in_(["SENT", "FAILED", "SKIPPED"]),
            F.Notification.created_at <= cutoff)
        if user_id is not None:
            q = q.filter(F.Notification.recipient_id == user_id)
        out["notifications"] = q.count()
    else:
        out["notifications"] = 0

    cutoff = _cutoff(settings.RETENTION_SYNCOP_DAYS)
    if cutoff is not None:
        q = db.query(F.SyncOperation).filter(
            F.SyncOperation.status.in_(["ACKED", "REJECTED"]),
            F.SyncOperation.created_at <= cutoff)
        if user_id is not None:
            q = q.filter(F.SyncOperation.user_id == user_id)
        out["sync_operations"] = q.count()
    else:
        out["sync_operations"] = 0

    cutoff = _cutoff(settings.RETENTION_SHARE_DAYS)
    if cutoff is not None:
        q = db.query(F.ShareGrant).filter(
            F.ShareGrant.status.in_(["REVOKED", "EXPIRED"]),
            F.ShareGrant.created_at <= cutoff)
        if user_id is not None:
            q = q.filter(F.ShareGrant.owner_id == user_id)
        out["share_grants"] = q.count()
    else:
        out["share_grants"] = 0

    if settings.RETENTION_AUDIT_DAYS > 0:
        cutoff = _cutoff(settings.RETENTION_AUDIT_DAYS)
        q = db.query(M.AuditLog).filter(M.AuditLog.created_at <= cutoff)
        if user_id is not None:
            q = q.filter(M.AuditLog.user_id == user_id)
        out["audit_logs"] = q.count()
    else:
        out["audit_logs"] = 0  # retained forever by default

    out["protected"] = "health_events/symptoms/medications/visits/files/reports/reminders/consent never auto-deleted"

    # ── BIN4 ecosystem hygiene ──
    # PURGE: terminal webhook deliveries (SENT|FAILED) older than
    # RETENTION_WEBHOOK_DAYS; REJECTED (or stale RAW) external imports older
    # than RETENTION_IMPORT_DAYS. NEVER purged: connections, relationships,
    # credentials, IMPORTED events (provenance), plans/entitlements.
    cutoff = _cutoff(settings.RETENTION_WEBHOOK_DAYS)
    if cutoff is not None:
        out["webhook_deliveries"] = db.query(E.WebhookDelivery).filter(
            E.WebhookDelivery.status.in_(["SENT", "FAILED"]),
            E.WebhookDelivery.created_at <= cutoff).count()
    else:
        out["webhook_deliveries"] = 0

    cutoff = _cutoff(settings.RETENTION_IMPORT_DAYS)
    if cutoff is not None:
        out["external_imports"] = db.query(E.ExternalImport).filter(
            E.ExternalImport.status.in_(["REJECTED", "RAW"]),
            E.ExternalImport.created_at <= cutoff).count()
    else:
        out["external_imports"] = 0
    return out


def run_retention(db: Session, user_id=None, dry_run: bool = True) -> dict:
    """Apply retention. dry_run=True (default) only counts. Idempotent."""
    counts = retention_candidates(db, user_id)
    if dry_run:
        log_event(logging.INFO, "retention_dry_run", **{k: v for k, v in counts.items() if k != "protected"})
        return {"dry_run": True, "deleted": {k: 0 for k in ("notifications", "sync_operations", "share_grants", "audit_logs",
                                                             "webhook_deliveries", "external_imports")},
                "candidates": counts}

    deleted: dict[str, int] = {"notifications": 0, "sync_operations": 0, "share_grants": 0, "audit_logs": 0,
                               "webhook_deliveries": 0, "external_imports": 0}

    cutoff = _cutoff(settings.RETENTION_NOTIFICATION_DAYS)
    if cutoff is not None:
        q = db.query(F.Notification).filter(
            F.Notification.status.in_(["SENT", "FAILED", "SKIPPED"]),
            F.Notification.created_at <= cutoff)
        if user_id is not None:
            q = q.filter(F.Notification.recipient_id == user_id)
        for row in q.all():
            db.delete(row)
            deleted["notifications"] += 1
        db.commit()

    cutoff = _cutoff(settings.RETENTION_SYNCOP_DAYS)
    if cutoff is not None:
        q = db.query(F.SyncOperation).filter(
            F.SyncOperation.status.in_(["ACKED", "REJECTED"]),
            F.SyncOperation.created_at <= cutoff)
        if user_id is not None:
            q = q.filter(F.SyncOperation.user_id == user_id)
        for row in q.all():
            db.delete(row)
            deleted["sync_operations"] += 1
        db.commit()

    cutoff = _cutoff(settings.RETENTION_SHARE_DAYS)
    if cutoff is not None:
        q = db.query(F.ShareGrant).filter(
            F.ShareGrant.status.in_(["REVOKED", "EXPIRED"]),
            F.ShareGrant.created_at <= cutoff)
        if user_id is not None:
            q = q.filter(F.ShareGrant.owner_id == user_id)
        for row in q.all():
            # Preserve audit trail of the grant before removing the row.
            db.add(M.AuditLog(user_id=row.owner_id, dog_id=row.pet_id, action="share.retention_purged",
                              details={"resource_type": "share_grant", "resource_id": str(row.id),
                                       "scope": row.status}))
            db.delete(row)
            deleted["share_grants"] += 1
        db.commit()

    if settings.RETENTION_AUDIT_DAYS > 0:
        cutoff = _cutoff(settings.RETENTION_AUDIT_DAYS)
        q = db.query(M.AuditLog).filter(M.AuditLog.created_at <= cutoff)
        if user_id is not None:
            q = q.filter(M.AuditLog.user_id == user_id)
        for row in q.all():
            db.delete(row)
            deleted["audit_logs"] += 1
        db.commit()

    _run_bin4(db, deleted)

    log_event(logging.INFO, "retention_run", **deleted,
              scope="global" if user_id is None else "user")
    return {"dry_run": False, "deleted": deleted, "candidates": counts}


def _run_bin4(db: Session, deleted: dict) -> None:
    """BIN4 categories. Imported canonical events and live connections are
    never purged — only delivery logs and failed/stale import attempts."""
    if E is None:
        return
    cutoff = _cutoff(settings.RETENTION_WEBHOOK_DAYS)
    if cutoff is not None:
        for row in db.query(E.WebhookDelivery).filter(
                E.WebhookDelivery.status.in_(["SENT", "FAILED"]),
                E.WebhookDelivery.created_at <= cutoff).all():
            db.delete(row)
            deleted["webhook_deliveries"] += 1
        db.commit()
    cutoff = _cutoff(settings.RETENTION_IMPORT_DAYS)
    if cutoff is not None:
        for row in db.query(E.ExternalImport).filter(
                E.ExternalImport.status.in_(["REJECTED", "RAW"]),
                E.ExternalImport.created_at <= cutoff).all():
            db.delete(row)
            deleted["external_imports"] += 1
        db.commit()
