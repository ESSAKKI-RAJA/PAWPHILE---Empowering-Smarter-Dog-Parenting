# PAWPHILE Environment Reference

This document maps all environment variables used across the PAWPHILE system based on actual repository configurations.

> [!WARNING]
> This document deliberately omits any real secret values. Do not commit actual secrets to the repository.

## Backend Environment Variables

Located in: `backend/.env` (Ignored by Git, `.env.example` tracked)

| Variable | Purpose | Service | Used By | Local / Prod | Public / Secret | Required? | Status |
|----------|---------|---------|---------|--------------|-----------------|-----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | Database | `core/config.py` | Both | Secret | **Yes** | [CONFIGURED] |
| `CLERK_SECRET_KEY` | Clerk Auth verification | Auth | `core/config.py` | Both | Secret | **Yes** | [CONFIGURED] |
| `CLERK_JWKS_URL` | Clerk JSON Web Key Set URL | Auth | `core/config.py` | Both | Public | **Yes** | [CONFIGURED] |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary instance name | Storage | `core/config.py` | Both | Public | **Yes** | [CONFIGURED] |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Storage | `core/config.py` | Both | Secret | **Yes** | [CONFIGURED] |
| `CLOUDINARY_API_SECRET` | Cloudinary Secret | Storage | `core/config.py` | Both | Secret | **Yes** | [CONFIGURED] |
| `FRONTEND_ORIGIN` | CORS allowed origin | Security | `main.py` | Both | Public | **Yes** | [CONFIGURED] |
| `VISION_API_URL` | Local vision API stub | Vision | `core/config.py` | Local | Public | No | [OBSOLETE] |
| `RESEND_API_KEY` | Email delivery | Notifications| `core/config.py` | Both | Secret | No | [CONFIGURED] |
| `GROQ_API_KEY` | LLM inference (Llama3) | PAW AI | `paw_ai.py` | Both | Secret | **Yes** | [CONFIGURED] |
| `GUARDIAN_API_KEY` | News feed | PAWNEWS | `pawnews.py` | Both | Secret | No | [CONFIGURED] |
| `GNEWS_API_KEY` | News feed | PAWNEWS | `pawnews.py` | Both | Secret | No | [CONFIGURED] |
| `NEWSDATA_API_KEY` | News feed | PAWNEWS | `pawnews.py` | Both | Secret | No | [CONFIGURED] |
| `SUPABASE_URL` | Supabase instance URL | DB/Storage| `supabaseClient` | Both | Public | **Yes** | [CONFIGURED] |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase admin key | DB/Storage| `supabaseClient` | Both | Secret | **Yes** | [CONFIGURED] |
| `SUPABASE_ANON_KEY` | Supabase anon key | Auth bridge| `supabaseClient` | Both | Public | **Yes** | [CONFIGURED] |
| `ROBOFLOW_API_KEY` | Vision workflow API | Vision | `vision_service.py`| Both | Secret | **Yes** | [CONFIGURED] |

## Frontend Environment Variables

Located in: `frontend/.env` (Ignored by Git, `.env.example` tracked)

| Variable | Purpose | Service | Used By | Local / Prod | Public / Secret | Required? | Status |
|----------|---------|---------|---------|--------------|-----------------|-----------|--------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Auth frontend | Auth | `main.tsx` | Both | Public | **Yes** | [CONFIGURED] |
| `VITE_SUPABASE_URL` | Supabase instance URL | DB/Storage| `supabaseClient` | Both | Public | **Yes** | [CONFIGURED] |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Auth bridge| `supabaseClient` | Both | Public | **Yes** | [CONFIGURED] |
| `VITE_FIREBASE_API_KEY` | FCM Push Notifications | Firebase | `firebase.ts` | Both | Public | No | [CONFIGURED] |
| `VITE_FIREBASE_AUTH_DOMAIN` | FCM Push Notifications | Firebase | `firebase.ts` | Both | Public | No | [CONFIGURED] |
| `VITE_FIREBASE_PROJECT_ID` | FCM Push Notifications | Firebase | `firebase.ts` | Both | Public | No | [CONFIGURED] |
| `VITE_FIREBASE_STORAGE_BUCKET`| FCM Push Notifications | Firebase | `firebase.ts` | Both | Public | No | [CONFIGURED] |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| FCM Push Notifications | Firebase | `firebase.ts` | Both | Public | No | [CONFIGURED] |
| `VITE_FIREBASE_APP_ID` | FCM Push Notifications | Firebase | `firebase.ts` | Both | Public | No | [CONFIGURED] |
| `VITE_FIREBASE_VAPID_KEY` | FCM Push Notifications | Firebase | `firebase.ts` | Both | Public | No | [CONFIGURED] |
| `VITE_API_BASE_URL` | Backend FastAPI URL | API Client| `apiClient.ts` | Both | Public | **Yes** | [CONFIGURED] |
| `OLLAMA_URL` | Local AI inference | PAW AI | `chatEngine.ts` | Local | Public | No | [OBSOLETE] |

## Production Deployment Context

- **Vercel (Frontend)**: Requires all `VITE_*` variables to be set in the Vercel Dashboard.
- **Render (Backend)**: Requires all backend variables (except those explicitly marked optional) to be set in the Render Dashboard. `DATABASE_URL` is typically provided by the attached PostgreSQL instance or Supabase connection string.

## Security Note
All actual backend secrets (e.g., `ROBOFLOW_API_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`) are isolated from the frontend and do not use the `VITE_` prefix.
