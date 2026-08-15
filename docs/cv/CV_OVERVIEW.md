# Computer Vision Overview

The PAWPHILE CV subsystem is divided into "Bins" representing different stages of maturity and pipeline integration. Currently, the local engineering pipelines are fully implemented, but clinical deployments are blocked awaiting Tier-A veterinary data.

## Pipeline Breakdown

### Bin 1: Dog Localization
- **Status:** **IMPLEMENTED, TESTED, LOCALLY WORKING, PRODUCTION READY**.
- **Role:** Identifies the presence and location of a dog in user-uploaded images.
- **Backend Integration:** Fully integrated in `backend/app/services/vision_service.py`.
- **Infrastructure:** Currently relies on Roboflow Serverless API (`inference_sdk`).

### Bin 2A: Experimental Skin Lesion Baseline
- **Status:** **IMPLEMENTED, TESTED, LOCALLY WORKING** (Experimental only).
- **Role:** A baseline model capable of identifying basic dermatological anomalies (e.g., mange, tick bites, superficial wounds).
- **Caveat:** Built with public/web-scraped data. It is explicitly NOT for clinical deployment and acts purely as an engineering pathfinder.

### Bin 2B: Clinical Data Infrastructure
- **Status:** **IMPLEMENTED, TESTED, LOCALLY WORKING**.
- **Role:** The data engineering backend required to safely ingest and validate actual veterinary data (Tier-A).
- **Components:**
  - `DatasetIngestor`: Validates metadata schemas and standardizes annotations.
  - `ImageQualityGate`: Detects blur, lighting, and artifact issues.
  - `DataLeakageEngine`: Ensures patient-level (dog-level) strict splitting across Train/Val/Test.

### Bin 2C: Clinical Production Readiness Gate
- **Status:** **IMPLEMENTED, TESTED, BLOCKED**.
- **Role:** The final barrier preventing unsafe model training or deployment.
- **Behavior:** It intentionally intercepts the pipeline and throws a `TrainingBlockedError` if valid Tier-A clinical data is not found.
- **Result:** Successfully blocks execution as expected. **Clinical model training cannot proceed until Tier-A data is provided.**

## Safety & Validation Protocol
The CV pipeline in PAWPHILE enforces a strict separation between consumer guidance and clinical diagnosis. Any future models trained from Bin 2C must pass rigorous evaluation against veterinary ground truth before entering production. PAWPHILE does not diagnose.
