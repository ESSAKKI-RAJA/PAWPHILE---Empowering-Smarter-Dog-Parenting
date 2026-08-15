# PAWPHILE CV Bin 2C

## Production Pipeline Infrastructure

### 1. Ingestion Pipeline
Located in `cv/skin_lesion/clinical_ingestion/`. This pipeline validates Tier-A data against strict JSON/CSV schemas. It guarantees that `dog_id` is tracked and that coordinate formatting is correct before compiling a versioned dataset manifest.

### 2. The Final Readiness Gate (The Hard Block)
The command `python cv/skin_lesion/infrastructure/bin2c_readiness_gate.py` must pass for PAWPHILE to train. It mathematically evaluates:
- Ingestion validation (schema correctness)
- Quality gates (blur, corruption)
- Leakage checks (cross-split dog duplication)
- Minimum volume requirements (500 unique dogs)
- Veterinary consensus statuses.

### 3. Patient Isolation
Random train/test splits are strictly forbidden. The utility `cv/skin_lesion/scripts/split_by_dog.py` ensures 100% patient isolation.

### 4. Current Status
**BLOCKED — CLINICAL DATA NOT AVAILABLE**
The pipeline has been constructed. Tests have been written to guarantee the pipeline correctly blocks invalid data. However, the required Tier-A clinical data has not yet been acquired, so model training cannot physically commence.
