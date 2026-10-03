"""Security-blocker regression tests — fixes #1-#5.

Covers (deterministic, no network — all provider calls stubbed):
  A. unauthenticated /api/reports/upload            -> 401/403
  B. unauthenticated /api/reports/generate-pdf      -> 401/403
  C. user A + user B dog_id on reports endpoints    -> 403/404
  D. legacy client user_id field rejected / ignored -> 422, server identity used
  E. unauthenticated /api/paw-ai/{chat,stream,triage,vet-report,knowledge/ingest} -> 401/403
  F. public paw-ai reads stay public                -> 200 (breed-context, breeds, food-safety)
  G. JWT: valid/expired/wrong-iss/wrong-aud/bad-alg/bad-sig
  H. production test_token_* never authenticates
  I. vision/malformed + oversized + fake-pdf + traversal rejected
  J. error responses generic (no traceback/paths/provider text)
  K. AI rate-limit tier enforced (429 + Retry-After)

Run: .venv/Scripts/python -m pytest backend/tests/test_security_blockers.py -v
"""
import base64
import io
import time
import uuid
from contextlib import contextmanager

import pytest

from bin1_shared import _as, _current, client, fastapi_app  # noqa: F401,E402
from app.core import security as sec
from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.core.security import get_current_user, get_optional_user
from app.services import cloudinary_service
from app.services import vision_service as vision_svc
import app.api.routes.reports as reports_mod
from PIL import Image


# ── helpers ───────────────────────────────────────────────────

@contextmanager
def no_auth():
    cu = fastapi_app.dependency_overrides.pop(get_current_user, None)
    ou = fastapi_app.dependency_overrides.pop(get_optional_user, None)
    try:
        yield
    finally:
        if cu is not None:
            fastapi_app.dependency_overrides[get_current_user] = cu
        if ou is not None:
            fastapi_app.dependency_overrides[get_optional_user] = ou


def _sync(email=None):
    return client.post("/api/users/sync",
                       json={"clerk_user_id": _current["sub"],
                             "email": email or f"{_current['sub']}@x.com"})


def _dog(name="SecDog"):
    r = client.post("/api/dogs", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _png(color=(10, 120, 60)):
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buf, format="PNG")
    return buf.getvalue()


MIN_PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"


def _pdf_files(data=MIN_PDF, name="r.pdf", mime="application/pdf"):
    return {"file": (name, data, mime)}


def setup_function(_):
    RateLimitMiddleware.reset()
    settings.RATE_LIMIT_ENABLED = False
    sec._jwks_cache["keys"] = None
    sec._jwks_cache["fetched_at"] = 0.0


def teardown_function(_):
    RateLimitMiddleware.reset()
    settings.RATE_LIMIT_ENABLED = False
    sec._jwks_cache["keys"] = None


# ── A/B: reports endpoints require auth ───────────────────────

def test_reports_upload_no_token_rejected():
    with no_auth():
        r = client.post("/api/reports/upload",
                        files=_pdf_files(), data={"dog_id": str(uuid.uuid4())})
        assert r.status_code in (401, 403), r.text


def test_reports_generate_pdf_no_token_rejected():
    with no_auth():
        r = client.post("/api/reports/generate-pdf",
                        json={"dog_id": str(uuid.uuid4()), "report_data": {"s": 1}})
        assert r.status_code in (401, 403), r.text


# ── C: cross-user dog_id rejected ─────────────────────────────

def test_reports_upload_foreign_dog_rejected():
    _as("sec_owner")
    _sync()
    dog = _dog("SecDogA")
    _as("sec_intruder")
    _sync()
    r = client.post("/api/reports/upload", files=_pdf_files(), data={"dog_id": dog})
    assert r.status_code in (403, 404), r.text


def test_reports_generate_pdf_foreign_dog_rejected():
    _as("sec_owner2")
    _sync()
    dog = _dog("SecDogB")
    _as("sec_intruder2")
    _sync()
    r = client.post("/api/reports/generate-pdf",
                    json={"dog_id": dog, "report_data": {"s": 1}})
    assert r.status_code in (403, 404), r.text


def test_reports_own_dog_upload_accepted():
    _as("sec_owner3")
    _sync()
    dog = _dog("SecDogC")
    r = client.post("/api/reports/upload", files=_pdf_files(), data={"dog_id": dog})
    assert r.status_code == 200, r.text
    body = r.json()
    # Server-derived namespace: no client identity string, no public URL.
    assert "public_url" not in body
    assert body["mock"] is True
    assert "sec_owner3" not in body["bucket_path"]


# ── D: legacy user_id must not control authorization ──────────

def test_reports_generate_pdf_legacy_user_id_rejected():
    _as("sec_owner4")
    _sync()
    dog = _dog("SecDogD")
    r = client.post("/api/reports/generate-pdf",
                    json={"user_id": "sec_victim", "dog_id": dog,
                          "report_data": {"s": 1}})
    assert r.status_code == 422, r.text  # extra field forbidden


def test_reports_generate_pdf_namespace_uses_server_identity(monkeypatch):
    monkeypatch.setattr(reports_mod, "get_supabase", lambda: None)
    _as("sec_owner5")
    _sync()
    dog = _dog("SecDogE")
    r = client.post("/api/reports/generate-pdf",
                    json={"dog_id": dog, "report_data": {"section": "x"}})
    assert r.status_code == 200, r.text
    assert r.json()["bucket_path"] == "local"  # fallback: nothing persisted


# ── E/F: paw-ai auth allow-list ───────────────────────────────

PROTECTED_AI = [
    ("post", "/api/paw-ai/chat", {"messages": [{"role": "user", "content": "hi"}]}),
    ("post", "/api/paw-ai/stream", {"query": "hi"}),
    ("post", "/api/paw-ai/triage", {"symptoms": ["cough"]}),
    ("post", "/api/paw-ai/vet-report", {}),
    ("post", "/api/paw-ai/knowledge/ingest",
     {"title": "t", "source": "s", "content": "c"}),
]


def test_protected_ai_endpoints_reject_anonymous():
    with no_auth():
        for method, path, body in PROTECTED_AI:
            r = client.post(path, json=body)
            assert r.status_code in (401, 403), (path, r.status_code, r.text)


def test_public_ai_reads_stay_public():
    with no_auth():
        assert client.get("/api/paw-ai/breed-context/labrador").status_code == 200
        assert client.get("/api/paw-ai/breeds").status_code == 200
        r = client.post("/api/paw-ai/food-safety", json={"food_name": "chocolate"})
        assert r.status_code == 200 and r.json()["is_toxic"] is True


def test_ai_chat_authenticated_success_and_generic_provider_error(monkeypatch):
    import httpx as _httpx

    class _Resp:
        status_code = 200

        def json(self):
            return {"choices": [{"message": {"content":
                '{"message": "ok", "severity": "Green", "confidence": 0.9, '
                '"dataUsed": [], "nextAction": "none", "vetEscalation": "", '
                '"followUpQuestions": [], "redFlags": []}'}}]}

    monkeypatch.setattr(_httpx, "post", lambda *a, **k: _Resp())
    _as("sec_ai")
    _sync()
    r = client.post("/api/paw-ai/chat",
                    json={"messages": [{"role": "user", "content": "hello"}]})
    assert r.status_code == 200, r.text
    assert "decision-support tool" in r.json()["message"]

    class _Bad:
        status_code = 500
        text = "internal-groq-secret-trace"

    monkeypatch.setattr(_httpx, "post", lambda *a, **k: _Bad())
    r = client.post("/api/paw-ai/chat",
                    json={"messages": [{"role": "user", "content": "hello"}]})
    assert r.status_code == 502, r.text
    assert "internal-groq-secret-trace" not in r.text
    assert "Groq API error" not in r.text


def test_ai_input_caps_enforced():
    _as("sec_ai2")
    _sync()
    r = client.post("/api/paw-ai/chat",
                    json={"messages": [{"role": "u", "content": "x"}] * 51})
    assert r.status_code == 422
    r = client.post("/api/paw-ai/knowledge/ingest",
                    json={"title": "t", "source": "s", "content": "x" * 20001})
    assert r.status_code == 422


# ── G/H: JWT validation ───────────────────────────────────────

def _b64uint(n: int) -> str:
    raw = n.to_bytes((n.bit_length() + 7) // 8 or 1, "big")
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


@pytest.fixture()
def rsa_setup(monkeypatch):
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption()).decode()
    pub = key.public_key().public_numbers()
    kid = "test-kid-1"
    jwks = {"keys": [{"kty": "RSA", "kid": kid, "use": "sig",
                      "n": _b64uint(pub.n), "e": _b64uint(pub.e)}]}

    import httpx as _httpx

    class _Resp:
        status_code = 200

        def json(self):
            return jwks

        def raise_for_status(self):
            return None

    monkeypatch.setattr(_httpx, "get", lambda *a, **k: _Resp())

    old = (settings.CLERK_JWKS_URL, settings.CLERK_ISSUER,
           settings.CLERK_AUDIENCE, settings.ENVIRONMENT)
    settings.CLERK_JWKS_URL = "https://issuer.example/.well-known/jwks.json"
    settings.CLERK_ISSUER = "https://issuer.example"
    settings.CLERK_AUDIENCE = "pawphile-test-aud"
    settings.ENVIRONMENT = "development"
    sec._jwks_cache["keys"] = None
    try:
        yield {"priv": priv, "kid": kid}
    finally:
        (settings.CLERK_JWKS_URL, settings.CLERK_ISSUER,
         settings.CLERK_AUDIENCE, settings.ENVIRONMENT) = old
        sec._jwks_cache["keys"] = None


def _mint(priv, kid, claims):
    from jose import jwt as _jwt
    return _jwt.encode(claims, priv, algorithm="RS256", headers={"kid": kid})


def test_jwt_valid_accepted(rsa_setup):
    now = int(time.time())
    tok = _mint(rsa_setup["priv"], rsa_setup["kid"],
                {"sub": "u1", "iss": "https://issuer.example",
                 "aud": "pawphile-test-aud", "exp": now + 300, "iat": now})
    assert sec.verify_clerk_token(tok)["sub"] == "u1"


def test_jwt_expired_rejected(rsa_setup):
    now = int(time.time())
    tok = _mint(rsa_setup["priv"], rsa_setup["kid"],
                {"sub": "u1", "iss": "https://issuer.example",
                 "aud": "pawphile-test-aud", "exp": now - 10, "iat": now - 100})
    with pytest.raises(Exception) as ei:
        sec.verify_clerk_token(tok)
    assert getattr(ei.value, "status_code", None) == 401
    assert "expired" not in str(getattr(ei.value, "detail", "")).lower()


def test_jwt_wrong_issuer_rejected(rsa_setup):
    now = int(time.time())
    tok = _mint(rsa_setup["priv"], rsa_setup["kid"],
                {"sub": "u1", "iss": "https://evil.example",
                 "aud": "pawphile-test-aud", "exp": now + 300, "iat": now})
    with pytest.raises(Exception) as ei:
        sec.verify_clerk_token(tok)
    assert getattr(ei.value, "status_code", None) == 401


def test_jwt_wrong_audience_rejected(rsa_setup):
    now = int(time.time())
    tok = _mint(rsa_setup["priv"], rsa_setup["kid"],
                {"sub": "u1", "iss": "https://issuer.example",
                 "aud": "wrong-aud", "exp": now + 300, "iat": now})
    with pytest.raises(Exception) as ei:
        sec.verify_clerk_token(tok)
    assert getattr(ei.value, "status_code", None) == 401


def test_jwt_wrong_algorithm_rejected(rsa_setup):
    from jose import jwt as _jwt
    tok = _jwt.encode({"sub": "u1"}, "not-a-secret", algorithm="HS256")
    with pytest.raises(Exception) as ei:
        sec.verify_clerk_token(tok)
    assert getattr(ei.value, "status_code", None) == 401


def test_jwt_bad_signature_rejected(rsa_setup):
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv2 = other.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption()).decode()
    now = int(time.time())
    tok = _mint(priv2, rsa_setup["kid"],
                {"sub": "u1", "iss": "https://issuer.example",
                 "aud": "pawphile-test-aud", "exp": now + 300, "iat": now})
    with pytest.raises(Exception) as ei:
        sec.verify_clerk_token(tok)
    assert getattr(ei.value, "status_code", None) == 401


def test_production_test_token_never_authenticates():
    old = (settings.CLERK_JWKS_URL, settings.ENVIRONMENT)
    settings.CLERK_JWKS_URL = ""
    settings.ENVIRONMENT = "production"
    try:
        with pytest.raises(Exception) as ei:
            sec.verify_clerk_token("test_token_anybody")
        assert getattr(ei.value, "status_code", None) == 401
    finally:
        settings.CLERK_JWKS_URL, settings.ENVIRONMENT = old


# ── I: upload validation ──────────────────────────────────────

def _stub_vision(monkeypatch, called):
    def _fake_upload(data, folder="pawphile"):
        called["cloudinary"] = folder
        return {"secure_url": "https://cdn.example/x.png",
                "public_id": "pawphile/vision/abc"}

    async def _fake_scan(*a, **k):
        called["vision"] = True
        return {"prediction": "ok", "confidence": 0.9, "explanation": "e",
                "recommendation": "r", "severity_level": "green"}

    monkeypatch.setattr(cloudinary_service, "upload_image", _fake_upload)
    monkeypatch.setattr(vision_svc, "run_vision_scan", _fake_scan)


def test_vision_exe_renamed_png_rejected(monkeypatch):
    called = {}
    _stub_vision(monkeypatch, called)
    _as("sec_vis")
    _sync()
    dog = _dog("SecVisDog")
    r = client.post("/api/vision/scan",
                    files={"image": ("evil.png", b"MZ" + b"\x00" * 64, "image/png")},
                    data={"dog_id": dog, "scan_type": "skin"})
    assert r.status_code == 422
    assert "cloudinary" not in called  # rejected before any provider call


def test_vision_undecodable_rejected(monkeypatch):
    called = {}
    _stub_vision(monkeypatch, called)
    _as("sec_vis2")
    _sync()
    dog = _dog("SecVisDog2")
    r = client.post("/api/vision/scan",
                    files={"image": ("a.png", b"not-an-image", "image/png")},
                    data={"dog_id": dog, "scan_type": "skin"})
    assert r.status_code == 422
    assert "cloudinary" not in called


def test_vision_oversized_rejected(monkeypatch):
    called = {}
    _stub_vision(monkeypatch, called)
    _as("sec_vis3")
    _sync()
    dog = _dog("SecVisDog3")
    big = _png()
    big = big + b"\x00" * (16 * 1024 * 1024)
    r = client.post("/api/vision/scan",
                    files={"image": ("big.png", big, "image/png")},
                    data={"dog_id": dog, "scan_type": "skin"})
    assert r.status_code == 422
    assert "cloudinary" not in called


def test_vision_foreign_dog_rejected(monkeypatch):
    called = {}
    _stub_vision(monkeypatch, called)
    _as("sec_vis_o")
    _sync()
    dog = _dog("SecVisDogO")
    _as("sec_vis_i")
    _sync()
    r = client.post("/api/vision/scan",
                    files={"image": ("a.png", _png(), "image/png")},
                    data={"dog_id": dog, "scan_type": "skin"})
    assert r.status_code == 404
    assert "cloudinary" not in called


def test_vision_valid_accepted(monkeypatch):
    called = {}
    _stub_vision(monkeypatch, called)
    _as("sec_vis_ok")
    _sync()
    dog = _dog("SecVisDogOK")
    r = client.post("/api/vision/scan",
                    files={"image": ("a.png", _png(), "image/png")},
                    data={"dog_id": dog, "scan_type": "skin"})
    assert r.status_code == 201, r.text
    assert called["cloudinary"] == f"pawphile/vision/{dog}"


def test_reports_fake_pdf_rejected():
    _as("sec_pdf")
    _sync()
    dog = _dog("SecPdfDog")
    # .txt bytes with .pdf name
    r = client.post("/api/reports/upload",
                    files=_pdf_files(b"just some text, not a pdf"),
                    data={"dog_id": dog})
    assert r.status_code == 422
    # wrong MIME
    r = client.post("/api/reports/upload",
                    files={"file": ("r.pdf", MIN_PDF, "text/plain")},
                    data={"dog_id": dog})
    assert r.status_code == 422
    # traversal filename
    r = client.post("/api/reports/upload",
                    files={"file": ("../../evil.pdf", MIN_PDF, "application/pdf")},
                    data={"dog_id": dog})
    assert r.status_code == 422


def test_reports_oversized_pdf_rejected():
    _as("sec_pdf2")
    _sync()
    dog = _dog("SecPdfDog2")
    big = b"%PDF" + b"\x00" * (16 * 1024 * 1024)
    r = client.post("/api/reports/upload",
                    files=_pdf_files(big), data={"dog_id": dog})
    assert r.status_code == 422


# ── J: generic errors ─────────────────────────────────────────

def test_vision_provider_failure_generic(monkeypatch):
    def _boom(data, folder="pawphile"):
        raise RuntimeError("/srv/cloudinary/key=BADVALUESQL traceback xyz")

    monkeypatch.setattr(cloudinary_service, "upload_image", _boom)

    async def _never(*a, **k):
        raise AssertionError("ML must not run after upload failure")

    monkeypatch.setattr(vision_svc, "run_vision_scan", _never)
    _as("sec_err")
    _sync()
    dog = _dog("SecErrDog")
    r = client.post("/api/vision/scan",
                    files={"image": ("a.png", _png(), "image/png")},
                    data={"dog_id": dog, "scan_type": "skin"})
    assert r.status_code == 500
    assert r.json()["detail"] == "Unable to process the image."
    for needle in ("traceback", "/srv/", "BADVALUE", ".py"):
        assert needle not in r.text


def test_reports_generation_failure_generic(monkeypatch):
    def _boom(data):
        raise RuntimeError("reportlab /etc/fonts boom")

    monkeypatch.setattr(reports_mod, "generate_pdf_from_json", _boom)
    _as("sec_err2")
    _sync()
    dog = _dog("SecErrDog2")
    r = client.post("/api/reports/generate-pdf",
                    json={"dog_id": dog, "report_data": {"s": 1}})
    assert r.status_code == 500
    assert r.json()["detail"] == "Unable to generate the report."
    assert "reportlab" not in r.text and "/etc/" not in r.text


def test_vision_service_error_generic():
    import asyncio

    out = asyncio.get_event_loop().run_until_complete(
        vision_svc.run_vision_scan(b"garbage-bytes", "skin", "x.png"))
    assert "Failed to process image format" not in str(out)
    assert out["explanation"].startswith("Image could not be read")


# ── K: AI rate-limit tier ─────────────────────────────────────

def test_ai_rate_limit_enforced(monkeypatch):
    import httpx as _httpx

    class _Resp:
        status_code = 500
        text = "x"

    monkeypatch.setattr(_httpx, "post", lambda *a, **k: _Resp())
    old_enabled, old_sync = settings.RATE_LIMIT_ENABLED, settings.RATE_LIMIT_SYNC_PER_MINUTE
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_SYNC_PER_MINUTE = 3
    RateLimitMiddleware.reset()
    try:
        _as("sec_rl")
        _sync()
        codes = [client.post("/api/paw-ai/chat",
                             json={"messages": [{"role": "u", "content": "x"}]}).status_code
                 for _ in range(6)]
        assert 429 in codes, codes
        RateLimitMiddleware.reset()
        seen = False
        for _ in range(6):
            r = client.post("/api/paw-ai/chat",
                            json={"messages": [{"role": "u", "content": "x"}]})
            if r.status_code == 429:
                assert "Retry-After" in r.headers
                seen = True
                break
        assert seen
    finally:
        settings.RATE_LIMIT_ENABLED = old_enabled
        settings.RATE_LIMIT_SYNC_PER_MINUTE = old_sync
        RateLimitMiddleware.reset()
