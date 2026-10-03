"""BIN1 worker endpoints — scheduler/cron operations with safe auth.

Auth model (documented, fail-closed):
- If WORKER_CRON_TOKEN is configured and request carries matching
  X-Cron-Token header -> GLOBAL scope (scheduler sweeps all users).
  Compared with hmac.compare_digest (timing-safe).
- Else, normal Clerk JWT (optional bearer) -> USER scope (caller's own rows).
- Otherwise -> 401. No anonymous global sweeps, no fake success.
"""
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.observability import log_event
from app.core.ownership import get_user_or_404
from app.core.security import get_optional_user
from app.db.session import get_db
from app.services import reminder_worker, retention_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _resolve_scope(request: Request, clerk_user_id: str | None, db: Session):
    cron_token = request.headers.get("X-Cron-Token", "")
    configured = settings.WORKER_CRON_TOKEN or ""
    if configured and cron_token and hmac.compare_digest(cron_token, configured):
        log_event(logging.INFO, "worker_cron_auth", scope="global")
        return "global", None
    if clerk_user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    user = get_user_or_404(clerk_user_id, db)
    return "user", user


@router.post("/worker/reminders/sweep")
async def worker_sweep(request: Request, db: Session = Depends(get_db),
                       clerk_user_id: str | None = Depends(get_optional_user)):
    """Find due reminders and queue exactly-one notifications (idempotent)."""
    scope, user = _resolve_scope(request, clerk_user_id, db)
    result = reminder_worker.sweep_due(db, user_id=None if scope == "global" else user.id)
    return {"status": "success", "scope": scope, **result}


@router.post("/worker/deliver")
async def worker_deliver(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    retry_failed: bool = False,
    db: Session = Depends(get_db),
    clerk_user_id: str | None = Depends(get_optional_user),
):
    """Claim QUEUED notifications and dispatch via configured provider.

    Truthful outcomes: sent / failed (reason) / skipped (reason).
    Unconfigured provider -> FAILED with failed_missing_config, never fake SENT.
    """
    scope, user = _resolve_scope(request, clerk_user_id, db)
    result = reminder_worker.deliver_queued(
        db, user_id=None if scope == "global" else user.id,
        limit=min(limit, settings.WORKER_BATCH_LIMIT), retry_failed=retry_failed)
    return {"status": "success", "scope": scope, **result}


@router.get("/worker/delivery-config")
async def worker_delivery_config(request: Request, db: Session = Depends(get_db),
                                 clerk_user_id: str | None = Depends(get_optional_user)):
    """Truthful delivery readiness (no secrets exposed)."""
    _resolve_scope(request, clerk_user_id, db)
    ok, info = settings.delivery_available()
    return {"available": ok, "provider": info if ok else "none",
            "reason": None if ok else info}


@router.get("/worker/retention/preview")
async def retention_preview(request: Request, db: Session = Depends(get_db),
                            clerk_user_id: str | None = Depends(get_optional_user)):
    scope, user = _resolve_scope(request, clerk_user_id, db)
    return {"scope": scope,
            "candidates": retention_service.retention_candidates(db, user_id=None if scope == "global" else user.id)}


@router.post("/worker/retention/run")
async def retention_run(request: Request, dry_run: bool = True, db: Session = Depends(get_db),
                        clerk_user_id: str | None = Depends(get_optional_user)):
    """Apply retention. dry_run=True (default) only counts. Idempotent."""
    scope, user = _resolve_scope(request, clerk_user_id, db)
    result = retention_service.run_retention(db, user_id=None if scope == "global" else user.id, dry_run=dry_run)
    return {"status": "success", "scope": scope, **result}
