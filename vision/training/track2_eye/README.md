# Track 2: Eye Condition Classifier with Segmentation

**Phase:** 3.2

## Pipeline Architecture
This track uses a two-stage pipeline:
1. **Localization (Segmentation):** U-Net model. It accepts close-up phone or clinic photos of the dog's eye and outputs a segmentation mask isolating the region of concern (e.g. lesion, cloudiness, redness). 
   - **Target Metric:** IoU > 80%
2. **Classification:** A secondary classifier runs on the cropped localized region.
   - **Target Metric:** F1 Score
   - **Classes:**
     - Conjunctivitis
     - Corneal Ulcer
     - Cataract
     - Glaucoma
     - Healthy Eye

## Dataset
- **Source:** DogEyeSeg4 (145 clinical images annotated for four classes).
- **Split Strategy:** Strict 70/15/15 train/val/test split by *dog identity*, not image.

## Output
- Triage Score (Green, Orange, Red, Emergency)
- Grad-CAM / Segmentation overlay highlighting the flagged region for the owner.
