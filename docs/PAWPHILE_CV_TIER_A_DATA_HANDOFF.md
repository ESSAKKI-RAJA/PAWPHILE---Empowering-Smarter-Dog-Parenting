# PAWPHILE CV — Tier A Clinical Data Acquisition Handoff

## 1. Purpose
This document provides exact specifications for veterinary partners delivering **Tier-A clinical data** to PAWPHILE. This data is the sole dependency preventing PAWPHILE's Computer Vision system from advancing to production training. The system's safety gates strictly block processing until these requirements are met.

## 2. Patient Coverage
- **Volume**: A minimum of 500 unique dogs must be provided.
- **Controls**: At least 20% of the dataset must consist of healthy controls (dogs with normal skin).
- **Diversity**: The dataset must capture diverse breeds, coat types (long, short, double), and coat colors (especially black and white coats, where contrast varies).

## 3. Image Requirements
- **Resolution**: Minimum 512x512 pixels.
- **Quality**: Images must be in focus. PAWPHILE's automated quality gate (`quality_gate.py`) will automatically reject blurry, overly dark, or overexposed images via Laplacian variance and mean brightness checks.
- **Content**: The lesion must be clearly visible.

## 4. Required Metadata Structure
Metadata must be delivered as a CSV file matching the schema in `metadata_template.csv`.
- `image_id`: Must be unique.
- `dog_id`: A strictly pseudonymized ID (e.g., `dog_491`). The exact same ID must be used for multiple images of the same dog to prevent cross-split leakage.
- `breed`, `age_group`, `sex`, `body_region`, `capture_date`.
- `consent_status`: Must explicitly document owner/clinic consent.

## 5. Required Visual Findings (Ontology)
Annotations must strictly map to PAWPHILE's Level-2 Visual Findings, not clinical diseases.
Allowed findings: `erythema`, `alopecia`, `crust`, `scaling`, `erosion`, `ulcer`, `pustule`, `lichenification`, `papule`, `macule`.

## 6. Annotation Geometry
Annotations must be delivered in JSON format matching `annotation_template.json`.
- **Focal lesions** (e.g., pustules, ulcers) must use `"format": "bounding_box"`.
- **Diffuse conditions** (e.g., widespread erythema) must use `"format": "polygon"`.

## 7. Veterinary Review & Consensus
- All annotations must be performed by a licensed veterinarian.
- **Double-Blind Review**: At least 10% of the dataset must undergo independent review by a second veterinarian.
- **Consensus**: Conflicts must be resolved and logged using `review_template.json`. The final dataset manifest must carry a `clinical_validation_status = "consensus"` for the PAWPHILE readiness gate to unlock.

## 8. Privacy & Security
- **No PII**: All owner names, addresses, and clinic identifiers (unless explicitly approved) must be scrubbed before delivery.
- **Watermarks**: Images must not contain diagnostic overlays or text watermarks.

## 9. PAWPHILE Validation Process
Upon delivery, PAWPHILE will run the data through:
1. `validate_metadata.py` & `validate_annotations.py`
2. `quality_gate.py`
3. `leakage_engine.py` (Detects identical images, perceptual copies, and dog-level cross-contamination).
4. `bin2c_readiness_gate.py` (The final hard block).

If all checks pass, the dataset will be locked into `PAWPHILE-SKIN-v1.0` and GPU training will commence.
