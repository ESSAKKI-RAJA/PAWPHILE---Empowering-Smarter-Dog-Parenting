import json
import os
import pandas as pd
from typing import Dict
from .leakage_engine import DataLeakageEngine

class TrainingBlockedError(Exception):
    pass

class ModelReadinessGate:
    def __init__(self, version_manifest_path: str):
        self.manifest_path = version_manifest_path

    def evaluate_readiness(self) -> Dict:
        if not os.path.exists(self.manifest_path):
            raise TrainingBlockedError(f"Dataset manifest not found: {self.manifest_path}")

        try:
            df = pd.read_csv(self.manifest_path)
        except Exception as e:
            raise TrainingBlockedError(f"Failed to read manifest: {e}")

        # 1. Size Check
        if len(df) < 500:
            raise TrainingBlockedError(f"Insufficient total images: {len(df)}. Minimum is 500.")

        # 2. Leakage Check
        engine = DataLeakageEngine()
        # Assume images are relative to manifest dir
        img_dir = os.path.dirname(self.manifest_path)
        leakage_report = engine.audit_dataset(df, img_dir)
        
        if leakage_report["status"] == "FAIL":
            raise TrainingBlockedError(
                f"Data Leakage Detected: Cross-split patients={leakage_report['cross_split_patient_leaks']}, "
                f"Missing IDs={leakage_report['missing_patient_ids']}"
            )

        # 3. Validation Check
        # Check if the required 'clinical_validation_status' column exists and is populated
        if 'clinical_validation_status' not in df.columns:
            raise TrainingBlockedError("Dataset is missing clinical_validation_status column.")
            
        unvalidated = df[df['clinical_validation_status'] != 'consensus']
        if len(unvalidated) > 0:
             raise TrainingBlockedError(f"{len(unvalidated)} images lack 'consensus' clinical validation.")

        return {
            "status": "READY",
            "message": "All clinical safety gates passed. Ready for GPU training."
        }

if __name__ == "__main__":
    print("Readiness Gate Initialized.")
