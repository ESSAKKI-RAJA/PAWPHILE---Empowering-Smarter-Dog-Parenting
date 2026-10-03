# PAWPHILE BIN2 — Longitudinal Health Intelligence

Status: COMPLETE. Backend: 47 tests pass (22 BIN1 + 25 BIN2). Frontend: `tsc --noEmit` clean, `vite build` succeeds, `eslint` 0 errors.

BIN1 gave PAWPHILE a reliable memory. BIN2 gives that memory intelligence:
descriptive, personal, evidence-linked, non-diagnostic, owner-controlled.

## 1. Product objective

Answer "what changed for THIS dog, vs its own history, on what evidence —
and what to do next" — never "this dog has disease X".

## 2. Architecture

```
CANONICAL HEALTH DATA (BIN1, frozen)
        ▼
DATA QUALITY / ELIGIBILITY (analytics_stats.assess_eligibility)
        ▼
UNIT NORMALIZATION (normalize_weight; originals preserved)
        ▼
LONGITUDINAL AGGREGATION (intelligence_engine series fetchers, effective time)
        ▼
┌───────┬───────────┬──────────────┐
TRENDS  BASELINES   COMPLETENESS   (per-metric payloads + explanations)
└───────┴───────────┴──────────────┘
        ▼
CHANGE DETECTION (recent-vs-baseline, robust z + % + persistence)
        ▼
MULTI-SIGNAL CONTEXT (7-day temporal overlap; co-occurrence language only)
        ▼
INTELLIGENCE RECORD (ai_analysis_records: GENERATED/SUPERSEDED/FAILED)
        ▼
PAW AI SUPERVISOR (capability registry → evidence packet → safety → composer)
        ▼
OWNER OUTPUT (/intelligence) + VET-READY OUTPUT (/intelligence/vet-summary)
```

Modules (follow repo flat-service convention, no new infra):
- `app/services/analytics_stats.py` — pure stats (stdlib `statistics`): median/MAD/robust-z/least-squares/R²/trend states/outlier split/duplicate finder/eligibility/rolling mean. Versioned `bin2-stats-v1`.
- `app/services/intelligence_engine.py` — DB aggregation + baselines/trends/changes/multi-signal/completeness/freshness/explanations/lineage/consent gate. `deterministic:bin2-intel-v1`.
- `app/services/paw_supervisor.py` — capability registry, safety escalation, evidence packets, template composer, session persistence. `bin2-supervisor-v1`, safety `bin2-safety-v1-heuristic`.
- Routes: `app/api/routes/analytics.py` (12 GET + POST analyze + history), `app/api/routes/supervisor.py` (capabilities/ask/sessions/feedback).
- Migration `d1nt3ll1g3nc3b2`: nullable `status/period_start/period_end/method/rules_version/evidence` on `ai_analysis_records` (backward-compatible).

## 3. Data eligibility

Per-metric gates (observations, span, gaps) → AVAILABLE | INSUFFICIENT_DATA | STALE_DATA | INVALID_DATA | UNAVAILABLE | ERROR. Baselines are never fabricated: insufficient → explicit status + "not enough data" language in UI.

## 4. Metrics

Weight (kg-normalized, invalid units rejected never converted), activity (daily exertion minutes), nutrition (daily kcal), behavior (daily events), symptoms (episodes/recurrence/3-day co-occurrence/severity, onset else labeled recorded-time), medications (chronology; effectiveness never inferred), preventive (deterministic overdue = past `next_due_date`).

## 5. Baselines

Personal windows: weight 90d (≥3 obs, ≥14d span), activity/nutrition 30d (≥5, ≥7d), behavior 30d (≥3, ≥7d), symptoms 90d rate. Representation: period, n used, median/mean/stdev/MAD/min/max, suspicious exclusions with reasons, duplicate notes, freshness note. Recent slice excluded by design.

## 6. Trend engine

Least-squares slope + edge-median % change + R² → STABLE (|%|<5) | INCREASING | DECREASING | VARIABLE (R²<0.35) | INSUFFICIENT_DATA | STALE. Descriptive only.

## 7. Change detection

Recent-slice median vs baseline median; flag requires |robust z|≥3 AND |%|≥threshold (weight 5%, others 10%) AND ≥2 recent obs AND ≥1d persistence. Output: what/when/magnitude/baseline/evidence/method. Never a diagnosis.

## 8. Multi-signal analysis

Signals (flagged changes, recurring symptoms, med starts ≤60d, vet visits ≤60d) paired on 7-day overlap. Fixed language: "occurred within the same 7-day period. This is a temporal overlap, not evidence that one caused the other."

## 9. Completeness

Mean of dimension coverage fractions (weight/activity/nutrition/behavior/preventive/vet). Labeled "record completeness — NOT a health score" with per-dimension detail. No single health score exists anywhere in the product.

## 10. Freshness

Per-metric CURRENT/RECENT/STALE/NO_DATA with documented day thresholds (e.g. weight 7/30, activity 2/7). Stale data is shown, never hidden.

## 11. Intelligence records

`POST /intelligence/analyze` writes GENERATED + supersedes prior same-type rows; failures write FAILED. History endpoint lists lineage with method/rules/evidence IDs. Every output carries pet/method/rules/generated-at/evidence.

## 12. Explanation engine

Every result: what / why / comparison (own baseline, never breed averages) / limitation (insufficient, stale, exclusions) / next_step (keep recording; discuss dated records with vet).

## 13. PAW AI Supervisor

Request → auth → ownership → consent → capability match → evidence packet (minimum necessary) → safety rules → template composer → persist (session/message/evidence-only snapshot/safety-log) → response. No LLM in this path; records are DATA (embedded instructions cannot execute — adversarially tested). Banned phrases enforced in code and tests.

## 14. Safety rules

Levels INFORMATION/OBSERVATION/MONITOR/VET_DISCUSSION/URGENT_VET. Deterministic triggers: emergency keywords (reuses BIN1 `EMERGENCY_KEYWORDS` + toxic list) → URGENT_VET + safety log; ≥3 severe episodes/30d or weight move ≥15% → VET_DISCUSSION; flagged change → MONITOR. Heuristic safety rules, explicitly NOT clinical thresholds (`bin2-safety-v1-heuristic`). Non-diagnostic language bank ("may", "could be consistent with", "worth discussing", "records show", "not enough data").

## 15. Consent

All `/analytics/*`, `/intelligence/*`, `/supervisor/*` (except public capability ledger) require GRANTED `ai_analysis` consent → else truthful 403. Frontend shows Consent Center prompt.

## 16. Privacy

Ownership on every route (404 on cross-user); evidence packets contain only needed refs; snapshots store evidence refs + completeness, never record dumps; no health details in logs/audit (IDs/counts/statuses); email domains only.

## 17. API

20 routes under `/api/v1` (12 analytics GET, analyze, history, vet-summary, capabilities, ask, sessions ×2, feedback). Consistent 404/409/422/403/429/500 contract; rate limiting applies; audit on analyze + ask.

## 18. Frontend

`/intelligence` page: overview (flagged changes), weight chart (actual points + baseline reference line + gap disclosure), baselines table (period/n/current/baseline/change/quality/freshness), completeness bars, multi-signal list, supervised chat (sessions, safety badges), vet-summary builder (review-first + download). Consent-blocked/offline/empty/error states via DataStates. No health score, no false precision, no diagnosis anywhere.

## 19. Testing

25 BIN2 tests: stats/eligibility/normalization/outliers/duplicates; baselines (sufficient/insufficient/stale); trends (up/down/stable/variable); changes (flagged/persistent vs insufficient); multi-signal overlap language; completeness framing; lineage GENERATED/SUPERSEDED; vet-summary review-notice; isolation (9 endpoints × cross-user 404); consent withdraw→403→grant→200; provenance (evidence IDs match rows); effective-time anchoring; supervisor (grounded answers, session persistence, minimal snapshots, diagnostic/fabrication refusal, record-embedded + question-embedded injection containment, emergency escalation + safety log, unsupported-capability honesty, severe-recurrence escalation, feedback validation). BIN1 suite untouched and green (47 total).

## 20. Model-readiness

No ML models trained or deployed (correctly — no labeled outcomes exist). What exists: dataset lineage via `ai_analysis_records` evidence + export; deterministic rules versioned; evaluation harness = analytics + safety + adversarial suites. Model registry, training pipelines, shadow mode: FUTURE (only when real labeled outcomes + locked evaluation + approval exist).

## 21. Vision boundary

Unchanged from BIN1: image-quality + narrow screening only, no diagnostic claims. No new CV work in BIN2.

## 22. Knowledge/RAG boundary

No RAG built. Supervisor uses personal records + breed context already in product; general knowledge stays out. Any future corpus needs source/version/citations and strict separation from personal data.

## 23. Known limitations

- Baselines need weeks of consistent recording; new users see honest INSUFFICIENT_DATA.
- Triage sessions lack effective time (labeled recorded-time).
- v2 nutrition/behavior logs are legacy sources not merged into canonical series (documented; avoids double-counting).
- Activity nutrition aggregates ignore same-day distribution.
- Supervisor has no external LLM: answers are deterministic templates (a deliberate safety choice).
- operate on naive-UTC datetimes consistent with BIN1 storage.

## 24. Configuration

`INTEL_STABLE_PCT_THRESHOLD=5.0`, `INTEL_VARIABLE_R2=0.35`, `INTEL_CHANGE_MAD_Z=3.0`, `INTEL_CHANGE_MIN_PCT=10.0`, `INTEL_WEIGHT_CHANGE_MIN_PCT=5.0`, `INTEL_OUTLIER_MAD_Z=5.0` (see `backend/.env.example`). Windows/thresholds documented in code (§5–§8 here).

## 25. Deployment

Same monolith: `alembic upgrade head` (head now `d1nt3ll1g3nc3b2`), no new services/deps (stdlib only), analytics computed on demand with bounded indexed queries; `POST analyze` for persisted lineage (idempotent, superseding).

## 26. Capability ledger

IMPLEMENTED: descriptive analytics (weight/activity/nutrition/behavior/symptoms/meds/preventive), personal baselines, trend engine, change detection, multi-signal context, completeness, freshness, intelligence lineage, explanations, supervisor + 10 capabilities, sessions/feedback, vet summary, frontend experience, 25 tests.
RESEARCH ONLY: none exposed (all user-facing outputs are deterministic rules).
CONFIGURATION REQUIRED: thresholds tunable via env (sane defaults ship).
UNAVAILABLE (truthfully refused when asked): disease prediction, diagnosis, image diagnosis, treatment advice, RAG chatbot, health scores, calibrated probabilities.
FUTURE: model registry/training/shadow evaluation, CV diagnosis, knowledge corpus — only with validated data + approvals (BIN3+ scope).
