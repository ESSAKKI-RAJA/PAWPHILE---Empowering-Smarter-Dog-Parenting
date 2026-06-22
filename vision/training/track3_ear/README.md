# Track 3: Ear Disease Classifier

**Phase:** 3.3

## Pipeline Architecture
This track classifies diseases in the ear canal using either consumer ear canal photos or video-otoscopic images.
- **Backbone:** ResNet (for classification format labels) or YOLOv8 (for bounding-box format labels).
- **Classes:**
  - Healthy Ear Canal
  - Otitis Externa
  - Ear Mass

## Dataset
- **Source:** Curated otoscopic image datasets.
- **Data Safety:** Never mix otoscopic, CT, or clinical images with consumer phone images in the same model without explicit domain separation.
- **Split Strategy:** Strict 70/15/15 train/val/test split by *dog identity* to prevent data leakage.

## Metrics
- **Target Metrics:** mAP, Precision, and Recall per class.

## Output
- Triage Score (Green, Orange, Red, Emergency)
- Saliency Map or bounding boxes indicating the area of concern.
