"""BIN1 production tests — rate limiting, worker delivery, retention.

Run: venv/Scripts/python -m pytest backend/tests/test_production.py -v
Uses shared SQLite fixtures (bin1_shared). No network; delivery provider
forced to disabled/fake to prove truthful (never fake SENT) behavior.
"""
from datetime import datetime, timedelta
from uuid import UUID as PyUUID

from bin1_shared import _as, _current, client, TestingSession  # noqa: F401,E402 — first: fixes sys.path for app imports
from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.services import delivery_service
from app.models import all_models as M
from app.models import foundation_models as F

CRON = "test-cron-token-123"


def _sync(email="pa@x.com"):
    return client.post("/api/users/sync", json={"clerk_user_id": _current["sub"], "email": email})


def _dog(name="ProdDog"):
    r = client.post("/api/dogs", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _cron():
    return {"X-Cron-Token": CRON}


def setup_function(_):
    RateLimitMiddleware.reset()
    # Other suites share this process/app; keep limiter off except in the
    # dedicated rate-limit tests below.
    settings.RATE_LIMIT_ENABLED = False
    settings.WORKER_CRON_TOKEN = CRON
    settings.DELIVERY_PROVIDER = "disabled"
    settings.WORKER_MAX_ATTEMPTS = 5


def teardown_function(_):
    RateLimitMiddleware.reset()
    settings.RATE_LIMIT_ENABLED = False
    settings.WORKER_CRON_TOKEN = ""
    settings.DELIVERY_PROVIDER = "auto"


# ── Rate limiting ──

def test_health_exempt_and_burst_limited_with_retry_after():
    RateLimitMiddleware.reset()
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_AUTH_PER_MINUTE = 3
    try:
        for _ in range(10):
            assert client.get("/health").status_code == 200  # exempt, never limited
        codes = [client.get("/api/me").status_code for _ in range(6)]
        assert 429 in codes, codes
        # Find a 429 and check Retry-After
        RateLimitMiddleware.reset()
        seen_retry_after = False
        for _ in range(10):
            r = client.get("/api/me")
            if r.status_code == 429:
                assert "Retry-After" in r.headers
                assert "detail" in r.json()
                assert "traceback" not in r.text and "secret" not in r.text.lower()
                seen_retry_after = True
                break
        assert seen_retry_after
    finally:
        settings.RATE_LIMIT_AUTH_PER_MINUTE = 20
        settings.RATE_LIMIT_ENABLED = False
        RateLimitMiddleware.reset()


def test_rate_limit_disabled_allows_traffic():
    RateLimitMiddleware.reset()
    settings.RATE_LIMIT_ENABLED = False
    try:
        for _ in range(5):
            assert client.get("/api/me").status_code in (200, 404)
    finally:
        RateLimitMiddleware.reset()


# ── Worker auth ──

def test_worker_requires_cron_or_auth():
    settings.WORKER_CRON_TOKEN = CRON
    _as("prod_a")
    _sync("pa@x.com")
    # Cron token -> global scope.
    r = client.post("/api/v1/worker/reminders/sweep", headers=_cron())
    assert r.status_code == 200 and r.json()["scope"] == "global"
    # Wrong cron token falls back to user JWT -> user scope, NOT global.
    bad = client.post("/api/v1/worker/reminders/sweep", headers={"X-Cron-Token": "wrong"})
    assert bad.status_code == 200 and bad.json()["scope"] == "user"


# ── Sweep + delivery truthfulness ──

def test_sweep_idempotent_and_unconfigured_delivery_never_fakes_sent():
    _as("prod_a")
    _sync("pa@x.com")
    dog = _dog("SweepDog")
    past = (datetime.utcnow() - timedelta(days=1)).isoformat()
    r = client.post(f"/api/v1/pets/{dog}/reminders",
                    json={"reminder_type": "vaccination", "title": "Rabies due", "due_at": past})
    assert r.status_code == 201
    # create_reminder seeds a SCHEDULED notification; the sweep promotes it
    # to QUEUED exactly once (second sweep queues nothing).
    s1 = client.post("/api/v1/worker/reminders/sweep").json()
    s2 = client.post("/api/v1/worker/reminders/sweep").json()
    assert s1["queued_count"] == 1 and s2["queued_count"] == 0  # exactly-one
    settings.DELIVERY_PROVIDER = "disabled"
    d = client.post("/api/v1/worker/deliver").json()
    assert d["attempted"] == 1 and d["sent"] == 0 and d["failed"] == 1
    db = TestingSession()
    n = db.query(F.Notification).order_by(F.Notification.created_at.desc()).first()
    assert n.status == "FAILED" and "fail" in (n.failure_reason or "")
    db.close()
    # Retry with a working provider delivers exactly once; duplicate run sends nothing.
    orig = delivery_service.send_email
    delivery_service.send_email = lambda *a, **k: delivery_service.DeliveryResult(True, "test", "sent")
    try:
        d2 = client.post("/api/v1/worker/deliver?retry_failed=true").json()
        assert d2["sent"] == 1, d2
        d3 = client.post("/api/v1/worker/deliver?retry_failed=true").json()
        assert d3["attempted"] == 0 and d3["sent"] == 0, d3
    finally:
        delivery_service.send_email = orig


def test_stale_lock_reclaimed_and_max_attempts_bounded():
    _as("prod_a")
    _sync("pa@x.com")
    dog = _dog("StaleDog")
    past = (datetime.utcnow() - timedelta(days=1)).isoformat()
    rid = client.post(f"/api/v1/pets/{dog}/reminders",
                      json={"reminder_type": "general", "title": "Stale", "due_at": past}).json()["id"]
    db = TestingSession()
    user = db.query(M.User).filter(M.User.clerk_user_id == "prod_a").first()
    rem = db.query(F.ReminderV1).filter(F.ReminderV1.id == PyUUID(rid)).first()
    n = F.Notification(reminder_id=rem.id, recipient_id=user.id, channel="email",
                       status="QUEUED", attempt=99, processing_lock="dead-worker",
                       created_at=datetime.utcnow() - timedelta(hours=2),
                       updated_at=datetime.utcnow() - timedelta(hours=2))
    db.add(n)
    db.commit()
    nid = n.id
    db.close()
    orig = delivery_service.send_email
    delivery_service.send_email = lambda *a, **k: delivery_service.DeliveryResult(True, "test", "sent")
    try:
        d = client.post("/api/v1/worker/deliver").json()
        assert d["attempted"] >= 1
    finally:
        delivery_service.send_email = orig
    db = TestingSession()
    n2 = db.query(F.Notification).filter(F.Notification.id == nid).first()
    # attempt exceeded max -> FAILED, never infinite loop, lock released
    assert n2.status == "FAILED" and n2.processing_lock is None
    db.close()


def test_skipped_when_no_recipient_email():
    _as("prod_naked")
    client.post("/api/users/sync", json={"clerk_user_id": "prod_naked", "email": None})
    dog = _dog("NakedDog")
    past = (datetime.utcnow() - timedelta(days=1)).isoformat()
    client.post(f"/api/v1/pets/{dog}/reminders",
                json={"reminder_type": "general", "title": "NoAddr", "due_at": past})
    client.post("/api/v1/worker/reminders/sweep")
    d = client.post("/api/v1/worker/deliver").json()
    assert d["skipped"] >= 1 and d["sent"] == 0


# ── Retention ──

def _backdate(model, row_id, days: int):
    db = TestingSession()
    row = db.query(model).filter(model.id == row_id).first()
    row.created_at = datetime.utcnow() - timedelta(days=days)
    db.commit()
    db.close()


def test_retention_dry_run_preview_apply_idempotent_and_protects_active():
    _as("prod_a")
    _sync("pa@x.com")
    dog = _dog("RetDog")
    past = (datetime.utcnow() - timedelta(days=1)).isoformat()
    rid = client.post(f"/api/v1/pets/{dog}/reminders",
                      json={"reminder_type": "general", "title": "Ret", "due_at": past}).json()["id"]
    client.post("/api/v1/worker/reminders/sweep")
    client.post("/api/v1/worker/deliver")  # FAILED (provider disabled)
    db = TestingSession()
    notif = db.query(F.Notification).order_by(F.Notification.created_at.desc()).first()
    nid = notif.id
    db.close()
    _backdate(F.Notification, nid, 100)
    # Active health data must never be candidates.
    sym = client.post(f"/api/v1/pets/{dog}/symptoms", json={"name": "cough"}).json()["id"]
    preview = client.get("/api/v1/worker/retention/preview").json()
    assert preview["candidates"]["notifications"] >= 1
    dry = client.post("/api/v1/worker/retention/run?dry_run=true").json()
    assert dry["dry_run"] is True
    db = TestingSession()
    assert db.query(F.Notification).filter(F.Notification.id == nid).first() is not None
    db.close()
    run = client.post("/api/v1/worker/retention/run?dry_run=false").json()
    assert run["deleted"]["notifications"] >= 1
    rerun = client.post("/api/v1/worker/retention/run?dry_run=false").json()
    assert rerun["deleted"]["notifications"] == 0  # idempotent
    # Protected rows survived.
    db = TestingSession()
    assert db.query(F.Symptom).filter(F.Symptom.id == PyUUID(sym)).first() is not None
    assert db.query(F.ReminderV1).filter(F.ReminderV1.id == PyUUID(rid)).first() is not None
    db.close()
