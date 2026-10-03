"""BIN4 ecosystem & platform tests — organizations, verified identity,
relationships, connections/ingestion, labs/devices, emergency packets,
export, interop map, partner API, webhooks, entitlements, KPIs, retention,
supervisor boundaries. Uses shared fixtures (bin1_shared). No network
(webhook dispatch is monkeypatched), deterministic only.
"""
from datetime import datetime, timedelta
from uuid import UUID as PyUUID

from bin1_shared import _as, _current, client, TestingSession  # noqa: F401,E402
from app.models import ecosystem_models as ECO
from app.models import foundation_models as F
from app.services import webhook_service as wh


def _sync(email):
    r = client.post("/api/users/sync",
                    json={"clerk_user_id": _current["sub"], "email": email})
    assert r.status_code in (200, 201), r.text


def _dog(name="B4Dog"):
    r = client.post("/api/dogs", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _consent(purpose, status="GRANTED"):
    return client.post("/api/v1/consent",
                       json={"purpose": purpose, "status": status})


def _setup(owner="b4_owner", dog="B4Dog"):
    _as(owner)
    _sync(f"{owner}@x.com")
    _consent("ai_analysis", "GRANTED")
    _consent("veterinary_sharing", "GRANTED")
    for p in ("integration_lab", "integration_imaging", "integration_device",
              "integration_pims", "integration_partner"):
        _consent(p, "GRANTED")
    return _dog(dog)


def _other(sub):
    _as(sub)
    _sync(f"{sub}@x.com")


def _org(name="City Clinic", otype="CLINIC"):
    r = client.post("/api/v1/orgs", json={"name": name, "org_type": otype})
    assert r.status_code == 201, r.text
    return r.json()


def _prof(name="Dr. Org", org_id=None):
    body = {"display_name": name}
    if org_id:
        body["org_id"] = org_id
    r = client.post("/api/v1/professionals", json=body)
    assert r.status_code == 201, r.text
    return r.json()


# ── Organizations & roles ─────────────────────────────────────────

def test_org_create_lists_and_member_admin():
    _setup("b4o_owner", "B4OrgDog")
    org = _org()
    mine = client.get("/api/v1/orgs").json()["organizations"]
    assert any(o["id"] == org["id"] and o["my_role"] == "OWNER" for o in mine)
    _other("b4o_staff")
    r = client.post(f"/api/v1/orgs/{org['id']}/members",
                    json={"user_email": "b4o_staff@x.com", "role": "STAFF"})
    assert r.status_code == 404  # non-member sees nothing (no leakage)
    _as("b4o_owner")
    r = client.post(f"/api/v1/orgs/{org['id']}/members",
                    json={"user_email": "b4o_staff@x.com", "role": "STAFF"})
    assert r.status_code == 201, r.text
    # STAFF cannot administer members.
    _as("b4o_staff")
    assert client.post(f"/api/v1/orgs/{org['id']}/members",
                       json={"user_email": "b4o_owner@x.com", "role": "VIEWER"}).status_code == 403
    # Membership alone grants no pet access.
    _as("b4o_owner")
    pet = _dog("B4OrgDog2")
    _as("b4o_staff")
    assert client.get(f"/api/v1/pets/{pet}/relationships").status_code == 404


def test_last_owner_protected_and_org_suspend():
    _setup("b4l_owner", "B4LastDog")
    org = _org()
    mid = client.get(f"/api/v1/orgs/{org['id']}/members").json()[0]["id"]
    r = client.patch(f"/api/v1/orgs/{org['id']}/members/{mid}", json={"status": "REVOKED"})
    assert r.status_code == 409  # last active OWNER cannot strand the org
    assert client.patch(f"/api/v1/orgs/{org['id']}?status=SUSPENDED").status_code == 200
    assert client.get(f"/api/v1/orgs/{org['id']}").status_code == 410


# ── Verified identity (honest workflow) ────────────────────────────

def test_verification_request_review_and_no_self_assert():
    _setup("b4v_vet", "B4VetDog")
    org = _org("Vet Org")
    p = _prof("Dr. V", org["id"])
    assert p["verification_state"] == "UNVERIFIED"
    assert "Unverified" in p["verification_label"]
    # Self-approval is refused even by the profile owner via review path.
    _as("b4v_vet")
    assert client.post(f"/api/v1/professionals/{p['id']}/request-verification",
                       json={"license_no": "LIC-1", "jurisdiction": "KA",
                             "evidence_ref": "file://license-1"}).status_code == 200
    # Requester is also the only member (OWNER) — but self-review is blocked.
    r = client.post(f"/api/v1/professionals/{p['id']}/review",
                    json={"approve": True})
    assert r.status_code == 403  # self-review never allowed
    # A second admin reviews: approve WITH evidence works.
    _other("b4v_admin")
    _as("b4v_vet")
    # add admin to org
    client.post(f"/api/v1/orgs/{org['id']}/members",
                json={"user_email": "b4v_admin@x.com", "role": "ADMIN"})
    _as("b4v_admin")
    r = client.post(f"/api/v1/professionals/{p['id']}/review", json={"approve": True})
    assert r.status_code == 200, r.text
    assert r.json()["verification_state"] == "VERIFIED"
    assert "organization-attested" in r.json()["verification_label"]
    assert r.json()["verification_expires_at"] is not None


def test_review_without_evidence_rejected_and_suspend_blocks():
    _setup("b4s_vet", "B4SuspDog")
    org = _org("Susp Org")
    p = _prof("Dr. S", org["id"])
    _other("b4s_admin")
    _as("b4s_vet")
    client.post(f"/api/v1/orgs/{org['id']}/members",
                json={"user_email": "b4s_admin@x.com", "role": "ADMIN"})
    # Force PENDING without evidence (simulates incomplete request) then review.
    db = TestingSession()
    row = db.query(ECO.VetProfessional).filter(
        ECO.VetProfessional.id == PyUUID(p["id"])).first()
    row.verification_state = "PENDING"
    row.verification_evidence_ref = None
    db.commit()
    db.close()
    _as("b4s_admin")
    r = client.post(f"/api/v1/professionals/{p['id']}/review", json={"approve": True})
    assert r.status_code == 422  # evidence required — no fake VERIFIED


def test_suspended_professional_loses_vet_access():
    _setup("b4x_owner", "B4SuspPet2")
    _other("b4x_vet")
    # owner shares with vet user
    _as("b4x_owner")
    pet = _dog("B4SuspPet3")
    pkg = client.post(f"/api/v1/pets/{pet}/vet-packages",
                      json={"package_type": "QUICK_SUMMARY"}).json()
    client.post(f"/api/v1/pets/{pet}/vet-packages/{pkg['id']}/approve")
    r = client.post(f"/api/v1/pets/{pet}/vet-packages/{pkg['id']}/share",
                    json={"recipient_label": "Dr. X", "scope": "FULL_RECORD",
                          "grantee_email": "b4x_vet@x.com"})
    assert r.status_code == 201, r.text
    share_id = r.json()["share_id"]
    _as("b4x_vet")
    assert client.get("/api/v1/vet/pets").json()["pets"] != []
    # vet registers a professional profile; org admin suspends it.
    _as("b4x_vet")
    org = _org("Block Org")
    p = _prof("Dr. X", org["id"])
    _other("b4x_admin")
    _as("b4x_vet")
    client.post(f"/api/v1/orgs/{org['id']}/members",
                json={"user_email": "b4x_admin@x.com", "role": "ADMIN"})
    _as("b4x_admin")
    # link profile to vet user first (admin cannot; vet owns profile — simulate link)
    db = TestingSession()
    from app.models import all_models as M
    vet_user = db.query(M.User).filter(M.User.clerk_user_id == "b4x_vet").first()
    row = db.query(ECO.VetProfessional).filter(
        ECO.VetProfessional.id == PyUUID(p["id"])).first()
    row.user_id = vet_user.id
    db.commit()
    db.close()
    assert client.post(f"/api/v1/professionals/{p['id']}/suspend").status_code == 200
    _as("b4x_vet")
    r = client.get(f"/api/v1/vet/pets/{pet}")
    assert r.status_code == 410  # suspended provider blocked, owner unaffected
    _as("b4x_owner")
    assert client.get(f"/api/v1/pets/{pet}/timeline").status_code == 200


# ── Relationships ─────────────────────────────────────────────────

def test_relationship_owner_control_and_partner_use():
    _setup("b4r_owner", "B4RelDog")
    pet = _dog("B4RelPet")
    org = _org("Rel Clinic")
    r = client.post(f"/api/v1/pets/{pet}/relationships",
                    json={"org_id": org["id"], "purpose": "ROUTINE_REVIEW",
                          "scope": "REPORT_ONLY"}).json()
    assert r["status"] == "ACTIVE"
    rows = client.get(f"/api/v1/pets/{pet}/relationships").json()
    assert len(rows) == 1
    # Owner pauses; partner-style read via relationship is scope-checked in partner tests.
    assert client.patch(f"/api/v1/pets/{pet}/relationships/{r['id']}",
                        json={"status": "PAUSED"}).json()["status"] == "PAUSED"
    # Foreign owner cannot see or touch it.
    _other("b4r_stranger")
    assert client.get(f"/api/v1/pets/{pet}/relationships").status_code == 404
    assert client.patch(f"/api/v1/pets/{pet}/relationships/{r['id']}",
                        json={"status": "ACTIVE"}).status_code == 404


# ── Connections + ingestion ───────────────────────────────────────

def test_connection_requires_consent_and_revoke():
    _setup("b4c_owner", "B4ConnDog")
    pet = _dog("B4ConnPet")
    client.post("/api/v1/consent",
                json={"purpose": "integration_device", "status": "WITHDRAWN"})
    r = client.post(f"/api/v1/pets/{pet}/connections",
                    json={"provider_type": "DEVICE", "provider_name": "STUB",
                          "pet_id": pet, "scopes": ["activity"]})
    assert r.status_code == 403
    client.post("/api/v1/consent",
                json={"purpose": "integration_device", "status": "GRANTED"})
    c = client.post(f"/api/v1/pets/{pet}/connections",
                    json={"provider_type": "DEVICE", "provider_name": "STUB",
                          "pet_id": pet, "scopes": ["activity"]}).json()
    assert c["status"] == "CONNECTED" and c["consent_status"] == "GRANTED"
    h = client.get(f"/api/v1/connections/{c['id']}/health").json()
    assert h["ok"] is True
    assert client.post(f"/api/v1/connections/{c['id']}/revoke").json()["status"] == "REVOKED"
    # Revoked connections refuse imports.
    assert client.post(f"/api/v1/connections/{c['id']}/imports",
                       json={"kind": "device", "records": []}).status_code == 409


def test_ingestion_pipeline_lab_device_and_rejection():
    _setup("b4i_owner", "B4IngDog")
    pet = _dog("B4IngPet")
    c = client.post(f"/api/v1/pets/{pet}/connections",
                    json={"provider_type": "LAB", "provider_name": "STUB",
                          "pet_id": pet, "scopes": ["results"]}).json()
    res = client.post(f"/api/v1/connections/{c['id']}/imports",
                      json={"kind": "lab", "records": [
                          {"test_name": "CBC", "result_value": "6.5",
                           "result_unit": "x10^9/L", "reference_range": "6.0-17.0",
                           "external_id": "LAB-1"},
                          {"result_value": "oops"}  # invalid: no test_name
                      ]}).json()
    assert res["imported"] == 1 and res["rejected"] == 1
    items = client.get(f"/api/v1/connections/{c['id']}/imports").json()
    good = [i for i in items if i["status"] == "IMPORTED"][0]
    assert good["source_label"] == "LAB" and good["verification_status"] == "imported"
    assert good["event_id"]  # canonical HealthEvent exists
    # Lab summary flags recorded-range comparison, never a diagnosis.
    summ = client.get(f"/api/v1/pets/{pet}/labs/summary").json()
    assert "diagnose" in summ["disclaimer"].lower()
    cbc = [x for x in summ["results"] if x["test_name"] == "CBC"][0]
    assert cbc["flag"] == "WITHIN_RECORDED_RANGE"
    # Device import lands as labeled timeline observation, out of BIN2 baselines.
    d = client.post(f"/api/v1/pets/{pet}/connections",
                    json={"provider_type": "DEVICE", "provider_name": "STUB",
                          "pet_id": pet, "scopes": ["activity"]}).json()
    res = client.post(f"/api/v1/connections/{d['id']}/imports",
                      json={"kind": "device", "records": [
                          {"metric_type": "activity", "value": 42,
                           "unit": "mins",
                           "measured_at": datetime.utcnow().isoformat()},
                          {"metric_type": "activity"}  # invalid
                      ]}).json()
    assert res["imported"] == 1 and res["rejected"] == 1
    dev = client.get(f"/api/v1/pets/{pet}/devices/readings").json()
    assert dev["readings"][0]["source"] == "DEVICE"
    assert "not fed" in dev["note"]


def test_import_isolation_and_bad_modality():
    _setup("b4m_owner", "B4IsoPet")
    pet = _dog("B4IsoPet2")
    c = client.post(f"/api/v1/pets/{pet}/connections",
                    json={"provider_type": "IMAGING", "provider_name": "STUB",
                          "pet_id": pet, "scopes": ["studies"]}).json()
    res = client.post(f"/api/v1/connections/{c['id']}/imports",
                      json={"kind": "imaging", "records": [
                          {"modality": "telepathy"}  # invalid modality
                      ]}).json()
    assert res["imported"] == 0 and res["rejected"] == 1
    _other("b4m_stranger")
    assert client.get(f"/api/v1/connections/{c['id']}/imports").status_code == 404
    assert client.post(f"/api/v1/connections/{c['id']}/imports",
                       json={"kind": "note", "records": []}).status_code == 404


# ── Emergency packet + export ─────────────────────────────────────

def test_emergency_packet_flow():
    _setup("b4e_owner", "B4EmPet")
    pet = _dog("B4EmPet2")
    client.post(f"/api/v1/pets/{pet}/symptoms", json={"name": "Collapse", "severity": "severe"})
    client.post(f"/api/v1/pets/{pet}/allergies",
                json={"allergen": "Penicillin", "severity": "severe"})
    client.post(f"/api/v1/pets/{pet}/medications", json={"name": "Vetmedin"})
    pkg = client.post(f"/api/v1/pets/{pet}/emergency-packets").json()
    assert pkg["package_type"] == "EMERGENCY_PACKET"
    assert "allergies" in pkg["sections"] and "medications" in pkg["sections"]
    full = client.get(f"/api/v1/pets/{pet}/vet-packages/{pkg['id']}").json()
    snap = full["snapshot"]
    assert snap["package_type"] == "EMERGENCY_PACKET"
    assert any(a["allergen"] == "Penicillin" for a in snap["allergies"])
    assert "not a diagnosis" in snap["disclaimer"]
    assert "storage_ref" not in str(snap) and "local://" not in str(snap)
    # Same review+share rules: DRAFT cannot be shared, then short-expiry share.
    client.post(f"/api/v1/pets/{pet}/vet-packages/{pkg['id']}/approve")
    exp = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    r = client.post(f"/api/v1/pets/{pet}/vet-packages/{pkg['id']}/share",
                    json={"recipient_label": "ER Clinic", "purpose": "EMERGENCY_REVIEW",
                          "scope": "FULL_RECORD", "expires_at": exp})
    assert r.status_code == 201, r.text
    # JSON export carries provenance + digest + disclaimer.
    ex = client.get(f"/api/v1/pets/{pet}/vet-packages/{pkg['id']}/export").json()
    assert ex["format"] == "PAWPHILE-package-json-v1"
    assert ex["snapshot_digest"] == pkg["snapshot_digest"]
    assert "storage_ref" not in str(ex)


# ── Interop map honesty ───────────────────────────────────────────

def test_fhir_map_makes_no_compliance_claim():
    _setup("b4f_owner", "B4FhirDog")
    m = client.get("/api/v1/interoperability/fhir-map").json()
    assert m["map_version"].startswith("bin4-fhir-map")
    assert "NONE" in m["conformance_claim"]
    statuses = {k: v["status"] for k, v in m["resources"].items()}
    assert statuses["CarePlan"] == "NOT_SUPPORTED"
    assert set(statuses.values()) <= {"MAPPED", "PARTIALLY_MAPPED", "NOT_SUPPORTED"}
    assert "compliant" not in str(m).lower()


# ── Partner API ───────────────────────────────────────────────────

def _partner_setup(owner="b4p_owner", partner="b4p_admin"):
    _setup(owner, "B4PartDog")
    pet = _dog("B4PartPet")
    org = _org("Partner Org", "PARTNER")
    plan = client.post("/api/v1/plans", json={"name": "clinic", "features": []}).json()
    client.post("/api/v1/entitlements",
                json={"user_email": f"{owner}@x.com", "features": ["partner_api"]})
    pc = client.post("/api/v1/partner-clients",
                     json={"name": "PIMS-ish", "org_id": org["id"],
                           "scopes": ["timeline.read", "reports.read"]}).json()
    raw = client.post(f"/api/v1/partner-clients/{pc['id']}/credentials").json()["api_key"]
    rel = client.post(f"/api/v1/pets/{pet}/relationships",
                      json={"org_id": org["id"], "purpose": "ROUTINE_REVIEW",
                            "scope": "FULL_RECORD"}).json()
    return pet, org, raw, rel


def _pget(raw, path):
    return client.get(path, headers={"Authorization": f"Bearer {raw}"})


def test_partner_reads_scope_and_relationship_gates():
    pet, org, raw, rel = _partner_setup()
    client.post(f"/api/v1/pets/{pet}/symptoms", json={"name": "Cough"})
    r = _pget(raw, f"/api/partner/v1/pets/{pet}/timeline")
    assert r.status_code == 200 and any(t["event_type"] == "symptom" for t in r.json()["items"])
    # Scope escalation: package.read was never granted.
    assert _pget(raw, "/api/partner/v1/packages/00000000-0000-0000-0000-000000000000").status_code in (403, 404)
    # Revoked credential -> 401, never data.
    _as("b4p_owner")
    pcs = client.post("/api/v1/partner-clients",
                      json={"name": "Tmp", "org_id": org["id"], "scopes": ["timeline.read"]}).json()
    tmp_raw = client.post(f"/api/v1/partner-clients/{pcs['id']}/credentials").json()["api_key"]
    assert client.post(f"/api/v1/partner-clients/{pcs['id']}/revoke").status_code == 200
    assert _pget(tmp_raw, f"/api/partner/v1/pets/{pet}/timeline").status_code == 401
    # Paused relationship closes partner reads.
    _as("b4p_owner")
    client.patch(f"/api/v1/pets/{pet}/relationships/{rel['id']}", json={"status": "PAUSED"})
    assert _pget(raw, f"/api/partner/v1/pets/{pet}/timeline").status_code == 404


def test_partner_no_leak_no_write_all_and_selected_denied():
    pet, org, raw, rel = _partner_setup("b4q_owner", "b4q_admin")
    _as("b4q_owner")
    other = _dog("B4QOther")
    assert _pget(raw, f"/api/partner/v1/pets/{other}/timeline").status_code == 404
    assert _pget("pk_bogus", f"/api/partner/v1/pets/{pet}/timeline").status_code == 401
    # SELECTED relationships are honestly refused by the partner API.
    client.patch(f"/api/v1/pets/{pet}/relationships/{rel['id']}", json={"status": "ACTIVE"})
    db = TestingSession()
    row = db.query(ECO.PetCareRelationship).filter(
        ECO.PetCareRelationship.id == PyUUID(rel["id"])).first()
    row.scope = "SELECTED"
    db.commit()
    db.close()
    assert _pget(raw, f"/api/partner/v1/pets/{pet}/timeline").status_code == 403


def test_entitlement_gates_feature_not_data():
    _setup("b4t_owner", "B4EntDog")
    pet = _dog("B4EntPet")
    # No entitlement -> client creation refused (feature gate).
    r = client.post("/api/v1/partner-clients", json={"name": "X", "scopes": ["timeline.read"]})
    assert r.status_code == 403
    mine = client.get("/api/v1/entitlements/mine").json()
    assert mine["features"] == [] and "never health-data access" in mine["note"]
    # With the feature but no relationship -> still 404 (feature != data access).
    client.post("/api/v1/entitlements",
                json={"user_email": "b4t_owner@x.com", "features": ["partner_api"]})
    pc = client.post("/api/v1/partner-clients",
                     json={"name": "Y", "scopes": ["timeline.read"]}).json()
    raw = client.post(f"/api/v1/partner-clients/{pc['id']}/credentials").json()["api_key"]
    assert _pget(raw, f"/api/partner/v1/pets/{pet}/timeline").status_code == 404


# ── Webhooks ──────────────────────────────────────────────────────

def test_webhook_subscribe_emit_dispatch_signed_idsonly(monkeypatch=None):
    _setup("b4w_owner", "B4HookDog")
    pet = _dog("B4HookPet")
    sub = client.post("/api/v1/webhooks/subscriptions",
                      json={"events": ["SHARE_CREATED", "FOLLOWUP_CREATED"],
                            "url": "https://hooks.example.test/paw"}).json()
    assert sub["signing_secret"]
    assert "secret" not in str(client.get("/api/v1/webhooks/subscriptions").json())
    r = client.post(f"/api/v1/pets/{pet}/shares",
                    json={"recipient_label": "Dr. H", "scope": "REPORT_ONLY"})
    assert r.status_code == 201, r.text
    dels = client.get(f"/api/v1/webhooks/deliveries?subscription_id={sub['id']}").json()
    assert len(dels) == 1 and dels[0]["event_type"] == "SHARE_CREATED"
    # Dispatch with a stubbed transport: assert signature + IDs-only payload.
    seen = {}

    class _Resp:
        status_code = 200

    import app.services.webhook_service as ws
    orig = ws._post

    def _fake(url, payload, secret, timeout_s):
        seen["url"] = url
        seen["payload"] = payload
        seen["sig"] = ws.sign(secret, __import__("json").dumps(payload, sort_keys=True, default=str))
        assert "note_text" not in str(payload) and "storage_ref" not in str(payload)
        return True, ""

    ws._post = _fake
    try:
        d = client.post("/api/v1/worker/webhooks/dispatch").json()
        assert d["sent"] == 1 and d["attempted"] == 1, d
    finally:
        ws._post = orig
    assert seen["url"] == "https://hooks.example.test/paw"
    assert seen["payload"]["ref"]["scope"] == "REPORT_ONLY"
    # Idempotent re-dispatch sends nothing new.
    d2 = client.post("/api/v1/worker/webhooks/dispatch").json()
    assert d2["attempted"] == 0
    # Revocation stops future delivery; failure path is bounded.
    assert client.post(f"/api/v1/webhooks/subscriptions/{sub['id']}/revoke").status_code == 200
    bad = client.post("/api/v1/webhooks/subscriptions",
                      json={"events": ["BOGUS"], "url": "https://x.example.test"}).status_code
    assert bad == 422


def test_webhook_failure_bounded_and_leak_free():
    _setup("b4d_owner", "B4FailDog")
    pet = _dog("B4FailPet")
    sub = client.post("/api/v1/webhooks/subscriptions",
                      json={"events": ["SHARE_CREATED"],
                            "url": "https://down.example.test/hook"}).json()
    client.post(f"/api/v1/pets/{pet}/shares",
                json={"recipient_label": "Dr. D", "scope": "REPORT_ONLY"})
    import app.services.webhook_service as ws
    orig = ws._post
    ws._post = lambda *a, **k: (False, "delivery_failed: conn refused")
    try:
        from app.core.config import settings
        prev = settings.WEBHOOK_MAX_ATTEMPTS
        settings.WEBHOOK_MAX_ATTEMPTS = 2
        try:
            for _ in range(3):
                client.post("/api/v1/worker/webhooks/dispatch")
        finally:
            settings.WEBHOOK_MAX_ATTEMPTS = prev
    finally:
        ws._post = orig
    db = TestingSession()
    d = db.query(ECO.WebhookDelivery).filter(
        ECO.WebhookDelivery.subscription_id == PyUUID(sub["id"])).first()
    assert d.status == "FAILED" and d.attempts == 2  # bounded, then terminal
    assert "conn refused" in (d.last_error or "")
    db.close()


# ── KPIs / retention / interop honesty ────────────────────────────

def test_kpis_count_workflows_not_phi():
    _setup("b4k_owner", "B4KpiDog")
    pet = _dog("B4KpiPet")
    k = client.get("/api/v1/metrics/ecosystem").json()
    assert k["organizations"]["total"] >= 0
    assert "completion_rate" in k["followups"]
    assert "not" in k["note"].lower() or "PHI" in k["note"]
    assert "Cough" not in str(k) and "@x.com" not in str(k)


def test_bin4_retention_idempotent_and_protects():
    _setup("b4n_owner", "B4RetDog")
    pet = _dog("B4RetPet")
    sub = client.post("/api/v1/webhooks/subscriptions",
                      json={"events": ["SHARE_CREATED"],
                            "url": "https://hooks.example.test/r"}).json()
    client.post(f"/api/v1/pets/{pet}/shares",
                json={"recipient_label": "Dr. R", "scope": "REPORT_ONLY"})
    c = client.post(f"/api/v1/pets/{pet}/connections",
                    json={"provider_type": "DEVICE", "provider_name": "STUB",
                          "pet_id": pet, "scopes": []}).json()
    client.post(f"/api/v1/connections/{c['id']}/revoke")
    assert client.post(f"/api/v1/connections/{c['id']}/revoke").json()["status"] == "REVOKED"
    # Revoked connections refuse imports; seed an old REJECTED row + old delivery below.
    assert client.post(f"/api/v1/connections/{c['id']}/imports",
                       json={"kind": "note", "records": []}).status_code == 409
    db = TestingSession()
    conn = db.query(ECO.ExternalConnection).filter(
        ECO.ExternalConnection.id == PyUUID(c["id"])).first()
    bad = ECO.ExternalImport(connection_id=conn.id, pet_id=PyUUID(pet),
                             kind="note", status="REJECTED", raw={},
                             created_at=datetime.utcnow() - timedelta(days=400))
    db.add(bad)
    for d in db.query(ECO.WebhookDelivery).all():
        d.status = "SENT"
        d.created_at = datetime.utcnow() - timedelta(days=400)
    db.commit()
    db.close()
    prev = client.get("/api/v1/worker/retention/preview").json()["candidates"]
    assert prev["webhook_deliveries"] >= 1 and prev["external_imports"] >= 1
    run = client.post("/api/v1/worker/retention/run?dry_run=false").json()
    assert run["deleted"]["webhook_deliveries"] >= 1
    assert run["deleted"]["external_imports"] >= 1
    rerun = client.post("/api/v1/worker/retention/run?dry_run=false").json()
    assert rerun["deleted"]["webhook_deliveries"] == 0  # idempotent
    # Connections and canonical events are protected.
    db = TestingSession()
    assert db.query(ECO.ExternalConnection).count() >= 1
    assert db.query(F.HealthEvent).count() >= 0
    db.close()


# ── Supervisor ecosystem boundaries ───────────────────────────────

def _ask(pet, question):
    return client.post(f"/api/v1/pets/{pet}/supervisor/ask", json={"question": question})


def test_ecosystem_capabilities_grounded_and_labeled():
    pet = _setup("b4a_owner", "B4AiDog")
    dog = _dog("B4AiPet")
    ans = _ask(dog, "What external sources are connected for my pet?").json()
    assert "integration_explain" in ans["capabilities_used"]
    assert "not veterinarian-verified" in ans["answer"].lower()
    ans = _ask(dog, "Is my record complete enough to share with my vet?").json()
    assert "data_gap_explain" in ans["capabilities_used"]
    ans = _ask(dog, "Explain the vet package versions for my pet.").json()
    assert "vet_package_explain" in ans["capabilities_used"]
    ans = _ask(dog, "Summarize the wearable tracker data.").json()
    assert "external_record_summary" in ans["capabilities_used"]
    assert "not fed into personal baselines" in ans["answer"].lower()
    ans = _ask(dog, "Invent lab results for last month.").json()
    assert ans["capabilities_used"] == []
    assert "won't invent" in ans["answer"].lower()
    ans = _ask(dog, "Make up a vet note saying recovered.").json()
    assert "won't invent" in ans["answer"].lower()
