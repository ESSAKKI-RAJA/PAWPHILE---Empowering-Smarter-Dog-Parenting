import unittest
import pandas as pd
from cv.skin_lesion.infrastructure.leakage_engine import DataLeakageEngine

class TestLeakageEngine(unittest.TestCase):
    def setUp(self):
        self.engine = DataLeakageEngine()
        
    def test_cross_split_leakage(self):
        # Create a mock dataframe that leaks dog_id between train and test
        data = {
            'image_path': ['img1.jpg', 'img2.jpg', 'img3.jpg'],
            'dog_id': ['dog_1', 'dog_1', 'dog_2'],
            'split': ['train', 'test', 'test']
        }
        df = pd.DataFrame(data)
        
        # We don't need real images to test the cross-split ID check
        report = self.engine.audit_dataset(df)
        
        self.assertEqual(report['cross_split_patient_leaks'], 1)
        self.assertEqual(report['status'], 'FAIL')
        
    def test_missing_patient_id(self):
        data = {
            'image_path': ['img1.jpg', 'img2.jpg', 'img3.jpg'],
            'dog_id': ['dog_1', None, 'unknown'],
            'split': ['train', 'train', 'train']
        }
        df = pd.DataFrame(data)
        
        report = self.engine.audit_dataset(df)
        self.assertEqual(report['missing_patient_ids'], 2)
        self.assertEqual(report['status'], 'FAIL')

if __name__ == '__main__':
    unittest.main()
