"""BIN1 rate limiting — in-memory sliding-window middleware (no external service).

Protects auth, sync, uploads, report generation, shares, and worker endpoints.
- Configurable via settings (limits + window).
- 429 JSON + Retry-After header on exceed; no sensitive data in errors.
- Key: authenticated identity hash when a Bearer token is present, else client IP.
- Exempts /health, /docs, /redoc, /openapi.json.
"""
import hashlib
import logging
import threading
import time
from collections import deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)

EXEMPT_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}

# path-prefix -> (limit per window, scope label). Ordered: first match wins.
_RULES = [
    ("/api/users/sync", "auth", lambda: settings.RATE_LIMIT_AUTH_PER_MINUTE),
    ("/api/me", "auth", lambda: settings.RATE_LIMIT_AUTH_PER_MINUTE),
    ("/api/v1/pets/", "sync", lambda: settings.RATE_LIMIT_SYNC_PER_MINUTE),
    ("/api/v1/reminders/process-due", "worker", lambda: settings.RATE_LIMIT_SYNC_PER_MINUTE),
    ("/api/v1/worker", "worker", lambda: settings.RATE_LIMIT_SYNC_PER_MINUTE),
    ("/api/uploads", "upload", lambda: settings.RATE_LIMIT_SYNC_PER_MINUTE),
    ("/api/vision/scan", "upload", lambda: settings.RATE_LIMIT_SYNC_PER_MINUTE),
    ("/api/reports/generate-pdf", "reports", lambda: settings.RATE_LIMIT_SYNC_PER_MINUTE),
    ("/api/v1/pets", "default", lambda: settings.RATE_LIMIT_PER_MINUTE),
    ("/api/", "default", lambda: settings.RATE_LIMIT_PER_MINUTE),
]


def _rule_for(path: str):
    for prefix, scope, limit_fn in _RULES:
        if path.startswith(prefix):
            return scope, limit_fn()
    return None, None


def _caller_key(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer ") and len(auth) > 12:
        digest = hashlib.sha256(auth.encode()).hexdigest()[:16]
        return f"user:{digest}"
    client = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client = forwarded.split(",")[0].strip()
    return f"ip:{client}"


class RateLimitMiddleware(BaseHTTPMiddleware):
    _lock = threading.Lock()
    _hits: dict[str, deque] = {}

    @classmethod
    def reset(cls) -> None:
        with cls._lock:
            cls._hits.clear()

    def _allow(self, bucket: str, limit: int, window: int) -> tuple[bool, int]:
        now = time.monotonic()
        with RateLimitMiddleware._lock:
            dq = RateLimitMiddleware._hits.get(bucket)
            if dq is None:
                dq = RateLimitMiddleware._hits[bucket] = deque()
            while dq and dq[0] <= now - window:
                dq.popleft()
            if len(dq) >= limit:
                retry_after = max(1, int(dq[0] + window - now))
                return False, retry_after
            dq.append(now)
            if len(RateLimitMiddleware._hits) > 20000:
                # Bound memory: drop oldest buckets.
                oldest = next(iter(RateLimitMiddleware._hits))
                del RateLimitMiddleware._hits[oldest]
            return True, 0

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)
        path = request.url.path
        if path in EXEMPT_PATHS:
            return await call_next(request)
        scope, limit = _rule_for(path)
        if scope is None:
            return await call_next(request)
        window = settings.RATE_LIMIT_WINDOW_SECONDS
        bucket = f"{scope}:{_caller_key(request)}"
        allowed, retry_after = self._allow(bucket, limit, window)
        if not allowed:
            logger.warning("rate_limit_exceeded scope=%s path=%s", scope, path)
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."},
                headers={"Retry-After": str(retry_after)},
            )
        response = await call_next(request)
        return response


rate_limiter = RateLimitMiddleware
