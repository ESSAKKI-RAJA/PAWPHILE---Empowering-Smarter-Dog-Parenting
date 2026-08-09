# backend/app/utils/email.py
import resend

# TODO: Replace "re_xxxxxxxxx" with your actual Resend API key.
resend.api_key = "re_xxxxxxxxx"

def send_resend_email(
    subject: str,
    html: str,
    to_email: str,
    from_email: str = "onboarding@resend.dev",
):
    """
    Send an email via Resend API.

    Parameters:
        subject: Email subject.
        html: HTML content of the email.
        to_email: Recipient email address.
        from_email: Sender email address (defaults to Resend onboarding address).
    """
    return resend.Emails.send(
        {
            "from": from_email,
            "to": to_email,
            "subject": subject,
            "html": html,
        }
    )
