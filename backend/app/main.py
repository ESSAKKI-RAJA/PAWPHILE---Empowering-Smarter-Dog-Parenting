from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.observability import RequestIDMiddleware, get_request_id
from app.core.rate_limit import RateLimitMiddleware
from app.api.routes import auth, users, dogs, vaccines, medical_history, vision, uploads
from app.api.routes import deworming, triage, reports, reminders, settings as settings_routes
from app.api.routes import paw_ai, pawnews, vet_clinics, weather, foundation, worker
from app.api.routes import analytics, supervisor
from app.api.routes import collaboration
from app.api.routes import ecosystem, partner

# Interactive API docs are a development aid. In production they stay
# disabled so route schemas are not advertised to anonymous clients.
_is_prod = (settings.ENVIRONMENT or "").strip().lower() == "production"

app = FastAPI(
    title="PAWPHILE API",
    description="India-first AI preventive healthcare companion for dog owners. Not a diagnostic tool.",
    version="2.0.0",
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

# CORS — allow local dev + production frontends
origins = [
    "http://localhost:5173",                          # local dev
    "http://localhost:3000",                          # alternate local dev
    "https://pawphile.vercel.app",                    # production frontend (Vercel)
    "https://pawphile-empowering-smarter-dog-par.vercel.app",  # production frontend (Vercel, current)
    settings.FRONTEND_ORIGIN,                         # from .env (fallback / custom)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Observability first (request IDs), then abuse controls.
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RateLimitMiddleware)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "pawphile-backend", "version": "2.0.0"}


@app.exception_handler(Exception)
async def safe_unhandled_handler(request: Request, exc: Exception):
    # Never leak stack traces, paths, or secrets to clients.
    # Request ID included for support correlation (safe).
    return JSONResponse(status_code=500, content={
        "detail": "Internal server error.",
        "request_id": get_request_id(),
    })

# Auth
app.include_router(auth.router, prefix="/api", tags=["auth"])

# Users
app.include_router(users.router, prefix="/api/users", tags=["users"])

# Dogs CRUD
app.include_router(dogs.router, prefix="/api/dogs", tags=["dogs"])

# Dog sub-resources (note: vaccines and medical_history routers use dog_id in path)
app.include_router(vaccines.router, prefix="/api/dogs", tags=["vaccines"])
app.include_router(medical_history.router, prefix="/api/dogs", tags=["medical_history"])

# Vision & Uploads
app.include_router(vision.router, prefix="/api/vision", tags=["vision"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])

# Dog sub-resources + completed modules (deworming/triage/settings fully implemented)
app.include_router(deworming.router, prefix="/api/dogs", tags=["deworming"])
app.include_router(triage.router, prefix="/api/triage", tags=["triage"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(reminders.router, prefix="/api/reminders", tags=["reminders"])
app.include_router(settings_routes.router, prefix="/api/settings", tags=["settings"])
app.include_router(weather.router, prefix="/api/weather", tags=["weather"])

# PAW AI — Central AI Health Engine
app.include_router(paw_ai.router, prefix="/api/paw-ai", tags=["paw-ai"])

# PAWNEWS — Validated Feeds
app.include_router(pawnews.router, prefix="/api/pawnews", tags=["pawnews"])

# Vet Clinics — PostGIS PostGIS
app.include_router(vet_clinics.router, prefix="/api/vet-clinics", tags=["vet-clinics"])

# BIN1 Foundation — canonical longitudinal record (versioned)
app.include_router(foundation.router, prefix="/api/v1", tags=["foundation-v1"])

# BIN1 worker — scheduler/cron sweep, delivery, retention (cron-token or user scope)
app.include_router(worker.router, prefix="/api/v1", tags=["worker-v1"])

# BIN2 longitudinal intelligence — descriptive analytics + supervised PAW AI
app.include_router(analytics.router, prefix="/api/v1", tags=["analytics-v1"])
app.include_router(supervisor.router, prefix="/api/v1", tags=["supervisor-v1"])

# BIN3 veterinary continuity — owner-controlled collaboration loop
app.include_router(collaboration.router, prefix="/api/v1", tags=["collaboration-v1"])

# BIN4 ecosystem & platform — organizations, integrations, partners, webhooks
app.include_router(ecosystem.router, prefix="/api/v1", tags=["ecosystem-v1"])
app.include_router(partner.router, prefix="/api", tags=["partner-v1"])
