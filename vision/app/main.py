from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import analyze

app = FastAPI(
    title="PAWPHILE Vision Engine™ API",
    description="Phase 3 Computer Vision Intelligence Layer powered by DermAI™, EyeScan AI™, EarSense AI™, VetPriority™, and ExplainVet™.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api/v1")

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "PAWPHILE Vision Engine™",
        "modules": {
            "DermAI™ (Skin)": "active",
            "EyeScan AI™ (Eye)": "active",
            "EarSense AI™ (Ear)": "active",
            "VetPriority™ (Triage)": "active",
            "ExplainVet™ (Explainability)": "active"
        }
    }
