# Phase 9: Architecture Hardening & Reliability Updates

## 1. Exact Files Changed
- `frontend/src/lib/storage.ts` (Complete replacement with IDB adapter)
- `frontend/src/services/SyncManager.tsx` (IDB integration, Service Worker Sync hook)
- `backend/app/services/paw_ai_engine.py` (Added Async streaming via Ollama REST API)
- `backend/app/api/routes/paw_ai.py` (Added `POST /stream` endpoint)
- `backend/app/api/routes/reminders.py` (Smart urgency, deduplication, safe Resend fallback)
- `backend/app/api/routes/pawnews.py` (Created normalized feed API with URL HEAD validation)
- `backend/app/main.py` (Registered pawnews router)
- `backend/app/services/report_service.py` (Added ReportLab PDF generator `generate_pdf_from_json`)
- `backend/app/api/routes/reports.py` (Added `POST /generate-pdf`)
- `backend/supabase_schema.sql` (Updated `reminder_events`, added PostGIS `vet_clinics`)
- `backend/.env.example` (Added required external APIs)

## 2. Fragile Systems Removed
- **Synchronous Subprocess LLM:** Replaced blocking Python `subprocess` with `httpx.AsyncClient().stream` for streaming tokens.
- **Client-Side PDF Fragility:** Replaced complex client HTML-to-canvas PDF logic with a robust, backend ReportLab JSON-to-PDF architecture.
- **Blanket Reminder Limits:** Removed the arbitrary "1 per week" cap that blocked critical emergency alerts.
- **Blind LocalStorage Scaling:** Migrated large clinical queue states off synchronous `localStorage` using `localforage` (IndexedDB).

## 3. Adapter Layers Added
- **`src/lib/storage.ts` (Typed Offline Storage Adapter):** Implements `loadFromStorageAsync` and `saveToStorageAsync` using `localforage`, safely dual-reading `localStorage` during initial rollout to prevent data loss.
- **Service Worker Hooks:** `SyncManager` now registers `'pawphile-sync'` Background Sync events for offline retries when connection is restored.

## 4. Supabase Schema Updates
- **`reminder_events` (Audit Log):** Added `urgency_level` (critical/high/medium/low), `event_type`, `cooldown_until`, `provider_message_id`.
- **`vet_clinics` (PostGIS):** Added `CREATE EXTENSION postgis`, `location geography(POINT, 4326)`, and `GIST` indexing for true geospatial radius searches.

## 5. Reminder Rule Changes & Resend Behavior Proof
- **Urgency Matrix:**
  - **Critical:** NO cooldown. (e.g. Toxic food ingested).
  - **High:** 1-day cooldown. (e.g. Vaccine due today).
  - **Medium/Low:** 7-day cooldown.
- **Fallback Proof:** If `RESEND_API_KEY` is omitted from `.env`, the backend skips Resend dispatch entirely and logs `failed_missing_config` in Supabase without throwing 500 errors to the client.

## 6. PAWNEWS Reliability & Validation
- **Endpoint:** `GET /api/pawnews/feed?feed=local|global|guide&zone=chennai`
- **Validation Engine:** Built-in `httpx.head` checks. If a URL returns >= 400, it marks `urlStatus: "broken"`, preventing the frontend from showing fake Read More buttons.
- **Seeds Added:** Internal GCC Rabies Camp (Local) & Heatstroke Brachycephalic Guide (Guide).

## 7. Command Outputs
**Frontend Compilation Check (Vite & TSC):**
```text
> npx tsc --noEmit && npm run lint && npm run build
✓ 2759 modules transformed.
dist/index.html                        0.71 kB
dist/assets/index.es-1t2s_TY_.js     150.69 kB
dist/assets/index-B2TBLaUv.js      2,040.40 kB
✓ built in 21.46s
Exit code: 0
```
**Backend Safety Regression Tests:**
```text
> python run_safety_tests.py
All guardrails passed (0 Type Errors). Deterministic toxic food/emergency blocks remained fully active.
```

## 8. Remaining Mocks & Risks
- **Admin Panel UI:** The backend routes are established, but the physical `/admin/pawnews` React routes do not exist yet.
- **Legacy Storage Fallbacks:** We must NOT delete the synchronous `loadFromStorage` functions yet. React Contexts currently rely on them for initial synchronous hydration.
- **Mock Feed APIs:** `pawnews.py` currently uses static dict seeds instead of actively calling Guardian/GNews APIs (which require keys).

## 9. Exact Next Fixes
1. Wire the frontend `PawAiCenter.tsx` to consume the new `text/event-stream` endpoint.
2. Build the physical React UI for the Admin Panel (`/admin`).
3. Deploy the updated `supabase_schema.sql` to the production Neon/Supabase instance.
