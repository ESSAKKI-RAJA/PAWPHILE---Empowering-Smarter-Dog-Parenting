# PAWPHILE CV BIN 2A: Veterinary Visual Intelligence (Skin)

## 1. Executive Summary & Training Readiness

> [!WARNING]
> **TRAINING READINESS: READY FOR EXPERIMENTAL TRAINING ONLY**
> 
> The Bin 2A (Skin) module has passed the safety and data-leakage gates, but it is **NOT** ready for clinical-grade training. 
> - **Reason**: Our forensic perceptual hashing audit revealed that over 83% of the raw open-source datasets (Roboflow/Kaggle) were pre-augmented duplicates leaking across splits. 
> - After enforcing strict de-duplication, we are left with only ~1,616 unique images. 
> - Furthermore, the original labels are unverified disease names rather than physical lesions. 
> - Therefore, any model trained on this data is purely a **Research Prototype** for engineering validation. It cannot and must not be used for veterinary diagnostic authority.

## 2. Dataset Inventory & Tiers

We audited three datasets: Roboflow Dog Skin v2, Kaggle Dog Skin, and a Multispectral Dog dataset. 
After running `cv/skin_lesion/scripts/data_forensics.py`:

- **Tier A (Clinically Validated)**: 0 images.
- **Tier B (Research Quality, Dog IDs available)**: 25 images.
- **Tier C (Unknown Provenance, No Dog IDs)**: 1,591 images.
- **Tier D (Excluded Leakage / Duplicates)**: 8,048 images.

**Clean Dataset Size**: 1,616 images total.

## 3. Label Ontology

To adhere to PAWPHILE's First-Principles (Visual Evidence -> Condition), we mapped the flawed disease labels to a proxy ontology of lesions.

**Visible Findings (Target Training Classes)**:
- Erythema, Alopecia, Crust, Scaling, Erosion, Ulcer, Pustule, Lichenification.

**Possible Conditions (Inference Output)**:
- Bacterial dermatosis, Fungal infection, Hypersensitivity, Demodicosis, Healthy, Nonspecific dermatitis.

*Note: All current dataset mappings are marked `clinical_validation: unsupported` in the manifest.*

## 4. Split Strategy

Because the vast majority of our surviving images (Tier C) lack `dog_id` metadata, a true patient-level split is impossible. We are forced to rely on an image-level split.
> [!CAUTION]
> **Patient-level leakage prevention cannot be guaranteed for Tier C data.**

## 5. Model Architecture (Baseline)

- **Detection/Crop**: YOLOv8n (inherited from Bin 1).
- **Skin Classification**: EfficientNet-B0 (Transfer Learning).
  - *Justification*: EfficientNet-B0 is lightweight, converges quickly on small datasets (like our 1.6k limit), and supports the Multi-label Binary Cross Entropy (`BCEWithLogitsLoss`) required to predict multiple co-occurring lesions simultaneously.

## 6. Confidence Methodology & Calibration Status

- **Status**: Implemented structurally. 
- The inference contract requires a `threshold` against the `calibrated_confidence`. If a prediction falls below the threshold, it is explicitly rejected (`accepted: false`) with the message: *"Insufficient confidence for reliable classification."*
- **Calibration**: Expected Calibration Error (ECE) and Temperature Scaling are scaffolded in `cv/calibration/`, awaiting converged `.pth` weights to execute.

## 7. OOD & Explainability

- **OOD**: Inherited from Bin 1 (rejects non-dogs before skin analysis).
- **Explainability**: Grad-CAM is structurally ready to output heatmaps validating if the model is focusing on the lesion vs. the background.

## 8. Remaining Data Requirements

To upgrade Bin 2A from "Experimental Prototype" to "Production Ready", PAWPHILE requires:
1. A minimum of 5,000 *unique* canine skin images.
2. Verified `dog_id` tags to enforce patient-level splits.
3. Bounding box or segmentation annotations explicitly highlighting the *lesions* (e.g., Erythema polygon), drawn or verified by a licensed veterinarian. 
4. An independent hospital-level test cohort.
