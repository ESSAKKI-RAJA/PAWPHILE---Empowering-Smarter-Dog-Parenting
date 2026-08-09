# PAWPHILE API Reference

This document maps all backend API routes in the PAWPHILE FastAPI application (`backend/app/main.py`) based on the repository's current structure.

## Authentication & Authorization
All protected endpoints require a Clerk JWT passed in the `Authorization: Bearer <token>` header. The backend verifies this using `python-jose` against the `CLERK_JWKS_URL`.

## API Inventory

### Health & System
| Method | Path | Function | Auth Required | Output | Frontend Caller | Status |
|--------|------|----------|---------------|--------|-----------------|--------|
| GET | `/health` | `health_check` | No | `{"status": "ok", "service": "pawphile-backend", "version": "2.0.0"}` | Deployment checks | [IMPLEMENTED] |

### Auth (`/api`)
| Method | Path | Purpose | Input | Output | Frontend Caller | Status |
|--------|------|---------|-------|--------|-----------------|--------|
| POST | `/api/sync-user` | Syncs Clerk user with Supabase profiles | Clerk Webhook payload | Profile record | Clerk Webhook | [IMPLEMENTED] |

### Users (`/api/users`)
| Method | Path | Purpose | Input | Output | Frontend Caller | Status |
|--------|------|---------|-------|--------|-----------------|--------|
| GET | `/api/users/me` | Fetch current user profile | Header | Profile record | `Auth.tsx`, `Profile.tsx` | [IMPLEMENTED] |
| PUT | `/api/users/me` | Update user profile | Profile schema | Profile record | `Profile.tsx`, `Settings.tsx`| [IMPLEMENTED] |

### Dogs (`/api/dogs`)
| Method | Path | Purpose | Input | Output | Frontend Caller | Status |
|--------|------|---------|-------|--------|-----------------|--------|
| GET | `/api/dogs` | List all dogs for user | - | List[DogProfile] | `Dashboard.tsx` | [IMPLEMENTED] |
| POST | `/api/dogs` | Create new dog profile | Dog schema | DogProfile | `Profile.tsx` | [IMPLEMENTED] |
| GET | `/api/dogs/{id}` | Get specific dog | Path param | DogProfile | Various contexts | [IMPLEMENTED] |
| PUT | `/api/dogs/{id}` | Update dog profile | Partial dog schema| DogProfile | `Profile.tsx` | [IMPLEMENTED] |
| DELETE | `/api/dogs/{id}` | Delete dog profile | Path param | Success message | `Profile.tsx` | [IMPLEMENTED] |

### PAW AI (`/api/paw-ai`)
| Method | Path | Purpose | Input | Output | Frontend Caller | Status |
|--------|------|---------|-------|--------|-----------------|--------|
| POST | `/api/paw-ai/chat` | AI Chat inference | `GroqChatRequest` | JSON response | `chatEngine.ts` | [IMPLEMENTED] |
| POST | `/api/paw-ai/stream` | Async streaming chat | `ChatRequest` | SSE Stream | `chatEngine.ts` | [IMPLEMENTED] |
| POST | `/api/paw-ai/triage` | Structured symptom triage| `TriageRequest` | JSON triage assessment| `triageService.ts` | [IMPLEMENTED] |
| POST | `/api/paw-ai/food-safety`| Food safety check | `FoodSafetyRequest`| JSON safety assessment | `FoodSafety.tsx` | [IMPLEMENTED] |
| GET | `/api/paw-ai/breed-context/{breed}` | Fetch breed intelligence | Path param | JSON breed context | `PawphileDataContext` | [IMPLEMENTED] |
| POST | `/api/paw-ai/vet-report` | Generate vet summary | `VetReportRequest`| JSON structured report | `VetRecords.tsx` | [IMPLEMENTED] |

### Vision (`/api/vision`)
| Method | Path | Purpose | Input | Output | Frontend Caller | Status |
|--------|------|---------|-------|--------|-----------------|--------|
| POST | `/api/vision/scan` | Roboflow vision scan | Form-data (Image) | `VisionScreeningResult`| `VisionScan.tsx` | [IMPLEMENTED] |

### PawNews (`/api/pawnews`)
| Method | Path | Purpose | Input | Output | Frontend Caller | Status |
|--------|------|---------|-------|--------|-----------------|--------|
| GET | `/api/pawnews/feed` | Fetch aggregated news | Query params | List[NewsArticle] | `PawNews.tsx` | [IMPLEMENTED] |

### Vet Clinics (`/api/vet-clinics`)
| Method | Path | Purpose | Input | Output | Frontend Caller | Status |
|--------|------|---------|-------|--------|-----------------|--------|
| GET | `/api/vet-clinics/search`| Search vets via PostGIS | Lat, Lng, Radius | List[VetClinic] | `VetFinder.tsx` | [IMPLEMENTED] |

### Stubs & Future Modules (Present in Router, Not fully fleshed out)
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET/POST | `/api/triage/*` | Separate triage flows | [STUBBED] (Logic routed through `/api/paw-ai/triage`) |
| GET/POST | `/api/reports/*` | Report generation | [PARTIAL] (Generates PDF, lacks robust data fetching) |
| GET/POST | `/api/reminders/*` | Reminder management | [STUBBED] (Missing Cron/Scheduler) |
| GET/POST | `/api/settings/*` | User settings management| [STUBBED] |
| GET/POST | `/api/weather/*` | Weather alerts | [STUBBED] |
| GET/POST | `/api/dogs/{id}/vaccines` | Vaccine logs | [IMPLEMENTED] (Basic CRUD) |
| GET/POST | `/api/dogs/{id}/medical_history`| Med history logs | [IMPLEMENTED] (Basic CRUD) |
| GET/POST | `/api/dogs/{id}/deworming`| Deworming logs | [STUBBED] |
| POST | `/api/uploads/*` | Cloudinary uploads | [IMPLEMENTED] (via `cloudinary_service.py`) |

## Data Flow for AI and Vision Endpoints
1. **Frontend Call**: Client dispatches a request (e.g., `POST /api/vision/scan`) with an Authorization header.
2. **Backend Auth**: FastAPI dependency `get_current_user` decodes the Clerk JWT.
3. **Backend Service**: Request is routed to `app.services.vision_service.run_vision_scan()`.
4. **External API**: Backend securely calls Roboflow (using `ROBOFLOW_API_KEY`).
5. **Backend Processing**: Roboflow response is parsed into standard `VisionScreeningResult`.
6. **Response**: FastAPI returns JSON to the frontend.
