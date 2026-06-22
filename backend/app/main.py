from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, users, dogs, vaccines, medical_history, vision, uploads
from app.api.routes import deworming, triage, reports, reminders, settings as settings_routes
from app.api.routes import paw_ai, pawnews, vet_clinics, weather

app = FastAPI(
    title="PAWPHILE API",
    description="India-first AI preventive healthcare companion for dog owners. Not a diagnostic tool.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "pawphile-backend", "version": "2.0.0"}

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

# Stubs
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
