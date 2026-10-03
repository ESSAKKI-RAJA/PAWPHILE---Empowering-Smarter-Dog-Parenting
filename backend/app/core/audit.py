"""BIN1 audit helper. Records WHO did WHAT to WHICH resource WHEN.

Sensitive health payloads are never stored in audit details — only IDs,
resource types, and non-sensitive metadata.
"""
from typing import Any
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.all_models import AuditLog


def log_audit(
    db: Session,
    *,
    action: str,
    user_id: UUID | None = None,
    dog_id: UUID | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    try:
        entry = AuditLog(
            user_id=user_id,
            dog_id=dog_id,
            action=action,
            details=details or {},
        )
        db.add(entry)
        # Caller commits; flush here so failures surface early without breaking flow.
        db.flush()
    except Exception:
        # Audit must never break the primary operation.
        db.rollback()
