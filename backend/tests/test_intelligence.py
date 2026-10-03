"""BIN2 intelligence tests — stats, eligibility, baselines, trends, changes,
multi-signal, completeness, lineage, isolation, consent, provenance.

Uses shared fixtures (bin1_shared). No network, no ML, deterministic only.
"""
from datetime import datetime, timedelta

from bin1_shared import _as, _current, client  # noqa: F401,E402 — first: sys.path
from app.services import analytics_stats as st


def _sync(email="ia@x.com"):
    return client.post("/api/users/sync", json={"clerk_user_id": _current["sub"], "email": email})


def _dog(name="IntelDog"):
    r = client.post("/api/dogs", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _consent(status="GRANTED"):
    return client.post("/api/v1/consent", json={"purpose": "ai_analysis", "status": status})


def _w(dog, kg, days_ago, unit="kg"):
    ts = (datetime.utcnow() - timedelta(days=days_ago)).isoformat()
    r = client.post(f"/api/v1/pets/{dog}/measurements/weight",
                    json={"value": kg, "unit": unit, "measured_at": ts})
    assert r.status_code == 201, r.text
    return r.json()


def _setup_user_dog(sub="int_a", dog="IntelDogA"):
    _as(sub)
    _sync(f"{sub}@x.com")
    _consent("GRANTED")
    return _dog(dog)


# ── Pure stats ──────────────────────────────────────────────────────

def test_stats_primitives():
    assert st.median([1, 2, 3]) == 2.0
    assert st.median([]) is None
    assert st.stdev([5.0]) is None
    assert st.mad([1, 1, 1]) == 0.0
    assert st.robust_z(10.0, 5.0, 0.0) is None  # zero spread -> no z, never fabricated
    assert st.robust_z(8.0, 5.0, 1.0) == abs(st.robust_z(8.0, 5.0, 1.0))
    assert st.pct_change(110.0, 100.0) == 10.0
    assert st.pct_change(5.0, 0.0) is None  # divide-by-zero -> None, not inf
    fit = st.least_squares_slope([0, 1, 2], [0, 2, 4])
    assert fit["slope"] == 4 / 2 and round(fit["r2"], 6) == 1.0
    assert st.least_squares_slope([0, 1], [1, 2])["slope"] is None  # < 3 pts
    assert st.classify_trend(0.5, 0.9, 12.0, 5) == "INCREASING"
    assert st.classify_trend(0.5, 0.9, 1.0, 5) == "STABLE"  # < 5% -> stable
    assert st.classify_trend(0.5, 0.1, 12.0, 5) == "VARIABLE"  # low R^2
    assert st.classify_trend(None, None, None, 1) == "INSUFFICIENT_DATA"


def test_outliers_and_duplicates_never_delete():
    vals = [19.6, 20.1, 19.9, 20.3, 19.8, 20.0, 20.2, 19.7, 45.0]
    pts = [{"t": datetime(2026, 1, i + 1), "value": v} for i, v in enumerate(vals)]
    usable, susp = st.split_outliers(pts)
    assert len(usable) == 8 and len(susp) == 1 and "exclusion_reason" in susp[0]
    # zero-spread data cannot produce z-scores — nothing flagged, nothing dropped
    flat = [{"t": datetime(2026, 1, i + 1), "value": 20.0} for i in range(5)]
    u2, s2 = st.split_outliers(flat)
    assert len(u2) == 5 and s2 == []
    dups = st.find_duplicates([{"t": datetime(2026, 1, 1), "value": 5.0},
                               {"t": datetime(2026, 1, 1), "value": 5.0}])
    assert len(dups) == 1


def test_unit_normalization_truthful():
    ok = st.normalize_weight(1000, "g")
    assert ok["status"] == "AVAILABLE" and ok["value"] == 1.0 and ok["unit"] == "kg"
    bad = st.normalize_weight(10, "stone")
    assert bad["status"] == "INVALID_DATA" and "not converted" in bad["reason"]
    neg = st.normalize_weight(-5, "kg")
    assert neg["status"] == "INVALID_DATA"
    assert st.normalize_weight(1000, "kg")["status"] == "INVALID_DATA"  # implausible


def test_eligibility_gates():
    assert st.assess_eligibility([], 3, 7)["status"] == "INSUFFICIENT_DATA"
    one = [{"t": datetime(2026, 1, 1), "value": 1.0}]
    assert st.assess_eligibility(one, 3, 7)["status"] == "INSUFFICIENT_DATA"
    tight = [{"t": datetime(2026, 1, 1), "value": 1.0}, {"t": datetime(2026, 1, 2), "value": 1.0},
             {"t": datetime(2026, 1, 3), "value": 1.0}]
    assert st.assess_eligibility(tight, 3, 7)["status"] == "INSUFFICIENT_DATA"  # span too short


# ── Weight analytics: baseline / trend / change / provenance ───────

def test_weight_baseline_trend_change_with_evidence():
    dog = _setup_user_dog("int_w", "WeightDog")
    for i, v in enumerate([19.8, 20.0, 20.2, 19.9, 20.1]):
        _w(dog, v, 80 - i * 10)
    ids = [_w(dog, 22.0, 10)["id"], _w(dog, 22.1, 5)["id"], _w(dog, 21.9, 1)["id"]]
    r = client.get(f"/api/v1/pets/{dog}/analytics/weight").json()
    assert r["status"] == "AVAILABLE"
    assert r["baseline"]["status"] == "AVAILABLE"
    assert r["baseline"]["observations"] >= 5
    assert r["trend"]["state"] == "INCREASING"
    assert r["change"]["flagged"] is True
    assert r["change"]["delta_pct"] is not None and r["change"]["delta_pct"] > 5.0
    ev_ids = [e["record_id"] for e in r["evidence"]]
    assert all(i in ev_ids for i in ids)  # provenance: every recent row referenced
    assert r["rules_version"] and r["method"]
    # explanations answer what/why/comparison/limitation/next_step
    for k in ("what", "why", "comparison", "limitation", "next_step"):
        assert r["explanation"][k]
    # effective time respected: oldest observation anchors the period
    assert r["period"]["start"] is not None


def test_weight_insufficient_and_stale():
    dog = _setup_user_dog("int_w2", "ThinDog")
    _w(dog, 20.0, 1)
    r = client.get(f"/api/v1/pets/{dog}/analytics/weight").json()
    assert r["status"] == "INSUFFICIENT_DATA"
    assert r["baseline"]["status"] == "INSUFFICIENT_DATA"
    assert "not enough data" in r["explanation"]["what"].lower()

    dog2 = _setup_user_dog("int_w3", "StaleDog")
    for i in range(4):
        _w(dog2, 20.0 + i * 0.1, 120 - i * 20)
    r2 = client.get(f"/api/v1/pets/{dog2}/analytics/weight").json()
    assert r2["freshness"]["state"] == "STALE"
    assert r2["trend"]["state"] in ("STALE", "INSUFFICIENT_DATA", "STABLE")


def test_activity_nutrition_behavior_descriptive():
    _as("int_anb")
    _sync("int_anb@x.com")
    _consent("GRANTED")
    dog = _dog("ActiveDog")
    base = datetime.utcnow()
    for d in range(30):
        r = client.post(f"/api/v1/pets/{dog}/measurements/activity", json={
            "activity_type": "walk", "duration_mins": 20,
            "occurred_at": (base - timedelta(days=d)).isoformat()})
        assert r.status_code == 201
    for d in range(30):
        r = client.post(f"/api/v1/pets/{dog}/nutrition", json={
            "food_name": "kibble", "calories": 400,
            "fed_at": (base - timedelta(days=d)).isoformat()})
        assert r.status_code == 201
    for d in range(0, 40, 2):
        r = client.post(f"/api/v1/pets/{dog}/behavior", json={
            "behavior_type": "playful", "observed_at": (base - timedelta(days=d)).isoformat()})
        assert r.status_code == 201
    for metric in ("activity", "nutrition", "behavior"):
        r = client.get(f"/api/v1/pets/{dog}/analytics/{metric}").json()
        assert r["status"] == "AVAILABLE", (metric, r)
        assert r["baseline"]["status"] == "AVAILABLE"
        assert r["freshness"]["state"] in ("CURRENT", "RECENT")


# ── Symptoms: recurrence, co-occurrence, severity, time basis ─────

def test_symptom_analytics_recurrence_and_evidence():
    dog = _setup_user_dog("int_s", "Sneezy")
    for d in (50, 30, 5):
        r = client.post(f"/api/v1/pets/{dog}/symptoms",
                        json={"name": "Coughing", "severity": "moderate",
                              "onset_at": (datetime.utcnow() - timedelta(days=d)).isoformat()})
        assert r.status_code == 201
    r = client.post(f"/api/v1/pets/{dog}/symptoms",
                    json={"name": "Lethargy", "severity": "severe",
                          "onset_at": (datetime.utcnow() - timedelta(days=4)).isoformat()})
    assert r.status_code == 201
    s = client.get(f"/api/v1/pets/{dog}/analytics/symptoms").json()
    assert s["status"] == "AVAILABLE"
    assert s["recurrence"].get("coughing") == 3
    assert s["episodes_30d"] >= 2
    assert s["severe_recent_30d"] >= 1
    assert all("time_basis" in e for e in s["evidence"])
    assert "diagnos" not in (s["explanation"]["why"] + s["explanation"]["what"]).lower()


# ── Medications / preventive: descriptive only ─────────────────────

def test_medication_preventive_descriptive_no_effectiveness():
    dog = _setup_user_dog("int_m", "MedDog")
    r = client.post(f"/api/v1/pets/{dog}/medications",
                    json={"name": "Apoquel", "dose": "16mg", "frequency": "daily",
                          "start_at": (datetime.utcnow() - timedelta(days=10)).isoformat()})
    assert r.status_code == 201
    m = client.get(f"/api/v1/pets/{dog}/analytics/medications").json()
    assert len(m["active"]) == 1 and m["active"][0]["name"] == "Apoquel"
    assert "effectiveness" in m["note"].lower() and "never" in m["note"].lower()
    p = client.get(f"/api/v1/pets/{dog}/analytics/preventive").json()
    assert "overdue" in p and "upcoming_30d" in p


# ── Multi-signal: overlap language, never causation ────────────────

def test_multi_signal_overlap_not_causation():
    dog = _setup_user_dog("int_ms", "MultiDog")
    for i, v in enumerate([20.0, 20.1, 19.9, 20.0, 20.2]):
        _w(dog, v, 70 - i * 10)
    for d in (8, 4, 1):
        _w(dog, 23.0, d)
    client.post(f"/api/v1/pets/{dog}/medications",
                json={"name": "MedX", "start_at": (datetime.utcnow() - timedelta(days=6)).isoformat()})
    c = client.get(f"/api/v1/pets/{dog}/analytics/changes").json()
    assert c["multi_signal"], "expected a temporal overlap context"
    for ctx in c["multi_signal"]:
        assert "not evidence that one caused" in ctx["statement"]
        assert "caused" not in ctx["statement"].lower().replace("not evidence that one caused", "")


# ── Completeness: coverage, never a health score ───────────────────

def test_completeness_is_coverage_not_health_score():
    dog = _setup_user_dog("int_c", "CoverDog")
    _w(dog, 20.0, 2)
    c = client.get(f"/api/v1/pets/{dog}/analytics/completeness").json()
    assert "record_completeness_pct" in c
    assert "NOT a health score" in c["label"]
    assert "health_score" not in str(c.keys()) and "healthScore" not in str(c)
    assert set(c["dimensions"]) >= {"weight", "activity", "nutrition", "behavior", "preventive", "vet_records"}
    blob = str(c).lower()
    assert "not that the dog is unhealthy" in blob  # the only allowed framing
    assert "health_score" not in blob and "healthscore" not in blob


# ── Lineage: analyze stores GENERATED, supersedes prior ────────────

def test_analyze_lineage_and_history():
    dog = _setup_user_dog("int_l", "LineageDog")
    _w(dog, 20.0, 30)
    _w(dog, 20.1, 20)
    _w(dog, 20.0, 10)
    a1 = client.post(f"/api/v1/pets/{dog}/intelligence/analyze")
    assert a1.status_code == 201, a1.text
    a2 = client.post(f"/api/v1/pets/{dog}/intelligence/analyze")
    assert a2.status_code == 201
    assert a1.json()["id"] != a2.json()["id"]
    h = client.get(f"/api/v1/pets/{dog}/intelligence/history").json()
    by_status = {}
    for rec in h["records"]:
        by_status.setdefault(rec["status"], 0)
        by_status[rec["status"]] += 1
        assert rec["rules_version"] and rec["method"]
    assert by_status.get("GENERATED") == 1 and by_status.get("SUPERSEDED") == 1


def test_vet_summary_reviewable_no_diagnosis():
    dog = _setup_user_dog("int_v", "VetDog")
    _w(dog, 20.0, 5)
    v = client.get(f"/api/v1/pets/{dog}/intelligence/vet-summary").json()
    for k in ("recent_changes", "symptom_evidence", "medications", "preventive",
              "data_gaps", "questions_for_vet", "review_note", "disclaimer"):
        assert k in v, k
    assert "not a diagnosis" in v["disclaimer"].lower()
    for banned in ("your dog has", "definitely", "this proves", "i diagnose"):
        assert banned not in str(v).lower()


# ── Isolation + consent gates ──────────────────────────────────────

def test_analytics_isolation_and_consent():
    dog = _setup_user_dog("int_iso_a", "IsoDog")
    _w(dog, 20.0, 3)
    _as("int_iso_b")
    _sync("int_iso_b@x.com")
    _consent("GRANTED")
    for endpoint in ("overview", "weight", "baselines", "changes", "completeness",
                     "symptoms", "medications", "preventive", "freshness"):
        r = client.get(f"/api/v1/pets/{dog}/analytics/{endpoint}")
        assert r.status_code == 404, endpoint
    assert client.post(f"/api/v1/pets/{dog}/intelligence/analyze").status_code == 404
    assert client.get(f"/api/v1/pets/{dog}/intelligence/vet-summary").status_code == 404

    # consent withdrawn -> truthful 403 even for the owner
    _as("int_iso_a")
    _consent("WITHDRAWN")
    r = client.get(f"/api/v1/pets/{dog}/analytics/weight")
    assert r.status_code == 403 and "consent" in r.json()["detail"].lower()
    _consent("GRANTED")
    assert client.get(f"/api/v1/pets/{dog}/analytics/weight").status_code == 200
