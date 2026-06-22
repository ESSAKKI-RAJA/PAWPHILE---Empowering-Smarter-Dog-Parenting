# PAWPHILE Beta Readiness Pack

## 1. Beta Tester Checklist & Execution Flow
Test users should complete the following sequence to validate core mechanics:
- [ ] **Onboarding & Profile Setup:** Create an account via Clerk, input dog details (breed, age, weight), and confirm offline-first persistence.
- [ ] **Preventive Triage (Safe Mode):** Enter a low-risk symptom (e.g., "small scratch") and complete the triage flow.
- [ ] **Emergency Triage (Guardrail Check):** Enter a high-risk symptom (e.g., "seizure", "ate grapes") and confirm the immediate RED severity block and veterinary disclaimer.
- [ ] **Data Export / PDF Generation:** Generate a health report from the Reports section, verify local download, and verify successful sync state.
- [ ] **Reminder Configuration:** Navigate to Settings, enable 'Vet Visits' reminders, trigger a manual Sync, and request a Test Email.
- [ ] **Offline Sync Simulation:** Disconnect network, add a vaccine record, reconnect network, and press 'Sync Now' in Settings.

## 2. In-App Feedback Flow Strategy
*Constraint: No UI redesigns or new feature development.*
**Feedback Mechanism:** Introduce a floating fixed `mailto:` link or a lightweight external Typeform link via a simple `FeedbackBanner` component at the bottom of the Settings page. 
**Fields Collected (via External Form):**
- Device/OS (e.g., iOS Safari, Android Chrome)
- Issue Type (Bug, UX Friction, Medical Safety Concern)
- Description
- Sync State at time of issue

## 3. Known Limitations (To set honest expectations)
- **Offline Sync Conflict Resolution:** If multiple devices edit the same record while offline, the device that syncs last with the newest local `updated_at` timestamp will overwrite the older record. True collaborative merging is not supported.
- **AI Fallbacks:** The PAW AI runs securely but will entirely refuse to generate LLM insights for toxic foods or emergencies, defaulting to a static emergency template. This is intentional.
- **Mock Data Constraints:** The Vet Locator uses verified seed data for Chennai, but does not have live GPS routing or global clinic coverage.

## 4. KPI Tracking Manifest
Instrumentation events currently logging to console/Supabase:
| Event Name | Trigger Location | Purpose |
|---|---|---|
| `profile_completed` | `SetupDetails.tsx` | Measures onboarding completion rate. |
| `triage_completed` | `SymptomEngine` | Measures primary user intent conversion. |
| `paw_ai_guardrail_triggered` | `paw_ai_engine.py` | Tracks how often users input emergencies. |
| `report_upload_success/failed` | `reportService.ts` | Measures offline-to-cloud durability. |
| `reminder_preferences_saved` | `Settings.tsx` | Measures habit loop adoption. |

## 5. Go / No-Go Evaluation
**Go Criteria:**
- [x] Zero TypeScript (`npx tsc --noEmit`) errors.
- [x] Zero Vite build (`npm run build`) crashes.
- [x] AI Safety Tests (`python run_safety_tests.py`) pass 100%.
- [x] No dead ends or unhandled promises in routing (Dashboard, Profile, AI, Preventive Care, Settings).

**Status:** **GO FOR BETA.** All critical offline, safety, and sync requirements are met. Ensure testers are explicitly warned that PAWPHILE is an educational tool, not a veterinary replacement.
