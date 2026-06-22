from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Any, Optional, List, Dict
import datetime
import os
import pytz  # for timezone conversion
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from supabase import create_client, Client

router = APIRouter()

# ------------------------------------------------------------------
# Utility: Supabase client
# ------------------------------------------------------------------
def get_supabase() -> Optional[Client]:
    """Return a Supabase client using the service role key if available."""
    url = os.environ.get("SUPABASE_URL")
    # Prefer service role key for server‑side operations
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if url and key:
        return create_client(url, key)
    return None

# ------------------------------------------------------------------
# Pydantic models
# ------------------------------------------------------------------
class ReminderPreferences(BaseModel):
    user_id: str
    email_address: EmailStr
    vaccinations_enabled: bool = True
    deworming_enabled: bool = True
    vet_visits_enabled: bool = True
    report_review_enabled: bool = False
    timezone: str = "Asia/Kolkata"

class TestEmailRequest(BaseModel):
    user_id: str
    email_address: EmailStr
    category: str = "test"

# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------
@router.post("/save-preferences")
def save_preferences(prefs: ReminderPreferences) -> dict[str, Any]:
    """POST /api/reminders/save-preferences"""
    sb = get_supabase()
    if sb:
        # Save preferences with fixed quiet hours (09:00 - 18:00) as required.
        # (If you later allow custom quiet hours, remove the hardcoded values.)
        try:
            sb.table("reminder_preferences").upsert({
                "profile_id": prefs.user_id,
                "email_address": prefs.email_address,
                "vaccines_enabled": prefs.vaccinations_enabled,
                "walks_enabled": False,
                "vet_visits_enabled": prefs.vet_visits_enabled,
                "nutrition_enabled": False,
                "timezone": prefs.timezone,
                "quiet_hours_start": "09:00",
                "quiet_hours_end": "18:00",
                "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            print(f"[Supabase] Error saving preferences: {e}")

    return {
        "status": "success",
        "message": "Preferences saved successfully to backend.",
        "user_id": prefs.user_id,
        "email": prefs.email_address
    }

# ------------------------------------------------------------------
# Email building
# ------------------------------------------------------------------
def build_reminder_html(title: str, content: str, unsubscribe_url: str) -> str:
    """Build a calm, preventive reminder email."""
    return f"""
    <html>
      <body style="font-family: sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0d9488;">{title}</h2>
            <p style="font-size: 16px; line-height: 1.5;">{content}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #888; text-align: center;">
                This is a calm, preventive reminder from PAWPHILE.<br/>
                <a href="{unsubscribe_url}" style="color: #0d9488; text-decoration: none;">One-click Unsubscribe</a>
            </p>
        </div>
      </body>
    </html>
    """

# ------------------------------------------------------------------
# Quiet hours enforcement
# ------------------------------------------------------------------
def is_within_allowed_window(profile_id: str, now_utc: datetime.datetime) -> bool:
    """
    Check if the current time falls within the user's allowed sending window.
    Returns True if sending is allowed, False if we are inside quiet hours.
    """
    sb = get_supabase()
    if not sb:
        return True  # If Supabase unavailable, do not block

    try:
        res = sb.table("reminder_preferences")\
                .select("quiet_hours_start, quiet_hours_end, timezone")\
                .eq("profile_id", profile_id)\
                .single()\
                .execute()
        if not res.data:
            return True  # No preferences => allow

        prefs = res.data
        tz_name = prefs.get("timezone", "UTC")
        try:
            tz = pytz.timezone(tz_name)
        except Exception:
            tz = pytz.UTC

        local_now = now_utc.astimezone(tz)
        start_str = prefs.get("quiet_hours_start")  # e.g., "09:00"
        end_str = prefs.get("quiet_hours_end")      # e.g., "18:00"

        if start_str and end_str:
            # Parse time strings (HH:MM)
            start_h, start_m = map(int, start_str.split(":"))
            end_h, end_m = map(int, end_str.split(":"))
            start_time = local_now.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
            end_time = local_now.replace(hour=end_h, minute=end_m, second=0, microsecond=0)

            # Sending is allowed between start_time (inclusive) and end_time (exclusive)
            if not (start_time <= local_now < end_time):
                print(f"[Quiet Hours] {profile_id}: outside allowed window ({start_str} - {end_str}), skipping.")
                return False
    except Exception as e:
        print(f"[Quiet Hours] Error checking window: {e}")

    return True

# ------------------------------------------------------------------
# Core sending logic (background task)
# ------------------------------------------------------------------
def send_email_task(
    email: str,
    subject: str,
    html_content: str,
    profile_id: str,
    dog_id: str,
    category: str,
    urgency_level: str = "medium",
    event_type: str = "general_alert"
):
    sb = get_supabase()
    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Smart Urgency Cooldown Logic
    if sb and urgency_level != "critical":
        try:
            cooldown_days = 1 if urgency_level == "high" else 7
            cutoff = (now - datetime.timedelta(days=cooldown_days)).isoformat()
            res = sb.table("reminder_events")\
                    .select("id")\
                    .eq("profile_id", profile_id)\
                    .eq("event_type", event_type)\
                    .gte("created_at", cutoff)\
                    .execute()
            if res.data and len(res.data) > 0:
                print(f"[Reminders] Skipped: {event_type} for {email} blocked by {urgency_level} cooldown.")
                return
        except Exception as e:
            print(f"[Reminders] Cooldown check error: {e}")

    # 2. Enforce quiet hours (do not send outside allowed window)
    if not is_within_allowed_window(profile_id, now):
        # Log a “skipped” event so we know it was suppressed
        if sb:
            try:
                sb.table("reminder_events").insert({
                    "profile_id": profile_id,
                    "dog_id": dog_id,
                    "category": category,
                    "urgency_level": urgency_level,
                    "event_type": event_type,
                    "delivery_status": "skipped_quiet_hours",
                    "sent_at": now.isoformat(),
                    "created_at": now.isoformat(),
                    "cooldown_until": now.isoformat()  # no future cooldown needed
                }).execute()
            except Exception as e:
                print(f"[Supabase] Error logging skipped event: {e}")
        return

    # 3. Dispatch using SMTP
    message_id = None
    error_msg = None
    status = "sent"

    print(f"[Email Dispatch] Sending to {email}: {subject} (Urgency: {urgency_level})")

    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT", "587")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")

    if smtp_host and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart()
            msg['From'] = f"PAWPHILE <{smtp_user}>"
            msg['To'] = email
            msg['Subject'] = subject
            msg.attach(MIMEText(html_content, 'html'))

            server = smtplib.SMTP(smtp_host, int(smtp_port))
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
            server.quit()

            message_id = f"smtp-{now.timestamp()}"
        except Exception as e:
            error_msg = str(e)
            status = "failed"
            print(f"[SMTP Error] {error_msg}")
    else:
        status = "failed_missing_config"
        error_msg = "SMTP_HOST/USER/PASSWORD missing"
        print("[SMTP CONFIG MISSING] Attempted to send email but SMTP credentials are not configured.")

    # 4. Log event (Audit Log Schema)
    if sb:
        try:
            cooldown_until = now + datetime.timedelta(days=1) if urgency_level == "high" else now + datetime.timedelta(days=7)
            sb.table("reminder_events").insert({
                "profile_id": profile_id,
                "dog_id": dog_id,
                "category": category,
                "urgency_level": urgency_level,
                "event_type": event_type,
                "delivery_status": status,
                "provider_message_id": message_id,
                "error_message": error_msg,
                "sent_at": now.isoformat(),
                "cooldown_until": cooldown_until.isoformat(),
                "created_at": now.isoformat()
            }).execute()
        except Exception as e:
            print(f"[Supabase] Error logging reminder event: {e}")

# ------------------------------------------------------------------
# Test email endpoint
# ------------------------------------------------------------------
@router.post("/test-email")
def test_email(req: TestEmailRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    """POST /api/reminders/test-email"""
    if not os.environ.get("SMTP_HOST") or not os.environ.get("SMTP_USER"):
        raise HTTPException(status_code=500, detail="failed_missing_config: SMTP environment variables missing")

    unsub_url = f"https://pawphile.com/unsubscribe?user={req.user_id}&cat=test"
    html = build_reminder_html(
        "Welcome to PAWPHILE Reminders",
        "This is a test notification to confirm your email preferences are working.",
        unsub_url
    )
    background_tasks.add_task(
        send_email_task,
        req.email_address,
        "PAWPHILE Test Reminder",
        html,
        req.user_id,
        "test_dog_id",
        "test",
        "low",
        "test_email"
    )
    return {
        "status": "success",
        "message": "Test email queued for delivery."
    }

# ------------------------------------------------------------------
# Trigger due reminders (mock / cron placeholder)
# ------------------------------------------------------------------
@router.post("/send-due")
def trigger_due_reminders(background_tasks: BackgroundTasks) -> dict[str, Any]:
    """
    CRON endpoint to send due reminders.
    In production, this would:
      - Query due vaccinations, deworming, vet visits, report reviews
      - Respect per-user preferences (enabled/disabled, timezone, quiet hours)
      - Build personalised content and trigger background tasks
    """
    now = datetime.datetime.now(datetime.timezone.utc)

    # ---------- Replace this mock with real querying ----------
    # Example: fetch users with due vaccines and their preferences
    # Due is a placeholder; real logic would iterate over them.
    # Here we simulate sending one high‑priority reminder for testing.
    unsub_url = "https://pawphile.com/unsubscribe?user=test_user&cat=vaccination"
    html = build_reminder_html(
        "Upcoming Preventive Care",
        "It's almost time for your dog's scheduled vaccination. Keeping up with preventive care ensures long-term health and peace of mind.",
        unsub_url
    )

    background_tasks.add_task(
        send_email_task,
        "test@example.com",
        "PAWPHILE: Upcoming Vaccine Reminder",
        html,
        "test_user",
        "test_dog",
        "vaccination",
        "high",
        "vaccine_due"
    )
    # --------------------------------------------------------

    return {
        "status": "success",
        "triggered_count": 1,   # In real code, the actual number of queued tasks
        "timestamp": now.isoformat()
    }