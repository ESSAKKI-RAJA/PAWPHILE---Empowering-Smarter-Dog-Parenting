# PAWPHILE BIN4 — Ecosystem & Platform

Status: COMPLETE. Backend: 90 tests pass (22 BIN1 + 25 BIN2 + 24 BIN3 + 19 BIN4).
Frontend: `tsc --noEmit` clean, `vite build` succeeds, `eslint` 0 errors
(1 pre-existing warning).

BIN4 expands the network without breaking the continuity layer: verified
identity, organizations, pet-specific relationships, consent-gated
integrations, partner API, webhooks, entitlements, emergency continuity —
every ecosystem datum feeding back into the canonical longitudinal record.
No PIMS, ERP, billing, marketplace, or diagnosis was built.

## 1. Objective

From "owner-controlled veterinary continuity" to "owner-controlled
continuity connected to a structured ecosystem", preserving PAWPHILE as a
lightweight continuity layer that complements clinic systems.

## 2. Architecture

Same modular monolith (`/api/v1` + `/api/partner/v1`). New, additive only:

- `models/ecosystem_models.py` — 14 tables (§3–§5, §10–§12, §19).
- `schemas/ecosystem_schemas.py` — request validation.
- `services/org_service.py` — membership/role gates, provider-status blocks.
- `services/ingestion_service.py` — adapter contract + stub connector +
  RAW→VALIDATED→NORMALIZED→IMPORTED/REJECTED pipeline.
- `services/fhir_maps.py` — versioned mapping reference (`bin4-fhir-map-v1`).
- `services/partner_service.py` — hashed credentials, scope/relationship
  gates, entitlements, KPIs, emergency snapshot builder.
- `services/webhook_service.py` — signed IDs-only dispatch, bounded retries.
- `routes/ecosystem.py` + `routes/partner.py` — all endpoints.
- `retention_service.py` — webhook-delivery + failed-import hygiene.
- `paw_supervisor.py` — 5 ecosystem capabilities + invent-record refusal.
- Migration `b1n4ec0sys7em` (head; linear, reversible).
- Frontend: `Connections.tsx`, `Organizations.tsx`, emergency tab +
  relationship manager in `VeterinaryCare.tsx`, routes, nav.

No new services, queues, or dependencies (outbound HTTP reuses `httpx`,
already installed).

## 3. Organization model

`organizations` (CLINIC/PARTNER/LAB/IMAGING/DEVICE/OTHER, ACTIVE/SUSPENDED/
REVOKED) + `org_memberships` (role + status). Creator becomes OWNER.
Last-active-OWNER is protected (409). Suspended orgs 410. Members list is
member-visible only (404 otherwise — no leakage).

## 4. Professional identity

`vet_professionals`: user link + org link + display/role/type/jurisdiction/
location + verification_state + source + evidence ref + timestamps + expiry +
reviewer + active flag. Flow: register (UNVERIFIED) → request with license
evidence (PENDING) → org ADMIN/OWNER review (not self) → VERIFIED labeled
"organization-attested — not an independent credential check", 1-year expiry,
or SUSPENDED/REVOKED. Approval without evidence → 422. Self-review → 403.
Independent (org-less) profiles cannot be verified (422, honest).
Suspension/expiry blocks vet-portal access immediately (410); owner access
never affected. Tested end to end.

## 5. Verification model

States UNVERIFIED/PENDING/VERIFIED/SUSPENDED/EXPIRED/REVOKED (lazy expiry
check on access). VERIFIED requires: PENDING + evidence on file + org-admin
review + recorded source/attestation. Nothing self-asserts.

## 6. Care relationships

`pet_care_relationships`: pet + owner + professional/org + purpose + scope +
status (REQUESTED/ACTIVE/PAUSED/ENDED/REVOKED) + expiry. Owner creates and
revokes; organizations can never silently establish access. Vet-side
read-only view (`/vet/relationships`). Partner reads resolve through these.

## 7. Integration architecture

Canonical data → adapter layer (`Connector` base: connect/authenticate/
validate/fetch/normalize/map/import/sync/revoke/health) → external system.
Only a stub connector ships (explicit manual/test imports); production
connectors arrive as subclasses, never route logic. No fake live sync is
claimed anywhere (adapter reports its type; health endpoint is truthful).

## 8. Consent

Per-category purposes (`integration_lab/imaging/device/pims/partner`)
required for connection AND import (403 + guidance otherwise). Connections
display WHAT/WHY/consent-status/last-sync/revoke. Location/behavioral data:
not collected in BIN4; documented as requiring explicit consent when added.
Withdrawal blocks new imports; existing canonical events keep provenance.

## 9. Data provenance

Source types preserved end to end: OWNER/VETERINARIAN/CLINIC/IMPORT/DEVICE/
LAB/SYSTEM/AI_DERIVED. Imports land `imported` (never verified facts);
device rows are `device`-sourced timeline observations explicitly excluded
from BIN2 baselines (documented boundary, UI-noted). Emergency snapshots and
exports label every section's source.

## 10. API scopes

Partner scopes: `pet.read`/`timeline.read`/`reports.read`/`package.read`/
`followup.read` — no `write_all`, no unrestricted access. Credentials are
`pk_` bearer tokens, sha256-hashed, shown once, revocable with bounded
expiry. Every request: credential → ACTIVE client → scope → ACTIVE
org relationship (purpose/scope/expiry) → resource. SELECTED relationships
are honestly refused (403) as insufficiently granular for API access.

## 11. Webhooks

Events: SHARE_CREATED/REVOKED, PACKAGE_APPROVED/SHARED, CONSULTATION_
COMPLETED, FOLLOWUP_CREATED/COMPLETED, QUESTION_ANSWERED, VET_NOTE_CREATED,
RELATIONSHIP/CONNECTION/IMPORT_CHANGED. Explicit subscriptions (unknown
events 422), HMAC-signed, IDs-only payloads (tested leak-free), idempotent
dispatch with bounded retries and terminal FAILED, revocation-aware,
per-subscription delivery log. Dispatch: cron-token global or per-user scope.

## 12. Export packages

Package JSON export (`format: PAWPHILE-package-json-v1`): id/version/digest/
provenance/generated-by/disclaimer; no storage pointers, no unrelated
records. Server-side PDF is FUTURE (not claimed); the UI remains printable
via existing report views. Emergency packet: `EMERGENCY_PACKET` type with
minimal freeze (identity/allergies/meds/recents/symptoms/visits/files/
contact/disclaimer), same review→approve→share rules, 24h default share.

## 13. Emergency continuity

Generate → review exact sections → approve → share (EMERGENCY_REVIEW).
Continuity packet only: presents "recorded information that may be relevant",
never a diagnosis or treatment. Tested including digest + no-leak scan.

## 14. PIMS/FHIR readiness

`GET /interoperability/fhir-map`: versioned MAPPED/PARTIALLY_MAPPED/
NOT_SUPPORTED table for Patient/Organization/Practitioner/Encounter/
Observation/Medication/Allergy/DiagnosticReport/DocumentReference/CarePlan,
with `conformance_claim: NONE`. No compliance asserted, tested absent.

## 15. Security

Enforced server-side throughout: cross-user (404), cross-pet (404),
cross-org (404, incl. member admin boundaries), STAFF≠vet authority
(role gates tested), suspended professional/org/membership → 410,
expired/revoked grants → 410, SELECTED partner denial (403), credential
misuse (401), webhook payload scan (IDs only, signed), consent bypass
(403), unauthorized import/export (404/409/422 as appropriate). Frontend
never the boundary (all re-checked in 19 BIN4 + 71 prior tests).

## 16. Privacy

Data minimization per field: connections carry scopes + purpose; imports
bounded (≤50/batch, raw stored bounded); webhook payloads IDs-only;
credentials hashed; secrets shown once and never re-exposed; lab display
uses recorded ranges with no interpretation; device data excluded from
intelligence; no hidden collection or secondary use; revocation visible
everywhere.

## 17. Audit

New actions (IDs only): org.created/status_changed, membership
created/changed, professional created/verification_requested/changed,
relationship created/changed, connection created/revoked, import.completed,
lab_panel.created, plan/entitlement events, partner client/credential
events, webhook created/revoked. Access history extended with relationship/
integration/professional actions.

## 18. Retention

Documented + tested + idempotent: terminal webhook deliveries (default
90d), REJECTED/stale-RAW imports (default 30d). NEVER purged: connections,
relationships, credentials, IMPORTED events, plans/entitlements, or any
BIN1–3 protected category. New knobs: `RETENTION_WEBHOOK_DAYS`,
`RETENTION_IMPORT_DAYS`.

## 19. KPIs

`GET /metrics/ecosystem`: orgs, professionals by state, relationships,
packages shared/awaiting, active shares, follow-up completion rate,
connections, imports in/out, webhook sub/delivery counts — counts only,
no PHI (tested). Business posture: model/demand/willingness-to-pay remain
hypotheses; validation via clinic/owner/integration pilots (no PMF claims).

## 20. Commercial hypotheses

Primitives only: `plans` (operator catalog) + `entitlements` (user/org
features). `partner_api` gates client creation; tests prove entitlements
never confer data access (feature 403 vs relationship 404 are distinct).
No billing, no payments, no plan-gated safety features.

## 21. Validation plan

Clinic pilot (org + verification + relationships), owner usability
(prepare/share/revoke/emergency), integration pilot (stub→real connector),
partner discovery (scoped reads + webhooks), B2B2C pilot scoping. Metrics
from §19 measure workflow completion, not clicks.

## 22. Future integrations

Real lab/PIMS/device connectors (subclass `Connector`), server PDF packets,
location-aware features (explicit consent), formal credential authority,
coded formularies/terminologies, marketplace/billing (separate scope).

## 23. Capability ledger

IMPLEMENTED: organization + membership/roles, honest verification workflow,
owner-controlled relationships, suspension-gated vet access, consent-gated
connections, ingestion pipeline + stub adapter, lab panels + recorded-range
display, device readings (timeline-only), emergency packet + JSON export,
FHIR map (reference), partner API (5 scoped reads, hashed credentials),
webhooks (subscribe/sign/dispatch/revoke), plans + entitlements (feature-only),
KPIs, extended audit/access-history/retention, 5 supervisor capabilities +
invent-record refusal, 2 frontend pages + emergency/relationship UX, 19 tests.
CONFIGURATION REQUIRED: real connector credentials, production webhook URLs,
email/cron (BIN1), operator plan catalog.
UNAVAILABLE: live PIMS/lab/device feeds, server PDF, credential authority,
coded clinical terminologies, clinical interpretation/diagnosis, billing,
marketplace, ERP.
FUTURE: above + location features + advanced commercial ecosystem.
RESEARCH: predictive clinical models, image diagnosis, multimodal/CDS —
none built, none claimed.

## 24. Known limitations

- Verification is org-attested, not independently credential-checked.
- One stub connector ships; production feeds are FUTURE.
- Partner API honors FULL/REPORT_ONLY relationships only (SELECTED → 403).
- Server PDF not implemented (JSON export + printable views only).
- No location data collected (by design, pending explicit consent model).
- Device data excluded from BIN2 baselines (documented boundary).
- Live-browser verification reserved for connected preview (workflows
  covered by API-level tests + type-safe UI states).
