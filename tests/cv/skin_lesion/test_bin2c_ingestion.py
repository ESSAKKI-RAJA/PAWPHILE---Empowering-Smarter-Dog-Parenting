import unittest
import pandas as pd
import json
import os
from cv.skin_lesion.clinical_ingestion.validate_metadata import MetadataValidator
from cv.skin_lesion.clinical_ingestion.validate_annotations import AnnotationValidator
from cv.skin_lesion.clinical_ingestion.ingest_dataset import DatasetIngestor

class TestBin2CIngestion(unittest.TestCase):
    def setUp(self):
        self.test_meta = "test_meta.csv"
        self.test_anno = "test_anno.json"
        
    def tearDown(self):
        if os.path.exists(self.test_meta):
            os.remove(self.test_meta)
        if os.path.exists(self.test_anno):
            os.remove(self.test_anno)

    def test_metadata_validator_missing_columns(self):
        df = pd.DataFrame({"image_id": ["img1"]}) # Missing dog_id, breed, etc.
        df.to_csv(self.test_meta, index=False)
        
        val = MetadataValidator()
        result = val.validate(self.test_meta)
        self.assertFalse(result["valid"])
        self.assertTrue(any("Missing required columns" in e for e in result["errors"]))

    def test_metadata_validator_duplicate_image(self):
        df = pd.DataFrame({
            "image_id": ["img1", "img1"],
            "dog_id": ["dog1", "dog1"],
            "breed": ["x", "y"], "age_group": ["a", "b"], "sex": ["M", "M"],
            "body_region": ["a", "a"], "capture_date": ["a", "a"], "consent_status": ["y", "y"]
        })
        df.to_csv(self.test_meta, index=False)
        
        val = MetadataValidator()
        result = val.validate(self.test_meta)
        self.assertFalse(result["valid"])
        self.assertTrue(any("duplicate" in e for e in result["errors"]))

    def test_annotation_validator_invalid_format(self):
        data = [{
            "image_id": "img1",
            "findings": [{"lesion_type": "erythema", "format": "invalid_format", "coordinates": []}]
        }]
        with open(self.test_anno, 'w') as f:
            json.dump(data, f)
            
        val = AnnotationValidator()
        result = val.validate(self.test_anno)
        self.assertFalse(result["valid"])
        self.assertTrue(any("invalid format" in e for e in result["errors"]))

if __name__ == '__main__':
    unittest.main()
