# PAWPHILE

**India-first AI preventive healthcare companion for dog owners.**

> PAWPHILE is NOT a diagnosis tool. It is NOT a prescription tool. It does NOT replace a veterinarian.  
> It is a **decision-support and owner-education tool**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Auth | Clerk |
| Database | Neon PostgreSQL |
| Image Storage | Cloudinary (backend-only) |
| Backend API | FastAPI (Python) |
| Vision AI | FastAPI (Python) |

> **No Supabase. No Docker required for local development.**

---

## Folder Structure

```
PAWPHILE/
├── frontend/          # React + Vite + TypeScript app
├── backend/           # FastAPI + SQLAlchemy + Neon API
├── vision/            # FastAPI Vision AI inference service
├── docs/              # Architecture, API, setup, migration docs
├── archive/           # Archived old Supabase/Docker configs
└── README.md
```

---

## Environment Setup

Copy each `.env.example` and fill in your real values:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp vision/.env.example vision/.env
```

---

## Run Commands

### Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
# http://localhost:8001/docs
```

### Vision Service
```bash
cd vision
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# http://localhost:8000/docs
```

---

## Key URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API Docs | http://localhost:8001/docs |
| Backend ReDoc | http://localhost:8001/redoc |
| Vision API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8001/health |

---

## Docs

- [Setup Guide](docs/setup.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Migration Notes](docs/migration-notes.md)
- [Cleanup Report](docs/cleanup-report.md)
- [Manual Cleanup Guide](docs/manual-cleanup.md)
