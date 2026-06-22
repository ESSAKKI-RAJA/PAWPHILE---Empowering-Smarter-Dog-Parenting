# PAWPHILE Verified Data Pipeline

## 1. PAWNEWS Verification Schema
**Feeds Supported:** "Chennai Local Alerts" and "Global Care".
To prevent misinformation, all news items strictly adhere to the `PawNewsItem` schema, which mandates:
- `trustLabel`: Must be exactly one of: `"Source-backed"`, `"Manually reviewed"`, `"Educational"`, or `"Unverified local update"`. No "Vet Approved" claims are permitted unless a signature is present.
- `expiresAt`: Ensures out-of-date seasonal alerts (e.g., Summer Heat warnings) expire automatically.
- `source`: Explicitly references the organization (e.g., "National Vet Board", "PAWPHILE Health Desk").
- **Interactions:** Support for `saved`, `helpful`, and `click` telemetry to rank feed usefulness dynamically.

## 2. Vet Locator Verification Protocol
The `VetFinder.tsx` local seed data (and matching Supabase `vet_clinics` schema) has been upgraded to enforce manual verification fields:
- `openingHours` (e.g., "09:00 - 20:00")
- `is24_7` (Boolean flag)
- `verificationLabel` (String, must align with strict trust guidelines)
- `source` (e.g., "Direct Call", "Vet Board Registry")
- `last_verified_at` (ISO Date)

### Strict 24/7 Rule
The system will **NEVER** claim a clinic is "24/7 emergency" unless:
1. `is24_7 === true`
2. `source` is "Direct Call" or "Vet Board Registry"
3. `verificationLabel` is "Source-backed" or "Manually verified".

*Result: Fake API integrations and unverified scrapers are strictly banned from PAWPHILE. Trust is our primary product.*
