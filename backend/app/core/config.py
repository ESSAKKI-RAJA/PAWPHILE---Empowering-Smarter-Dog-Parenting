from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()


def _get_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _get_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _get_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
    CLERK_JWKS_URL: str = os.getenv("CLERK_JWKS_URL", "")
    # Expected JWT issuer / audience. Enforced when set; empty = not checked.
    # Set these in production from the Clerk dashboard values.
    CLERK_ISSUER: str = os.getenv("CLERK_ISSUER", "")
    CLERK_AUDIENCE: str = os.getenv("CLERK_AUDIENCE", "")
    # In-process JWKS cache TTL (seconds). Avoids a Clerk round-trip per request.
    JWKS_CACHE_TTL_SECONDS: int = _get_int("JWKS_CACHE_TTL_SECONDS", 600)
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY", "")

    # ── Rate limiting (in-memory sliding window; no external service) ──
    RATE_LIMIT_ENABLED: bool = _get_bool("RATE_LIMIT_ENABLED", True)
    RATE_LIMIT_PER_MINUTE: int = _get_int("RATE_LIMIT_PER_MINUTE", 120)
    RATE_LIMIT_SYNC_PER_MINUTE: int = _get_int("RATE_LIMIT_SYNC_PER_MINUTE", 60)
    RATE_LIMIT_AUTH_PER_MINUTE: int = _get_int("RATE_LIMIT_AUTH_PER_MINUTE", 20)
    RATE_LIMIT_WINDOW_SECONDS: int = _get_int("RATE_LIMIT_WINDOW_SECONDS", 60)

    # ── Worker / delivery ──
    # Shared secret for scheduler/cron callers of worker endpoints.
    # Empty = worker endpoints fall back to per-caller user auth only.
    WORKER_CRON_TOKEN: str = os.getenv("WORKER_CRON_TOKEN", "")
    DELIVERY_PROVIDER: str = os.getenv("DELIVERY_PROVIDER", "auto")  # auto|smtp|resend|disabled
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = _get_int("SMTP_PORT", 587)
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "PAWPHILE <no-reply@pawphile.com>")
    SMTP_TIMEOUT_SECONDS: int = _get_int("SMTP_TIMEOUT_SECONDS", 10)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM: str = os.getenv("RESEND_FROM", "onboarding@resend.dev")
    WORKER_BATCH_LIMIT: int = _get_int("WORKER_BATCH_LIMIT", 50)
    WORKER_STALE_MINUTES: int = _get_int("WORKER_STALE_MINUTES", 10)
    WORKER_MAX_ATTEMPTS: int = _get_int("WORKER_MAX_ATTEMPTS", 5)

    # ── Retention (operational hygiene only; health records are never auto-deleted) ──
    RETENTION_NOTIFICATION_DAYS: int = _get_int("RETENTION_NOTIFICATION_DAYS", 90)
    RETENTION_SYNCOP_DAYS: int = _get_int("RETENTION_SYNCOP_DAYS", 30)
    RETENTION_SHARE_DAYS: int = _get_int("RETENTION_SHARE_DAYS", 180)
    RETENTION_AUDIT_DAYS: int = _get_int("RETENTION_AUDIT_DAYS", 0)  # 0 = retain forever
    # ── BIN4 ecosystem retention (webhook delivery log + rejected/raw imports) ──
    RETENTION_WEBHOOK_DAYS: int = _get_int("RETENTION_WEBHOOK_DAYS", 90)
    RETENTION_IMPORT_DAYS: int = _get_int("RETENTION_IMPORT_DAYS", 30)

    # ── BIN4 webhooks (outbound event delivery) ──
    WEBHOOK_MAX_ATTEMPTS: int = _get_int("WEBHOOK_MAX_ATTEMPTS", 5)
    WEBHOOK_TIMEOUT_S: float = _get_float("WEBHOOK_TIMEOUT_S", 10.0)

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # ── BIN2 intelligence thresholds (descriptive, not clinical) ──
    # |% change| below STABLE_PCT -> STABLE; R^2 below VARIABLE_R2 -> VARIABLE;
    # recent-vs-baseline flag needs |robust z| >= CHANGE_MAD_Z and |%| >= metric min;
    # |robust z| above OUTLIER_MAD_Z -> suspicious (excluded from baseline w/ reason).
    INTEL_STABLE_PCT_THRESHOLD: float = _get_float("INTEL_STABLE_PCT_THRESHOLD", 5.0)
    INTEL_VARIABLE_R2: float = _get_float("INTEL_VARIABLE_R2", 0.35)
    INTEL_CHANGE_MAD_Z: float = _get_float("INTEL_CHANGE_MAD_Z", 3.0)
    INTEL_CHANGE_MIN_PCT: float = _get_float("INTEL_CHANGE_MIN_PCT", 10.0)
    INTEL_WEIGHT_CHANGE_MIN_PCT: float = _get_float("INTEL_WEIGHT_CHANGE_MIN_PCT", 5.0)
    INTEL_OUTLIER_MAD_Z: float = _get_float("INTEL_OUTLIER_MAD_Z", 5.0)

    def delivery_available(self) -> tuple[bool, str]:
        """Truthful provider resolution. Never claims delivery that cannot happen."""
        provider = (self.DELIVERY_PROVIDER or "auto").lower()
        if provider == "disabled":
            return False, "delivery_failed: disabled by DELIVERY_PROVIDER=disabled"
        if provider == "resend":
            if self.RESEND_API_KEY:
                return True, "resend"
            return False, "failed_missing_config: RESEND_API_KEY not configured"
        if provider == "smtp":
            if self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD:
                return True, "smtp"
            return False, "failed_missing_config: SMTP_HOST/USER/PASSWORD not configured"
        # auto
        if self.RESEND_API_KEY:
            return True, "resend"
        if self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD:
            return True, "smtp"
        return False, "failed_missing_config: no delivery provider configured (RESEND_API_KEY or SMTP_*)"


settings = Settings()
