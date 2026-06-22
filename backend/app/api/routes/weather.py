from fastapi import APIRouter, Query, HTTPException
from typing import Any
import os
import datetime
import httpx

router = APIRouter()

@router.get("/alert")
def get_weather_alert(
    lat: float = Query(13.0827, description="Latitude"),
    lng: float = Query(80.2707, description="Longitude")
) -> dict[str, Any]:
    """GET /api/weather/alert?lat=...&lng=..."""
    api_key = os.environ.get("OPENWEATHER_API_KEY")
    
    current_month = datetime.datetime.now().month
    is_monsoon_month = 6 <= current_month <= 9
    
    weather_data = {
        "temp": 28.0,
        "humidity": 65,
        "condition": "Clear",
        "is_monsoon_season": is_monsoon_month,
        "has_rain": False,
        "high_humidity": False,
        "source": "fallback"
    }

    if api_key and api_key != "your_openweather_key":
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={api_key}&units=metric"
            res = httpx.get(url, timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                temp = data.get("main", {}).get("temp", 28.0)
                humidity = data.get("main", {}).get("humidity", 65)
                weather_list = data.get("weather", [])
                condition = weather_list[0].get("main", "Clear") if weather_list else "Clear"
                
                has_rain = "rain" in condition.lower() or any("rain" in w.get("main", "").lower() for w in weather_list)
                high_humidity = humidity > 70
                
                weather_data.update({
                    "temp": temp,
                    "humidity": humidity,
                    "condition": condition,
                    "has_rain": has_rain,
                    "high_humidity": high_humidity,
                    "source": "openweathermap"
                })
        except Exception as e:
            print(f"[Weather API] OpenWeatherMap Error: {e}")

    # If key is missing or failed, also check if it's currently June-Sept in India
    # which is the peak monsoon season.
    # High humidity can also be simulated/triggered based on season.
    if weather_data["is_monsoon_season"] and weather_data["source"] == "fallback":
        weather_data["condition"] = "Rain"
        weather_data["has_rain"] = True
        weather_data["humidity"] = 85
        weather_data["high_humidity"] = True

    return {
        "status": "success",
        "weather": weather_data,
        "alert_triggered": weather_data["is_monsoon_season"] or weather_data["has_rain"] or weather_data["high_humidity"]
    }
