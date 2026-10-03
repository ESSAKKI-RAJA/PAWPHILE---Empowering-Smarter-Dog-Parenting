"""BIN1 foundation tests — auth, CRUD, timeline, sync idempotency, isolation.

Run: venv/Scripts/python -m pytest backend/tests/test_foundation.py -v
Uses shared SQLite fixtures (bin1_shared); no network, no secrets.
"""
import uuid

from bin1_shared import _as, _current, client  # noqa: F401 — first: fixes sys.path for app imports


def _sync_user(email="a@example.com"):
    return client.post("/api/users/sync", json={"clerk_user_id": _current["sub"], "email": email})


def _make_dog(name="Bruno"):
    r = client.post("/api/dogs", json={"name": name, "breed": "Pariah", "weight_kg": 20.0})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_health():
    r = client.get("/health")
    assert r.status_code == 200


def test_user_pet_isolation():
    _as("user_a")
    assert _sync_user("a@example.com").status_code == 200
    dog_a = _make_dog("A-Dog")
    _as("user_b")
    assert _sync_user("b@example.com").status_code == 200
    dog_b = _make_dog("B-Dog")
    # cross access blocked both directions
    _as("user_a")
    assert client.get(f"/api/dogs/{dog_b}").status_code == 404
    assert client.get(f"/api/v1/pets/{dog_b}/timeline").status_code == 404
    _as("user_b")
    assert client.get(f"/api/dogs/{dog_a}").status_code == 404
    assert client.get(f"/api/v1/pets/{dog_a}/timeline").status_code == 404


def test_symptom_crud_validation_conflict():
    _as("user_a")
    _sync_user("a@example.com")
    dog = _make_dog("SymDog")
    r = client.post(f"/api/v1/pets/{dog}/symptoms", json={"name": "vomiting", "severity": "moderate"})
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    ver = r.json()["version"]
    # invalid severity rejected
    bad = client.post(f"/api/v1/pets/{dog}/symptoms", json={"name": "x", "severity": "extreme"})
    assert bad.status_code == 422
    # blank name rejected
    bad2 = client.post(f"/api/v1/pets/{dog}/symptoms", json={"name": "  "})
    assert bad2.status_code == 422
    # update with correct version
    u = client.put(f"/api/v1/pets/{dog}/symptoms/{sid}", json={"notes": "twice today", "version": ver})
    assert u.status_code == 200, u.text
    # stale version -> 409, no silent overwrite
    c = client.put(f"/api/v1/pets/{dog}/symptoms/{sid}", json={"notes": "stale", "version": ver})
    assert c.status_code == 409
    # archive (not hard delete)
    a = client.post(f"/api/v1/pets/{dog}/symptoms/{sid}/archive")
    assert a.status_code == 200 and a.json()["is_archived"] is True
    # archived hidden by default
    lst = client.get(f"/api/v1/pets/{dog}/symptoms").json()
    assert all(x["id"] != sid for x in lst)


def test_medication_visit_weight():
    _as("user_a")
    _sync_user("a@example.com")
    dog = _make_dog("MedDog")
    m = client.post(f"/api/v1/pets/{dog}/medications", json={"name": "Amoxicillin", "dose": "250mg", "frequency": "BID"})
    assert m.status_code == 201, m.text
    # vet visit with effective/recorded distinction
    v = client.post(f"/api/v1/pets/{dog}/visits", json={"visit_date": "2026-09-10T10:00:00", "reason_for_visit": "checkup"})
    assert v.status_code == 201, v.text
    # implausible weight rejected (correction path is archive, not fake history)
    w_bad = client.post(f"/api/v1/pets/{dog}/measurements/weight",
                        json={"value": 1000, "unit": "kg", "measured_at": "2026-09-15T10:00:00"})
    assert w_bad.status_code == 422
    w = client.post(f"/api/v1/pets/{dog}/measurements/weight",
                    json={"value": 21.5, "unit": "kg", "measured_at": "2026-09-15T10:00:00"})
    assert w.status_code == 201, w.text
    tl = client.get(f"/api/v1/pets/{dog}/timeline").json()
    types = {i["event_type"] for i in tl["items"]}
    assert {"medication", "vet_visit", "weight"} <= types


def test_sync_idempotency_no_duplicates():
    _as("user_a")
    _sync_user("a@example.com")
    dog = _make_dog("SyncDog")
    op = {"client_operation_id": f"op-{uuid.uuid4().hex[:12]}", "entity_type": "weight",
          "payload": {"value": 22.0, "unit": "kg", "measured_at": "2026-09-20T10:00:00"}}
    r1 = client.post(f"/api/v1/pets/{dog}/sync/operations", json=op)
    assert r1.status_code == 201, r1.text
    r2 = client.post(f"/api/v1/pets/{dog}/sync/operations", json=op)  # retry
    assert r2.status_code == 201
    assert r1.json()["entity_id"] == r2.json()["entity_id"]
    weights = client.get(f"/api/v1/pets/{dog}/measurements/weight").json()
    assert len(weights) == 1
    # unsupported type rejected, not silently stored
    bad = client.post(f"/api/v1/pets/{dog}/sync/operations",
                      json={"client_operation_id": "op-bad-12345", "entity_type": "spaceship", "payload": {}})
    assert bad.status_code == 422


def test_files_private_and_validated():
    _as("user_a")
    _sync_user("a@example.com")
    dog_a = _make_dog("FileDogA")
    f = client.post(f"/api/v1/pets/{dog_a}/files",
                    json={"file_name": "vet.pdf", "mime_type": "application/pdf",
                          "size_bytes": 1000, "storage_ref": "internal/files/abc"})
    assert f.status_code == 201, f.text
    fid = f.json()["id"]
    # invalid mime rejected
    bad = client.post(f"/api/v1/pets/{dog_a}/files",
                      json={"file_name": "x.exe", "mime_type": "application/x-msdownload",
                            "size_bytes": 100, "storage_ref": "internal/files/x"})
    assert bad.status_code == 422
    # public URL smuggling rejected
    bad2 = client.post(f"/api/v1/pets/{dog_a}/files",
                       json={"file_name": "x.pdf", "mime_type": "application/pdf",
                             "size_bytes": 100, "storage_ref": "https://evil.com/x.pdf"})
    assert bad2.status_code == 422
    _as("user_b")
    _sync_user("b@example.com")
    assert client.get(f"/api/v1/pets/{dog_a}/files/{fid}").status_code == 404


def test_reports_lifecycle():
    _as("user_a")
    _sync_user("a@example.com")
    dog = _make_dog("RepDog")
    r = client.post(f"/api/v1/pets/{dog}/reports", json={"report_type": "monthly_summary"})
    assert r.status_code == 201
    rid = r.json()["id"]
    assert r.json()["status"] == "DRAFT"
    g = client.post(f"/api/v1/pets/{dog}/reports/{rid}/generate")
    assert g.status_code == 200, g.text
    assert g.json()["status"] == "READY"
    assert g.json()["storage_ref"].startswith("local://reports/")
    _as("user_b")
    _sync_user("b@example.com")
    assert client.get(f"/api/v1/pets/{dog}/reports/{rid}").status_code == 404


def test_sharing_scoped_revocable():
    _as("user_a")
    _sync_user("a@example.com")
    dog = _make_dog("ShareDog")
    s = client.post(f"/api/v1/pets/{dog}/shares", json={"recipient_label": "Dr. Vet", "scope": "REPORT_ONLY"})
    assert s.status_code == 201, s.text
    sid = s.json()["id"]
    v = client.get(f"/api/v1/pets/{dog}/shares/{sid}/view").json()
    assert v["access_count"] == 1
    rv = client.post(f"/api/v1/pets/{dog}/shares/{sid}/revoke")
    assert rv.json()["status"] == "REVOKED"
    gone = client.get(f"/api/v1/pets/{dog}/shares/{sid}/view")
    assert gone.status_code == 410
    _as("user_b")
    _sync_user("b@example.com")
    assert client.get(f"/api/v1/pets/{dog}/shares").status_code == 404


def test_reminders_server_authoritative_idempotent():
    _as("user_a")
    _sync_user("a@example.com")
    dog = _make_dog("RemDog")
    r = client.post(f"/api/v1/pets/{dog}/reminders",
                    json={"reminder_type": "vaccination", "title": "Rabies due", "due_at": "2020-01-01T10:00:00"})
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    p1 = client.post("/api/v1/reminders/process-due").json()
    p2 = client.post("/api/v1/reminders/process-due").json()
    assert p1["queued_count"] >= 0
    assert p2["queued_count"] == 0  # no duplicates on retry
    notifs = client.get(f"/api/v1/pets/{dog}/reminders/{rid}/notifications").json()
    assert len(notifs) >= 1
    # complete with version guard
    ver = r.json()["version"]
    u = client.put(f"/api/v1/pets/{dog}/reminders/{rid}", json={"status": "COMPLETED", "version": ver})
    assert u.json()["status"] == "COMPLETED"
    stale = client.put(f"/api/v1/pets/{dog}/reminders/{rid}", json={"status": "SCHEDULED", "version": ver})
    assert stale.status_code == 409


def test_consent_export_audit_no_leakage():
    _as("user_a")
    _sync_user("a@example.com")
    dog = _make_dog("PrivDog")
    client.post(f"/api/v1/pets/{dog}/symptoms", json={"name": "cough"})
    c = client.post("/api/v1/consent", json={"purpose": "care_reminders", "status": "GRANTED"})
    assert c.status_code == 201
    ex = client.get(f"/api/v1/pets/{dog}/export").json()
    assert ex["pet"]["name"] == "PrivDog" and len(ex["symptoms"]) >= 1
    au = client.get(f"/api/v1/pets/{dog}/audit").json()
    assert any("symptom" in a["action"] for a in au)
    _as("user_b")
    _sync_user("b@example.com")
    assert client.get(f"/api/v1/pets/{dog}/export").status_code == 404
    assert client.get(f"/api/v1/pets/{dog}/audit").status_code == 404


def test_deworming_triage_settings_crud():
    _as("user_a")
    _sync_user("a@example.com")
    dog = _make_dog("MiscDog")
    d = client.post(f"/api/dogs/{dog}/deworming", json={"product_name": "Drontal"})
    assert d.status_code == 201, d.text
    assert client.get(f"/api/dogs/{dog}/deworming").status_code == 200
    t = client.post("/api/triage/" + dog + "/sessions", json={"symptoms": ["lethargy"], "severity_level": "Orange"})
    assert t.status_code == 201, t.text
    assert client.get("/api/triage/" + dog + "/sessions").status_code == 200
    assert client.put("/api/settings", json={"theme": "dark"}).status_code == 200
    bad_theme = client.put("/api/settings", json={"theme": "neon"})
    assert bad_theme.status_code == 422
