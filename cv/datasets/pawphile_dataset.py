import os
import csv
from PIL import Image
from typing import List, Dict, Tuple, Optional
import torch
from torch.utils.data import Dataset
import torchvision.transforms as transforms

class PawphileDataset(Dataset):
    def __init__(
        self,
        manifest_path: str,
        images_dir: str,
        split: str = "train",
        transform: Optional[transforms.Compose] = None,
        crop_to_bbox: bool = True
    ):
        """
        Args:
            manifest_path: Path to dataset_manifest.csv
            images_dir: Directory where the 'Images' folder was extracted
            split: "train", "val", or "test"
            transform: PyTorch transforms to apply
            crop_to_bbox: If True, crops the image to the annotated bounding box
        """
        self.images_dir = images_dir
        self.split = split
        self.transform = transform
        self.crop_to_bbox = crop_to_bbox

        self.samples = []
        
        # We need a consistent mapping from breed name to index
        self.classes = sorted([
            'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'Pug',
            'Beagle', 'Shih Tzu', 'Rottweiler', 'Doberman', 'Pomeranian',
            'Siberian Husky', 'Great Dane', 'Boxer', 'Cocker Spaniel',
            'Saint Bernard', 'Chihuahua'
        ])
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}

        with open(manifest_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['split'] == split:
                    # In Stanford Dogs, some boxes might be slightly out of bounds, clip them
                    w, h = int(row['image_width']), int(row['image_height'])
                    x, y = int(row['bbox_x']), int(row['bbox_y'])
                    bw, bh = int(row['bbox_width']), int(row['bbox_height'])
                    
                    x = max(0, min(x, w - 1))
                    y = max(0, min(y, h - 1))
                    bw = max(1, min(bw, w - x))
                    bh = max(1, min(bh, h - y))

                    self.samples.append({
                        'image_path': os.path.join(self.images_dir, row['image_path']),
                        'breed': row['breed'],
                        'label': self.class_to_idx[row['breed']],
                        'bbox': (x, y, x + bw, y + bh)
                    })

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        sample = self.samples[idx]
        image = Image.open(sample['image_path']).convert('RGB')

        if self.crop_to_bbox:
            image = image.crop(sample['bbox'])

        if self.transform:
            image = self.transform(image)

        return image, sample['label']

def get_transforms(split: str, image_size: int = 224):
    if split == "train":
        return transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.1, contrast=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    else:
        return transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

if __name__ == "__main__":
    # Test dataset
    manifest = r'd:\PROJECTS\PAWPHILE\cv\datasets\dataset_manifest.csv'
    images = r'd:\PROJECTS\PAWPHILE\cv\datasets\images'
    
    try:
        ds = PawphileDataset(manifest, images, split='train', transform=get_transforms('train'))
        print(f"Train dataset size: {len(ds)}")
        img, label = ds[0]
        print(f"Sample 0 shape: {img.shape}, label: {label}")
        
        ds_test = PawphileDataset(manifest, images, split='test', transform=get_transforms('test'))
        print(f"Test dataset size: {len(ds_test)}")
    except Exception as e:
        print(f"Error loading dataset: {e}")
