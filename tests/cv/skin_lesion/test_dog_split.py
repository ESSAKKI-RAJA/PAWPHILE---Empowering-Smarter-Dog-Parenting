import unittest
import pandas as pd
import os
from cv.skin_lesion.scripts.split_by_dog import split_by_dog

class TestDogSplit(unittest.TestCase):
    def setUp(self):
        self.test_manifest = "test_manifest.csv"
        self.output_manifest = "test_output.csv"
        
    def tearDown(self):
        if os.path.exists(self.test_manifest):
            os.remove(self.test_manifest)
        if os.path.exists(self.output_manifest):
            os.remove(self.output_manifest)

    def test_split_by_dog_isolation(self):
        # Create 100 dogs, 5 images each
        data = []
        for d in range(100):
            for i in range(5):
                data.append({"image_id": f"img_{d}_{i}", "dog_id": f"dog_{d}"})
                
        df = pd.DataFrame(data)
        df.to_csv(self.test_manifest, index=False)
        
        split_by_dog(self.test_manifest, self.output_manifest, val_size=0.15, test_size=0.15)
        
        out_df = pd.read_csv(self.output_manifest)
        
        # Verify sizes roughly match (100 dogs -> 70/15/15)
        train_dogs = out_df[out_df['split'] == 'train']['dog_id'].unique()
        val_dogs = out_df[out_df['split'] == 'val']['dog_id'].unique()
        test_dogs = out_df[out_df['split'] == 'test']['dog_id'].unique()
        
        self.assertEqual(len(train_dogs), 70)
        self.assertEqual(len(val_dogs), 15)
        self.assertEqual(len(test_dogs), 15)
        
        # Verify absolute isolation (intersection should be empty)
        self.assertEqual(len(set(train_dogs).intersection(val_dogs)), 0)
        self.assertEqual(len(set(train_dogs).intersection(test_dogs)), 0)
        self.assertEqual(len(set(val_dogs).intersection(test_dogs)), 0)

if __name__ == '__main__':
    unittest.main()
