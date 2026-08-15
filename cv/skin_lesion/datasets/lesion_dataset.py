import os
from PIL import Image
import torch
from torch.utils.data import Dataset
import pandas as pd

class SkinLesionDataset(Dataset):
    """
    Multi-label Skin Lesion Dataset for PAWPHILE Bin 2A Experimental Baseline.
    Expects `prepared_manifest.csv`.
    """
    def __init__(self, manifest_path, split='train', transform=None):
        self.transform = transform
        
        if os.path.exists(manifest_path):
            self.df = pd.read_csv(manifest_path)
            self.df = self.df[self.df['experimental_split'] == split].reset_index(drop=True)
        else:
            raise FileNotFoundError(f"Manifest not found: {manifest_path}")
            
        self.lesions = self.get_target_lesions()

    def get_target_lesions(self):
        """
        The fundamental visual findings we want the model to learn.
        These are NOT diseases (e.g. not 'fungal infection'), but physical evidence.
        """
        return [
            "erythema", "alopecia", "crust", "scaling", 
            "erosion", "ulcer", "pustule", "lichenification"
        ]

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_name = row['source_path']
        
        try:
            image = Image.open(img_name).convert('RGB')
        except Exception as e:
            # Fallback for corrupted images, return a black image
            print(f"Warning: Could not open {img_name}: {e}")
            image = Image.new('RGB', (224, 224), (0, 0, 0))
            
        if self.transform:
            image = self.transform(image)
            
        labels = [row[lesion] for lesion in self.lesions]
        label_tensor = torch.tensor(labels, dtype=torch.float32)
        
        return image, label_tensor

def map_lesions_to_conditions(lesion_probs, threshold=0.5):
    """
    Rule-based or heuristic mapping from visual evidence to possible conditions.
    This fulfills the first-principles requirement: 
    IMAGE -> LESIONS -> POSSIBLE CONDITION
    """
    findings = [lesion for i, lesion in enumerate(SkinLesionDataset.get_target_lesions(None)) if lesion_probs[i] > threshold]
    
    conditions = []
    
    if "alopecia" in findings and "scaling" in findings:
        conditions.append("Possible fungal infection (Dermatophytosis) or Demodicosis")
        
    if "erythema" in findings and "pustule" in findings:
        conditions.append("Possible bacterial pyoderma")
        
    if "erythema" in findings and "lichenification" in findings:
        conditions.append("Possible chronic hypersensitivity (allergic dermatitis)")
        
    if not conditions and findings:
        conditions.append("Nonspecific dermatitis")
        
    if not findings:
        conditions.append("No specific lesions detected")
        
    return findings, conditions
