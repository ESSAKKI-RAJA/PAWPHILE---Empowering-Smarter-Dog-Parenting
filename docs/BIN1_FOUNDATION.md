# PAWPHILE BIN1 — Foundation (Longitudinal Health Record + Care Management)

Status: COMPLETE. Backend: 22 tests pass. Frontend: `tsc --noEmit` clean, `vite build` succeeds, `eslint` 0 errors.

## 1. What BIN1 establishes

Reliable data foundation before any BIN2 intelligence. Flow:

CAPTURE → STRUCTURE → STORE → VERIFY → TIMELINE → REMEMBER → SHARE → CORRECT → EXPORT

## 2. Architecture (modular monolith, Python-first)

- `backend/app/main.py` — FastAPI 2.0.0; legacy `/api/*` preserved for compatibility; canonical `/api/v1/*` in `app/api/routes/foundation.py`; worker ops in `app/api/routes/worker.py`.
- Middleware (in order): `RequestIDMiddleware` (`app/core/observability.py`) → `RateLimitMiddleware` (`app/core/rate_limit.py`) → CORS → routes.
- `backend/app/core/ownership.py` — `user → pet → resource` enforcement (404, never leaks existence).
- `backend/app/core/audit.py` — WHO/DID WHAT/TO WHICH/WHEN; no sensitive payloads.
- `backend/app/core/security.py` — Clerk JWKS auth (`get_current_user`) + `get_optional_user` (None instead of raising; used by worker endpoints).
- `backend/app/models/all_models.py` — `DogProfile` is canonical pet (`species`, `sex`, `date_of_birth`, `profile_image_ref`, `is_archived`); `medical_history` column/relationship collision fixed (ORM rename, same DB column — no data loss).
- `backend/app/models/foundation_models.py` — 22 canonical tables (see §3).
- `backend/app/schemas/foundation_schemas.py` — backend validation (ranges, enums, MIME, sizes).
- Migrations (linear, single head): `8931a6352851` (base) → `b1n1f0und4t10n` (foundation) → `c2r0nw0rk3r1` (`notifications.processing_lock`).

## 3. Canonical data model

- Envelope: `health_events` (`event_type`, `source`, `actor`, `effective_at` vs `recorded_at`, `verification_status`, `ref_table`/`ref_id`, `corrects_event_id`, archive).
- Clinical: `symptoms`, `medications` (version-guarded), `allergies`, `procedures`, `lab_results`, `imaging_studies`, `observations` (+ `vaccine_records`, `deworming_records`, `medical_history`, `vet_visit_summaries`, `symptom_triage_sessions` — completed CRUD).
- Tracking: `weight_measurements`, `activity_records`, `nutrition_entries`, `behavior_entries`.
- Team: `veterinarians`, `clinics` (minimal BIN1 structure for future vet collaboration).
- Files: `health_files` (private metadata; MIME allow-list, 15MB cap, internal refs only — never public URLs).
- Reports: `report_records` (DRAFT → GENERATING → READY|FAILED, reproducible source counts).
- Sharing: `share_grants` (FULL_RECORD|REPORT_ONLY|SELECTED, expiry, revoke, access logging; no anonymous public links).
- Reminders/notifications: `reminder_v1` (SCHEDULED|COMPLETED|DISMISSED|CANCELLED, version-guarded) + `notifications` (SCHEDULED|QUEUED|SENT|FAILED|SKIPPED + `processing_lock` claim token).
- Privacy: `consent_records` (GRANTED|DENIED|WITHDRAWN per purpose).
- Sync: `sync_operations` (unique `(user_id, client_operation_id)` idempotency ledger).
- AI: `ai_analysis_records` — provenance ledger only (no prediction in BIN1).

## 4. API v1

- Auth: Clerk JWT on every route except `GET /sync/health`. Ownership checked server-side on every pet resource.
- Errors: 404 for not-owned (no leakage), 409 on version/idempotency conflicts, 422 on validation, 410 on revoked/expired shares, 429 with `Retry-After` on rate exceed, 500 generic + `request_id` (no internals).
- Pagination: `?limit=&offset=` (defaults 50, max 200); timeline default 100. Timestamps ISO-8601; IDs stable UUIDs.
- Key routes: `/pets/{id}/health-events`, `/symptoms`, `/medications`, `/visits`, `/measurements/weight|activity`, `/nutrition`, `/behavior`, `/labs`, `/imaging`, `/allergies`, `/procedures`, `/observations`, `/timeline`, `/files`, `/reports[/{rid}/generate]`, `/shares[/{sid}/revoke|view]`, `/reminders`, `/reminders/process-due`, `/worker/reminders/sweep`, `/worker/deliver`, `/worker/delivery-config`, `/worker/retention/preview|run`, `/consent`, `/audit`, `/export`, `/completeness`, `/sync/operations`, `/care-team/*`, `/sync/health`.

## 5. HealthEvent

Canonical envelope: `event_type` (allow-listed), `source` (owner|vet|clinic|import|system|device|ai|other), `actor`, `effective_at` (when it happened) vs `recorded_at` (when entered), `verification_status`, `ref_table`/`ref_id` provenance pointer, `corrects_event_id` chain, archive (never silent rewrite). Every clinical write creates an envelope row.

## 6. Timeline

Single canonical `GET /pets/{id}/timeline` (type + date-range filters), chronological, envelope-first with legacy backfill (vaccines, triage) on the unfiltered first page. Frontend `/timeline` page with loading/empty/error/offline states and filters.

## 7. CRUD

Full create/read/list/filter/update/archive for all §3 entities (visits also support delete with audit). Optimistic concurrency (`version`) on symptoms/medications/reminders → 409 with server state; clinical history prefers archive/correction over hard delete.

## 8. Sync

Client generates `client_operation_id` (UUID) per operation → `POST /api/v1/pets/{id}/sync/operations` → server checks ledger first (duplicate retry returns original ACK, zero duplicates) → validates/authorizes → transacts → ACKs. Supported: symptom, medication, weight, activity, nutrition, behavior, observation, health_event, vet_visit, reminder, vaccine, deworming. Frontend `services/syncQueue.ts` (IndexedDB, exp backoff, pending/syncing/acked/failed/conflict); `PawphileDataContext` writers enqueue best-effort; `SyncManager` flushes the op queue (bulk Supabase path deprecated); UI shows Pending until ACK (`DataStates`).

## 9. Idempotency

Unique `(user_id, client_operation_id)` + race-safe re-read on `IntegrityError`. Retried operation → same `entity_id`, one row.

## 10. Conflict semantics

Explicit 409 (never blind last-write-wins): version-guarded updates, sync races, in-progress report generation. Logged with IDs only (`version_conflict`, `sync_conflict`).

## 11. File handling

Bytes via server-mediated `/api/uploads/image` (Cloudinary secret server-side); `/api/v1/pets/{id}/files` registers private metadata (MIME allow-list jpeg/png/webp/pdf/txt, 15MB cap, `storage_ref` must be internal — `..`/http rejected). Reads require ownership; no public URLs. Direct Supabase Storage helpers are deprecated and unimported.

## 12. Reports

DRAFT → GENERATING → READY|FAILED, reproducible `source_summary` counts + digest, 409 if already generating, failures logged + marked FAILED (never fabricated READY). Frontend Reports page: server-verified section (READY-gated) above the labeled on-device printable view.

## 13. Sharing

Scoped (FULL_RECORD|REPORT_ONLY|SELECTED), lazy expiry on list, revoke, owner-mediated views with `access_count` logging, 410 after revoke/expiry, no anonymous links. Frontend `/share` page.

## 14. Reminders

Server-authoritative per-pet records + version-guarded updates. Frontend Care Plan (`/care-plan`) waits for server ACK; Preventive Care reminders tab is labeled as on-device estimates pointing at Care Plan.

## 15. Notification delivery

Worker: `POST /api/v1/worker/reminders/sweep` (due → promote SCHEDULED→QUEUED / create QUEUED, exactly-one) → `POST /api/v1/worker/deliver` (atomic `processing_lock` claim, dispatch via configured SMTP/Resend, record SENT|FAILED|SKIPPED with reason; stale-lock reclaim; bounded retries via `WORKER_MAX_ATTEMPTS`; `retry_failed` re-queues). Unconfigured provider → truthful FAILED (`failed_missing_config`), never fake SENT. `GET /api/v1/worker/delivery-config` reports readiness without secrets. Scheduler auth: `X-Cron-Token` (timing-safe compare) → global scope, else caller JWT → own scope, else 401. Deployment: run sweep+deliver on a cron (e.g. every 5–15 min) with `WORKER_CRON_TOKEN` set.

## 16. Rate limiting

In-memory sliding-window (`app/core/rate_limit.py`, no external service): per-minute budgets for auth (20), sync/worker/upload/report (60), default (120), 60s window — all env-configurable (`RATE_LIMIT_*`), `/health|/docs|/openapi` exempt, 429 JSON + `Retry-After`, per-user (token hash) else per-IP keys, memory-bounded. Verified: burst → 429 + header; exempt stays 200; disabled → pass-through.

## 17. Retention

`app/services/retention_service.py` + `POST /api/v1/worker/retention/run?dry_run=` (default safe) with `preview` counts. Purges ONLY: terminal notifications, ACKED/REJECTED sync ops, REVOKED/EXPIRED shares (audit entry preserved) — each behind `RETENTION_*_DAYS` thresholds. Health events/records/files/reports/reminders/consent are NEVER auto-deleted; audit retained forever unless `RETENTION_AUDIT_DAYS > 0` is explicitly set. Idempotent re-runs delete zero. Assumption documented: no user-facing deletion promise — operational hygiene only.

## 18. Consent

Per-purpose records (care_reminders|ai_analysis|sharing) with GRANTED|DENIED|WITHDRAWN; frontend Consent Center requires online + server ACK; offline shows truthful blocked state.

## 19. Audit

`audit_logs` for create/update/archive/delete/share/revoke/file/report/export/consent/sync/retention events (IDs only); per-pet listing for owners; cross-user reads 404.

## 20. Export

Owner-only structured JSON of the pet subtree (`GET /pets/{id}/export`); recursion-safe dump (`c.key` + type guards); frontend Export page downloads the server payload. Unauthorized users get 404.

## 21. Security

Server-side `user → pet → resource` on every resource; 404 (not 403) to avoid existence leakage; validation allow-lists; safe 500s with request IDs; secrets from env, never in responses/logs; health data never logged (IDs/counts/statuses only); email domains only in delivery logs; cron token timing-safe.

## 22. Environment configuration

See `backend/.env.example` (all knobs documented). Required to boot: `DATABASE_URL`. Required for delivery: `RESEND_API_KEY` or `SMTP_HOST/USER/PASSWORD` (`DELIVERY_PROVIDER` auto|smtp|resend|disabled). Optional: `WORKER_CRON_TOKEN` (unset → user-auth-only worker scope), `RATE_LIMIT_*`, `WORKER_*`, `RETENTION_*_DAYS`, `LOG_LEVEL`, `ENVIRONMENT`. Missing delivery config fails truthfully at send time (FAILED/SKIPPED + reason), never fake success.

## 23. Worker processes

No in-app scheduler (keeps the monolith simple; no Redis/Celery introduced). Operate via external cron hitting, with `X-Cron-Token`:
`POST /api/v1/worker/reminders/sweep` → `POST /api/v1/worker/deliver?retry_failed=true` → (nightly) `POST /api/v1/worker/retention/run?dry_run=false`. All endpoints are idempotent and safe under duplicate invocation/restart.

## 24. Migration procedure

```bash
cd backend
alembic upgrade head            # applies 8931a6352851 → b1n1f0und4t10n → c2r0nw0rk3r1
alembic current                 # expect c2r0nw0rk3r1 (head)
alembic downgrade -1            # rollback verified (worker rev reversible)
alembic upgrade head            # re-upgrade verified
```
All migrations non-destructive (new tables/nullable columns only); existing rows preserved (test-verified).

## 25. Testing procedure

```bash
# backend (22 tests)
venv/Scripts/python -m pytest backend/tests/ -v
# frontend
cd frontend && npx tsc --noEmit && npm run build && npm run lint
```
Suites: `test_foundation.py` (11: isolation, CRUD, validation, 409s, timeline, sync idempotency, files, reports, sharing, reminders, consent/export/audit, deworming/triage/settings), `test_health.py` (1), `test_migrations.py` (3: chain linearity, fresh-install schema, downgrade/re-upgrade + preservation), `test_production.py` (7: rate-limit 429/Retry-After/exempt/disabled, worker auth, sweep idempotency, truthful failed delivery + exactly-once success, stale-lock reclaim, max-attempts bound, no-email skip, retention dry-run/apply/idempotency/protection).

## 26. Production deployment procedure

1. Set env per §22 (notably `DATABASE_URL`, Clerk keys, `FRONTEND_ORIGIN`, delivery provider, `WORKER_CRON_TOKEN`, cron schedule).
2. `alembic upgrade head`; verify `alembic current`.
3. Start API (`uvicorn app.main:app`); verify `/health` (exempt from rate limits).
4. Configure cron for sweep/deliver/retention with `X-Cron-Token`.
5. Verify `/api/v1/worker/delivery-config` (expect `available: true` once provider configured).

## 27. Capability ledger (honest states)

- IMPLEMENTED: everything in §2–§21.
- CONFIGURATION REQUIRED: actual email delivery (needs RESEND_API_KEY or SMTP_*), cron scheduling (needs WORKER_CRON_TOKEN + external scheduler).
- ENVIRONMENT DEPENDENT: vision scans (Roboflow key), weather/vet-locator/pawnews externals (unchanged legacy behavior).
- DEPRECATED (compat only, unimported by production flows): `syncService.SyncService` bulk sync, Supabase-direct `reportService/reminderService/dogService/healthLogService/storageService`, legacy `apiClient.saveReminderPreferences/testReminderEmail/uploadPdfReport`, legacy mock-flagged `/api/reports/upload` + `/api/reminders/send-due`.
- MOCK / DEMO: none on any primary production path.

## 28. BIN2 readiness

Ready: every fact has effective/recorded time + provenance + verification; one timeline; consistent measurements; private file refs; reproducible reports; exactly-once sync ledger; audit trail; lineage hook (`ai_analysis_records`). No predictive models added (by design).
