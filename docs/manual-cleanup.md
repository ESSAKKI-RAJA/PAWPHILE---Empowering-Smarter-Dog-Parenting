# Manual Cleanup Guide

## Docker Desktop

Docker Desktop is **not required** for PAWPHILE local development anymore.

All services run natively:
- **Frontend**: `npm run dev` (Node.js)
- **Backend**: `uvicorn app.main:app` (Python)
- **Vision**: `uvicorn app.main:app` (Python)

### To uninstall Docker Desktop on Windows (optional):
1. Open **Settings** → **Apps** → **Installed Apps**
2. Search for **Docker Desktop**
3. Click **Uninstall**

> ⚠️ Do NOT delete shared Docker volumes or networks if other projects on your machine still use Docker.

---

## Remaining Manual Steps

### 1. Fill in .env files
Copy each `.env.example` and add real keys:
```
frontend/.env       ← VITE_CLERK_PUBLISHABLE_KEY
backend/.env        ← DATABASE_URL, CLERK_SECRET_KEY, CLERK_JWKS_URL, CLOUDINARY_*, FRONTEND_ORIGIN
vision/.env         ← VISION_MODEL_PATH, VISION_API_HOST, VISION_API_PORT
```

### 2. Run Database Migrations
After setting `DATABASE_URL` in `backend/.env`:
```bash
cd backend
alembic init migrations       # only first time
alembic revision --autogenerate -m "initial"
alembic upgrade head
```
Or paste `migrations/schema.sql` directly into the Neon SQL console.

### 3. Clerk Webhook (optional for production)
Set up a Clerk webhook → `POST /api/users/sync` to auto-sync new users.

### 4. Cloudinary Upload Preset (optional)
For direct frontend uploads (future), create an unsigned upload preset in Cloudinary dashboard.
Current architecture: all uploads go through the backend (recommended for security).
