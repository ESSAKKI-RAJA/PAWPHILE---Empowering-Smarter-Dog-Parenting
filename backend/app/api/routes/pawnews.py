from fastapi import APIRouter, Query, HTTPException
from typing import Any, List
from pydantic import BaseModel
import httpx
import asyncio
from datetime import datetime

router = APIRouter()

class PawNewsItem(BaseModel):
    id: str
    title: str
    summary: str
    feedType: str
    category: str
    sourceName: str
    sourceType: str
    trustLabel: str
    url: str
    urlStatus: str
    publishedAt: str
    lastCheckedAt: str
    expiresAt: str
    locationTags: List[str]
    relevanceScore: int
    isVerified: bool
    readTimeMinutes: int
    imageUrl: str | None = None
    tags: List[str]

# Mock database of verified manual feeds
MOCK_FEEDS = {
    "local": [
        {
            "id": "chennai-alert-1",
            "title": "Local Chennai Pet Alert 1",
            "summary": "Important local alert 1 regarding dog safety in Chennai.",
            "feedType": "local",
            "category": "Safety",
            "sourceName": "Local Vet Network",
            "sourceType": "Internal",
            "trustLabel": "Manually reviewed",
            "url": "https://pawphile.com/broken-link-test",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Chennai"
            ],
            "relevanceScore": 90,
            "isVerified": True,
            "readTimeMinutes": 2,
            "tags": [
                "safety"
            ]
        },
        {
            "id": "chennai-alert-2",
            "title": "Local Chennai Pet Alert 2",
            "summary": "Important local alert 2 regarding dog safety in Chennai.",
            "feedType": "local",
            "category": "Safety",
            "sourceName": "Local Vet Network",
            "sourceType": "Internal",
            "trustLabel": "Manually reviewed",
            "url": "https://pawphile.com/local-alert-2",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Chennai"
            ],
            "relevanceScore": 90,
            "isVerified": True,
            "readTimeMinutes": 2,
            "tags": [
                "safety"
            ]
        },
        {
            "id": "chennai-alert-3",
            "title": "Local Chennai Pet Alert 3",
            "summary": "Important local alert 3 regarding dog safety in Chennai.",
            "feedType": "local",
            "category": "Safety",
            "sourceName": "Local Vet Network",
            "sourceType": "Internal",
            "trustLabel": "Manually reviewed",
            "url": "https://pawphile.com/local-alert-3",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Chennai"
            ],
            "relevanceScore": 90,
            "isVerified": True,
            "readTimeMinutes": 2,
            "tags": [
                "safety"
            ]
        },
        {
            "id": "chennai-alert-4",
            "title": "Local Chennai Pet Alert 4",
            "summary": "Important local alert 4 regarding dog safety in Chennai.",
            "feedType": "local",
            "category": "Safety",
            "sourceName": "Local Vet Network",
            "sourceType": "Internal",
            "trustLabel": "Manually reviewed",
            "url": "https://pawphile.com/local-alert-4",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Chennai"
            ],
            "relevanceScore": 90,
            "isVerified": True,
            "readTimeMinutes": 2,
            "tags": [
                "safety"
            ]
        },
        {
            "id": "chennai-alert-5",
            "title": "Local Chennai Pet Alert 5",
            "summary": "Important local alert 5 regarding dog safety in Chennai.",
            "feedType": "local",
            "category": "Safety",
            "sourceName": "Local Vet Network",
            "sourceType": "Internal",
            "trustLabel": "Manually reviewed",
            "url": "https://pawphile.com/local-alert-5",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Chennai"
            ],
            "relevanceScore": 90,
            "isVerified": True,
            "readTimeMinutes": 2,
            "tags": [
                "safety"
            ]
        }
    ],
    "guide": [
        {
            "id": "guide-preventive-1",
            "title": "Preventive Care Guide 1",
            "summary": "Essential guide 1 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-1",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        },
        {
            "id": "guide-preventive-2",
            "title": "Preventive Care Guide 2",
            "summary": "Essential guide 2 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-2",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        },
        {
            "id": "guide-preventive-3",
            "title": "Preventive Care Guide 3",
            "summary": "Essential guide 3 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-3",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        },
        {
            "id": "guide-preventive-4",
            "title": "Preventive Care Guide 4",
            "summary": "Essential guide 4 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-4",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        },
        {
            "id": "guide-preventive-5",
            "title": "Preventive Care Guide 5",
            "summary": "Essential guide 5 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-5",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        },
        {
            "id": "guide-preventive-6",
            "title": "Preventive Care Guide 6",
            "summary": "Essential guide 6 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-6",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        },
        {
            "id": "guide-preventive-7",
            "title": "Preventive Care Guide 7",
            "summary": "Essential guide 7 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-7",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        },
        {
            "id": "guide-preventive-8",
            "title": "Preventive Care Guide 8",
            "summary": "Essential guide 8 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-8",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        },
        {
            "id": "guide-preventive-9",
            "title": "Preventive Care Guide 9",
            "summary": "Essential guide 9 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-9",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        },
        {
            "id": "guide-preventive-10",
            "title": "Preventive Care Guide 10",
            "summary": "Essential guide 10 on keeping your dog healthy and happy.",
            "feedType": "guide",
            "category": "Tips",
            "sourceName": "PAWPHILE Vet Panel",
            "sourceType": "Internal",
            "trustLabel": "Educational",
            "url": "https://pawphile.com/guide-10",
            "urlStatus": "unchecked",
            "publishedAt": "2026-05-26T22:44:18.348862",
            "lastCheckedAt": "2026-05-26T22:44:18.348862",
            "expiresAt": "2099-12-31T00:00:00Z",
            "locationTags": [
                "Global"
            ],
            "relevanceScore": 95,
            "isVerified": True,
            "readTimeMinutes": 5,
            "tags": [
                "prevention"
            ]
        }
    ]
}



async def check_url_status(url: str) -> str:
    if url.startswith("https://pawphile.com"):
        return "valid"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.head(url, follow_redirects=True)
            if resp.status_code >= 400:
                return "broken"
            return "valid"
    except Exception:
        return "broken"

@router.get("/feed")
async def get_pawnews_feed(
    feed: str = Query(..., description="Feed type: local|global|guide"),
    zone: str = Query("global")
) -> dict[str, Any]:
    """GET /api/pawnews/feed?feed=...&zone=..."""
    items = MOCK_FEEDS.get(feed, [])
    
    # URL Validation Step (Server-side)
    validated_items = []
    for item in items:
        # Check URL validity asynchronously
        status = await check_url_status(item["url"])
        item["urlStatus"] = status
        item["lastCheckedAt"] = datetime.utcnow().isoformat()
        validated_items.append(item)
    
    return {
        "status": "success",
        "feed_type": feed,
        "zone": zone,
        "count": len(validated_items),
        "items": validated_items,
        "metadata": {
            "cached": False,
            "generated_at": datetime.utcnow().isoformat()
        }
    }
