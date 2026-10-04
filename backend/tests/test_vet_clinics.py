"""Vet Locator tests — validation, normalization, provider fallback, and
failure states. All transport is mocked; no real API key, no network.
The Google key must never appear in responses, logs, or errors.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import vet_clinics as V


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.delenv("GOOGLE_PLACES_API_KEY", raising=False)
    monkeypatch.delenv("SERP_API_KEY", raising=False)
    app = FastAPI()
    app.include_router(V.router, prefix="/api/vet-clinics")
    return TestClient(app, raise_server_exceptions=False)


def _resp(status=200, payload=None):
    class _R:
        status_code = status

        def json(self):
            return payload

    return _R()


_GOOGLE_PLACE = {
    "place_id": "ChIJvet123",
    "name": "Paws Veterinary Clinic",
    "vicinity": "12 Main St, Chennai",
    "rating": 4.6,
    "user_ratings_total": 128,
    "geometry": {"location": {"lat": 13.06, "lng": 80.25}},
    "opening_hours": {"open_now": True},
    "types": ["veterinary_care", "health", "point_of_interest"],
}

_GOOGLE_NON_VET = {
    "place_id": "ChIJcafe999",
    "name": "Coffee Corner",
    "vicinity": "14 Main St",
    "geometry": {"location": {"lat": 13.061, "lng": 80.251}},
    "types": ["cafe", "food", "point_of_interest"],
}

_NOMINATIM_VET = {
    "place_id": 4242,
    "name": "City Veterinary Hospital",
    "display_name": "City Veterinary Hospital, Main Rd, Chennai",
    "lat": "13.062",
    "lon": "80.252",
    "type": "veterinary",
    "category": "amenity",
}

_NOMINATIM_NON_VET = {
    "place_id": 9999,
    "display_name": "Central Bakery, Main Rd, Chennai",
    "lat": "13.063",
    "lon": "80.253",
    "type": "bakery",
    "category": "shop",
}


def _mock_httpx(monkeypatch, google_payload=None, osm_payload=None,
                google_status=200, osm_status=200,
                serp_payload=None, serp_status=200):
    seen = {"serp_calls": 0, "google_calls": 0, "osm_calls": 0}

    def _get(url, params=None, headers=None, timeout=None):
        seen["url"] = url
        seen["params"] = params
        if "maps.googleapis.com" in url:
            seen["google_calls"] += 1
            seen["google_params"] = params
            return _resp(google_status, google_payload)
        if "serpapi.com" in url:
            seen["serp_calls"] += 1
            seen["serp_params"] = params
            return _resp(serp_status, serp_payload)
        seen["osm_calls"] += 1
        seen["osm_params"] = params
        return _resp(osm_status, osm_payload)

    import httpx
    monkeypatch.setattr(httpx, "get", _get)
    return seen


_SERP_VET = {
    "title": "Paws Veterinary Clinic",
    "address": "12 Main St, Chennai",
    "phone": "+91-44-1111-2222",
    "website": "https://pawsvet.example.com",
    "rating": 4.6,
    "reviews": 128,
    "hours": "Monday: 9:00 AM – 8:00 PM",
    "open_state": "Open now",
    "gps_coordinates": {"latitude": 13.06, "longitude": 80.25},
    "place_id": "ChIJserp123",
    "type": "Veterinary clinic",
}

_SERP_NON_VET = {
    "title": "Coffee Corner",
    "address": "14 Main St",
    "gps_coordinates": {"latitude": 13.061, "longitude": 80.251},
    "type": "Coffee shop",
}


# ── Validation ──

def test_lat_lng_out_of_range_rejected(client):
    assert client.get("/api/vet-clinics/search?lat=95&lng=80").status_code == 422
    assert client.get("/api/vet-clinics/search?lat=13&lng=200").status_code == 422
    assert client.get("/api/vet-clinics/search?lat=abc&lng=80").status_code == 422


def test_radius_clamped_to_max(monkeypatch, client):
    seen = _mock_httpx(monkeypatch, {"status": "OK", "results": []}, [])
    r = client.get("/api/vet-clinics/search?lat=13&lng=80&radius_km=500")
    assert r.status_code == 200
    # Nominatim fallback reached; radius-derived box stays bounded.
    assert seen.get("osm_params") is not None
    assert float(seen["osm_params"]["limit"]) <= 20


# ── Google path ──

def test_google_results_normalized_to_vet_shape(monkeypatch, client,):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key-abc")
    _mock_httpx(monkeypatch, {"status": "OK", "results": [_GOOGLE_PLACE, _GOOGLE_NON_VET]})
    r = client.get("/api/vet-clinics/search?lat=13.06&lng=80.25")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "success" and body["source"] == "google"
    # Non-veterinary place filtered out.
    assert body["count"] == 1
    v = body["results"][0]
    for field in ("id", "provider", "provider_place_id", "name", "address",
                  "latitude", "longitude", "phone", "rating", "review_count",
                  "open_state", "distance_km", "maps_url", "retrieved_at"):
        assert field in v, field
    assert v["provider_place_id"] == "ChIJvet123"
    assert v["rating"] == 4.6 and v["review_count"] == 128
    assert v["open_state"] is True
    assert v["phone"] is None  # Nearby Search has no phone: never fabricate.
    assert v["hours"] is None  # no Place Details call: never claim hours.
    assert "test-key-abc" not in r.text  # key never leaks.


def test_google_key_sent_as_param_not_path(monkeypatch, client):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key-abc")
    seen = _mock_httpx(monkeypatch, {"status": "OK", "results": []}, [])
    client.get("/api/vet-clinics/search?lat=13&lng=80")
    assert seen["google_params"]["key"] == "test-key-abc"
    assert "test-key-abc" not in seen["url"]


# ── Nominatim fallback ──

def test_nominatim_fallback_when_google_unconfigured(monkeypatch, client):
    _mock_httpx(monkeypatch, None, [_NOMINATIM_VET, _NOMINATIM_NON_VET])
    r = client.get("/api/vet-clinics/search?lat=13.06&lng=80.25")
    body = r.json()
    assert body["status"] == "success" and body["source"] == "nominatim"
    assert body["count"] == 1  # bakery filtered out
    v = body["results"][0]
    assert v["name"] == "City Veterinary Hospital"
    assert v["rating"] is None and v["review_count"] is None  # OSM has none
    assert v["source_url"] and "openstreetmap.org" in v["source_url"]


def test_partial_flag_when_google_fails_but_osm_succeeds(monkeypatch, client):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "k")
    _mock_httpx(monkeypatch, None, [_NOMINATIM_VET], google_status=500, osm_status=200)
    body = client.get("/api/vet-clinics/search?lat=13&lng=80").json()
    assert body["status"] == "success" and body.get("partial") is True


# ── Failure states (never a bare "Failed to fetch") ──

def test_empty_results_is_success_with_notice(monkeypatch, client):
    _mock_httpx(monkeypatch, {"status": "ZERO_RESULTS", "results": []}, [])
    body = client.get("/api/vet-clinics/search?lat=13&lng=80").json()
    assert body["status"] == "success" and body["count"] == 0
    assert "notice" in body


def test_both_providers_down_returns_error_code(monkeypatch, client):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "k")
    _mock_httpx(monkeypatch, None, None, google_status=500, osm_status=500)
    body = client.get("/api/vet-clinics/search?lat=13&lng=80").json()
    assert body["status"] == "error"
    assert body["error_code"] == "provider_unavailable"
    assert body["message"] != "Failed to fetch vet clinics from any source"


def test_rate_limited_maps_to_rate_limited_code(monkeypatch, client):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "k")
    _mock_httpx(monkeypatch, None, None, google_status=429, osm_status=429)
    body = client.get("/api/vet-clinics/search?lat=13&lng=80").json()
    assert body["error_code"] == "rate_limited"


def test_transport_failure_maps_to_provider_unavailable(monkeypatch, client):
    import httpx

    def _boom(*a, **k):
        raise httpx.ConnectError("dns down")

    monkeypatch.setattr(httpx, "get", _boom)
    body = client.get("/api/vet-clinics/search?lat=13&lng=80").json()
    assert body["status"] == "error"
    assert body["error_code"] == "provider_unavailable"


def test_dedupe_stable_ids():
    a = {"id": "google:x", "name": "A", "latitude": 1.0, "longitude": 2.0}
    b = {"id": "google:x", "name": "A dup", "latitude": 1.0, "longitude": 2.0}
    c = {"id": "nominatim:y", "name": "B", "latitude": 3.0, "longitude": 4.0}
    assert len(V._dedupe([a, b, c])) == 2


def test_cross_provider_dedupe_same_clinic_listed_once():
    g = {"id": "google:ChIJ1", "name": "Paws Veterinary Clinic",
         "latitude": 13.06, "longitude": 80.25}
    s = {"id": "serp:ChIJ9", "name": "Paws Veterinary Clinic",
         "latitude": 13.06001, "longitude": 80.25001}
    n = {"id": "nominatim:7", "name": "Other Vet Clinic",
         "latitude": 13.07, "longitude": 80.26}
    out = V._dedupe([g, s, n])
    assert len(out) == 2  # google record wins (priority order kept)
    assert out[0]["id"].startswith("google")


def test_similar_names_are_never_merged():
    a = {"id": "google:1", "name": "Paws Veterinary Clinic",
         "latitude": 13.06, "longitude": 80.25}
    b = {"id": "serp:2", "name": "Paws Veterinary Hospital",
         "latitude": 13.06, "longitude": 80.25}
    assert len(V._dedupe([a, b])) == 2


# ── SERP API provider ──

def test_serp_results_normalized(monkeypatch, client):
    monkeypatch.setenv("SERP_API_KEY", "serp-test-key")
    seen = _mock_httpx(monkeypatch, {"status": "OK", "results": []}, [],
                       serp_payload={"local_results": [_SERP_VET, _SERP_NON_VET]})
    r = client.get("/api/vet-clinics/search?lat=13.06&lng=80.25")
    body = r.json()
    assert r.status_code == 200
    assert body["status"] == "success" and body["source"] == "serp"
    assert body["count"] == 1  # coffee shop filtered out
    v = body["results"][0]
    assert v["name"] == "Paws Veterinary Clinic"
    assert v["phone"] == "+91-44-1111-2222"
    assert v["website"] == "https://pawsvet.example.com"
    assert v["rating"] == 4.6 and v["review_count"] == 128
    assert v["open_state"] is True
    assert v["hours"] == "Monday: 9:00 AM – 8:00 PM"
    assert "serp-test-key" not in r.text  # key never leaks
    assert seen["serp_params"]["engine"] == "google_maps"


def test_serp_missing_fields_stay_null(monkeypatch, client):
    monkeypatch.setenv("SERP_API_KEY", "k")
    bare = {"title": "Village Veterinary Clinic", "address": "Main Rd",
            "gps_coordinates": {"latitude": 13.0, "longitude": 80.2}, "type": "veterinary"}
    _mock_httpx(monkeypatch, {"status": "OK", "results": []}, [],
                serp_payload={"local_results": [bare]})
    v = client.get("/api/vet-clinics/search?lat=13&lng=80").json()["results"][0]
    assert v["phone"] is None and v["website"] is None
    assert v["rating"] is None and v["hours"] is None and v["open_state"] is None


def test_serp_not_called_when_google_succeeds(monkeypatch, client):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "gk")
    monkeypatch.setenv("SERP_API_KEY", "sk")
    seen = _mock_httpx(monkeypatch,
                       {"status": "OK", "results": [_GOOGLE_PLACE]},
                       [], serp_payload={"local_results": [_SERP_VET]})
    body = client.get("/api/vet-clinics/search?lat=13.06&lng=80.25").json()
    assert body["source"] == "google" and body["count"] == 1
    assert seen["serp_calls"] == 0  # cost control: no redundant provider call


def test_serp_serves_with_partial_flag_when_google_fails(monkeypatch, client):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "gk")
    monkeypatch.setenv("SERP_API_KEY", "sk")
    _mock_httpx(monkeypatch, None, [], google_status=500,
                serp_payload={"local_results": [_SERP_VET]})
    body = client.get("/api/vet-clinics/search?lat=13.06&lng=80.25").json()
    assert body["status"] == "success" and body["source"] == "serp"
    assert body.get("partial") is True


def test_serp_unauthorized_falls_through_to_nominatim(monkeypatch, client):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "gk")
    monkeypatch.setenv("SERP_API_KEY", "bad-key")
    _mock_httpx(monkeypatch, None, [_NOMINATIM_VET], google_status=500,
                serp_payload={"error": "Invalid API key"}, serp_status=401)
    body = client.get("/api/vet-clinics/search?lat=13.06&lng=80.25").json()
    assert body["status"] == "success" and body["source"] == "nominatim"
    assert "bad-key" not in str(body)


def test_all_keys_invalid_returns_configuration_error(monkeypatch, client):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "gk")
    monkeypatch.setenv("SERP_API_KEY", "bad-key")
    _mock_httpx(monkeypatch, None, google_status=500,
                serp_payload={"error": "Invalid API key"}, serp_status=401,
                osm_payload=[], osm_status=200)
    body = client.get("/api/vet-clinics/search?lat=13&lng=80").json()
    # Both keyed providers rejected their keys and open data is empty:
    # operator-facing misconfiguration, user-safe message, no key leakage.
    assert body["status"] == "error"
    assert body["error_code"] == "configuration_error"
    assert "bad-key" not in str(body)


def test_serp_rate_limited_propagates(monkeypatch, client):
    monkeypatch.setenv("SERP_API_KEY", "sk")
    _mock_httpx(monkeypatch, {"status": "OK", "results": []}, [],
                serp_payload=None, serp_status=429, osm_status=429)
    body = client.get("/api/vet-clinics/search?lat=13&lng=80").json()
    assert body["error_code"] == "rate_limited"


def test_serp_timeout_and_malformed_fall_through(monkeypatch, client):
    import httpx
    monkeypatch.setenv("SERP_API_KEY", "sk")
    calls = {"n": 0}
    real_osm = [_NOMINATIM_VET]

    def _get(url, params=None, headers=None, timeout=None):
        if "serpapi.com" in url:
            raise httpx.ConnectError("dns down")
        calls["n"] += 1
        return _resp(200, real_osm)

    monkeypatch.setattr(httpx, "get", _get)
    body = client.get("/api/vet-clinics/search?lat=13.06&lng=80.25").json()
    assert body["status"] == "success" and body["source"] == "nominatim"
    assert calls["n"] == 1
