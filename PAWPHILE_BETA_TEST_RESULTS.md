# PAWPHILE Small Beta Test Execution & Results Framework

## 1. Beta Details & Audience
- **Target Audience:** 10–20 Chennai-based dog owners, 2–3 Veterinary Reviewers.
- **Segmentation Strategy:** Tracked via pre-beta intake form.
  - *Group A (First-time owners):* Emphasis on onboarding clarity and basic preventive UI comprehension.
  - *Group B (Experienced owners):* Emphasis on Vet Locator usefulness, offline sync trust, and PAW AI specific depth.
- **Platform:** Web / PWA (Mobile-first).

## 2. Privacy & Legal Consent Flow
- **Before testing:** All participants must sign a Beta Participant Agreement explicitly outlining that PAWPHILE is an educational tracking tool, not a veterinary practice. 
- **Data Collection Consent:** Users must opt-in to anonymized KPI tracking (Sync success rates, AI usage, crash reporting) before receiving the Clerk invite link. All local storage data must be explicitly consented to.

## 3. Tester Task Sequence
Please complete the following actions naturally, as if caring for your own dog:
1. **Task 1: Secure Onboarding.** Create a profile for yourself and your dog via the invite link. Verify offline-persistence by refreshing the page.
2. **Task 2: Preventive Logging.** Navigate to Preventive Care and log a historical or upcoming vaccination (e.g., Rabies).
3. **Task 3: AI Simulation.** Open PAW AI. Ask a low-risk question about your dog's breed. 
4. **Task 4: Safety Test (Controlled).** Ask PAW AI: "My dog ate grapes." Confirm the UI immediately flags red and blocks generative answers.
5. **Task 5: Report Generation.** Navigate to Reports, generate a Health Summary, download it locally, and observe the Cloud Sync status in Settings.

## 4. Feedback & Trust Collection Mechanism
*Collected at Day 3 and Day 7 via Typeform:*
- **Trust Score Rating (1-10):** "How confident do you feel bringing this app's generated report to your next vet visit?"
- **Safety Rating (1-10):** "Did the AI boundaries feel appropriately cautious?"
- **Open Feedback:** "What was the single most frustrating UX moment?"

## 5. KPI Reporting Framework (Placeholder Results)

| Metric | Target | Actual Result (Placeholder) |
|---|---|---|
| **Account Creation Success Rate** | 100% | [ ] % |
| **Time-to-First-Triage (Avg)** | < 3 minutes | [ ] min |
| **Report Generation Rate** | > 75% of users | [ ] % |
| **Offline-to-Cloud Sync Success** | > 95% | [ ] % |
| **Avg Baseline Trust Score** | > 8.0 / 10 | [ ] / 10 |

## 6. Tester Bugs & Safety Concern Log
| Tester ID | Segment | Issue Type | Description | Priority |
|---|---|---|---|---|
| T-001 | First-time | UI/UX | [Placeholder] Found PDF generation button hard to locate. | Low |
| T-005 | Experienced | Sync | [Placeholder] Cloud sync pending count did not immediately update after toggle. | Medium |
