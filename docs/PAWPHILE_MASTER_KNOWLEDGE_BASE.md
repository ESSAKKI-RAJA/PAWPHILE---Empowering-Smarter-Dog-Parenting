# PAWPHILE Master Knowledge Base

> **SOURCE OF TRUTH**: This document is derived *strictly* from the runtime repository state (`d:/PROJECTS/PAWPHILE/`) as of the final release audit. It maps the active, implemented systems and explicitly calls out legacy or stubbed features.

---

## PART 1 — PRODUCT IDENTITY

1. **Product name**: PAWPHILE
2. **Full product title**: PAWPHILE - Empowering Smarter Dog Parenting
3. **Product purpose**: An India-first AI preventive healthcare companion for dog owners.
4. **Problem statement**: Indian dog parents lack localized, breed-specific preventive care guidance and face high veterinary costs for issues that could be prevented.
5. **Target users**: Dog owners in India.
6. **Primary user**: The everyday dog parent needing day-to-day guidance, triage, and records management.
7. **Secondary users**: Veterinarians receiving generated health reports.
8. **Geographic/product positioning**: Localized to India (e.g., vet locator defaults to Indian context).
9. **Core value proposition**: Centralized health records paired with an AI engine that provides structured triage and safety checks before a vet visit is necessary.
10. **Product philosophy**: Prevention over cure; AI as a decision support tool, not a doctor.
11. **Safety boundaries**: Hardcoded guardrails (e.g., `TOXIC_FOODS` dict) and strict LLM system prompts enforcing vet consultation.

---

## PART 2 — COMPLETE SYSTEM ARCHITECTURE

See [PAWPHILE_ARCHITECTURE_DIAGRAM.md](PAWPHILE_ARCHITECTURE_DIAGRAM.md).

**Summary**: 
- **Frontend**: React (Vite) SPA hosted on Vercel.
- **Backend**: FastAPI Python app hosted on Render.
- **Database (The Split Brain)**: Supabase native schema (`dogs`, `profiles`) populated by frontend offline sync. PostgreSQL SQLAlchemy schema (`dog_profiles`, `users`) populated by FastAPI backend.
- **Auth**: Clerk JWTs.
- **AI Services**: Groq (Llama 3) for text, Roboflow for images.
- **Storage**: Cloudinary for images, Supabase Storage for PDFs.

---

## PART 3 — REPOSITORY STRUCTURE

- `frontend/`: React SPA source code. 
- `backend/`: FastAPI Python application.
- `vision/`: [PARTIALLY IMPLEMENTED] Legacy folder. Production logic is in `backend/app/services/vision_service.py` using Roboflow.
- `docs/`: Master knowledge base and architecture decision records.

---

## PART 4 — DATABASE & SPLIT BRAIN ARCHITECTURE

PAWPHILE currently operates a "split-brain" data persistence model due to a partial architecture migration:
1. **Frontend Direct (`syncService.ts`)**: Uses the Supabase JS client to aggressively push local PWA state to native Supabase tables (`preventive_care_records`, `dogs`).
2. **Backend API (`apiClient.ts` -> FastAPI)**: Uses SQLAlchemy ORM to map objects to PostgreSQL tables (`vaccine_records`, `dog_profiles`).

*See `PAWPHILE_ARCHITECTURE_DECISIONS.md` for trade-offs.*

---

## PART 5 — PAW AI (TEXT ENGINE)

Implemented in `backend/app/api/routes/paw_ai.py` and `paw_ai_engine.py`.
- **Provider**: Groq API (`llama3-70b-8192`)
- **Safety**: A deterministic safety engine evaluates queries *before* LLM execution. The `TOXIC_FOODS` dict intercepts harmful foods. `detect_emergency()` intercepts red-flag symptoms.
- **Breed Intelligence**: 20 core breeds are hardcoded into `BREED_RULES` to inject genetic risks into the LLM context.
- **Endpoints**: Chat, Triage, Food Safety, Vet Report.

---

## PART 6 — VISION AI (IMAGE ENGINE)

Implemented in `backend/app/services/vision_service.py`.
- **Storage**: Images are uploaded to **Cloudinary** prior to inference.
- **Inference**: Handled by **Roboflow Serverless Inference**.
- **Outputs**: Triage severity, confidence, concerns. Result logged to SQLAlchemy `vision_scan_records`.

---

## PART 7 — FEATURE STATUS MATRIX

- **Auth**: [IMPLEMENTED] (Clerk)
- **Profiles**: [IMPLEMENTED]
- **Triage**: [IMPLEMENTED] (Groq)
- **Vision**: [IMPLEMENTED] (Roboflow)
- **PawNews**: [IMPLEMENTED] (GNews/Guardian)
- **Vet Map**: [IMPLEMENTED] (PostGIS)
- **Offline / PWA**: [PARTIAL] Syncs to Supabase, bypassing Backend API.
- **Reminders**: [STUBBED] (No backend cron worker).
- **Weather**: [STUBBED] (Dummy JSON).
- **RAG**: [STUBBED] (Dummy JSON).
- **Ollama**: [LEGACY] (Removed from active routing).

---

## PART 8 — DEVELOPMENT & DEPLOYMENT

### Local Startup
**Frontend**: 
```bash
cd frontend
npm install
npm run dev
```
**Backend**:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Production Deployment
- **Frontend**: Vercel. Requires all `VITE_*` environment variables.
- **Backend**: Render. Requires all backend secrets (`GROQ_API_KEY`, `ROBOFLOW_API_KEY`, `CLOUDINARY_*`, `DATABASE_URL`).
