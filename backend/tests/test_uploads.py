"""Upload security tests — Cloudinary boundary hardening.

Covers: unauthenticated rejection, MIME allow-list, size cap, undecodable
bytes, cross-user dog rejection, server-side folder scoping, truthful
unconfigured-provider behavior, and secret containment. Uses the suite's
standard dependency-override identity plus a stubbed Cloudinary service
(no network). Live-Clerk-token validation is not unit-testable without
browser-minted tokens and is covered by the shared auth contract instead.
"""
import io

from bin1_shared import _as, _current, client, fastapi_app  # noqa: F401,E402
from app.core.security import get_current_user, get_optional_user
from app.services import cloudinary_service
from PIL import Image


def _png(color=(200, 30, 30)):
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), color).save(buf, format="PNG")
    return buf.getvalue()


def _sync(email="up@x.com"):
    return client.post("/api/users/sync",
                       json={"clerk_user_id": _current["sub"], "email": email})


def _dog(name="UpDog"):
    r = client.post("/api/dogs", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _files(data, name="a.png", mime="image/png"):
    return {"image": (name, data, mime)}


def test_no_auth_rejected():
    cu = fastapi_app.dependency_overrides.pop(get_current_user, None)
    ou = fastapi_app.dependency_overrides.pop(get_optional_user, None)
    try:
        r = client.post("/api/uploads/image", files=_files(_png()))
        assert r.status_code in (401, 403)
    finally:
        if cu is not None:
            fastapi_app.dependency_overrides[get_current_user] = cu
        if ou is not None:
            fastapi_app.dependency_overrides[get_optional_user] = ou


def test_bad_mime_rejected():
    _as("up_mime")
    _sync("up_mime@x.com")
    r = client.post("/api/uploads/image",
                    files=_files(b"MZ" + b"\x00" * 50, "a.exe",
                                 "application/x-msdownload"))
    assert r.status_code == 422


def test_oversized_rejected():
    _as("up_big")
    _sync("up_big@x.com")
    big = b"\xff" * (16 * 1024 * 1024)
    r = client.post("/api/uploads/image", files=_files(big))
    assert r.status_code == 422


def test_undecodable_rejected():
    _as("up_fake")
    _sync("up_fake@x.com")
    r = client.post("/api/uploads/image", files=_files(b"not-an-image-at-all"))
    assert r.status_code == 422


def test_foreign_dog_rejected():
    _as("up_owner")
    _sync("up_owner@x.com")
    dog = _dog("UpDogA")
    _as("up_intruder")
    _sync("up_intruder@x.com")
    r = client.post("/api/uploads/image", files=_files(_png()),
                    data={"dog_id": dog})
    assert r.status_code == 403


def test_valid_upload_scoped_folder_and_no_secret_leak(monkeypatch):
    seen = {}

    def _fake(data, folder="pawphile"):
        seen["folder"] = folder
        seen["bytes"] = len(data)
        return {"secure_url": "https://cdn.example/x.png",
                "public_id": "pawphile/dogs/abc", "format": "png",
                "width": 4, "height": 4}

    monkeypatch.setattr(cloudinary_service, "upload_image", _fake)
    _as("up_ok")
    _sync("up_ok@x.com")
    dog = _dog("UpDogB")
    r = client.post("/api/uploads/image", files=_files(_png()),
                    data={"dog_id": dog})
    assert r.status_code == 200, r.text
    assert seen["folder"] == f"pawphile/dogs/{dog}"
    assert set(r.json().keys()) == {"secure_url", "public_id"}
    # Client-supplied folder is ignored without a dog scope.
    r = client.post("/api/uploads/image", files=_files(_png()),
                    data={"folder": "evil/../../x"})
    assert r.status_code == 200, r.text
    assert seen["folder"] == "pawphile/general"


def test_unconfigured_provider_truthful_503(monkeypatch):
    def _boom(data, folder="pawphile"):
        raise ValueError("Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME in .env")

    monkeypatch.setattr(cloudinary_service, "upload_image", _boom)
    _as("up_cfg")
    _sync("up_cfg@x.com")
    r = client.post("/api/uploads/image", files=_files(_png()))
    assert r.status_code == 503
    assert "not configured" in r.json()["detail"]
