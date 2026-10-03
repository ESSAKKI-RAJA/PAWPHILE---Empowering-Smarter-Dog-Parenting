"""BIN1 production observability: request IDs + safe structured logging.

Rules:
- Log actions, counts, statuses, and non-sensitive IDs only.
- NEVER log: tokens, passwords, secrets, file contents, medical details,
  email addresses (domain part only where needed).
"""
import logging
import uuid
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

request_id_ctx: ContextVar[str] = ContextVar("pawphile_request_id", default="-")

logger = logging.getLogger("pawphile")


def get_request_id() -> str:
    return request_id_ctx.get()


def log_event(level: int, event: str, **fields) -> None:
    safe = {k: v for k, v in fields.items()}
    logger.log(level, "[%s] %s %s", get_request_id(), event, safe)


def email_domain(email: str | None) -> str:
    if not email or "@" not in email:
        return "unknown"
    return email.split("@")[-1]


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        request_id_ctx.set(rid)
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("[%s] unhandled_exception path=%s", rid, request.url.path)
            raise
        response.headers["X-Request-ID"] = rid
        if response.status_code >= 500:
            logger.error("[%s] server_error path=%s status=%s", rid, request.url.path, response.status_code)
        return response
