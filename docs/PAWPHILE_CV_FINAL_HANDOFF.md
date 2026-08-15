# PAWPHILE CV Final Engineering Handoff

## 1. What Is Complete
The complete architecture and safety pipelines for Bin 1 (Dog Localization), Bin 2A (Experimental Skin Baseline), Bin 2B (Clinical Data Infrastructure), and Bin 2C (Clinical Ingestion & Readiness) have been completely built, audited, and tested. The safety gate mechanism mathematically enforces our validation constraints.

## 2. What Is Frozen
- **Ontology**: 4-level separation between visual findings and clinical diseases.
- **Clinical Data Contract**: Required JSON/CSV metadata and bounding-box/polygon schemas.
- **Leakage Policy**: Hashing and perceptual duplicate checks.
- **Dog-Level Split Policy**: 70/15/15 isolated by `dog_id`.
- **Readiness Gates**: The programmatic hard block on unvalidated data.
- **Confidence Contract**: Strict separation between `raw_probability`, `calibrated_confidence`, and `uncertainty`.
- **Production Isolation**: The Roboflow pipeline remains entirely decoupled from unvalidated experimental models.

## 3. What Is Blocked
- Training a Production Candidate Skin Model.
- Calibrating Model Confidence.
- Performing External Validation.
- Shadow-Testing the New Model.
- Production Deployment.

## 4. Why It Is Blocked
**Absence of Tier-A Veterinary Data.** The system absolutely refuses to train a clinical model using proxy Kaggle datasets or unverified web images. Real-world veterinary annotations are the only acceptable ground truth.

## 5. Exact Tier-A Requirements
- Minimum 500 unique dogs.
- Pseudonymized `dog_id` tracking.
- Minimum 512x512 resolution (1024x1024 preferred).
- Veterinarian annotations strictly mapping to PAWPHILE Level-2 Visual Findings.
- At least 20% healthy controls.
- 10% double-blind review with resolved consensus.

## 6. Exact Command to Ingest Future Data
When data arrives, place it in the correct format and run:
```bash
$env:PYTHONPATH="."
python cv/skin_lesion/clinical_ingestion/ingest_dataset.py
```

## 7. Exact Readiness-Gate Command
```bash
$env:PYTHONPATH="."
python cv/skin_lesion/infrastructure/bin2c_readiness_gate.py
```

## 8. Exact Resume Sequence
1. Receive Tier-A clinical data
2. Validate metadata
3. Validate annotations
4. Run quality gate
5. Run leakage engine
6. Create patient-level split
7. Verify veterinary consensus
8. Run readiness gate
9. Analyze annotation geometry
10. Select architecture
11. Freeze training configuration
12. Train on CUDA
13. Evaluate
14. Tune thresholds
15. Calibrate
16. Measure ECE/Brier
17. Perform OOD evaluation
18. Perform explainability review
19. Perform independent clinical validation
20. Shadow-test against Roboflow
21. Production safety approval

## 9. Production Safety Conditions
The unvalidated skin models must **not** be integrated into `backend/app/services/vision_service.py`. Only after completing the 21-step resume sequence (including shadow testing and independent clinical validation) can the Roboflow endpoints be deprecated.

## 10. Explicit Clinical Claims Statement
**NO CLINICAL CLAIMS ARE CURRENTLY SUPPORTED.** The PAWPHILE CV skin lesion model is completely unvalidated and is blocked from making any veterinary diagnoses. Any current output represents a *research association* only.
