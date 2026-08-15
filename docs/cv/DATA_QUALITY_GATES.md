# PAWPHILE CV Data Quality Gates & Versioning

To ensure absolute safety and traceability, PAWPHILE CV enforces automated Quality Gates and strict Dataset Versioning. 

## 1. Dataset Versioning Protocol
Any dataset approved for training must be compiled into a locked, versioned bundle.

Format: `PAWPHILE-SKIN-v[Major].[Minor]`
- **Major**: Incremented when the ontology changes (e.g., adding a new target lesion).
- **Minor**: Incremented when new verified images are added to the corpus.

Each version directory must contain:
1. `metadata.csv`
2. `annotations.json`
3. `images/` directory
4. `version_manifest.json` (locking the hash of the dataset)

## 2. Automated Quality Gate
Before an image is presented to a veterinary annotator, it passes through `quality_gate.py`:
- **Minimum Resolution**: 512x512 pixels.
- **Blur Detection**: Laplacian variance > 100.
- **Lighting Limits**: Mean brightness must be between 20 (not pitch black) and 240 (not completely blown out).

Images failing this gate are routed to the `REJECTED` pile to save veterinarian time.

## 3. Data Leakage Engine
Before a versioned dataset is approved for training, it passes through `leakage_engine.py`:
- **Exact Hashing (SHA-256)**: Prevents identical bytes.
- **Perceptual Hashing (AverageHash)**: Detects cropped, resized, or color-adjusted copies of the same image.
- **Cross-Split Patient Isolation**: Enforces that `dog_id` does NOT overlap between Train and Test splits.

## 4. The Readiness Gate (The Hard Block)
The final step before architectural selection is executing `readiness_gate.py`.
This script will instantly raise a `TrainingBlockedError` if:
1. The dataset contains fewer than 500 images.
2. The Leakage Engine returns `"status": "FAIL"`.
3. Any image in the manifest lacks a `clinical_validation_status == 'consensus'`.

**There is no bypass flag.** If the data is not clinically ready, PAWPHILE will not train.

## 5. Post-Gate Workflow
Passing the Readiness Gate does NOT mean automatic training. The correct workflow is:
Tier-A data -> ingestion -> validation -> quality gate -> leakage check -> split -> veterinary consensus -> readiness gate -> **annotation-distribution analysis -> final architecture selection -> final training configuration freeze -> GPU training**.

The final architecture remains data-dependent until Tier-A annotations are actually available.
