# PAWPHILE MASTER PRODUCT DOSSIER
**Date:** August 15, 2026
**Status:** FORENSIC REPOSITORY AUDIT

---

## 1. Executive Summary
PAWPHILE is an India-first, AI-powered preventive health intelligence platform for dog parents. It is a monorepo application consisting of a React/Vite/TypeScript frontend, a FastAPI/Python backend, a dual-database architecture (SQLite local + Supabase Postgres production), and a localized Computer Vision engine. The product bridges the gap between daily canine wellness and veterinary care by serving as a **decision-support tool, not a diagnostic medical device**.

It relies on an offline-first PWA architecture (`SyncManager.tsx`) to support regions with intermittent connectivity.

## 2. Product Vision & Philosophy
**Vision:** "Calm intelligence for responsible dog parents." 
**Problem Statement:** Dog parents often struggle to distinguish between benign anomalies and veterinary emergencies, leading to delayed care or unnecessary panic. Traditional vet care is episodic; daily wellness is invisible.
**Philosophy:** PAWPHILE strictly enforces safety guardrails, pushing users to clinical care when deterministic emergency keywords are triggered, avoiding LLM hallucinations. It explicitly does not diagnose.

## 3. Product Status Matrix

| Feature | Implemented | Tested | Local Working | Production Ready | Clinical Validation | Current Status |
| ------- | ----------- | ------ | ------------- | ---------------- | ------------------- | -------------- |
| **Authentication** | YES | YES | YES | NO | N/A | 🟢 IMPLEMENTED + TESTED + LOCALLY VERIFIED |
| **Offline Sync / PWA** | YES | YES | YES | NO | N/A | 🟢 IMPLEMENTED + TESTED + LOCALLY VERIFIED |
| **Dog Profiles** | YES | YES | YES | NO | N/A | 🟢 IMPLEMENTED + TESTED + LOCALLY VERIFIED |
| **PAW AI Chat** | YES | YES | YES | NO | N/A | 🟡 LOCALLY WORKING |
| **Vision Scan (Bin 1)** | YES | YES | YES | NO | N/A | 🟢 IMPLEMENTED + TESTED + LOCALLY VERIFIED |
| **Vision Scan (Skin Bin 2A)** | YES | YES | YES | NO | NO | 🔵 EXPERIMENTAL |
| **Clinical Tier-A CV (Bin 2C)** | YES | YES | NO | NO | NO | 🔒 BLOCKED |
| **Preventive Care** | YES | YES | YES | NO | N/A | 🟢 IMPLEMENTED + TESTED + LOCALLY VERIFIED |
| **Nutrition / BCS** | YES | YES | YES | NO | N/A | 🟢 IMPLEMENTED + TESTED + LOCALLY VERIFIED |
| **Vet Locator** | YES | YES | YES | NO | N/A | 🟢 IMPLEMENTED + TESTED + LOCALLY VERIFIED |
| **Reports Export** | YES | YES | YES | NO | N/A | 🟢 IMPLEMENTED + TESTED + LOCALLY VERIFIED |

## 4. Frontend Architecture
- **Framework:** React 18, TypeScript, Vite, TailwindCSS.
- **Routing:** React Router (Dashboard, PawAiCenter, VisionScan, PreventiveCare, Profile, Settings).
- **State & Data Fetching:** React Context (`PawphileDataContext`), standard fetch wrappers.

## 5. Offline-First Architecture
- `SyncManager.tsx` handles `pawphile:force-sync` and `online` events.
- Data is queued into IndexedDB using `localforage` (`StorageKeys.SYNC_QUEUE`).
- Utilizes standard Background Sync API (`navigator.serviceWorker.ready.then(reg => reg.sync.register('pawphile-sync'))`).
- Optimistic updates allow the user to continue using the app while the queue drains. Offline persistence works, but relies on browser limits.

## 6. Backend Architecture
- **Framework:** FastAPI (Python 3.12).
- **Core Modules:**
  - `api/routes/`: Distinct routers for auth, dogs, medical_history, paw_ai, reports, triage, vaccines, vet_clinics, vision.
  - `services/`: Encapsulates business logic (`paw_ai_engine.py`, `vision_service.py`, `sync_service.py`).

## 7. PAW AI Architecture & Safety
- **Engine:** `backend/app/services/paw_ai_engine.py`
- **Flow:**
  1. **Deterministic Emergency Guardrail:** Checks `EMERGENCY_KEYWORDS` (e.g., "collapse", "seizure", "bloody stool"). If matched, returns a pre-canned "Red" emergency payload without hitting the LLM.
  2. **Toxic Food Guardrail:** Checks `TOXIC_FOOD_KEYWORDS` (chocolate, grapes, xylitol). Returns immediate critical warning.
  3. **Intent Detection:** Routes query to specific sub-engines (triage, breed, nutrition, bcs).
  4. **LLM Engine:** Falls back to an asynchronous Ollama stream (`llama3`) generating strict JSON schema. 
- **Production Status:** PAW AI is locally functional but requires production LLM infrastructure (e.g., Groq, OpenAI) before cloud deployment. It will fail if Ollama is unavailable on `localhost`.

## 8. Computer Vision Architecture
- **Production Vision:** Active object detection (Dog Localization) uses **Roboflow** via API.
- **Internal Engineering (The `cv/` directory):**
  - **Bin 1 (Dog Detection):** Completed and verified.
  - **Bin 2A (Experimental Skin Baseline):** Functional but restricted to experimental research. Not diagnostic.
  - **Bin 2B (Clinical Infrastructure):** Metadata validation, annotation quality gates, and leakage engines are fully engineered.
  - **Bin 2C (Clinical Production Pipeline):** `cv/skin_lesion/infrastructure/bin2c_readiness_gate.py` actively **BLOCKS** execution because Tier-A clinical data is unavailable. 
- **Status:** CV Engineering is COMPLETE. Clinical Model Validation is BLOCKED.

## 9. Database Architecture
- **Backend ORM:** SQLAlchemy using SQLite (`pawphile.db`) for local dev, and Postgres `postgresql://` URI for production environments.
- **Frontend Direct:** The Javascript frontend also uses Supabase natively to push to tables (`profiles`, `dogs`, `preventive_care_records`).
- **Status:** This is a Split-Brain database architecture (FastAPI ORM + Supabase JS Client). It works but results in data path duplication.

## 10. Security Architecture
- **Secret Management:** `.env` variables strictly ignored in `.gitignore`. No private keys or Supabase secrets exist in the Git tree.
- **Data Privacy:** Local offline data stored securely in IndexedDB; API uses standard JWT Bearer tokens (via Clerk).

## 11. Testing & Verification Results
- **Frontend Lint:** PASS
- **Frontend Build:** PASS
- **Backend Tests:** PASS (1 test executed in `backend/tests/test_health.py`)
- **CV Unit Tests:** PASS (12/12 unittest in `tests/cv/skin_lesion/`)
- **CV Readiness Gate:** BLOCKED (Expected safety result: "CLINICAL DATA NOT AVAILABLE OR INVALID")

## 12. Production Readiness Assessment

### READY / WORKING
- Frontend UI and Build
- Backend Health and Authentication
- Existing Roboflow Integration
- Core Offline Data Flows (IndexedDB)
- Safety Guardrails (Toxic Food/Emergency detection)

### PARTIALLY READY
- PAW AI (Requires cloud LLM deployment)
- Production Database (Requires backend unification to remove Split-Brain JS Client)

### BLOCKED
- Clinical Skin Model Training (Tier-A data unavailable)
- Clinical Validation and Calibration

## 13. Top Next Actions
1. **Tier-A Data Acquisition:** Secure veterinary-grade annotated datasets to unlock Bin 2C.
2. **LLM Cloud Migration:** Transition PAW AI from local Ollama to a production-grade inference provider.
3. **App Store PWA Packaging:** Wrap the Vite/PWA build using Capacitor or bubblewrap for Android/iOS distribution.
4. **End-to-End Cypress Tests:** Add frontend integration testing.
5. **CI/CD Pipeline Setup:** Configure GitHub Actions for automated lint/build/pytest on push.

---
*Generated via PAWPHILE Forensic Audit.*
