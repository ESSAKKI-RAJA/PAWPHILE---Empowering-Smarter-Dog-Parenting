# PAWPHILE CV BIN 2A: Skin Dataset Forensic Audit

## 1. Executive Summary
This audit evaluated the three locally available canine skin disease datasets to determine their suitability for training the PAWPHILE Bin 2A (Skin Visual Intelligence) model. 

The primary finding is that **none of these datasets can be used safely "out-of-the-box."** They suffer from high data leakage risks, ambiguous licensing, and a fundamental supervision mismatch (they label abstract diseases instead of physical visual findings).

## 2. Dataset 1: Roboflow Dog Skin Disease (v2)
- **Total Images**: 4,398
- **Classes**: Bacterial dermatosis (1,097), Fungal infection (1,201), Hypersensitivity dermatitis (914), Healthy (1,186)
- **Splits**: Train (3,851), Valid (367), Test (180)
- **Forensic Findings**:
  - The dataset documentation admits to generating "3 versions of each source image" using augmentations (e.g., exposure/brightness tweaks). 
  - **CRITICAL LEAKAGE RISK**: It is highly likely that augmented variants of the same source image exist across the train, valid, and test sets. 
  - **Lesion Mapping**: The labels represent diseases, not visual evidence. E.g., "bacterial dermatosis" typically presents with pustules, erythema, and crusts, but the model will only be trained to output the disease name, completely bypassing the explainable evidence layer required by PAWPHILE's First-Principles.

## 3. Dataset 2: Kaggle Dog's Skin Diseases
- **Total Images**: 4,315
- **Classes**: Demodicosis (862), Dermatitis (787), Fungal_infections (526), Healthy (700), Hypersensitivity (322), Ringworm (1,118)
- **Splits**: Train (3,022), Valid (860), Test (433)
- **Forensic Findings**:
  - Unclear provenance and licensing. Very likely scraped from Google Images or veterinary textbooks.
  - "Ringworm" and "Fungal_infections" are scientifically redundant (ringworm *is* a fungal infection caused by dermatophytes). This proves the labels lack rigorous veterinary validation.
  - No patient/dog IDs are available, meaning dog-level splitting is impossible, risking severe data leakage if multiple photos of the same dog were scraped.

## 4. Dataset 3: Multispectral Dog Skin
- **Total Images**: 951
- **Classes**: 95 unique dog IDs (e.g., `dog210422_04_02_33`), exactly 10 images per dog.
- **Forensic Findings**:
  - This dataset uniquely preserves patient identity, which is fantastic for preventing data leakage (we can split by dog ID).
  - However, the image labels are just IDs, and the actual disease mappings (from the associated text files) only cover 4 abstract classes. 
  - The sample size (effectively ~95 dogs) is too small to serve as the sole foundation for the model.

## 5. The Epistemological Gap (Lesions vs. Diseases)
PAWPHILE's safety architecture demands the model detect **Visual Evidence (Lesions)** before suggesting a **Condition**. 

Currently, our datasets map:
`IMAGE` -> `BACTERIAL DERMATOSIS`

We need:
`IMAGE` -> `[Erythema: 0.9, Pustule: 0.8, Alopecia: 0.1]` -> `Possible Bacterial Dermatosis`

### Proposed Solution
To bridge this gap without manually re-annotating 8,000 images, we must implement a **Semantic Proxy Mapping** during training. 

We will create a PyTorch Dataset (`SkinLesionDataset`) that treats the disease labels as noisy proxies for underlying lesions. 
For example, if an image is labeled "fungal infection" (Roboflow), the dataset loader will mathematically assume it exhibits `alopecia` and `scaling` with high probability, and train a multi-label classification head to predict the *lesions*, not the disease. The final inference script will then map the detected lesions back to a *Possible Condition* with calibrated confidence.

## 6. Forensic Hashing Results (The "Leakage Catastrophe")
We executed a comprehensive Perceptual Hashing (aHash) scan across all 9,664 images to cluster exact and near-exact duplicates (brightness/contrast augmentations).

The results prove the raw datasets were fundamentally unsafe for training:
- **Total Raw Images**: 9,664
- **Perceptual Duplicates / Leakage (Tier D - Excluded)**: 8,048
- **Clean Unique Images from Roboflow/Kaggle (Tier C)**: 1,591
- **Clean Unique Images from Multispectral (Tier B)**: 25

*Over 83% of the dataset consisted of augmented duplicates.* If trained raw, the model would have achieved near 100% test accuracy simply by memorizing the augmented copies of the training set.

## 7. Next Steps for Bin 2A
1. The cleaned `dataset_manifest.csv` has been generated, safely dropping the 8,048 leaked images.
2. The remaining 1,616 unique images have been mapped to provisional `pawphile_finding_label` proxies.
3. Due to the limited size and lack of true clinical validation, Bin 2A will proceed strictly as an **Experimental Prototype** using transfer learning on EfficientNet-B0.
