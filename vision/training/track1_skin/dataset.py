import os
import cv2
import torch
from torch.utils.data import Dataset
import numpy as np
import collections

# Classes for Track 1
SKIN_CLASSES = [
    "healthy skin",
    "bacterial dermatosis",
    "fungal infection",
    "hypersensitivity/allergic dermatitis",
    "mange",
    "hot spots"
]

class DogSkinDataset(Dataset):
    def __init__(self, data_records, transform=None, apply_clahe=False):
        """
        data_records: List of dicts, each containing:
            'image_path': str
            'label': int (0-5)
            'dog_id': str (for strict split, but handled before creating dataset)
        """
        self.data_records = data_records
        self.transform = transform
        self.apply_clahe = apply_clahe

    def __len__(self):
        return len(self.data_records)

    def __getitem__(self, idx):
        record = self.data_records[idx]
        image_path = record['image_path']
        label = record['label']

        image = cv2.imread(image_path)
        if image is None:
            # Handle corrupt images if any slipped through
            image = np.zeros((224, 224, 3), dtype=np.uint8)
        
        # Apply CLAHE if needed (usually for clinical low-light)
        if self.apply_clahe:
            from training.shared.augmentations import apply_clahe
            image = apply_clahe(image)
            
        # Convert BGR to RGB for albumentations
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        if self.transform:
            augmented = self.transform(image=image)
            image = augmented['image']
        else:
            # Default to tensor if no transform
            image = torch.tensor(image).permute(2, 0, 1).float() / 255.0

        return image, torch.tensor(label, dtype=torch.long)

def split_by_dog_id(all_records, train_ratio=0.7, val_ratio=0.15):
    """
    "split strictly by dog identity (not by image) at 70/15/15 train/val/test"
    all_records: list of dicts with 'dog_id'
    """
    dog_to_records = collections.defaultdict(list)
    for record in all_records:
        dog_to_records[record['dog_id']].append(record)
        
    dog_ids = list(dog_to_records.keys())
    np.random.shuffle(dog_ids)
    
    n_dogs = len(dog_ids)
    train_end = int(n_dogs * train_ratio)
    val_end = train_end + int(n_dogs * val_ratio)
    
    train_dogs = dog_ids[:train_end]
    val_dogs = dog_ids[train_end:val_end]
    test_dogs = dog_ids[val_end:]
    
    train_records = []
    val_records = []
    test_records = []
    
    for d in train_dogs:
        train_records.extend(dog_to_records[d])
    for d in val_dogs:
        val_records.extend(dog_to_records[d])
    for d in test_dogs:
        test_records.extend(dog_to_records[d])
        
    return train_records, val_records, test_records
