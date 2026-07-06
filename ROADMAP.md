# PAWPHILE Roadmap

Our roadmap outlines the strategic direction for PAWPHILE, evolving it from a robust foundation into a premier enterprise and research-grade veterinary informatics platform.

## Phase 1: Foundation (Current Status: Complete)
- [x] Scaffold React + Vite + TypeScript frontend.
- [x] Implement Clerk Authentication (JWT, SSO capabilities).
- [x] Build core FastAPI backend and configure Neon PostgreSQL.
- [x] Implement Cloudinary image proxying for secure file handling.
- [x] Build IndexedDB offline-first Service Worker architecture.
- [x] Establish the PAW AI Triage Assistant utilizing Groq (Llama 3).
- [x] Implement deterministic emergency keyword rule engine (Red Tier bypass).

## Phase 2: Intelligence & Vision Integration (Current Status: In Progress)
- [x] Deploy the dedicated PyTorch Vision AI microservice (DermAI™).
- [ ] Finalize model fine-tuning for dermatological anomalies (high recall threshold).
- [ ] Implement Grad-CAM heatmap overlays in the frontend UI for explainability.
- [ ] Expand Vision AI to include EyeScan AI™ (corneal opacity, cataracts).
- [ ] Introduce EarSense AI™ (detecting severe ear infections based on visual inflammation markers).

## Phase 3: Clinical Utilities & Export 
- [ ] Implement robust PDF Generation (React-PDF) for exporting longitudinal health summaries to veterinarians.
- [ ] Introduce customizable reminder systems (vaccinations, flea/tick medication schedules).
- [ ] Build the "Vet Locator" module to integrate with Google Maps API for emergency routing based on the Red Tier triage.
- [ ] Add advanced charting (Recharts) for visualizing weight trends and activity metrics over time.

## Phase 4: Enterprise & Clinic Portal (Commercial Target)
- [ ] Develop a secure "Veterinarian Portal" allowing clinics to access patient logs pre-visit (with owner consent).
- [ ] Implement comprehensive RBAC (Role-Based Access Control) for clinic staff vs. pet owners.
- [ ] Ensure HIPAA/GDPR equivalent compliance for veterinary data storage (e.g., AVMA guidelines).
- [ ] Introduce integration capabilities with standard Veterinary Practice Management Software (PIMS).

## Phase 5: Research & Open Data (Academic Target)
- [ ] Build a telemetry aggregation engine to securely strip PII (Personally Identifiable Information).
- [ ] Publish anonymized dataset snapshots of canine phenotypic trends based on geography and breed.
- [ ] Release a whitepaper detailing the efficacy of deterministic guardrails in non-human LLM medical triage.
- [ ] Partner with academic institutions for continued model validation and peer-reviewed longevity studies.
