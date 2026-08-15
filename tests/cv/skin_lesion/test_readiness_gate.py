import unittest
import os
import pandas as pd
from unittest.mock import patch, MagicMock
from cv.skin_lesion.infrastructure.readiness_gate import ModelReadinessGate, TrainingBlockedError

class TestReadinessGate(unittest.TestCase):
    def setUp(self):
        # Create a dummy manifest for testing
        self.dummy_manifest = "test_manifest.csv"
        
    def tearDown(self):
        if os.path.exists(self.dummy_manifest):
            os.remove(self.dummy_manifest)

    def test_gate_blocks_on_missing_manifest(self):
        gate = ModelReadinessGate("non_existent_manifest.csv")
        with self.assertRaises(TrainingBlockedError) as context:
            gate.evaluate_readiness()
        self.assertTrue("not found" in str(context.exception))

    def test_gate_blocks_on_insufficient_data(self):
        # Create a manifest with only 10 rows (needs 500)
        df = pd.DataFrame({'image_path': ['img.jpg'] * 10})
        df.to_csv(self.dummy_manifest, index=False)
        
        gate = ModelReadinessGate(self.dummy_manifest)
        with self.assertRaises(TrainingBlockedError) as context:
            gate.evaluate_readiness()
        self.assertTrue("Insufficient total images" in str(context.exception))

    @patch('cv.skin_lesion.infrastructure.readiness_gate.DataLeakageEngine')
    def test_gate_blocks_on_leakage(self, MockEngine):
        mock_engine_instance = MockEngine.return_value
        mock_engine_instance.audit_dataset.return_value = {
            "status": "FAIL",
            "cross_split_patient_leaks": 5,
            "missing_patient_ids": 0
        }
        
        df = pd.DataFrame({'image_path': ['img.jpg'] * 600})
        df.to_csv(self.dummy_manifest, index=False)
        
        gate = ModelReadinessGate(self.dummy_manifest)
        with self.assertRaises(TrainingBlockedError) as context:
            gate.evaluate_readiness()
        self.assertTrue("Data Leakage Detected" in str(context.exception))

    @patch('cv.skin_lesion.infrastructure.readiness_gate.DataLeakageEngine')
    def test_gate_blocks_on_missing_clinical_validation(self, MockEngine):
        mock_engine_instance = MockEngine.return_value
        mock_engine_instance.audit_dataset.return_value = {"status": "PASS"}
        
        # Missing 'clinical_validation_status' column
        df = pd.DataFrame({
            'image_path': ['img.jpg'] * 600,
            'dog_id': ['dog_1'] * 600
        })
        df.to_csv(self.dummy_manifest, index=False)
        
        gate = ModelReadinessGate(self.dummy_manifest)
        with self.assertRaises(TrainingBlockedError) as context:
            gate.evaluate_readiness()
        self.assertTrue("missing clinical_validation_status column" in str(context.exception))

    @patch('cv.skin_lesion.infrastructure.readiness_gate.DataLeakageEngine')
    def test_gate_passes_clean_data(self, MockEngine):
        mock_engine_instance = MockEngine.return_value
        mock_engine_instance.audit_dataset.return_value = {"status": "PASS"}
        
        df = pd.DataFrame({
            'image_path': ['img.jpg'] * 600,
            'dog_id': ['dog_1'] * 600,
            'clinical_validation_status': ['consensus'] * 600
        })
        df.to_csv(self.dummy_manifest, index=False)
        
        gate = ModelReadinessGate(self.dummy_manifest)
        result = gate.evaluate_readiness()
        self.assertEqual(result["status"], "READY")

if __name__ == '__main__':
    unittest.main()
