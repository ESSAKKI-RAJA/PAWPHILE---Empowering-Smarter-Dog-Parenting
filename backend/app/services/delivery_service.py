"""BIN1 delivery providers — SMTP + Resend, resolved from environment.

Never returns fake success. When no provider is configured, returns
delivered=False with a truthful failed_missing_config reason so callers
record FAILED/SKIPPED instead of SENT.
"""
import logging
import smtplib
from dataclasses import dataclass
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.observability import email_domain

logger = logging.getLogger(__name__)


@dataclass
class DeliveryResult:
    delivered: bool
    provider: str
    reason: str


def resolve_provider() -> tuple[bool, str, str]:
    """-> (available, provider_name, reason)."""
    ok, info = settings.delivery_available()
    if not ok:
        return False, "none", info
    return True, info, "configured"


def send_email(to_email: str, subject: str, body_text: str) -> DeliveryResult:
    ok, provider, info = resolve_provider()
    if not ok:
        logger.warning("delivery_unavailable domain=%s reason=%s", email_domain(to_email), info)
        return DeliveryResult(False, "none", info)
    try:
        if provider == "resend":
            return _send_resend(to_email, subject, body_text)
        return _send_smtp(to_email, subject, body_text)
    except Exception as e:  # provider timeout / network / auth — record, never raise
        reason = f"delivery_failed: {type(e).__name__}"
        logger.warning("delivery_failed provider=%s domain=%s reason=%s", provider, email_domain(to_email), reason)
        return DeliveryResult(False, provider, reason)


def _send_smtp(to_email: str, subject: str, body_text: str) -> DeliveryResult:
    msg = MIMEText(body_text, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        return DeliveryResult(False, "smtp", f"delivery_failed: {type(e).__name__}")
    return DeliveryResult(True, "smtp", "sent")


def _send_resend(to_email: str, subject: str, body_text: str) -> DeliveryResult:
    try:
        import resend
    except Exception:
        return DeliveryResult(False, "resend", "delivery_failed: resend package unavailable")
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.RESEND_FROM,
            "to": to_email,
            "subject": subject,
            "html": f"<p>{body_text}</p>",
        })
    except Exception as e:
        return DeliveryResult(False, "resend", f"delivery_failed: {type(e).__name__}")
    return DeliveryResult(True, "resend", "sent")
