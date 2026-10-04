<div align="center">

<img src="frontend/public/pawphile-logo.png" alt="PAWPHILE Logo" width="260" />

# PAWPHILE

### Empowering Smarter Dog Parenting

<br/>

> ## *"Don't Wait for the Emergency. Know the Signs. Care Better."*

<br/>

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-teal?style=for-the-badge)](CHANGELOG.md)
[![React](https://img.shields.io/badge/React-18.x-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![AI Powered](https://img.shields.io/badge/AI-Muse_Glimmer_%2B_Groq-FF6F00?style=for-the-badge&logo=openai&logoColor=white)](#ai-architecture)
[![Vision](https://img.shields.io/badge/Vision_AI-Roboflow_%2B_PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](#computer-vision)
[![PWA](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](#offline-first)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)

</div>

---

## The Problem

Dog parents face a fundamental information gap. When something seems wrong, the choice is between a Google spiral that causes panic, a rushed emergency vet visit that may not be needed, or the more dangerous option — doing nothing and hoping it resolves.

Preventive healthcare is invisible. Veterinary care is episodic. Warning signs go unrecognized until they become emergencies.

**PAWPHILE exists to close that gap.**

---

## Product Philosophy

PAWPHILE is built on a single organizing principle: **responsible dog parents should be able to recognize warning signs early, understand what they mean, and know when to escalate to a professional.**

PAWPHILE is not an AI veterinarian. It does not diagnose. It does not prescribe.

It is a **decision-support platform** — one that combines deterministic safety guardrails, breed-specific health intelligence, and AI-assisted guidance to help dog parents make more informed, calmer decisions before, during, and between veterinary visits.

---

## 📑 Table of Contents

1. [Product Overview](#product-overview)
2. [Core Capabilities](#core-capabilities)
3. [Safety Architecture](#safety-architecture)
4. [System Architecture](#system-architecture)
5. [Technology Stack](#technology-stack)
6. [Repository Structure](#repository-structure)
7. [AI Architecture](#ai-architecture)
8. [Computer Vision](#computer-vision)
9. [Offline First](#offline-first)
10. [Database Design](#database-design)
11. [Installation](#installation)
12. [Environment Variables](#environment-variables)
13. [API Documentation](#api-documentation)
14. [Testing](#testing)
15. [Deployment](#deployment)
16. [Security & Privacy](#security--privacy)
17. [Research Contributions](#research-contributions)
18. [Future Roadmap](#future-roadmap)
19. [Contributing](#contributing)
20. [Citation](#citation)
21. [Acknowledgements](#acknowledgements)

---

## 🔭 Product Overview

PAWPHILE is an **India-first, AI-assisted preventive healthcare and digital health platform for companion dogs**. It operates at the intersection of veterinary informatics, clinical decision support, and computer vision.

The platform is designed to help dog parents:

1. **Recognize early warning signs** before they become emergencies
2. **Understand their dog's health** through breed-specific, contextual intelligence
3. **Respond safely** during emergencies via deterministic triage — bypassing AI during critical symptom detection
4. **Maintain a longitudinal health record** for meaningful veterinary consultations
5. **Make informed care decisions** rather than reactive, fear-driven ones

> **Geographic Focus:** India-first. Accounts for Indian indigenous breeds (Pariah, Kombai, Mudhol, Rajapalayam), tick-fever prevalence, heatstroke risk in Indian summers, and WSAVA guidelines adapted for high-exposure environments.

---

## ⭐ Core Capabilities

| Module | Description | Status |
|--------|-------------|--------|
| **PAW AI — Chat** | Breed-aware LLM guidance via Muse Glimmer 30 when configured (`PAW_AI_PROVIDER=auto`), Groq legacy fallback. Deterministic guardrails fire before LLM for any emergency signal. | ✅ Implemented |
| **PAW AI — Triage Engine** | Structured symptom assessment engine with hardcoded emergency rules and breed-context injection. | 🟡 Locally Working (Ollama) |
| **Vision Scan (DermAI™)** | Roboflow Inference SDK wrapper for canine skin and lesion screening. | ✅ Implemented (Bin 1) |
| **Vision (PyTorch/YOLO)** | EfficientNet B0 breed classification and YOLOv8 detection — experimental pipelines. | 🔵 Experimental |
| **Clinical Vision (Bin 2C)** | Native skin lesion classification pipeline. Blocked pending Tier-A veterinary annotated data. | 🔒 Blocked |
| **Preventive Care** | Vaccine and deworming schedule tracking with WSAVA-calculated due dates. | ✅ Implemented |
| **Nutrition & BCS** | Food logging, calorie tracking, and 9-point WSAVA Body Condition Score assessment. | ✅ Implemented |
| **Behavior Log** | Mood and behavioral anomaly tracking for longitudinal pattern recognition. | ✅ Implemented |
| **Vet Locator** | Nearby veterinary discovery: Google Places (server-side key, `type=veterinary_care`) when configured, OpenStreetMap Nominatim fallback otherwise. Normalized results with source provenance; no fabricated ratings, hours, or phone numbers. Map: Leaflet + React-Leaflet. | ✅ Implemented |
| **PAWNEWS** | Contextual pet health news feed aggregating validated external sources with breed/season relevance. | ✅ Implemented |
| **Reports & PDF Export** | Longitudinal health summary generation for veterinary consultations. | ✅ Implemented |
| **Offline-First PWA** | IndexedDB-backed offline data entry with background sync on reconnection. | ✅ Implemented |
| **Push Notifications** | Firebase Cloud Messaging (FCM) for reminder and alert delivery. | ✅ Implemented |
| **Weather Alerts** | OpenWeather API integration for breed-specific heatstroke/cold risk guidance. | 🟡 Experimental |

---

## 🚦 Safety Architecture

Safety is not a feature in PAWPHILE — it is the foundation.

### Triage Tiers

Every AI output is categorized into a deterministic Action Tier **before** the LLM is ever consulted:

| Tier | Trigger | Response |
|------|---------|----------|
| 🔴 **RED — Emergency** | Hardcoded emergency keyword match (seizure, bloat, pale gums, bloody vomit, collapse, unresponsiveness, poisoning, heatstroke, etc.) | AI dialogue halted immediately. User directed to nearest emergency vet. No LLM response generated. |
| 🟡 **YELLOW — Monitor** | Non-critical concern signals (mild lethargy, localized scratching, appetite changes) | 24–48 hour monitoring protocol with clear escalation criteria. |
| 🟢 **GREEN — General** | Wellness, nutrition, behavioral, preventive care queries | Full LLM capability engaged with veterinary disclaimer appended to all responses. |

### Structural Constraints

- The AI is **architecturally prevented** from generating dosage recommendations or explicit diagnostic claims.
- All outputs append mandatory veterinary disclaimers.
- Emergency keyword detection is **deterministic string-matching**, not LLM inference — it cannot hallucinate.
- A dedicated **Toxin Guardrail** (`TOXIC_FOOD_KEYWORDS`) intercepts food safety queries and routes them to the deterministic food safety database.

---

## 🏛️ System Architecture

### Three-Service Monorepo

```mermaid
graph TD
    Client[Frontend PWA<br/>React 18 + Vite + TypeScript<br/>Vercel]
    API[Core Backend<br/>FastAPI + SQLAlchemy<br/>Render]
    Vision[Vision Inference Service<br/>FastAPI + PyTorch + Roboflow<br/>Dedicated GPU Instance]
    DB[(PostgreSQL<br/>Neon / Supabase)]
    Storage[Cloudinary<br/>Image Store]
    Auth[Clerk Identity]
    IDB[(IndexedDB<br/>localforage)]
    FCM[Firebase Cloud Messaging<br/>Push Notifications]

    Client -- Clerk JWT Bearer --> API
    Client -- Supabase JS Direct --> DB
    Client -- Offline Queue --> IDB
    IDB -- Background Sync --> DB
    Client -- OAuth --> Auth
    Client -- Push --> FCM
    API -- SQLAlchemy ORM --> DB
    API -- Upload --> Storage
    API -- Roboflow SDK --> Vision
    Vision -- Return Triage --> API
```

> **Split-Brain Database Architecture:** The frontend communicates directly with Supabase/PostgreSQL via `@supabase/supabase-js` for offline sync, while the FastAPI backend uses SQLAlchemy (psycopg2) against the same database for AI retrieval and complex queries.

### Vision Scan Request Lifecycle

```mermaid
sequenceDiagram
    participant User as Client (React)
    participant Auth as Clerk
    participant API as Core Backend (FastAPI)
    participant Storage as Cloudinary
    participant Vision as Roboflow Vision SDK
    participant DB as PostgreSQL (Neon)

    User->>Auth: Authenticate
    Auth-->>User: Return JWT Token
    User->>API: POST /api/vision/scan (Image + JWT)
    API->>Auth: Validate JWT Signature
    API->>Storage: Upload Secure Image (server-side only)
    Storage-->>API: Return secure_url
    API->>Vision: Roboflow Inference SDK (pawphile-screening-prototype)
    Vision-->>API: Return {prediction, confidence, explanation}
    API->>DB: Save VisionScanRecord
    API-->>User: Return Triage Result
```

---

## 🛠️ Technology Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18, Vite, TypeScript 5.x |
| Styling | Tailwind CSS |
| Routing | React Router DOM v7 |
| State | React Context API (`PawphileDataContext`, `ThemeContext`) |
| Offline Storage | `localforage` (IndexedDB wrapper) |
| Auth | Clerk React (`@clerk/clerk-react`) |
| Database Client | Supabase JS (`@supabase/supabase-js`) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Maps | Leaflet + React-Leaflet |
| Charts | Recharts |
| PDF Generation | jsPDF + jsPDF-AutoTable + html2canvas |
| Icons | Lucide React |

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy 2.0 |
| Database Driver | psycopg2-binary (PostgreSQL) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | Clerk JWT verification (python-jose) |
| Image Storage | Cloudinary Python SDK |
| Email | Resend API |
| PDF Reports | ReportLab |
| Vision SDK | Roboflow Inference SDK (`inference-sdk`) |
| Streaming | SSE-Starlette (Server-Sent Events) |
| LLM (Chat) | Muse Glimmer 30 (`PAW_AI_PROVIDER=auto` when `MUSE_GLIMMER_API_KEY` is set), Groq Cloud fallback (`llama3-70b-8192`) |
| LLM (Triage) | Local Ollama (Llama 3, `localhost:11434`) |

### Computer Vision Service
| Layer | Technology |
|-------|-----------|
| Framework | FastAPI |
| Primary Pipeline | Roboflow Serverless Inference (Bin 1) |
| Experimental Pipeline | PyTorch + EfficientNet B0, YOLOv8 (Bin 2A/2B) |
| Explainability | Grad-CAM heatmap overlays |
| Image Processing | OpenCV, Albumentations |
| Experiment Tracking | Weights & Biases (wandb) |

### Infrastructure
| Service | Provider |
|---------|---------|
| Database | Neon Serverless PostgreSQL / Supabase PostgreSQL |
| Authentication | Clerk (JWT, OAuth, JWKS) |
| Image Storage | Cloudinary |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Push Notifications | Firebase Cloud Messaging |

---

## 📂 Repository Structure

```text
PAWPHILE/
├── frontend/                   # React 18 + Vite + TypeScript PWA
│   ├── src/
│   │   ├── components/         # Layout, UI, Chat, PAWNEWS components
│   │   ├── context/            # PawphileDataContext, ThemeContext, etc.
│   │   ├── engines/            # Client-side rule engines
│   │   ├── features/           # Feature-scoped logic
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Route-level page components
│   │   ├── services/           # API client, SyncManager, chatEngine, etc.
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Helpers and utilities
│   ├── public/
│   │   ├── pawphile-logo.png   # PAWPHILE brand logo
│   │   └── firebase-messaging-sw.js  # FCM service worker
│   ├── .env.example            # Sanitized environment template
│   └── package.json
├── backend/                    # FastAPI core service
│   ├── app/
│   │   ├── api/routes/         # All API endpoints (17 route files)
│   │   ├── core/               # Config, Security, JWT validation
│   │   ├── db/                 # SQLAlchemy session management
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic validation schemas
│   │   └── services/           # PAW AI Engine, Vision Service, Cloudinary
│   ├── migrations/             # Alembic database migrations
│   ├── tests/                  # Backend pytest suite
│   ├── .env.example            # Sanitized environment template
│   └── requirements.txt
├── vision/                     # Dedicated Vision AI microservice
│   ├── app/
│   │   ├── routers/            # Analysis endpoints
│   │   ├── services/           # PyTorch inference pipelines
│   │   ├── triage/             # VetPriority™ triage logic
│   │   └── explainability/     # Grad-CAM / ExplainVet™
│   ├── training/               # Model training scripts
│   ├── models/                 # PyTorch weights (gitignored)
│   ├── .env.example            # Sanitized environment template
│   └── requirements.txt
├── cv/                         # Computer Vision research pipeline
│   ├── skin_lesion/            # Bin 2C — clinical CV (blocked)
│   └── models/                 # Trained weights (gitignored)
├── tests/                      # Cross-service integration tests
├── README.md
└── LICENSE                     # Apache 2.0
```

---

## 🧠 AI Architecture

### PAW AI — Guardrail-First Design

PAWPHILE implements a **Guardrail-First AI Architecture** where deterministic safety checks are always evaluated before any LLM call:

**Pipeline (Chat Route `/api/paw-ai/chat`):**
1. **Emergency Keyword Check** — Deterministic string match against `EMERGENCY_KEYWORDS` list. If triggered: halt, generate Red Alert, return emergency vet directive. No LLM contacted.
2. **Toxin Guard** — Intercepts food safety queries and routes to deterministic toxin database.
3. **Intent Classification** — Classifies query into: triage, breed, nutrition, vaccine, deworming, BCS, behavior, or general.
4. **Breed Context Injection** — Dog's breed, age, weight, and recent records auto-injected into system prompt.
5. **Provider Call** — Muse Glimmer 30 via `MUSE_GLIMMER_BASE_URL`/`MUSE_GLIMMER_MODEL` when configured (`PAW_AI_PROVIDER=auto|glimmer`); Groq `llama3-70b-8192` fallback. Server-side keys only; failures return a controlled unavailable state, never a fabricated answer.
6. **Output Sanitization** — Mandatory veterinary disclaimer appended. Dosage and diagnostic terms structurally excluded.

**Pipeline (Triage Route `/api/paw-ai/triage`):**
- Uses `paw_ai_engine.py` with local Ollama inference.
- Breed-specific risk profiles for 15+ breeds including Indian indigenous breeds (Kombai, Mudhol, Rajapalayam).
- Returns structured JSON: severity tier, explanation, recommended actions.

> **RAG Pipeline Status:** The RAG (Retrieval-Augmented Generation) endpoint exists as a stub (`POST /api/knowledge/ingest`) but is **not implemented**. pgvector embeddings are planned for a future phase.

---

## 👁️ Computer Vision

### Vision Tier Architecture

| Tier | Pipeline | Status |
|------|---------|--------|
| **Bin 1** | Roboflow Serverless Inference SDK — `pawphile-screening-prototype` workflow | ✅ Active |
| **Bin 2A** | PyTorch EfficientNet B0 — breed phenotype classification | 🔵 Experimental |
| **Bin 2B** | YOLOv8 — canine object detection | 🔵 Experimental |
| **Bin 2C** | Custom clinical skin lesion classifier — DermAI™ native model | 🔒 Blocked (awaiting Tier-A veterinary data) |

### Vision Modules
- **DermAI™** — Skin anomaly, hot spot, and lesion screening
- **EyeScan AI™** — Ocular condition preliminary screening
- **EarSense AI™** — Ear condition preliminary screening
- **VetPriority™** — Post-inference risk stratification
- **ExplainVet™** — Grad-CAM heatmap overlays for model transparency

> **Clinical Safety Note:** Vision results are risk-stratification outputs, not diagnoses. All vision results include confidence scores, recommended actions, and mandatory veterinary review prompts.

---

## 📶 Offline First

PAWPHILE is a **Progressive Web App (PWA)** designed for reliability in low-connectivity environments — dog parks, hiking trails, rural India.

**Offline Architecture (`SyncManager.tsx`):**
1. All user writes are intercepted and saved to **IndexedDB** via `localforage`.
2. A `SYNC_QUEUE` marker is appended to the pending record.
3. On reconnection, `SyncManager` triggers `syncService.ts`.
4. `syncService.ts` performs a differential upsert comparing `updated_at` timestamps to prevent overwrite conflicts.
5. **Firebase Service Worker** (`firebase-messaging-sw.js`) handles background sync and push notification delivery.

---

## 🗄️ Database Design

**Primary Database:** Neon Serverless PostgreSQL (accessed via both Supabase JS and SQLAlchemy ORM)

### Core Entities
| Entity | Description |
|--------|-------------|
| `users` | Mapped to `clerk_user_id`. Profile, preferences, subscription. |
| `dog_profiles` | Breed, age, weight, sex, baseline health context. |
| `vaccine_records` | Vaccination history with WSAVA-calculated due dates. |
| `deworming_records` | Deworming schedule and completion tracking. |
| `nutrition_logs` | Food entries, calorie and macro tracking. |
| `bcs_bmi_records` | 9-point WSAVA Body Condition Score assessments. |
| `behavior_logs` | Behavioral event recording for longitudinal analysis. |
| `vision_scan_records` | Cloudinary `secure_url`, confidence scores, raw Roboflow inference JSON. |
| `paw_ai_sessions` | Conversation history, guardrail trigger logs. |
| `reminders` | Scheduled health reminders with FCM push targeting. |
| `vet_clinics` | Geospatial vet clinic data. |

**Multi-tenancy:** Enforced at ORM layer — every query mandates `WHERE clerk_user_id = :id`.

---

## 🚀 Installation

### Prerequisites
- Node.js v18+
- Python 3.12+
- Clerk account — [clerk.com](https://clerk.com)
- Neon PostgreSQL account — [neon.tech](https://neon.tech)
- Cloudinary account — [cloudinary.com](https://cloudinary.com)
- Groq API key — [console.groq.com](https://console.groq.com) (legacy fallback)
- Muse Glimmer credentials (`MUSE_GLIMMER_API_KEY/BASE_URL/MODEL`) — preferred PAW AI provider
- Google Places API key (optional — Vet Locator falls back to OpenStreetMap without it)
- Roboflow account — [roboflow.com](https://roboflow.com)

### 1. Clone
```bash
git clone https://github.com/ESSAKKI-RAJA/PAWPHILE.git
cd PAWPHILE
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### 3. Core Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 4. Vision Service
```bash
cd vision
python -m venv venv
venv\Scripts\activate  # or source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔐 Environment Variables

All real `.env` files are **gitignored**. Only sanitized `.env.example` files are tracked.

### Frontend (`frontend/.env.example`)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=BG...
VITE_API_BASE_URL=http://localhost:8001
```

### Core Backend (`backend/.env.example`)
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://YOUR-CLERK-DOMAIN/.well-known/jwks.json
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_ORIGIN=http://localhost:5173
ROBOFLOW_API_KEY=...
GROQ_API_KEY=gsk_...
# PAW AI provider: auto|glimmer|groq. auto selects Muse Glimmer 30 when
# MUSE_GLIMMER_API_KEY is set, otherwise the legacy Groq path.
PAW_AI_PROVIDER=auto
MUSE_GLIMMER_API_KEY=
MUSE_GLIMMER_BASE_URL=
MUSE_GLIMMER_MODEL=
# Vet Locator (optional): Google Places veterinary discovery, server-side only.
# When absent, the endpoint falls back to OpenStreetMap Nominatim open data.
GOOGLE_PLACES_API_KEY=
RESEND_API_KEY=re_...
GUARDIAN_API_KEY=...     # Optional — PAWNEWS feeds fallback to internal seeds if absent
GNEWS_API_KEY=...        # Optional
NEWSDATA_API_KEY=...     # Optional
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
```

### Vision Service (`vision/.env.example`)
```env
VISION_MODEL_PATH=./models
VISION_API_HOST=0.0.0.0
VISION_API_PORT=8000
```

---

## 🔌 API Documentation

All backend requests require a valid Clerk JWT in the `Authorization: Bearer <token>` header.

Interactive Swagger/OpenAPI documentation is available at:
- **Backend:** `http://localhost:8001/docs`
- **Vision Service:** `http://localhost:8000/docs`

### Key Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/paw-ai/chat` | Groq LLM triage chat (streamed SSE) |
| `POST` | `/api/paw-ai/triage` | Structured symptom triage engine |
| `POST` | `/api/vision/scan` | Upload image → Roboflow inference → save result |
| `GET` | `/api/vision/scans/{dog_id}` | Retrieve all vision scan records for a dog |
| `GET` | `/api/pawnews` | Fetch curated pet health news feed |
| `GET` | `/api/vet-clinics` | Nearby vet clinic search |
| `GET` | `/api/weather` | Weather-based breed risk alerts |
| `POST` | `/api/reports/generate` | Generate PDF health summary |
| `GET` | `/api/dogs` | Dog profile CRUD |

---

## 🧪 Testing

```bash
# Backend — Pytest
cd backend
pytest tests/ -v

# Frontend — TypeScript typecheck
cd frontend
npm run typecheck

# Frontend — Build validation
cd frontend
npm run build

# Safety gate — Computer Vision Bin 2C readiness
cd cv
python skin_lesion/infrastructure/bin2c_readiness_gate.py
```

---

## 📦 Deployment

| Service | Platform | Notes |
|---------|---------|-------|
| Frontend | Vercel (Edge CDN) | PWA with Vercel config |
| Core Backend API | Render | FastAPI on standard instance |
| Vision Service | Render / AWS EC2 / RunPod | GPU instance recommended for Bin 2 pipelines |
| Database | Neon Serverless PostgreSQL | Scales to zero; Supabase also connected |

---

## 🛡️ Security & Privacy

- **Authentication:** Delegated to Clerk. Passwords never reach PAWPHILE servers.
- **Stateless Authorization:** JWT validated on every backend request via JWKS.
- **Multi-tenancy:** All ORM queries enforce `clerk_user_id` isolation.
- **Image Privacy:** Vision scan images upload server-side via Cloudinary; the client never receives API credentials.
- **No Tracking:** No telemetry pixels. Analytics strictly anonymized.
- **Responsible AI:** Structural constraints prevent dosage recommendations and diagnostic claims.
- **Secret Management:** Real `.env` files are gitignored. Firebase service account credentials are never committed.

---

## 🔬 Research Contributions

PAWPHILE is structured as both a consumer product and a research platform:

- **Veterinary Informatics:** Proof-of-concept for deterministic safety guardrails in non-human medical NLP systems — demonstrating that LLM hallucination risks can be mitigated through pre-inference rule engines.
- **Computer Vision:** Building a canine dermatological screening pipeline from user-captured (non-clinical) imagery, establishing baselines for vision model robustness under varied lighting and angles.
- **Breed-Specific Health Intelligence:** Curating a structured dataset linking breed phenotypes to health risk profiles, with specific coverage of Indian indigenous breeds underrepresented in global veterinary datasets.
- **Offline-First Healthcare UX:** Demonstrating a viable PWA architecture for healthcare decision-support in low-connectivity environments.

---

## 🗺️ Future Roadmap

> **Introduced in future updates (planned, not live):** connected health
> timeline, care planning, controlled health sharing, veterinary
> collaboration, external health connections, organizations / care networks,
> vet portal, longitudinal intelligence. These remain deferred from the
> current MVP and return only after real-world validation.

- [x] **Phase 1** — React PWA, FastAPI Backend, PostgreSQL, Clerk Auth
- [x] **Phase 2** — Offline-First IndexedDB Architecture, Supabase SyncManager
- [x] **Phase 3** — PAW AI Engine with deterministic safety guardrails (Groq Chat + Ollama Triage)
- [x] **Phase 4** — Roboflow Vision Integration (Bin 1), PyTorch/YOLO experimental pipelines
- [x] **Phase 5** — Repository hardening, documentation, security audit
- [ ] **Phase 6** — Cloud-native Triage Engine (remove Ollama local dependency)
- [ ] **Phase 7** — Tier-A veterinary data ingestion → Clinical DermAI™ training
- [ ] **Phase 8** — Vet clinic portal for direct longitudinal data export
- [ ] **Phase 9** — Opt-in anonymized research telemetry

---

## 🤝 Contributing

We welcome contributions from full-stack engineers, ML researchers, and veterinary professionals.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for code of conduct and submission guidelines.

---

## 🎓 Citation

If you use PAWPHILE for academic research or build upon this work, please cite:

```bibtex
@software{pawphile_2026,
  author       = {Essakki Raja},
  title        = {PAWPHILE: AI-Assisted Preventive Healthcare Platform for Companion Dogs},
  year         = {2026},
  publisher    = {GitHub},
  journal      = {GitHub repository},
  howpublished = {\url{https://github.com/ESSAKKI-RAJA/PAWPHILE}}
}
```

*See [CITATION.cff](CITATION.cff) for additional citation formats.*

---

## 🙏 Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/) — Python API framework
- [Clerk](https://clerk.com/) — Identity and authentication
- [Groq](https://groq.com/) — Low-latency LLM inference
- [Roboflow](https://roboflow.com/) — Computer vision inference infrastructure
- [Neon](https://neon.tech/) — Serverless PostgreSQL
- [Firebase](https://firebase.google.com/) — Push notification delivery
- The open-source veterinary AI and canine health communities

---

<div align="center">

<img src="frontend/public/pawphile-logo.png" alt="PAWPHILE" width="100" />

<br/>

*Built for dogs. Designed for the people who love them.*

**PAWPHILE &nbsp;·&nbsp; .Know Them Better &nbsp;·&nbsp; .Care Them Better**

</div>
