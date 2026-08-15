# PAWPHILE CV Architecture Freeze

This document formalizes the final engineering freeze of the PAWPHILE Computer Vision architecture prior to Tier-A clinical data acquisition.

## 1. What Is Frozen

The following architectural components are **LOCKED** and may not be altered without a formal architectural review:

* **Safety Architecture**: The pipeline inherently rejects raw logs masquerading as calibrated confidence and enforces strict thresholding and OOD rejection.
* **Ontology**: The 4-level hierarchy separating Visual Findings (Level 2) from Clinical Conditions (Level 3). CV targets Level 2 only.
* **Clinical Ingestion Architecture**: The JSON/CSV schemas and the automated validation scripts that enforce them.
* **Leakage Prevention**: The hashing and split mechanisms that prevent identical bytes or perceptual duplicates from bleeding across train/test splits.
* **Dog-Level Splitting**: The absolute mandate to isolate patients across splits (70/15/15) based strictly on `dog_id`.
* **Readiness Gates**: The programmatic blocks (`readiness_gate.py`) that throw `TrainingBlockedError` if dataset criteria (volume, leakage, consensus) are not met.
* **Inference Contract**: The required JSON output schema including `raw_confidence`, `calibrated_confidence`, `uncertainty`, and `accepted` booleans.
* **Roboflow Isolation**: The mandate that experimental or unvalidated CV code must not replace the production Roboflow integration (`backend/app/services/vision_service.py`) until formal shadow-mode validation is complete.

## 2. What Remains Data-Dependent

The following components are **NOT YET SELECTED** and must be determined *after* analyzing the final Tier-A annotations:

* **Final Skin Model Architecture**: We will select YOLO-family, U-Net, EfficientNet, or a hybrid based on whether the veterinarians predominantly draw bounding boxes, polygons, or provide image-level labels.
* **Exact Training Hyperparameters**: Learning rates, batch sizes, and augmentation strategies will be tuned based on the empirical dataset.
* **Threshold Values**: Safe rejection thresholds will be tuned against the validation dataset.
* **Calibration Temperature**: Will be fit post-training using the isolated validation set.
* **Clinical Performance Metrics**: Accuracy, Precision, Recall, F1, and Expected Calibration Error.
* **External Validation Results**: Performance on the independent test cohort.
