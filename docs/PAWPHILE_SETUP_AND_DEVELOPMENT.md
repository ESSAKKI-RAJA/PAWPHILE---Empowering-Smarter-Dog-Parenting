# Setup Guide

## Prerequisites
- Node.js 18+
- Python 3.10+
- A Clerk account (https://clerk.com)
- A Neon PostgreSQL account (https://neon.tech)
- A Cloudinary account (https://cloudinary.com)

## 1. Clerk Setup
1. Create a new Clerk application.
2. Copy the Publishable Key → `frontend/.env` → `VITE_CLERK_PUBLISHABLE_KEY`
3. Copy the Secret Key → `backend/.env` → `CLERK_SECRET_KEY`
4. Copy the JWKS URL from Clerk Dashboard → `backend/.env` → `CLERK_JWKS_URL`
   - Format: `https://<your-clerk-domain>/.well-known/jwks.json`

## 2. Neon Setup
1. Create a Neon project.
2. Copy the connection string → `backend/.env` → `DATABASE_URL`
   - Format: `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`
3. Run the schema: `backend/migrations/schema.sql` in the Neon SQL editor.

## 3. Cloudinary Setup
1. Create a Cloudinary account.
2. Copy Cloud Name, API Key, API Secret → `backend/.env`

## 4. Run migrations (Alembic)
```bash
cd backend
alembic init migrations
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

## 5. Start all services
```bash
# Terminal 1 — Frontend
cd frontend && npm install && npm run dev

# Terminal 2 — Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3 — Vision
cd vision && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
