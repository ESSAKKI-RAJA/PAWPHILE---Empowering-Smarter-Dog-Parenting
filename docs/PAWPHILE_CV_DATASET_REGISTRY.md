# PAWPHILE CV DATASET REGISTRY

## STEP 1 & 2 — Dataset Registry

| Field | Stanford Dogs Dataset | Canine Skin Lesion Paper (Kang et al.) | Roboflow Dog Skin Disease Dataset | Kaggle Dog Skin Disease Dataset | Canine Ear Lesion Paper (Apostolopoulos) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dataset ID** | DS_STANFORD_DOGS | DOC_SKIN_LESION_KANG | DS_ROBOFLOW_SKIN | DS_KAGGLE_SKIN | DOC_EAR_LESION |
| **Resource name** | Stanford Dogs Dataset | Artificial Intelligence-Based Identification of Common Canine Skin Lesions From Clinical Images | Dog Skin Disease Dataset (v2) | Dog's Skin Diseases - Image Dataset | Detection of canine external ear canal lesions using artificial intelligence |
| **Local path** | `C:\Users\ESSAKKI RAJA T EV\OneDrive\Desktop\DB PAWPHILE\images.tar` (and related `.tar`/`.mat`) | `C:\Users\ESSAKKI RAJA T EV\OneDrive\Desktop\DB PAWPHILE\Veterinary Dermatology - 2026 - Kang...pdf` | `C:\Users\ESSAKKI RAJA T EV\OneDrive\Desktop\DB PAWPHILE\Dog Skin Disease Dataset.v2i.folder` | `C:\Users\ESSAKKI RAJA T EV\OneDrive\Desktop\DB PAWPHILE\archive` | `C:\Users\ESSAKKI RAJA T EV\OneDrive\Desktop\DB PAWPHILE\Veterinary Dermatology - 2025 - Apostolopoulos...pdf` |
| **Resource type** | TAR Archives & MAT files | PDF Document | Folder (Images & TXT) | Folder (Images) | PDF Document |
| **Source** | Stanford University | Seoul National University VMTH | Roboflow (User Uploaded) | Kaggle | University of Wisconsin-Madison |
| **Authors** | Khosla et al. | Kang et al. | Unknown Roboflow user | Unknown Kaggle user | Apostolopoulos et al. |
| **Publication year** | 2011 | 2026 | 2025 | Unknown | 2025 |
| **License** | Non-commercial research use | N/A (Paper only) | CC BY 4.0 | UNKNOWN — VERIFY BEFORE TRAINING/DEPLOYMENT | N/A (Paper only) |
| **Number of images** | ~20,580 | Total ~11,228 images evaluated | 4,398 | 4,315 | Up to 4,342 depending on dataset variant |
| **Number of classes** | 120 | 4 | 4 | 6 | 3 |
| **Classes** | 120 dog breeds | Erythema, lichenification, alopecia, erosion/ulcer | Bacterial dermatosis, fungal infection, healthy, hypersensitivity dermatitis | Demodicosis, Dermatitis, Fungal infections, Healthy, Hypersensitivity, Ringworm | Healthy, Mass, Otitis |
| **Breed information** | Detailed per class | Various clinical | Unknown | Unknown | Various clinical |
| **Body areas** | Whole body | Skin | Skin | Skin | Ear Canal |
| **Disease/condition labels** | No | Yes | Yes | Yes | Yes |
| **Healthy class available?** | N/A (all healthy breeds) | No (uses "negative" for absence of lesion) | Yes | Yes | Yes |
| **Bounding boxes** | Yes (`annotation.tar`) | Unknown/Not specified (cropping used) | No | No | Yes (YOLO format in paper) |
| **Segmentation masks** | No | No | No | No | No |
| **Classification labels** | Yes | Yes | Yes (Folder format) | Yes (Folder format) | Yes |
| **Image format** | JPG | Clinical JPGs (in paper) | JPG | JPG | Video-otoscope JPGs |
| **Image resolution** | Varied | 600x600 (resized for training) | 640x640 | Varied | 416x416 (resized) |
| **Train split** | Yes (`train_data.mat`) | Yes | Yes (`train/`) | Yes (`train/`) | Yes (90%) |
| **Validation split** | No (Train/Test only) | Yes | Yes (`valid/`) | Yes (`valid/`) | No |
| **Test split** | Yes (`test_data.mat`) | Yes (independent) | Yes (`test/`) | Yes (`test/`) | Yes (10%) |
| **Veterinary annotation** | No | Yes | UNKNOWN — VERIFY | UNKNOWN — VERIFY | Yes (Board-certified) |
| **Clinical confirmation** | No | Yes | UNKNOWN — VERIFY | UNKNOWN — VERIFY | Yes |
| **Metadata available** | Limited | Detailed in paper | Basic | Basic | Detailed in paper |
| **Suitable for PAWPHILE?**| Partially (Missing Indian breeds) | Yes (Methodology reference) | Needs careful validation | Needs careful validation | Yes (Methodology reference) |
| **Recommended usage** | Supplementary Data | Research Reference Only | Supplementary Data | Supplementary Data | Research Reference Only |
| **Major limitations** | Lacks 5 specific PAWPHILE breeds | Paper only; no dataset | Unknown label quality & veterinary validation | Unknown origin and label quality | Paper only; no dataset |


## STEP 3 — Stanford Dogs Dataset Audit

The dataset contains 120 breeds with approximately 20,580 images. Bounding boxes are provided.

| PAWPHILE Breed | Stanford Dogs Present? | Approx. Images | Recommended Use |
| :--- | :---: | :---: | :--- |
| Labrador Retriever | YES | 172 | Use directly for initial breed model |
| German Shepherd | YES | 153 | Use directly for initial breed model |
| Golden Retriever | YES | 151 | Use directly for initial breed model |
| Pug | YES | 201 | Use directly for initial breed model |
| Beagle | YES | 196 | Use directly for initial breed model |
| Shih Tzu | YES | 215 | Use directly for initial breed model |
| Rottweiler | YES | 153 | Use directly for initial breed model |
| Indian Pariah Dog | NO | 0 | Must source custom data |
| Dachshund | NO | 0 | Must source custom data |
| Doberman | YES | 151 | Use directly for initial breed model |
| Pomeranian | YES | 220 | Use directly for initial breed model |
| Siberian Husky | YES | 193 | Use directly for initial breed model |
| Great Dane | YES | 157 | Use directly for initial breed model |
| Boxer | YES | 152 | Use directly for initial breed model |
| Cocker Spaniel | YES | 160 | Use directly for initial breed model |
| Saint Bernard | YES | 171 | Use directly for initial breed model |
| Chihuahua | YES | 153 | Use directly for initial breed model |
| Rajapalayam | NO | 0 | Must source custom data |
| Kombai | NO | 0 | Must source custom data |
| Mudhol Hound | NO | 0 | Must source custom data |


## STEP 4 — Canine Skin Lesion Research Dataset (Kang et al. 2026)

- **Origin**: Clinical images collected at SNU-VMTH (2023-2024).
- **Lesion Classes**: Erythema (3968 images), Lichenification (2512), Alopecia (2763), Erosion/Ulcer (1985).
- **Clinical Labels**: Labelled as positive (lesion present) or negative (lesion absent).
- **Annotation Process**: Bounding boxes/segmentation not explicitly detailed, but images were cropped to center on the lesion. Cross-validated by independent evaluators and a board-certified clinician.
- **Model**: EfficientNet (CNN).
- **Evaluation**: Accuracy >90% across all models.
- **Data Acquisition**: Various smartphones, natural clinical population.
- **Visual Lesion vs. Diagnosis**: This paper explicitly distinguishes **visual lesion classification** (identifying physical symptoms like alopecia or erythema) from **disease diagnosis** (e.g. diagnosing ringworm or demodicosis). PAWPHILE must learn to detect the *visual finding* first before predicting a *disease condition*.


## STEP 5 — Roboflow Dog Skin Disease Dataset

- **Version**: v2 (Exported Mar 14, 2025).
- **Image Count**: 4,398.
- **Classes**: bacterial dermatosis, fungal infection, healthy, hypersensitivity dermatitis.
- **Annotations**: Folder-based image classification (no bounding boxes).
- **Splits**: train, valid, test.
- **Dimensions**: Pre-processed to 640x640.
- **Label Quality**: UNKNOWN — VERIFY. Requires clinical auditing before use.
- **Veterinary Validation**: Unclear.
- **Source**: "Provided by a Roboflow user".
- **License**: CC BY 4.0.


## STEP 6 — Kaggle Dog Skin Disease Dataset

- **Origin/Source**: Unknown Kaggle user.
- **Image Count**: 4,315.
- **Classes**: demodicosis, Dermatitis, Fungal_infections, Healthy, Hypersensitivity, ringworm.
- **Annotations**: Folder-based image classification.
- **Splits**: train, valid, test.
- **Veterinary Validation**: UNKNOWN — VERIFY.
- **License**: UNKNOWN — VERIFY BEFORE TRAINING/DEPLOYMENT.
- **Suitability**: Supplementary experimentation only, pending rigorous veterinary review of the labels. Not suitable for production training.


## STEP 7 — Canine External Ear Canal Lesion Research (Apostolopoulos et al. 2025)

- **Origin**: University of Wisconsin-Madison (video-otoscopy images).
- **Classes**: Healthy, Mass, Otitis (which includes erythema, pus, debris, etc).
- **Annotations**: YOLO format bounding boxes.
- **Model**: YOLOv5.
- **Detection Methodology**: Object detection (predicting bounding boxes for ear canal regions).
- **Veterinary Annotation**: Labelled by a board-certified referral clinician.
- **Mapping to PAWPHILE**: This informs the **Ear Vision** module, proving that YOLO models can accurately identify otitis vs healthy canals using bounding box methodologies. 


## STEP 8 — PAWPHILE CV Coverage Matrix

| CV Capability | Current Dataset Available? | Dataset | Coverage | Missing Data |
| :--- | :---: | :--- | :--- | :--- |
| Dog detection | YES | Stanford Dogs | Good for breed bounding boxes | Challenging lighting/angles |
| Breed recognition | PARTIAL | Stanford Dogs | 15 of 20 breeds | Indian breeds (Pariah, Rajapalayam, etc) & Dachshund |
| Skin detection | NO | N/A | None | Body region semantic segmentation data |
| Skin lesion detection | NO | N/A | None (Only classification data exists) | Bounding box/mask data for specific lesions |
| Skin condition classification | YES (Unverified) | Roboflow / Kaggle | Moderate | Veterinary-validated condition sets |
| Ear lesion detection | NO (Paper only) | N/A | None | Annotated otoscopy datasets |
| Eye analysis | NO | N/A | None | Annotated ophthalmic datasets |
| Paw analysis | NO | N/A | None | Annotated pododermatitis datasets |
| Wound analysis | NO | N/A | None | Trauma/Wound specific datasets |
| Healthy/normal classification | YES | Roboflow / Kaggle | Moderate | Diverse healthy baselines |
| Image quality assessment | NO | N/A | None | Blurry, occluded, or poorly lit datasets |


## STEP 9 — Missing PAWPHILE Data

- **Indian Native Breeds**: Indian Pariah Dog, Rajapalayam, Kombai, Mudhol Hound.
- **Missing Common Breeds**: Dachshund.
- **Specific Body Areas**: Datasets specifically cropped or annotated for Eye, Ear, Paw, and Wounds.
- **Clinical Quality Labels**: We lack veterinary-confirmed datasets for skin diseases. Current Kaggle/Roboflow sets have unknown provenance.
- **Diversity**: Need more smartphone-captured, varying lighting, different coat types, and severities.


## STEP 10 — Training Status

**NO TRAINING HAS BEEN PERFORMED.** This is purely an audit.


## STEP 11 — Dataset Quality & Leakage Audit Risks

For Roboflow and Kaggle:
- **Augmentation Leakage**: The Roboflow dataset `README` explicitly states it includes "3 versions of each source image" (adjusting brightness/exposure). If splits were done *after* augmentation, this causes severe data leakage.
- **Duplicates**: Web-scraped Kaggle datasets frequently contain duplicates. (The Apostolopoulos paper explicitly notes that datasets A and C inflated metrics due to duplicate leakage).
- **Class Imbalance**: High likelihood of imbalance between healthy and specific conditions.
- **Repeated Cases**: Multiple crops of the same dog in train/test splits would artificially inflate accuracy.


## STEP 12 — Licensing & Research Use

- **Stanford Dogs**: Non-commercial research only. (May need alternatives for commercial deployment).
- **Roboflow Dataset**: CC BY 4.0 (Commercial use generally OK, requires attribution).
- **Kaggle Dataset**: `LICENSE STATUS: UNKNOWN — VERIFY BEFORE TRAINING/DEPLOYMENT`.
- **Papers (Kang, Apostolopoulos)**: Research reference only.


## STEP 13 — Final Recommendation

### A. USE DIRECTLY
- **Stanford Dogs Dataset** (for 15 supported breeds, research/demo only).

### B. USE AS SUPPLEMENTARY DATA
- **Roboflow Dog Skin Disease Dataset** (requires veterinary validation before promoting to primary).
- **Kaggle Dog Skin Disease Dataset** (quarantine until license and quality verified).

### C. RESEARCH REFERENCE ONLY
- **Artificial Intelligence-Based Identification of Common Canine Skin Lesions From Clinical Images** (Kang et al.)
- **Detection of Canine External Ear Canal Lesions Using Artificial Intelligence** (Apostolopoulos et al.)

### D. DO NOT USE
- None explicitly, but Kaggle must not be used in production yet.

### E. DATASETS WE STILL NEED
- Indian dog breed dataset.
- Veterinary-validated bounding box dataset for skin, ear, and eye lesions.
- Image quality assessment dataset (blurry vs clear).


## STEP 14 — Final Architecture Recommendation

```text
Image
  ↓
Image Quality Engine [FUTURE PROPOSED CAPABILITY]
  ↓
Dog Detection [CURRENTLY IMPLEMENTED / RESEARCH-READY]
  ↓
Body Region Detection [FUTURE PROPOSED CAPABILITY]
  ↓
Lesion Detection / Segmentation [FUTURE PROPOSED CAPABILITY]
  ↓
Visual Finding Classification (e.g. Erythema vs Alopecia) [RESEARCH-READY]
  ↓
Condition Screening (e.g. Fungal vs Bacterial) [RESEARCH-READY]
  ↓
Confidence Calibration [FUTURE PROPOSED CAPABILITY]
  ↓
Breed Context [CURRENTLY IMPLEMENTED]
  ↓
Dog Health Context [FUTURE PROPOSED CAPABILITY]
  ↓
PAW AI [CURRENTLY IMPLEMENTED]
  ↓
Deterministic Safety Engine [FUTURE PROPOSED CAPABILITY]
  ↓
Red / Yellow / Green [CURRENTLY IMPLEMENTED]
```


## STEP 15 — Git Safety

Verified no modifications to existing source code, environments, or git structure were made. This is a read-only dataset audit.
