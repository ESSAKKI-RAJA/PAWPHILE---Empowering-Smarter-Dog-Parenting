import os
import hashlib
from PIL import Image
import imagehash
import pandas as pd
from typing import List, Dict, Tuple

class DataLeakageEngine:
    def __init__(self):
        self.exact_hashes = {}
        self.perceptual_hashes = {}
        self.patient_records = {}

    def get_exact_hash(self, file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, 'rb') as f:
            buf = f.read()
            hasher.update(buf)
        return hasher.hexdigest()

    def get_perceptual_hash(self, file_path: str) -> str:
        try:
            img = Image.open(file_path).convert('RGB')
            # Use average hash for speed and basic perceptual matching
            return str(imagehash.average_hash(img))
        except Exception:
            return "CORRUPT"

    def audit_dataset(self, manifest_df: pd.DataFrame, image_dir: str = "") -> Dict:
        """
        Audits a DataFrame containing ['image_path', 'dog_id', 'split'].
        Returns a report of leakages.
        """
        report = {
            "total_images": len(manifest_df),
            "exact_duplicates_found": 0,
            "perceptual_duplicates_found": 0,
            "cross_split_patient_leaks": 0,
            "missing_patient_ids": 0,
            "status": "PASS"
        }
        
        train_patients = set()
        test_patients = set()

        for idx, row in manifest_df.iterrows():
            img_path = os.path.join(image_dir, row.get('image_path', row.get('source_path', '')))
            dog_id = row.get('dog_id', None)
            split = row.get('split', row.get('experimental_split', 'unknown'))

            if pd.isna(dog_id) or dog_id == 'unknown':
                report["missing_patient_ids"] += 1
                
            if split == 'train' and dog_id:
                train_patients.add(dog_id)
            elif split == 'test' and dog_id:
                test_patients.add(dog_id)

            if not os.path.exists(img_path):
                continue
                
            e_hash = self.get_exact_hash(img_path)
            if e_hash in self.exact_hashes:
                report["exact_duplicates_found"] += 1
            self.exact_hashes[e_hash] = img_path
            
            p_hash = self.get_perceptual_hash(img_path)
            if p_hash in self.perceptual_hashes and p_hash != "CORRUPT":
                report["perceptual_duplicates_found"] += 1
            self.perceptual_hashes[p_hash] = img_path

        # Check for cross-split leakage
        leaked_patients = train_patients.intersection(test_patients)
        report["cross_split_patient_leaks"] = len(leaked_patients)

        if report["exact_duplicates_found"] > 0 or \
           report["perceptual_duplicates_found"] > 0 or \
           report["cross_split_patient_leaks"] > 0 or \
           report["missing_patient_ids"] > (0.1 * report["total_images"]):
            report["status"] = "FAIL"

        return report

if __name__ == "__main__":
    print("Leakage Engine Initialized.")
