# PAWPHILE CV Bin 2B: Architecture & Confidence Strategy

## 1. Overview
The objective of Bin 2B is to establish a secure clinical data pipeline. The ultimate goal of this pipeline is to feed **Bin 2C**, where the actual Production Candidate model will be trained.

## 2. Future Architecture Selection (Bin 2C)
We will NOT automatically default to `EfficientNet-B0`. The architecture will be chosen based on the distribution of annotations in the Tier A dataset.

- **Option A: YOLO (v8/v11)**
  - *Use Case*: If the veterinarians predominantly use Bounding Boxes for localized lesions (e.g., pustules, ulcers, tumors).
  - *Advantage*: Extremely fast, native edge deployment, native localization.
- **Option B: U-Net / Segmentation**
  - *Use Case*: If the veterinarians predominantly use Polygons for diffuse conditions (e.g., widespread erythema, diffuse scaling).
  - *Advantage*: High-resolution pixel-perfect boundaries.
- **Option C: ConvNeXt / EfficientNet (Multi-Label)**
  - *Use Case*: If localization annotations fail IRR, and we are forced to rely on image-level multi-label presence.
  - *Advantage*: Robust, requires less annotation time.

## 3. Confidence Architecture (The "No Uncalibrated Output" Rule)
In Bin 2C, the model must maintain strict confidence boundaries:
1. **Raw Probability**: Extracted from the Sigmoid/Softmax output.
2. **Calibrated Confidence**: Calculated using Temperature Scaling on a held-out Validation set to ensure that when the model says "90% confident", it is historically accurate 90% of the time.
3. **Uncertainty Rejection**: Any calibrated confidence that falls in the uncertainty band (e.g., 40% - 60%) must automatically set `"accepted": false`.

## 4. The Disease Association Layer
The Computer Vision model stops at Level 2 (Visual Findings).
The mapping to Level 3 (Clinical Conditions) happens via logical association.

**Example Matrix:**
- Erythema + Pustule + Crust ➔ `possible condition: bacterial dermatosis`
- Alopecia + Scaling ➔ `possible condition: fungal infection`
- Erythema + Lichenification + Paw Region ➔ `possible condition: hypersensitivity dermatitis`

**Output Mandate**: The API MUST wrap these mappings in `"status": "research_association"` and display the disclaimer: *"This output is a research prototype and is not a veterinary diagnosis."*

## 5. Explainability (Grad-CAM Qualitative Review)
For classification architectures, Grad-CAM will be used to generate heatmaps.
Validation in Bin 2C requires a human qualitative review of these heatmaps.
We must manually verify that the model's highest activations land on the *actual lesion*, rather than:
- The dog's collar
- The clinical examination table
- Fingers/Gloves in the frame
- Breed-specific fur patterns
