# PAWPHILE CV Clinical Data Acquisition Specification

To graduate PAWPHILE's Computer Vision system to a Production Candidate (Bin 2C), we require authentic, high-quality data from veterinary clinics. 

> [!WARNING]
> We do NOT define clinical readiness by a fixed number of images (e.g., "5,000 images"). Readiness is defined by **Diversity, Validation, Annotation Quality, and Leakage Prevention**.

## 1. Required Clinical Volume & Diversity
- **Minimum Unique Dogs**: 500+ dogs with explicit, pseudonymous `dog_id` tracking.
- **Images Per Dog**: 2-5 images covering different angles, lighting, and distances (macro and context shots).
- **Lesion Diversity**: A minimum of 200 positive examples per target lesion class (erythema, alopecia, crust, etc.).
- **Healthy Controls**: At least 20% of the dataset must consist of healthy skin from diverse breeds and coat types.
- **Breed/Coat Diversity**: The dataset must capture short hair, long hair, double coats, hairless breeds, and various skin pigmentation (pink, black, mottled).

## 2. Image Quality Requirements
- **Resolution**: HARD MINIMUM 512x512 pixels. PREFERRED CLINICAL ACQUISITION TARGET: 1024x1024 or higher.
- **Clarity**: In-focus, properly lit (avoiding extreme flash glare or heavy shadows).
- **Framing**: Must clearly show the lesion in context of the surrounding skin/fur.
- **Obstructions**: Minimal hair obstruction if the lesion is on the skin surface (parting the hair is recommended).

## 3. Metadata & Privacy Requirements
Every image must be accompanied by a row in the `metadata.csv`.
- **Anonymization**: Absolutely NO owner names, clinic names in the background, or identifying tags.
- **Required Fields**: Pseudonymous `dog_id`, `capture_date`, `body_region`, `breed`, `age_group`, `sex`.
- **Consent**: Explicit logging of `consent_status` allowing AI research and commercial deployment.

## 4. Annotation Standards (The Ground Truth)
- Annotations must be performed by or explicitly reviewed by a licensed veterinarian.
- The annotations must target **VISUAL FINDINGS (Lesions)**, not abstract diseases.
- Use **Bounding Boxes** for distinct, localized findings (e.g., pustule, ulcer, mass).
- Use **Segmentation Masks** for diffuse, irregular areas (e.g., erythema, alopecia, scaling).

## 5. Review Protocol
- 10% of the dataset must undergo a Double-Blind Second Review by a different veterinarian to calculate Inter-Rater Reliability (IRR). Disagreements must be logged and resolved via consensus.

## 6. Dataset Versioning
Data deliveries must be versioned (e.g., `PAWPHILE-SKIN-v1.0`). Once a version is locked and evaluated, the exact version number must be recorded in the model's training configuration.
