# backend/app/utils/email.py
import os

import resend


def _resend_key() -> str:
    return os.getenv("RESEND_API_KEY", "")

def send_resend_email(
    subject: str,
    html: str,
    to_email: str,
    from_email: str = "onboarding@resend.dev",
):
    """
    Send an email via Resend API. API key comes from RESEND_API_KEY env;
    raises RuntimeError with a truthful message when unconfigured.
    """
    key = _resend_key()
    if not key:
        raise RuntimeError("failed_missing_config: RESEND_API_KEY not configured")
    resend.api_key = key
    return resend.Emails.send(
        {
            "from": from_email,
            "to": to_email,
            "subject": subject,
            "html": html,
        }
    )
