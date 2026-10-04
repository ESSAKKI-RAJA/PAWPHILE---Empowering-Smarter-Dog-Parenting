<div align="center">

<img src="frontend/public/pawphile-logo.png" alt="PAWPHILE Logo" width="260" />

# PAWPHILE

### Your dog's health story, connected.

<br/>

> ## *"Don't Wait for the Emergency. Know the Signs. Care Better."*

<br/>

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-18.x-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![AI Powered](https://img.shields.io/badge/AI-Muse_Glimmer_%2B_Groq-FF6F00?style=for-the-badge&logo=openai&logoColor=white)](#paw-ai)
[![PWA](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](#offline-first)

</div>

---

## What PAWPHILE Is

PAWPHILE is a **dog-parent-first health continuity platform**. It helps owners
maintain structured health information for their dogs, understand changes,
prepare for veterinary attention, and make informed next-step decisions.

> **Your dog's health story, connected.**

Dog parents face a fundamental information gap. When something seems wrong,
the choice is between a search spiral that causes panic, a rushed emergency
visit that may not be needed, or the more dangerous option — doing nothing
and hoping it resolves. Preventive healthcare is invisible. Veterinary care
is episodic. Warning signs go unrecognized until they become emergencies.

**PAWPHILE exists to close that gap** — as a decision-support companion, not
as a veterinarian.

PAWPHILE is **not**:

- a veterinarian replacement
- a diagnostic system
- a generic chatbot
- a clinic management system
- a medical decision replacement

---

## 📑 Table of Contents

1. [Current Product](#current-product)
2. [PAW AI](#paw-ai)
3. [Safety & Trust](#safety--trust)
4. [System Architecture](#system-architecture)
5. [Technology Stack](#technology-stack)
6. [Repository Structure](#repository-structure)
7. [Offline First](#offline-first)
8. [Installation](#installation)
9. [Environment Variables](#environment-variables)
10. [API Documentation](#api-documentation)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Security & Privacy](#security--privacy)
14. [Future Upgrades](#future-upgrades)
15. [Contributing](#contributing)

---

## 🐾 Current Product

### Dog Profile

Breed, age, weight, and baseline health context per dog. The profile grounds
every other feature — guidance, triage, and reports all read from it.

### Preventive Care

Vaccine and deworming schedule tracking with due-date reminders, so
prevention stays on schedule instead of slipping.

### Nutrition

Food logging with calorie awareness, plus a deterministic food-safety
reference for common toxic foods.

### Behavior

Mood and behavioral event logging with anomaly awareness. Behavioral
guidance only — never a diagnosis.

### BCS / BMI

9-point Body Condition Score assessment with healthy-weight guidance.

### Triage

Structured symptom assessment with deterministic emergency awareness.
Emergency signals escalate immediately and direct the owner toward
veterinary care. Triage is not diagnosis.

### PAW AI

Guided health Q&A grounded in the dog's record, behind safety guardrails.
See [PAW AI](#paw-ai).

### Vision Scan

Image-based skin/coat screening assistance (Roboflow-backed) with
confidence scores and mandatory veterinary-review prompts. Results are
risk-stratification outputs, not diagnoses.

### PAWNEWS

Contextual pet-health news and guide feed with breed/season relevance,
falling back to curated internal seeds when external feeds are unconfigured.

### Reports

Owner-generated health summaries (including PDF export) to bring to
veterinary visits — visit history, vaccinations, treatments, and context
in one place.

### Authentication & Privacy

Clerk sign-in, per-user data isolation enforced at the ORM layer,
consent-first design, and full data export. See
[Security & Privacy](#security--privacy).

---

## 🧠 PAW AI

PAW AI is a **guardrail-first** assistant: deterministic safety checks run
before any hosted model is contacted.

**Pipeline (`POST /api/paw-ai/chat`, Clerk JWT required):**

1. **Emergency keyword check** — hardcoded match list. On trigger: halt,
   return an emergency directive. No model contacted.
2. **Toxin guard** — food-safety queries route to the deterministic
   reference table.
3. **System prompt + breed context** — the dog's breed, age, weight, and
   supplied records are injected; the prompt forbids diagnosis.
4. **Provider call** — Muse Glimmer 30 when configured
   (`PAW_AI_PROVIDER=auto|glimmer` with server-side `MUSE_GLIMMER_*`),
   Groq fallback otherwise. Keys never leave the server. Failures return
   a controlled "currently unavailable" state — never a fabricated answer.
5. **Output sanitization** — a veterinary disclaimer is appended to every
   response; dosage and diagnostic claims are structurally excluded.

Prompt-injection text stays scoped to the user message; the guardrail
system prompt always precedes it.

---

## 🛡️ Safety & Trust

- PAW AI does not replace a veterinarian. Every AI answer carries a
  veterinary disclaimer.
- Health outputs are **informational**. Triage tiers describe urgency;
  they do not diagnose disease or prescribe treatment.
- When symptoms may be urgent, the product directs the owner toward
  professional veterinary care.
- The owner controls their data: consent-first flows, revocation,
  auditability, and export. No dark patterns.
- Authentication (Clerk JWT) and per-user authorization protect private
  health information on every request.
- Sensitive credentials (`MUSE_GLIMMER_*`, `CLERK_SECRET_KEY`,
  `DATABASE_URL`, Cloudinary secrets) remain **server-side only** and
  never enter the frontend bundle.

---

## 🏛️ System Architecture

```text
Vercel frontend (React PWA)
        ↓  Clerk JWT (Bearer)
Render backend (FastAPI + SQLAlchemy)
        ↓
PostgreSQL (Neon / Supabase)
        ↓
External services: Clerk (identity) · Cloudinary (images) ·
Roboflow (vision) · Muse/Groq (PAW AI) · PAWNEWS feeds
```

- **Auth chain:** Vercel → Render → Clerk JWKS verification → per-user
  ORM scoping (`clerk_user_id` isolation).
- **CORS:** explicit allow-list (local dev + production Vercel origins +
  `FRONTEND_ORIGIN`). No wildcard.
- **Offline-first PWA:** writes go to IndexedDB (`localforage`) and sync
  in the background on reconnection.
- **Rate limiting:** in-memory sliding windows per scope (auth, sync,
  uploads, AI, reports); 429 + `Retry-After` on exceed.

---

## 🛠️ Technology Stack

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 18, Vite, TypeScript 5.x |
| Styling | Tailwind CSS |
| Routing | React Router DOM v7 |
| State | React Context API |
| Offline Storage | `localforage` (IndexedDB) |
| Auth | Clerk React (`@clerk/clerk-react`) |
| Database Client | Supabase JS (`@supabase/supabase-js`) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Charts | Recharts |
| PDF Generation | jsPDF + jsPDF-AutoTable + html2canvas |
| Icons | Lucide React |

### Backend

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy 2.0 |
| Database Driver | psycopg2-binary (PostgreSQL) |
| Validation | Pydantic v2 |
| Auth | Clerk JWT verification (python-jose) |
| Image Storage | Cloudinary Python SDK |
| Email | Resend API |
| PDF Reports | ReportLab |
| Vision SDK | Roboflow Inference SDK (`inference-sdk`) |
| LLM (Chat) | Muse Glimmer 30 (preferred), Groq fallback |
| LLM (Triage) | Local Ollama (Llama 3, `localhost:11434`) |

### Infrastructure

| Service | Provider |
|---------|---------|
| Database | Neon Serverless PostgreSQL / Supabase PostgreSQL |
| Authentication | Clerk (JWT, OAuth, JWKS) |
| Image Storage | Cloudinary |
| Frontend Hosting | Vercel |
| Backend Hosting | Render (see `render.yaml`) |
| Push Notifications | Firebase Cloud Messaging |

---

## 📂 Repository Structure

```text
PAWPHILE/
├── frontend/                   # React 18 + Vite + TypeScript PWA
│   ├── src/
│   │   ├── components/         # Layout, UI, Chat, PAWNEWS components
│   │   ├── context/            # Data, theme, personalization contexts
│   │   ├── pages/              # Route-level page components
│   │   ├── services/           # API clients, sync, chat engine
│   │   └── utils/              # Helpers and rule engines
│   ├── public/
│   │   ├── pawphile-logo.png   # PAWPHILE brand logo (canonical)
│   │   └── firebase-messaging-sw.js
│   ├── .env.example            # Public frontend variables only
│   └── package.json
├── backend/                    # FastAPI core service
│   ├── app/
│   │   ├── api/routes/         # API endpoints
│   │   ├── core/               # Config, security, rate limiting
│   │   ├── db/                 # Session management
│   │   ├── models/             # SQLAlchemy ORM models
│   │   └── services/           # PAW AI, vision, Cloudinary, workers
│   ├── migrations/             # Alembic database migrations
│   ├── tests/                  # Backend pytest suite
│   ├── .env.example            # Server-side variables only
│   └── requirements.txt
├── docs/                       # Capability and design documentation
├── render.yaml                 # Render deployment blueprint
└── README.md
```

---

## 📶 Offline First

All user writes are intercepted and saved to **IndexedDB** first, queued,
and synced differentially on reconnection (`updated_at` comparison
prevents overwrite conflicts). Designed for low-connectivity environments.

---

## 🚀 Installation

### Prerequisites

- Node.js v18+
- Python 3.12+
- Clerk account — [clerk.com](https://clerk.com)
- PostgreSQL (Neon/Supabase) — connection string for `DATABASE_URL`
- Cloudinary account — [cloudinary.com](https://cloudinary.com) (image uploads)
- Muse Glimmer credentials **or** Groq API key — [console.groq.com](https://console.groq.com)
- Roboflow account — [roboflow.com](https://roboflow.com) (Vision Scan)

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

### 3. Backend

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

---

## 🔐 Environment Variables

All real `.env` files are **gitignored**. Only sanitized `.env.example`
files are tracked. Example files contain placeholders only — never real
credentials.

### Frontend (`frontend/.env.example`) — public only

```env
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
VITE_API_BASE_URL=http://localhost:8001
```

### Backend (`backend/.env.example`) — server secrets only

```env
DATABASE_URL=
CLERK_SECRET_KEY=
CLERK_JWKS_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FRONTEND_ORIGIN=http://localhost:5173
PAW_AI_PROVIDER=auto
GROQ_API_KEY=
MUSE_GLIMMER_API_KEY=
MUSE_GLIMMER_BASE_URL=
MUSE_GLIMMER_MODEL=
ROBOFLOW_API_KEY=
```

> **Rule:** server credentials (`*_SECRET*`, `*_API_KEY` for server
> providers, `DATABASE_URL`) belong in Render environment variables and
> must never use the `VITE_*` prefix.

---

## 🔌 API Documentation

All backend requests to protected paths require a valid Clerk JWT in the
`Authorization: Bearer <token>` header. Interactive docs (non-production):
`http://localhost:8001/docs`.

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/paw-ai/chat` | Guardrailed LLM guidance (protected) |
| `POST` | `/api/paw-ai/triage` | Structured symptom triage (protected) |
| `POST` | `/api/paw-ai/food-safety` | Deterministic food-safety reference |
| `POST` | `/api/vision/scan` | Upload image → inference → save result |
| `GET` | `/api/vision/scans/{dog_id}` | Vision scan history for a dog |
| `GET` | `/api/pawnews/feed` | Curated pet-health news feed |
| `GET` | `/api/weather/alert` | Breed-aware weather risk alert |
| `POST` | `/api/reports/generate-pdf` | Generate PDF health summary |
| `GET`/`POST` | `/api/dogs` | Dog profile CRUD |

---

## 🧪 Testing

```bash
# Backend — pytest (from repo root, uses ./venv)
./venv/Scripts/python -m pytest backend/tests/ -q

# Frontend — TypeScript typecheck
cd frontend
npm run typecheck

# Frontend — build validation
npm run build

# Frontend — lint
npm run lint
```

---

## 📦 Deployment

| Service | Platform | Notes |
|---------|---------|-------|
| Frontend | Vercel (Edge CDN) | SPA rewrite; public `VITE_*` vars only |
| Core Backend API | Render | `render.yaml` blueprint; honors `$PORT`; health check `/health` |
| Database | Neon Serverless PostgreSQL | Supabase also connected |

---

## 🛡️ Security & Privacy

- **Authentication:** delegated to Clerk. Passwords never reach PAWPHILE servers.
- **Stateless authorization:** JWT validated on every backend request via JWKS; per-user ORM scoping.
- **Image privacy:** uploads go server-side via Cloudinary; the client never receives API credentials.
- **No tracking pixels.** No hidden data usage.
- **Secret management:** real `.env` files are gitignored. Only `.env.example` placeholders are tracked.
- **Responsible AI:** structural constraints prevent dosage recommendations and diagnostic claims.

---

## 🔭 Future Upgrades

> **Future / planned — not part of the current MVP.**

### 1. Longitudinal Timeline

Unified chronological health history across every record type.

### 2. Care Plan

Structured preventive and follow-up action planning.

### 3. Controlled Health Sharing

Owner-controlled sharing with scoped access and expiration.

### 4. Veterinary Collaboration

Clinic/veterinary review workflows on shared records.

### 5. Health Connections

External health-record and device integrations.

### 6. Organizations

Care-team and organizational relationships.

### 7. Vet Portal

Dedicated veterinary-side workflow.

### 8. Advanced Intelligence

Longitudinal baselines, evidence-linked trends, and eventually
validated predictive capabilities — validation before scaling.

> **Note:** a veterinary-discovery (clinic locator) capability was
> evaluated and **permanently removed** from the product. It is not on
> the roadmap. The product finds value in records, guidance, and
> visit preparation — not in maps.

---

## 🤝 Contributing

We welcome contributions from full-stack engineers, ML researchers, and
veterinary professionals.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for code of conduct and
submission guidelines.

---

<div align="center">

<img src="frontend/public/pawphile-logo.png" alt="PAWPHILE" width="100" />

<br/>

*Built for dogs. Designed for the people who love them.*

**PAWPHILE &nbsp;·&nbsp; .Know Them Better &nbsp;·&nbsp; .Care Them Better**

</div>
