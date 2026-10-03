"""Clerk JWT verification — fail-closed, generic errors, cached JWKS.

Rules:
- RS256 only, ``kid``-matched key, signature + ``exp``/``nbf`` enforced,
  ``issuer``/``audience`` enforced when configured.
- ``test_token_*`` bypass exists ONLY outside production and ONLY when no
  JWKS URL is configured (local/dev convenience). In production, or whenever
  a JWKS URL is set, test tokens are rejected like any invalid token.
- Clients receive a single generic 401. Internal reasons go to server logs.
- JWKS is fetched with a finite timeout and cached in-process.
"""
import logging
import time

import httpx
from jose import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

JWKS_TIMEOUT_SECONDS = 3.0

_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}

GENERIC_401 = "Invalid authentication credentials."


def _is_production() -> bool:
    return (settings.ENVIRONMENT or "").strip().lower() == "production"


def _test_bypass_allowed() -> bool:
    # Local/dev convenience only: no JWKS configured AND not production.
    return not settings.CLERK_JWKS_URL and not _is_production()


def _get_jwks() -> dict:
    ttl = max(60, int(getattr(settings, "JWKS_CACHE_TTL_SECONDS", 600) or 600))
    now = time.monotonic()
    cached = _jwks_cache.get("keys")
    if cached is not None and (now - _jwks_cache.get("fetched_at", 0.0)) < ttl:
        return cached
    try:
        resp = httpx.get(settings.CLERK_JWKS_URL, timeout=JWKS_TIMEOUT_SECONDS)
        resp.raise_for_status()
        jwks = resp.json()
    except Exception:
        logger.warning("clerk jwks fetch failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_401,
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not isinstance(jwks, dict) or "keys" not in jwks:
        logger.warning("clerk jwks malformed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_401,
            headers={"WWW-Authenticate": "Bearer"},
        )
    _jwks_cache["keys"] = jwks
    _jwks_cache["fetched_at"] = now
    return jwks


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=GENERIC_401,
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_clerk_token(token: str) -> dict:
    if not token or not isinstance(token, str):
        raise _unauthorized()
    if not settings.CLERK_JWKS_URL:
        if _test_bypass_allowed() and token.startswith("test_token_"):
            sub = token.split("_")[-1]
            if not sub or sub == "token":
                raise _unauthorized()
            return {"sub": sub}
        # Fail closed: production (or any JWKS-less non-test call) never
        # authenticates. Log without the token value.
        logger.warning("auth rejected: CLERK_JWKS_URL not configured")
        raise _unauthorized()

    try:
        jwks = _get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        if unverified_header.get("alg") != "RS256":
            logger.warning("auth rejected: unexpected alg")
            raise _unauthorized()
        kid = unverified_header.get("kid")
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = {
                    "kty": key.get("kty"),
                    "kid": key.get("kid"),
                    "use": key.get("use"),
                    "n": key.get("n"),
                    "e": key.get("e"),
                }
                break
        if not rsa_key or not rsa_key.get("n") or not rsa_key.get("e"):
            logger.warning("auth rejected: unknown kid")
            raise _unauthorized()
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.CLERK_AUDIENCE or None,
            issuer=settings.CLERK_ISSUER or None,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_aud": bool(settings.CLERK_AUDIENCE),
                "verify_iss": bool(settings.CLERK_ISSUER),
                "require_exp": False,
                "require_sub": True,
            },
        )
        if not payload.get("sub"):
            raise _unauthorized()
        return payload
    except HTTPException:
        raise
    except Exception:
        # Never leak jose/internals (exp detail, key material hints) to clients.
        logger.warning("auth rejected: token verification failed")
        raise _unauthorized()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_clerk_token(token)
    clerk_user_id = payload.get("sub")
    if clerk_user_id is None:
        raise _unauthorized()
    return clerk_user_id


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
) -> str | None:
    """Bearer identity or None (never raises). Honors dependency overrides in tests."""
    if credentials is None:
        return None
    try:
        payload = verify_clerk_token(credentials.credentials)
    except HTTPException:
        return None
    return payload.get("sub")
