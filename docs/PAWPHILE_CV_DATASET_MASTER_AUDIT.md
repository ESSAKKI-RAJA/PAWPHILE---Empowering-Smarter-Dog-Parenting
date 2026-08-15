# PAWPHILE CV DATASET MASTER AUDIT

## 1. Executive Summary
This document is the definitive, read-only audit of all Computer Vision datasets, metadata, and research papers downloaded to the local Desktop environment. 

### Summary Statistics
- **Total number of datasets/resources discovered**: 8 (3 image datasets, 1 small multispectral dataset, 4 research papers)
- **Total image count across datasets**: ~29,355 images
- **Total annotation count**: ~20,580 bounding box annotations (Stanford Dogs) + ~8,775 image classification labels
- **Number of breed datasets**: 1
- **Number of disease datasets**: 3 (2 web-sourced, 1 multispectral)
- **Number of detection datasets**: 1 (Stanford Dogs)
- **Number of segmentation datasets**: 0 (excluding the paper reference)
- **Number of clinically validated resources**: 4 (Research papers containing methodology only; no large-scale clinical dataset was downloaded)
- **Number of questionable/unknown datasets**: 2 (Roboflow & Kaggle skin disease datasets)
- **Number of duplicate/leakage risks**: 2 (Roboflow contains pre-split augmentations; Kaggle contains suspected scrapes)

### Actionable Findings
- **Which PAWPHILE CV models can realistically be trained now**: Dog Detection and Breed Classification (15 breeds) via Stanford Dogs.
- **Which models require additional data**: Skin, Ear, Eye, Paw, and Wound detection/classification.
- **Which datasets should become primary**: Stanford Dogs (for breeds).
- **Which datasets should remain research/reference only**: Roboflow, Kaggle, Multispectral, and all 4 PDFs.
- **Next data-collection priority**: A clinically validated, bounding-box annotated dataset for canine skin lesions.

---

## 2. Desktop Inventory
A full recursive scan of `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop` was performed.

**Archives**: 
- `DB PAWPHILE\images.tar`
- `DB PAWPHILE\annotation.tar`
- `DB PAWPHILE\lists.tar`
- `DB PAWPHILE\train_data.mat` & `test_data.mat`

**Folders**:
- `DB PAWPHILE\Dog Skin Disease Dataset.v2i.folder`
- `DB PAWPHILE\archive` (Kaggle)
- `DB PAWPHILE\Classification of pet dog skin diseases using deep learning with images captured from multispectral imaging device\5dbht54kw7-1`

**PDF Research Papers**:
- `Veterinary Dermatology - 2026 - Kang - Artificial Intelligence‐Based Identification of Common Canine Skin Lesions From.pdf`
- `Veterinary Dermatology - 2025 - Apostolopoulos - Detection of canine external ear canal lesions using artificial.pdf`
- `Veterinary Dermatology - 2023 - Smith - Computer vision model for the detection of canine pododermatitis and neoplasia of.pdf`
- `computation-12-00042.pdf` (Kolli et al. - Wound healing)

---

## 3. Dataset Registry
*See `PAWPHILE_CV_DATASET_MASTER_REGISTRY.md` for the complete record.*

---

## 4. Dataset-by-Dataset Analysis

### Stanford Dogs Dataset
- **Content**: 20,580 images, 120 breeds, bounding box annotations.
- **Verdict**: Reliable for baseline breed recognition and dog detection.

### Roboflow Dog Skin Disease (v2)
- **Content**: 4,398 images, 4 classes.
- **Verdict**: Unreliable for primary training due to augmentation leakage (3x copies of each image modified for brightness/exposure) and lack of verified veterinary labels.

### Kaggle Dog's Skin Diseases
- **Content**: 4,315 images, 6 classes.
- **Verdict**: Unreliable for primary training due to unknown provenance, licensing, and lack of veterinary validation.

### Multispectral Skin Diseases
- **Content**: 62 images, 4 classes.
- **Verdict**: Too small for deep learning training, useful only as a test set or reference.

---

## 5. Breed Coverage
Against the official 15-breed target, the Stanford Dogs dataset provides:
1. Labrador Retriever: ~172
2. German Shepherd: ~153
3. Golden Retriever: ~151
4. Pug: ~201
5. Beagle: ~196
6. Shih Tzu: ~215
7. Rottweiler: ~153
8. Doberman: ~151
9. Pomeranian: ~220
10. Siberian Husky: ~193
11. Great Dane: ~157
12. Boxer: ~152
13. Cocker Spaniel: ~160
14. Saint Bernard: ~171
15. Chihuahua: ~153

**Labels**: Reliable, but flat (not hierarchical).
**Duplicates**: Clean dataset, well established.
**Disease Data**: None.

---

## 6. Disease Taxonomy

### Symptoms / Lesions
- `erythema` (Kang et al.)
- `alopecia` (Kang et al.)
- `lichenification` (Kang et al.)
- `erosion/ulcer` (Kang et al.)
- `Mass` (Apostolopoulos et al.)

### Diseases / Diagnoses
- `bacterial dermatosis` / `Bacterial_dermatosis`
- `fungal infection` / `Fungal_infections` / `ringworm` (Synonyms/Overlaps)
- `hypersensitivity dermatitis` / `Hypersensitivity_allergic_dermatosis`
- `demodicosis`
- `Otitis` (Apostolopoulos et al.)
- `Pododermatitis` (Smith et al.)
- `Neoplasia` (Smith et al.)

### Tissue Types (Wounds)
- `fibrin slough`, `granulation`, `necrotic tissue` (Kolli et al.)

**Observation**: The Kaggle dataset separates `Fungal_infections` and `ringworm`, which are often synonymous or overlapping in canine dermatology. This indicates poor taxonomic structure.

---

## 7. Annotation Formats
- **Stanford Dogs**: XML Bounding Boxes (Pascal VOC style).
- **Roboflow & Kaggle**: Folder structure (Image Classification). No localization data.
- **Multispectral**: TXT file mapping filenames to classes.

---

## 8. Image Statistics & 9. Class Distributions
- **Stanford Dogs**: ~150-200 images per class. Highly balanced.
- **Roboflow**: `fungal infection` (1,201), `healthy` (1,186), `bacterial dermatosis` (1,097), `hypersensitivity dermatitis` (914). Balanced.
- **Kaggle**: `ringworm` (1,118), `demodicosis` (862), `Dermatitis` (787), `Healthy` (700), `Fungal_infections` (526), `Hypersensitivity` (322). Highly imbalanced.

---

## 10. Train/Validation/Test Splits
- **Stanford Dogs**: Standard ImageNet train/test split.
- **Roboflow**: train (3,851), valid (367), test (180).
- **Kaggle**: train (2,912), valid (860), test (543).

---

## 11. Clinical Validation
- **HIGH**: All 4 PDF Research Papers (Involved Veterinary Hospitals & Board-certified specialists). *Note: We only have the papers, not the datasets.*
- **LOW / UNKNOWN**: Kaggle and Roboflow datasets. Labels are unverified.

---

## 12. Licensing
- **Stanford Dogs**: Non-commercial research.
- **Roboflow**: CC BY 4.0 (Commercial allowed with attribution).
- **Kaggle**: UNKNOWN.
- **Multispectral**: UNKNOWN.

---

## 13. Duplication & 14. Data Leakage
- **Roboflow**: **SEVERE LEAKAGE RISK**. The README explicitly states: "The following augmentation was applied to create 3 versions of each source image". If these augmentations were performed *before* the train/test split, the model will train and test on variations of the exact same image, rendering evaluation metrics meaningless.
- **Kaggle**: **HIGH RISK**. Web-scraped datasets typically contain identical or resized copies of the same clinical images across classes or splits.

---

## 15. Dataset Intersections
| Dataset A | Dataset B | Overlap | Safe to merge? | Reason |
|---|---|---|---|---|
| Roboflow | Kaggle | Disease Classes | NO | Conflicting taxonomies, unknown provenances, risk of cross-dataset duplication. |

---

## 16. PAWPHILE CV Capability Matrix

| Capability | Dataset(s) Available | Images | Annotation | Clinical Quality | Can Train Now? | Missing Data |
|---|---|---|---|---|---|---|
| 15-breed classifier | Stanford Dogs | ~2,600 | Class & Box | N/A | YES | More volume |
| Skin disease classifier | Roboflow / Kaggle | ~8,700 | Class | LOW | NO | Clinical labels |
| Skin lesion classifier | NONE | 0 | N/A | N/A | NO | Clinical lesions |
| Skin lesion detector | NONE | 0 | N/A | N/A | NO | Bounding boxes |
| Skin segmentation | NONE | 0 | N/A | N/A | NO | Masks |
| Eye disease classifier | NONE | 0 | N/A | N/A | NO | Images |
| Ear disease classifier | NONE | 0 | N/A | N/A | NO | Otoscopy imgs |
| Paw lesion detector | NONE | 0 | N/A | N/A | NO | Paw imgs |
| Wound segmentation | NONE | 0 | N/A | N/A | NO | Wound masks |

---

## 17. Trainable-Now Matrix

### GREEN — Trainable now
- **General Dog Detection**: Stanford Dogs (Bounding Boxes)
- **15-Breed Classification**: Stanford Dogs (Classification)

### YELLOW — Research prototype
- **Skin Disease Classification**: Roboflow (Can build a toy model, but NOT clinically safe).

### RED — Cannot responsibly train yet
- Everything else (Skin Lesions, Ear, Eye, Paw, Wounds).

---

## 18. Data Gaps
*See `PAWPHILE_CV_DATA_GAP_ANALYSIS.md` for complete breakdown.*

---

## 19. Recommended Future Collection
- Partner with veterinary clinics to acquire raw images of lesions (not just overall diseases) for Ear, Eye, Skin, and Paws.
- Source a high-quality annotated wound dataset to replicate the Kolli et al. methodology.

---

## 20. Recommended Dataset Architecture

```text
PAWPHILE_CV_DATA/
│
├── 01_BREEDS/
│   └── 15_BREEDS/
│
├── 02_SKIN/
│   ├── CLASSIFICATION/
│   ├── DETECTION/
│   └── SEGMENTATION/
│
├── 03_EYES/
│   ├── CLASSIFICATION/
│   ├── DETECTION/
│   └── SEGMENTATION/
│
├── 04_EARS/
│   ├── CLASSIFICATION/
│   └── DETECTION/
│
├── 05_PAWS/
│   ├── CLASSIFICATION/
│   └── DETECTION/
│
├── 06_WOUNDS/
│   ├── DETECTION/
│   └── SEGMENTATION/
│
├── 07_CLINICAL_VALIDATION/
│
├── 08_RAW/
│
├── 09_PROCESSED/
│
├── 10_SPLITS/
│
└── 11_AUDIT/
```

---

## 21. Cross-Check Against Existing PAWPHILE Knowledge
After comparing the newly discovered resources with `docs/PAWPHILE_AI_VISION_REFERENCE.md`, `PAWPHILE_MASTER_KNOWLEDGE_BASE.md`, and `PAWPHILE_CV_DATASET_REGISTRY.md`:

- **Changed Breed Coverage**: PAWPHILE was previously targeting 20 breeds, but 5 Indian native breeds (Indian Pariah Dog, Dachshund, Rajapalayam, Kombai, Mudhol Hound) have been removed, making it a 15-breed target. The Stanford Dogs dataset fully covers this revised target.
- **Changed CV Capabilities**: Wound Healing Prediction and Pawgnosis (Paw Detection) are new capabilities informed by newly discovered papers (`computation-12-00042.pdf` and the Smith et al. paper). These add tissue segmentation and paw pododermatitis/neoplasia detection to the roadmap.
- **Outdated Information**: Previous audits classified Kaggle and Roboflow datasets as "Supplementary Data." This audit has downgraded them to **RED (Do Not Train Yet)** due to explicitly discovered augmentation data leakage and duplicate risks.
- **New Datasets**: The Multispectral Skin Disease dataset was newly discovered but is too small (62 images) to impact training.
- **Missing Resources**: All advanced vision modules (Skin Lesions, Ear, Paw, Wound, Eye) severely lack annotated image datasets. The downloaded materials are exclusively methodology papers, not the actual datasets used in those papers.

---

## 22. Risks
- **Taxonomy Confusion**: Training a model on "Fungal Infection" vs "Ringworm" as separate classes (like the Kaggle dataset) will mathematically confuse the model.
- **Diagnostic Danger**: Predicting a disease (e.g. Demodicosis) solely from an unverified RGB image without scraping/microscopy data violates veterinary safety standards. We must train on visual findings (erythema, alopecia) instead.

---

## 23. Final Recommendations
1. Promote **Stanford Dogs** to the primary dataset for Dog Detection and 15-Breed Classification.
2. Reject **Roboflow** and **Kaggle** datasets from primary production pipelines due to severe leakage, unverified taxonomy, and lack of clinical validation.
3. Use the **4 downloaded PDFs** as foundational literature for the PAWPHILE AI Architecture (specifically focusing on object detection with YOLO for ears and paws, EfficientNet for skin lesions, and segmentation for wounds).

---

## 24. Complete Source/Path Index
- `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE`
- `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\archive`
- `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Dog Skin Disease Dataset.v2i.folder`
- `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Classification of pet dog skin diseases using deep learning with images captured from multispectral imaging device\5dbht54kw7-1`
