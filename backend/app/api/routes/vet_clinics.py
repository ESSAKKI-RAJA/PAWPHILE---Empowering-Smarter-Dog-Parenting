"""Vet clinic discovery — public nearby-search endpoint.

Provider responsibilities (existing architecture, extended):
- Veterinary place discovery, in deterministic priority order:
  1. Google Places Nearby Search (server-side GOOGLE_PLACES_API_KEY).
  2. SERP API Google Maps local results (server-side SERP_API_KEY).
  3. OpenStreetMap Nominatim bounded search (open data, no key).
- Only the first provider that returns usable results is served (cost
  control); later providers are not called once results exist.
- API keys never leave the server: interpolated into outbound requests
  only, never logged, never returned to clients.
- Map tiles / geocoding on the client remain the frontend's Leaflet layer
  (MapTiler tiles when VITE_MAPTILER_API_KEY is set, Carto/OSM otherwise).

Response contract (VetResult — PAWPHILE-safe normalized shape):
  id, provider, provider_place_id, name, address, latitude, longitude,
  phone, website, rating, review_count, open_state, hours, categories,
  distance_km, maps_url, source_url, retrieved_at.

Privacy: caller coordinates are used only to scope this search. They are
not persisted by this endpoint (no database writes here).
"""
from __future__ import annotations

import logging
import math
import os
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

PROVIDER_TIMEOUT_SECONDS = 10.0
MAX_RESULTS = 20
MIN_RADIUS_KM = 1.0
MAX_RADIUS_KM = 50.0
DEFAULT_RADIUS_KM = 10.0

_GOOGLE_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
_SERP_SEARCH_URL = "https://serpapi.com/search.json"
_NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
_NOMINATIM_USER_AGENT = "PAWPHILE/1.0 (contact@pawphile.com)"


class VetClinicResult(BaseModel):
    """Legacy shape kept for backward compatibility (older clients)."""

    id: str
    name: str
    phone: str | None = None
    address: str
    area: str | None = None
    city: str | None = None
    open_24_7: bool = False
    emergency_available: bool = False
    verified: bool = False
    distance_km: float | None = None


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float | None:
    try:
        r = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
            math.radians(lat2)
        ) * math.sin(dlng / 2) ** 2
        return round(2 * r * math.asin(math.sqrt(a)), 2)
    except (TypeError, ValueError):
        return None


def _normalize_google_place(place: dict[str, Any], origin_lat: float, origin_lng: float) -> dict[str, Any] | None:
    """Normalize one Google Places result. Returns None when the result
    cannot be reliably identified as a veterinary-care place."""
    if not isinstance(place, dict):
        return None
    types = place.get("types") or []
    # Google Nearby Search was already constrained with type=veterinary_care,
    # but defensively keep only results that carry a vet-related type or name.
    name = (place.get("name") or "").strip()
    is_vet_type = any("veterin" in str(t).lower() or t in ("pet_store", "veterinary_care") for t in types)
    is_vet_name = any(k in name.lower() for k in ("vet", "veterin", "animal hospital", "pet clinic", "pet hospital"))
    if not name or (types and not (is_vet_type or is_vet_name)):
        return None
    geometry = place.get("geometry") or {}
    location = geometry.get("location") or {}
    plat, plng = location.get("lat"), location.get("lng")
    if not isinstance(plat, (int, float)) or not isinstance(plng, (int, float)):
        return None
    place_id = str(place.get("place_id") or "")
    opening = place.get("opening_hours") or {}
    return {
        "id": f"google:{place_id}" if place_id else f"google:{name}:{plat},{plng}",
        "provider": "google",
        "provider_place_id": place_id or None,
        "name": name,
        "address": place.get("vicinity"),
        "latitude": plat,
        "longitude": plng,
        "phone": None,  # Nearby Search does not return phone; shown only when present.
        "website": None,
        "rating": place.get("rating") if isinstance(place.get("rating"), (int, float)) else None,
        "review_count": place.get("user_ratings_total") if isinstance(place.get("user_ratings_total"), int) else None,
        "open_state": opening.get("open_now") if isinstance(opening.get("open_now"), bool) else None,
        "hours": None,  # detailed hours require a Place Details call; not claimed.
        "categories": [str(t) for t in types][:5] if types else [],
        "distance_km": _haversine_km(origin_lat, origin_lng, plat, plng),
        "maps_url": f"https://www.google.com/maps/search/?api=1&query={plat},{plng}",
        "source_url": None,
        "retrieved_at": _utcnow_iso(),
    }


def _looks_veterinary(display_name: str, entry_type: str, category: str, name: str) -> bool:
    blob = f"{display_name} {entry_type} {category} {name}".lower()
    return any(k in blob for k in ("veterin", "animal hospital", "pet clinic", "pet hospital"))


def _normalize_nominatim_place(place: dict[str, Any], origin_lat: float, origin_lng: float) -> dict[str, Any] | None:
    """Normalize one Nominatim result. Returns None when not reliably
    veterinary-care related (avoids mislabeled clinics)."""
    if not isinstance(place, dict):
        return None
    display_name = str(place.get("display_name") or "")
    entry_type = str(place.get("type") or "")
    category = str(place.get("category") or "")
    name = str(place.get("name") or place.get("display_name", "").split(",")[0] or "").strip()
    if not _looks_veterinary(display_name, entry_type, category, name):
        return None
    try:
        plat = float(place.get("lat"))
        plng = float(place.get("lon"))
    except (TypeError, ValueError):
        return None
    place_id = str(place.get("place_id") or "")
    return {
        "id": f"nominatim:{place_id}" if place_id else f"nominatim:{name}:{plat},{plng}",
        "provider": "nominatim",
        "provider_place_id": place_id or None,
        "name": name or "Veterinary Clinic",
        "address": display_name or None,
        "latitude": plat,
        "longitude": plng,
        "phone": None,
        "website": None,
        "rating": None,  # OSM carries no ratings; never fabricate.
        "review_count": None,
        "open_state": None,
        "hours": None,
        "categories": [c for c in (category, entry_type) if c][:5],
        "distance_km": _haversine_km(origin_lat, origin_lng, plat, plng),
        "maps_url": f"https://www.google.com/maps/search/?api=1&query={plat},{plng}",
        "source_url": f"https://www.openstreetmap.org/?mlat={plat}&mlon={plng}#map=16/{plat}/{plng}",
        "retrieved_at": _utcnow_iso(),
    }


def _dedupe(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Deterministic dedupe, priority order preserved (first occurrence wins).

    Pass 1: stable provider ids (same place returned twice by one provider).
    Pass 2: normalized name + rounded coordinates (same clinic returned by
    two different providers). Names must match exactly after
    case/whitespace normalization — similar names are never merged.
    Provider provenance of the surviving record is kept as-is.
    """
    seen_ids: set[str] = set()
    seen_places: set[str] = set()
    out: list[dict[str, Any]] = []
    for r in results:
        key = r.get("id") or ""
        if not key:
            key = f"{(r.get('name') or '').lower()}|{round(r.get('latitude') or 0, 4)}|{round(r.get('longitude') or 0, 4)}"
        if key in seen_ids:
            continue
        name_key = " ".join(str(r.get("name") or "").lower().split())
        try:
            coord_key = f"{round(float(r.get('latitude')), 4)}|{round(float(r.get('longitude')), 4)}"
        except (TypeError, ValueError):
            coord_key = ""
        place_key = f"{name_key}|{coord_key}" if name_key and coord_key else ""
        if place_key and place_key in seen_places:
            continue
        seen_ids.add(key)
        if place_key:
            seen_places.add(place_key)
        out.append(r)
    return out


def _search_google(lat: float, lng: float, radius_m: int) -> tuple[list[dict[str, Any]], str | None]:
    """Returns (normalized_results, error_category). error_category is None
    on success (even when zero results — that is a valid empty response)."""
    import httpx

    api_key = (os.environ.get("GOOGLE_PLACES_API_KEY") or "").strip()
    if not api_key:
        return [], "not_configured"
    started = time.monotonic()
    try:
        res = httpx.get(
            _GOOGLE_NEARBY_URL,
            params={"location": f"{lat},{lng}", "radius": radius_m, "type": "veterinary_care", "key": api_key},
            timeout=PROVIDER_TIMEOUT_SECONDS,
        )
    except Exception as exc:  # timeouts, DNS, connection errors
        logger.warning("vet_locator provider=google error_category=transport detail=%s", type(exc).__name__)
        return [], "transport"
    duration_ms = int((time.monotonic() - started) * 1000)
    if res.status_code == 429:
        logger.warning("vet_locator provider=google error_category=rate_limited duration_ms=%d", duration_ms)
        return [], "rate_limited"
    if res.status_code != 200:
        # Status only; bodies/keys never logged.
        logger.warning("vet_locator provider=google error_category=upstream status=%s duration_ms=%d",
                       res.status_code, duration_ms)
        return [], "upstream"
    try:
        data = res.json()
    except Exception:
        logger.warning("vet_locator provider=google error_category=malformed duration_ms=%d", duration_ms)
        return [], "malformed"
    if data.get("status") not in (None, "OK", "ZERO_RESULTS"):
        logger.warning("vet_locator provider=google error_category=provider_error api_status=%s duration_ms=%d",
                       data.get("status"), duration_ms)
        return [], "provider_error"
    results: list[dict[str, Any]] = []
    for place in (data.get("results") or [])[:MAX_RESULTS]:
        normalized = _normalize_google_place(place, lat, lng)
        if normalized:
            results.append(normalized)
    results = _dedupe(results)
    logger.info("vet_locator provider=google success count=%d duration_ms=%d", len(results), duration_ms)
    return results, None


def _serp_looks_veterinary(title: str, entry_type: str, address: str) -> bool:
    blob = f"{title} {entry_type} {address}".lower()
    return any(k in blob for k in ("veterin", "animal hospital", "pet clinic", "pet hospital"))


def _normalize_serp_place(place: dict[str, Any], origin_lat: float, origin_lng: float) -> dict[str, Any] | None:
    """Normalize one SERP API Google Maps local_results entry. Returns None
    when not reliably veterinary-care related. Missing fields stay null —
    SerpApi local results carry no guaranteed phone/hours schema, so only
    explicitly present values are mapped."""
    if not isinstance(place, dict):
        return None
    title = str(place.get("title") or "").strip()
    if not title or not _serp_looks_veterinary(title, str(place.get("type") or ""), str(place.get("address") or "")):
        return None
    gps = place.get("gps_coordinates") or {}
    try:
        plat = float(gps.get("latitude", place.get("latitude")))
        plng = float(gps.get("longitude", place.get("longitude")))
    except (TypeError, ValueError):
        return None
    place_id = str(place.get("place_id") or place.get("data_id") or "")
    rating = place.get("rating")
    rating = float(rating) if isinstance(rating, (int, float)) else None
    reviews = place.get("reviews")
    reviews = int(reviews) if isinstance(reviews, int) else None
    hours = place.get("hours")
    hours = str(hours) if isinstance(hours, str) and hours.strip() else None
    open_state: bool | None = None
    raw_open = place.get("open_state")
    if isinstance(raw_open, bool):
        open_state = raw_open
    elif isinstance(raw_open, str):
        low = raw_open.lower()
        if "open" in low and "closed" not in low:
            open_state = True
        elif "closed" in low:
            open_state = False
    phone = place.get("phone")
    phone = str(phone) if isinstance(phone, str) and phone.strip() else None
    website = place.get("website") or (place.get("links") or {}).get("website")
    website = str(website) if isinstance(website, str) and website.strip() else None
    entry_type = str(place.get("type") or "")
    return {
        "id": f"serp:{place_id}" if place_id else f"serp:{title}:{plat},{plng}",
        "provider": "serp",
        "provider_place_id": place_id or None,
        "name": title,
        "address": place.get("address"),
        "latitude": plat,
        "longitude": plng,
        "phone": phone,
        "website": website,
        "rating": rating,
        "review_count": reviews,
        "open_state": open_state,
        "hours": hours,
        "categories": [entry_type] if entry_type else [],
        "distance_km": _haversine_km(origin_lat, origin_lng, plat, plng),
        "maps_url": f"https://www.google.com/maps/search/?api=1&query={plat},{plng}",
        "source_url": None,
        "retrieved_at": _utcnow_iso(),
    }


def _search_serp(lat: float, lng: float) -> tuple[list[dict[str, Any]], str | None]:
    """SERP API Google Maps engine (server-side SERP_API_KEY). Returns
    (normalized_results, error_category); error_category None on success."""
    import httpx

    api_key = (os.environ.get("SERP_API_KEY") or "").strip()
    if not api_key:
        return [], "not_configured"
    started = time.monotonic()
    try:
        res = httpx.get(
            _SERP_SEARCH_URL,
            params={"engine": "google_maps", "q": "veterinary clinic",
                    "ll": f"@{lat},{lng},14z", "type": "search", "api_key": api_key},
            timeout=PROVIDER_TIMEOUT_SECONDS,
        )
    except Exception as exc:
        logger.warning("vet_locator provider=serp error_category=transport detail=%s", type(exc).__name__)
        return [], "transport"
    duration_ms = int((time.monotonic() - started) * 1000)
    if res.status_code in (401, 403):
        logger.warning("vet_locator provider=serp error_category=unauthorized duration_ms=%d", duration_ms)
        return [], "unauthorized"
    if res.status_code == 429:
        logger.warning("vet_locator provider=serp error_category=rate_limited duration_ms=%d", duration_ms)
        return [], "rate_limited"
    if res.status_code != 200:
        logger.warning("vet_locator provider=serp error_category=upstream status=%s duration_ms=%d",
                       res.status_code, duration_ms)
        return [], "upstream"
    try:
        data = res.json()
    except Exception:
        logger.warning("vet_locator provider=serp error_category=malformed duration_ms=%d", duration_ms)
        return [], "malformed"
    if isinstance(data, dict) and data.get("error"):
        # SerpApi error bodies may echo request context; log nothing but category.
        logger.warning("vet_locator provider=serp error_category=provider_error duration_ms=%d", duration_ms)
        return [], "provider_error"
    local = (data.get("local_results") or []) if isinstance(data, dict) else []
    results: list[dict[str, Any]] = []
    for place in local[:MAX_RESULTS]:
        normalized = _normalize_serp_place(place, lat, lng)
        if normalized:
            results.append(normalized)
    results = _dedupe(results)
    logger.info("vet_locator provider=serp success count=%d duration_ms=%d", len(results), duration_ms)
    return results, None


def _search_nominatim(lat: float, lng: float, radius_km: float) -> tuple[list[dict[str, Any]], str | None]:
    import httpx

    # Nominatim bounded box ≈ radius (degrees latitude ≈ km/111).
    delta = min(max(radius_km / 111.0, 0.01), 0.5)
    viewbox = f"{lng - delta},{lat - delta},{lng + delta},{lat + delta}"
    started = time.monotonic()
    try:
        res = httpx.get(
            _NOMINATIM_SEARCH_URL,
            params={"q": "veterinary", "format": "json", "viewbox": viewbox,
                    "bounded": 1, "limit": MAX_RESULTS, "extratags": 1},
            headers={"User-Agent": _NOMINATIM_USER_AGENT},
            timeout=PROVIDER_TIMEOUT_SECONDS,
        )
    except Exception as exc:
        logger.warning("vet_locator provider=nominatim error_category=transport detail=%s", type(exc).__name__)
        return [], "transport"
    duration_ms = int((time.monotonic() - started) * 1000)
    if res.status_code == 429:
        logger.warning("vet_locator provider=nominatim error_category=rate_limited duration_ms=%d", duration_ms)
        return [], "rate_limited"
    if res.status_code != 200:
        logger.warning("vet_locator provider=nominatim error_category=upstream status=%s duration_ms=%d",
                       res.status_code, duration_ms)
        return [], "upstream"
    try:
        data = res.json()
    except Exception:
        logger.warning("vet_locator provider=nominatim error_category=malformed duration_ms=%d", duration_ms)
        return [], "malformed"
    results: list[dict[str, Any]] = []
    for place in (data if isinstance(data, list) else [])[:MAX_RESULTS]:
        normalized = _normalize_nominatim_place(place, lat, lng)
        if normalized:
            results.append(normalized)
    results = _dedupe(results)
    logger.info("vet_locator provider=nominatim success count=%d duration_ms=%d", len(results), duration_ms)
    return results, None


@router.get("/search")
def search_vet_clinics(
    lat: float = Query(..., ge=-90.0, le=90.0, description="User latitude"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="User longitude"),
    radius_km: float = Query(DEFAULT_RADIUS_KM, description="Search radius in kilometers"),
) -> dict[str, Any]:
    """GET /api/vet-clinics/search?lat=...&lng=...&radius_km=10

    Public endpoint (no user data accessed). Coordinates scope this single
    search and are not persisted. Radius is clamped to [1, 50] km and result
    counts are bounded to prevent proxy abuse.
    """
    radius = min(max(radius_km, MIN_RADIUS_KM), MAX_RADIUS_KM)

    # Deterministic priority: Google Places → SERP API → Nominatim.
    # Later providers run only while no usable results exist (cost control).
    attempted_failed = False

    google_results, google_error = _search_google(lat, lng, int(radius * 1000))
    if google_results:
        return {"status": "success", "count": len(google_results),
                "results": google_results, "source": "google"}
    attempted_failed = google_error not in (None, "not_configured")

    serp_results, serp_error = _search_serp(lat, lng)
    if serp_results:
        payload: dict[str, Any] = {"status": "success", "count": len(serp_results),
                                   "results": serp_results, "source": "serp"}
        if attempted_failed:
            payload["partial"] = True
            payload["notice"] = "Primary place provider was unavailable; showing alternative results."
        return payload
    attempted_failed = attempted_failed or serp_error not in (None, "not_configured")

    # Final fallback: OpenStreetMap Nominatim (open data, no key required).
    osm_results, osm_error = _search_nominatim(lat, lng, radius)
    if osm_results:
        payload = {"status": "success", "count": len(osm_results),
                   "results": osm_results, "source": "nominatim"}
        if attempted_failed:
            payload["partial"] = True
            payload["notice"] = "Primary place provider was unavailable; showing open-data results."
        return payload

    # No veterinary results from any reachable provider — distinguish causes.
    if not attempted_failed and osm_error is None:
        # All layers reachable but genuinely empty nearby.
        return {"status": "success", "count": 0, "results": [],
                "source": "nominatim",
                "notice": "No veterinary clinics found within the search area. Try a larger radius."}
    errors = {google_error, serp_error, osm_error}
    if "rate_limited" in errors:
        return {"status": "error", "error_code": "rate_limited", "count": 0, "results": [],
                "message": "Search is temporarily rate limited. Please wait a moment and try again."}
    if "unauthorized" in errors:
        return {"status": "error", "error_code": "configuration_error", "count": 0, "results": [],
                "message": "Veterinary search is temporarily unavailable. Please try again later."}
    return {"status": "error", "error_code": "provider_unavailable", "count": 0, "results": [],
            "message": "Veterinary search is temporarily unavailable. Please try again later."}
