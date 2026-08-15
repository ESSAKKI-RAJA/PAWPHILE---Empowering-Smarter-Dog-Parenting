# PAWPHILE CV DATASET MASTER REGISTRY

This registry contains every discovered dataset/resource on the Desktop.

## 1. Stanford Dogs Dataset
- **Exact local path**: `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\images.tar` (with `annotation.tar`, `lists.tar`, `train_data.mat`, `test_data.mat`)
- **File/folder type**: TAR Archives & MAT files
- **Archive size**: ~793 MB (`images.tar`), ~21 MB (`annotation.tar`), 481 KB (`lists.tar`)
- **Number of images**: 20,580
- **Annotation format**: Bounding boxes (XML inside `annotation.tar`)
- **Dataset structure**: ImageNet structure (120 classes)
- **Train/validation/test split**: Train (12,000) / Test (8,580) defined in MAT files
- **Number of classes**: 120
- **Bounding boxes exist**: YES
- **Segmentation masks exist**: NO
- **Classification labels exist**: YES (Breed labels)
- **Disease labels exist**: NO
- **Patient/dog IDs exist**: NO
- **Veterinary diagnosis available**: N/A
- **Dataset license**: Non-commercial research use
- **Dataset source**: Stanford University (Khosla et al.)
- **Original publication/paper**: "Novel Dataset for Fine-Grained Image Categorization" (2011)
- **Known limitations**: Lacks Indian native breeds, flat labels.
- **Clinical reliability**: N/A (General images)
- **Research reliability**: HIGH
- **Suitability for PAWPHILE**: YES (for the 15 standard breeds)
- **Recommended usage**: Primary dataset for the 15 supported breeds.

## 2. Dog Skin Disease Dataset (v2) - Roboflow
- **Exact local path**: `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Dog Skin Disease Dataset.v2i.folder`
- **File/folder type**: Folder (Images & TXT)
- **Number of images**: 4,398
- **Annotation format**: Folder format (classification)
- **Dataset structure**: train/valid/test folders
- **Train/validation/test split**: YES
- **Number of classes**: 4 (`bacterial dermatosis`, `fungal infection`, `healthy`, `hypersensitivity dermatitis`)
- **Bounding boxes exist**: NO
- **Segmentation masks exist**: NO
- **Classification labels exist**: YES
- **Disease labels exist**: YES
- **Patient/dog IDs exist**: NO
- **Veterinary diagnosis available**: UNKNOWN
- **Veterinarian/expert annotation**: NOT VERIFIED FROM LOCAL SOURCE
- **Dataset license**: CC BY 4.0
- **Dataset source**: Roboflow user
- **Known duplication risks**: README states "3 versions of each source image" (augmentation)
- **Augmentation status**: YES (Brightness/Exposure)
- **Potential data leakage risks**: HIGH (due to augmentation before splits)
- **Clinical reliability**: UNKNOWN
- **Suitability for PAWPHILE**: PARTIAL (Requires clinical validation)
- **Recommended usage**: Supplementary / Research only.

## 3. Dog's Skin Diseases - Image Dataset (Kaggle)
- **Exact local path**: `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\archive`
- **File/folder type**: Folder (Images)
- **Number of images**: 4,315
- **Annotation format**: Folder format (classification)
- **Dataset structure**: train/valid/test folders
- **Train/validation/test split**: YES
- **Number of classes**: 6 (`demodicosis`, `Dermatitis`, `Fungal_infections`, `Healthy`, `Hypersensitivity`, `ringworm`)
- **Bounding boxes exist**: NO
- **Segmentation masks exist**: NO
- **Classification labels exist**: YES
- **Disease labels exist**: YES
- **Patient/dog IDs exist**: NO
- **Veterinary diagnosis available**: UNKNOWN
- **Veterinarian/expert annotation**: NOT VERIFIED FROM LOCAL SOURCE
- **Dataset license**: UNKNOWN — DO NOT ASSUME USAGE RIGHTS
- **Dataset source**: Kaggle
- **Known duplication risks**: Likely web-scraped; high risk of near-duplicates
- **Augmentation status**: Unknown
- **Potential data leakage risks**: HIGH
- **Clinical reliability**: UNKNOWN
- **Suitability for PAWPHILE**: NO (Cannot responsibly train yet due to license and quality)
- **Recommended usage**: Keep separate. Do not merge.

## 4. Multispectral Dog Skin Disease Dataset
- **Exact local path**: `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Classification of pet dog skin diseases using deep learning with images captured from multispectral imaging device\5dbht54kw7-1`
- **File/folder type**: Folder (Images and `image_label.txt`)
- **Number of images**: 62 (based on text file)
- **Annotation format**: TXT map (filename to class)
- **Dataset structure**: Flat folder with TXT file
- **Train/validation/test split**: NO
- **Number of classes**: 4 (`Bacterial_dermatosis`, `Fungal_infections`, `Healthy`, `Hypersensitivity_allergic_dermatosis`)
- **Bounding boxes exist**: NO
- **Segmentation masks exist**: NO
- **Classification labels exist**: YES
- **Disease labels exist**: YES
- **Patient/dog IDs exist**: NO (Filename contains dates `Dog210422...`)
- **Veterinary diagnosis available**: INFERENCE (Likely yes, given the academic title)
- **Veterinarian/expert annotation**: INFERENCE (Likely yes)
- **Dataset license**: UNKNOWN
- **Original publication/paper**: Implied by folder name.
- **Suitability for PAWPHILE**: PARTIAL (Too small)
- **Recommended usage**: Research reference.

## 5. Artificial Intelligence-Based Identification of Common Canine Skin Lesions (Kang et al. 2026)
- **Exact local path**: `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Veterinary Dermatology - 2026 - Kang - Artificial Intelligence‐Based Identification of Common Canine Skin Lesions From.pdf`
- **File/folder type**: PDF Research Paper (No dataset)
- **Annotation format**: N/A
- **Dataset license**: N/A
- **Suitability for PAWPHILE**: YES (Methodology only)
- **Recommended usage**: Reference for visual finding (lesion) classification vs disease diagnosis.

## 6. Detection of Canine External Ear Canal Lesions Using AI (Apostolopoulos et al. 2025)
- **Exact local path**: `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Veterinary Dermatology - 2025 - Apostolopoulos - Detection of canine external ear canal lesions using artificial.pdf`
- **File/folder type**: PDF Research Paper (No dataset)
- **Annotation format**: YOLO bounding boxes (described in paper)
- **Number of classes**: 3 (`Healthy`, `Otitis`, `Mass`)
- **Dataset license**: N/A
- **Suitability for PAWPHILE**: YES (Methodology only)
- **Recommended usage**: Reference for Ear Vision module.

## 7. Computer Vision Model for the Detection of Canine Pododermatitis and Neoplasia of the Paw (Smith et al. 2023)
- **Exact local path**: `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Veterinary Dermatology - 2023 - Smith - Computer vision model for the detection of canine pododermatitis and neoplasia of.pdf`
- **File/folder type**: PDF Research Paper (No dataset)
- **Annotation format**: YOLO bounding boxes (described in paper)
- **Number of classes**: 3 (`Healthy`, `Pododermatitis`, `Neoplasia`)
- **Dataset license**: N/A
- **Suitability for PAWPHILE**: YES (Methodology only)
- **Recommended usage**: Reference for Paw Vision module.

## 8. Predicting Time-to-Healing from a Digital Wound Image (Kolli et al. 2024)
- **Exact local path**: `C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\computation-12-00042.pdf`
- **File/folder type**: PDF Research Paper (No dataset)
- **Annotation format**: Semantic Segmentation (Tissue types)
- **Number of classes**: Tissue types (`fibrin slough`, `granulation`, `necrotic tissue`)
- **Dataset license**: N/A
- **Suitability for PAWPHILE**: YES (Methodology only)
- **Recommended usage**: Reference for Wound Segmentation module.
