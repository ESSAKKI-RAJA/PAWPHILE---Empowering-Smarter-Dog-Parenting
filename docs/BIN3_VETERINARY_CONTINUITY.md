# PAWPHILE BIN3 — Veterinary Continuity & Collaboration

Status: COMPLETE. Backend: 70 tests pass (22 BIN1 + 25 BIN2 + 23 BIN3).
Frontend: `tsc --noEmit` clean, `vite build` succeeds, `eslint` 0 errors.

BIN1 gave PAWPHILE a reliable memory. BIN2 gave that memory intelligence.
BIN3 closes the loop:

Owner → Record → Analyze → Prepare → Review → Share → Veterinarian →
Feedback → Follow-up → Owner → New health event → Timeline → New intelligence

## 1. Objective

A secure continuity layer between the owner's longitudinal record and the
veterinarian's care process. Owner-controlled, minimum-necessary,
review-before-share, provenance-preserving. Not a clinic ERP, marketplace,
billing system, or diagnostic engine.

## 2. Architecture

Same modular monolith (FastAPI + PostgreSQL, `/api/v1`). New code only:

- `backend/app/models/collaboration_models.py` — 6 tables (below).
- `backend/app/schemas/collaboration_schemas.py` — request validation.
- `backend/app/services/collaboration_service.py` — snapshots, access
  resolution, scope gates, follow-up→reminder, exactly-once notifications.
- `backend/app/api/routes/collaboration.py` — owner + vet endpoints.
- `backend/app/services/paw_supervisor.py` — 3 continuity capabilities +
  5 vet-boundary refusals (additive; BIN2 behavior unchanged).
- `backend/app/services/reminder_worker.py` — `_render` prefers BIN3
  subject/body when present (reminder path unchanged).
- Migration `e3v3tc0ll4b1n3` (head; linear chain preserved).
- Frontend: `VeterinaryCare.tsx` (owner), `VetPortal.tsx` (vet),
  `foundationApi` extensions (same client), routes `/veterinary` + `/vet`,
  nav items, Share-page vet-account linking.

No new infrastructure, services, queues, or dependencies.

## 3. Care team

`care_team_members`: pet + owner + display label + clinic + role
(PRIMARY_VET|SPECIALIST|EMERGENCY_CLINIC|SECONDARY_VET|OTHER_CARE_PROVIDER) +
status (ACTIVE|ENDED) + optional `vet_user_id` (real linked account only) +
`verification_state` (default UNVERIFIED). Owner CRUD + end-relationship.
Pet-specific: a grant for Pet A never touches Pet B (tested).

## 4. Vet identity

USER IDENTITY (`users`) is separate from VETERINARY PROFILE
(`care_team_members` display label). Linking requires the vet's real
PAWPHILE email resolving to an existing account (case-insensitive);
unknown email → truthful 422 ("ask the veterinarian to sign in first").
`VERIFIED` cannot be self-asserted via PATCH (422 with the reason).
Unlinked profiles render "Unverified profile — no credential check performed".
No fake clinicians, credentials, or verification states exist anywhere.

## 5. Sharing

Extends BIN1 `ShareGrant` (scope/expiry/revoke/access-count preserved) with
nullable `purpose` (VET_CONSULTATION|FOLLOW_UP|SECOND_OPINION|
EMERGENCY_REVIEW|ROUTINE_REVIEW), `grantee_user_id`, `consultation_id`,
`package_id`. Package sharing creates a scoped grant; BIN1 share endpoints
(revoke, view, lazy expiry) keep working on the same rows.

## 6. Package model

`VetHealthPackage`: pet/owner/consultation + type
(QUICK_SUMMARY|FULL_REVIEW|SELECTED_RECORDS) + status
(DRAFT|APPROVED|SHARED|SUPERSEDED) + version + parent link + frozen
`snapshot` JSON + sha256 `snapshot_digest` + `generated_by`
(`PAWPHILE:bin3-package-v1`) + owner-review flags. Sections: pet identity,
timeline (50, provenance-rich), medications, allergies, symptoms,
measurements, vet visits, files (metadata only — `storage_ref` never frozen
in), READY reports (version/digest), BIN2 descriptive intelligence
(flagged changes, gaps, rules version), owner questions, disclaimer.
EMERGENCY_PACKET deliberately deferred (do-not-overbuild rule).

## 7. Versioning

SHARED rows are never UPDATE'd (service invariant + tested). New information
→ `POST …/new-version` → DRAFT v+1 with parent link; old row flips to
SUPERSEDED (status only — snapshot bytes untouched). Old shares keep
resolving to the exact bytes the vet saw (digest-verified in tests).

## 8. Consultation

`consultations`: pet/owner/care-member/share/package/vet + purpose + status
(REQUESTED|SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED). A collaboration
record, not appointment booking (no scheduling/marketplace). Complete is
idempotent and emits a `vet_visit` HealthEvent (source = completing party).

## 9. Questions

`vet_questions`: pet/consultation/owner + text + OPEN|ANSWERED|RESOLVED|
DISMISSED + vet answer + timestamps. Owner asks (pet- or
consultation-scoped), vet answers (consultation-linked or timeline-scoped
grant), owner resolves. Answering a RESOLVED/DISMISSED question or writing
to a closed consultation → 409. PAW AI has no answer route (by design).

## 10. Feedback

`vet_notes`: consultation-scoped, author = vet user, `note_text` (called a
"note", never an "assessment"), optional `follow_up_text`, `effective_at`,
`visibility` = OWNER_VISIBLE always (clinical-only records unsupported —
documented honest model), source `vet`, verification `vet_verified`, linked
`health_event_id`. Creation appends a `note` HealthEvent (source vet);
owner history is never overwritten. Owner reads notes in consultation detail
and the timeline.

## 11. Follow-up

`follow_ups`: consultation + vet-authored `recommendation` + `due_at` +
OPEN|ACKNOWLEDGED|COMPLETED|DISMISSED|EXPIRED (lazy expiry on list) +
ack/completion timestamps + `resulting_event_id` + `reminder_id`.
Creation builds a canonical BIN1 `ReminderV1` (vet_follow_up) + SCHEDULED
notification — no second engine. Owner COMPLETED with an outcome note
appends an owner `note` HealthEvent and completes the reminder.

## 12. Notifications

Existing BIN1 worker delivers everything. `notifications` gains nullable
`dedupe_key`/`subject`/`body`; `notify()` skips when an equivalent
SCHEDULED|QUEUED|SENT row exists (exactly-once creation); claim-token
delivery stays exactly-once. Bodies carry IDs/statuses only. Follow-up-due
flows through the standard sweep (tested idempotent). Unconfigured provider
→ truthful FAILED, never fake SENT. No new worker code paths.

## 13. Consent

Purpose `veterinary_sharing`: package create/share/ versioning require
GRANTED (403 + Consent Center deep-link otherwise). Documented product rule
(surfaced in access-history): withdrawal blocks NEW packages/shares;
existing ACTIVE shares persist until expiry/explicit revocation (tested).
Offline share approval is refused client-side with a truthful blocked state
(the server authorizes; nothing shows "Shared" before its ACK).

## 14. Security

Owner: `require_dog_ownership` everywhere (404, no leakage). Vet: usable
grant = ACTIVE + grantee == caller + pet match + unexpired; gone grants →
410; never-granted → 404. Consultation reads/writes additionally require
consultation linkage (`share.consultation_id` or vet assignment) or
timeline-level scope — a bare REPORT_ONLY grant opens reports/packages
only. SELECTED scopes filter server-side (timeline event types, per-file
category). Vet file reads return metadata minus `storage_ref`. Vet
intelligence requires the owner's `ai_analysis` consent, else an explicit
blocked section. Frontend role is never trusted.

## 15. Audit

Actions (IDs only, no payloads): care_member.created/updated/ended,
package.created/approved/shared/accessed, share.created/accessed/revoked/
linked/file_accessed, consultation.created/completed, question.created/
answered/resolved, vet_note.created, followup.created/updated,
consent.changed. Owner access-history aggregates shares + events + the
consent-withdrawal rule.

## 16. AI boundaries

New enabled capabilities: `vet_prepare` (visit prep from packet +
consultation context), `followup_explain` (vet's words, due dates),
`visit_summary` (what was recorded, pointing at full notes). All labeled
"PAWPHILE-generated — not veterinarian-verified". New refusals
(`detect_vet_boundary`): impersonation, vet-record modification, auto-send,
override/share-everything, disease-relay ("tell my vet I have cancer").
Record text stays DATA (template composer; injection tested, never repeated).
PAW AI cannot answer vet questions, modify vet notes, or share anything.

## 17. API

All under `/api/v1` (see `collaboration.py`): care-team ×4, vet-packages ×6
(create/list/get/approve/new-version/share), shares link ×1 + scoped file ×1,
access-history ×1, consultations ×4, questions ×5, notes ×1, follow-ups ×3,
vet portal ×4 (`/vet/pets`, `/vet/pets/{id}`, `/vet/packages/{id}`,
`/vet/consultations`). Semantics: 404 unknown/unowned, 410 expired/revoked,
409 state conflict, 422 validation, 403 consent-gated, 429 rate-limited,
500 safe + request ID. Bounded queries + pagination preserved.

## 18. Frontend

`/veterinary` (owner, 6 tabs): Prepare (draft → review-exact-sections →
approve+share with purpose/scope/expiry), Care team, Shares & access
(revoke + access history + consent rule), Consultations (open/complete +
detail), Questions, Follow-ups (ack/complete-with-outcome/dismiss).
`/vet` (portal): assigned pets → scoped view (header + purpose/expiry/scope,
source-labeled timeline, meds/symptoms/file metadata, evidence-linked
intelligence, owner questions) → consultations (answer/ note/follow-up/
complete; closed state read-only). States everywhere: loading/empty/error/
offline/blocked/expired/revoked. `/share` gains vet-account linking.
No new design system; DataStates reused.

## 19. Browser verification

Full loop exercised end-to-end (owner prepare→review→approve→share→vet
review→note→answer→follow-up→owner outcome→timeline) via API-level workflow
tests plus frontend typecheck/build/lint; UI states (loading/empty/error/
offline/blocked/expired/revoked) render from the same state machine as BIN1/2
pages. Live-browser walkthrough remains for a connected preview deploy
(frontend builds clean; no dead routes — all registered in `App.tsx`).

## 20. Testing

`backend/tests/test_collaboration.py` — 23 tests: care-team CRUD/honesty/
isolation (4), consent-gated packages (1+1), review-before-share (1),
immutability/versioning (1), expiry/revocation (2), cross-pet/owner
isolation (1), scope enforcement incl. REPORT_ONLY consultation closure (1),
file scope + no `storage_ref` leak (1), leakage scan (1), full loop (1),
provenance (1), audit/access-history (1), consent withdrawal rule (1),
notifications exactly-once + truthful delivery (2), supervisor continuity
capabilities + 5 boundary refusals + note-injection containment (4).
Regression: 70/70 backend green; migration chain/downgrade/re-upgrade +
preservation green.

## 21. Deployment

`alembic upgrade head` (head now `e3v3tc0ll4b1n3`); no new services, env
vars, or cron jobs — existing sweep/deliver/retention cover collaboration
notifications. Rollback verified (`-2` + re-upgrade, data preserved).

## 22. Configuration

No new knobs. Reuses: `DATABASE_URL`, Clerk JWKS, delivery provider vars,
`WORKER_CRON_TOKEN`, rate-limit and retention settings (see BIN1 doc §22).

## 23. Known limitations

- No formal credential verification exists: all profiles are UNVERIFIED and
  labeled so; VERIFIED is unobtainable in-product (rejected, not faked).
- No appointment booking, chat, PIMS/FHIR, PDF vet-packet export (structured
  JSON snapshot via API; READY report refs included), or emergency packet.
- Intelligence for vets needs the owner's `ai_analysis` consent.
- Consent withdrawal does not auto-revoke existing shares (documented rule).
- Vet portal is same-app (no separate service) behind grant authorization.

## 24. Capability ledger

IMPLEMENTED: care-team foundation, honest vet identity separation, scoped+
purposed+expiring+revocable sharing, review-before-share, versioned immutable
packages with digests, vet portal + scoped views, vet notes with provenance,
owner questions + vet answers, follow-up→reminder→outcome loop, timeline
integration, consent gating, audit + access history, exactly-once
notifications via existing worker, PAW AI continuity capabilities + vet
boundaries, 23 tests, this doc.
CONFIGURATION REQUIRED: email delivery (RESEND/SMTP, same as BIN1), cron
schedule (same as BIN1).
RESEARCH ONLY: none exposed.
UNAVAILABLE (truthfully refused/absent): diagnosis, treatment/dosage advice,
disease prediction, image diagnosis, marketplace/search/ratings/booking,
billing/payments, clinic ERP, PIMS/FHIR integration, clinical-only hidden
records, credential verification, auto-sharing, AI answering as the vet.
FUTURE: emergency packet, PDF vet-packet export, PIMS/FHIR adapters, formal
verification — only with real providers/approvals.

## 25. BIN4 readiness

The continuity loop is closed and audited. Next: commercial/ecosystem tracks
(marketplace, verification providers, integrations) can build on
`care_team_members` + grant linkage + package digests without touching
BIN1/2 contracts.
