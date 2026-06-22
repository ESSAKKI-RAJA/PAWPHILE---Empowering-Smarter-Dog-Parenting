from fastapi import APIRouter, Query, HTTPException
from typing import Any, List
from pydantic import BaseModel
import os
from supabase import create_client, Client

router = APIRouter()

def get_supabase() -> Client | None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if url and key:
        return create_client(url, key)
    return None

class VetClinicResult(BaseModel):
    id: str
    name: str
    phone: str | None
    address: str
    area: str | None
    city: str | None
    open_24_7: bool
    emergency_available: bool
    verified: bool
    distance_km: float | None

@router.get("/search")
def search_vet_clinics(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    radius_km: float = Query(10.0, description="Search radius in kilometers")
) -> dict[str, Any]:
    """GET /api/vet-clinics/search?lat=...&lng=...&radius_km=10"""
    import httpx
    
    google_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    results = []
    
    if google_key:
        try:
            radius_m = int(radius_km * 1000)
            url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius={radius_m}&type=veterinary_care&key={google_key}"
            res = httpx.get(url, timeout=10.0)
            if res.status_code == 200:
                data = res.json()
                for place in data.get("results", []):
                    results.append({
                        "id": place.get("place_id"),
                        "name": place.get("name"),
                        "address": place.get("vicinity"),
                        "rating": place.get("rating"),
                        "lat": place.get("geometry", {}).get("location", {}).get("lat"),
                        "lng": place.get("geometry", {}).get("location", {}).get("lng"),
                        "open_now": place.get("opening_hours", {}).get("open_now")
                    })
                if results:
                    return {"status": "success", "count": len(results), "results": results, "source": "google"}
        except Exception as e:
            print(f"[VetClinics] Google Places Error: {e}")
            
    # Fallback to Nominatim
    try:
        # Nominatim asks for user-agent
        headers = {"User-Agent": "PAWPHILE/1.0 (contact@pawphile.com)"}
        # Nominatim bounded search doesn't use radius param exactly like this but we can use q=veterinary in lat/lon
        # To make it work with lat/lon, we use free-form query and viewbox or just q=veterinary near lat, lon
        # Using a bounded query via q=veterinary+near+[lat],[lon] is tricky. A simple search with coordinates works best for reverse, 
        # but for POI search near a coordinate, nominatim has &lat= &lon= &viewbox= etc. 
        # But we can try a simple query first.
        # Format: search?q=[query]&format=json&extratags=1
        viewbox = f"{lng-0.1},{lat-0.1},{lng+0.1},{lat+0.1}"
        url = f"https://nominatim.openstreetmap.org/search?q=veterinary&format=json&viewbox={viewbox}&bounded=1&limit=20"
        res = httpx.get(url, headers=headers, timeout=10.0)
        if res.status_code == 200:
            data = res.json()
            for place in data:
                results.append({
                    "id": str(place.get("place_id")),
                    "name": place.get("name") or "Veterinary Clinic",
                    "address": place.get("display_name"),
                    "lat": float(place.get("lat", 0)),
                    "lng": float(place.get("lon", 0))
                })
            return {"status": "success", "count": len(results), "results": results, "source": "nominatim"}
    except Exception as e:
        print(f"[VetClinics] Nominatim Error: {e}")
        
    return {"status": "error", "message": "Failed to fetch vet clinics from any source", "count": 0, "results": []}
