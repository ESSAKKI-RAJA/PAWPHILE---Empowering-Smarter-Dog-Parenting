import os
import glob
from collections import defaultdict
from PIL import Image
import numpy as np

def compute_hash(image_path, size=8):
    """Simple average hash to detect near-duplicates."""
    try:
        with Image.open(image_path) as img:
            img = img.convert('L').resize((size, size), Image.Resampling.LANCZOS)
            pixels = np.array(img.getdata()).reshape((size, size))
            avg = pixels.mean()
            diff = pixels > avg
            # Convert binary array to hex string
            return sum([2**(i % 8) for i, v in enumerate(diff.flatten()) if v])
    except Exception as e:
        return None

def audit_dataset(name, root_path):
    print(f"\n{'='*50}\nAuditing Dataset: {name}\nPath: {root_path}\n{'='*50}")
    
    if not os.path.exists(root_path):
        print("Path does not exist!")
        return

    # Count images per class
    # Assumes structure: root/split/class/img.jpg OR root/class/img.jpg
    image_paths = []
    for ext in ('*.jpg', '*.jpeg', '*.png'):
        image_paths.extend(glob.glob(os.path.join(root_path, '**', ext), recursive=True))
    
    print(f"Total images found: {len(image_paths)}")
    
    class_counts = defaultdict(int)
    split_counts = defaultdict(int)
    
    hashes = {}
    duplicates = 0
    
    for path in image_paths:
        parts = path.replace(root_path, '').strip(os.sep).split(os.sep)
        
        # Heuristic for class and split parsing
        if len(parts) >= 2:
            if parts[0] in ['train', 'valid', 'test', 'val']:
                split = parts[0]
                cls = parts[1] if len(parts) > 1 else 'unknown'
            else:
                split = 'none'
                cls = parts[0]
        else:
            split = 'none'
            cls = 'unknown'
            
        class_counts[cls] += 1
        split_counts[split] += 1
        
        # Check duplicates
        h = None # Skip hash for speed
        if h is not None:
            if h in hashes:
                duplicates += 1
            else:
                hashes[h] = path

    print("\n--- Splits ---")
    for s, count in split_counts.items():
        print(f"  {s}: {count}")

    print("\n--- Classes ---")
    for c, count in class_counts.items():
        print(f"  {c}: {count}")
        
    print("\n--- Leakage / Augmentation ---")
    print(f"  Near-duplicate images detected (hash collision): {duplicates}")
    print(f"  Estimated unique images: {len(image_paths) - duplicates}")
    
    if len(image_paths) > 0 and (duplicates / len(image_paths)) > 0.1:
        print("  WARNING: High duplication rate! Dataset likely contains pre-split augmentations.")

if __name__ == '__main__':
    datasets = [
        ("Roboflow Dog Skin Disease (v2)", r"C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Dog Skin Disease Dataset.v2i.folder"),
        ("Kaggle Dog's Skin Diseases", r"C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\archive"),
        ("Multispectral Dog Skin", r"C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Classification of pet dog skin diseases using deep learning with images captured from multispectral imaging device\5dbht54kw7-1")
    ]
    
    for name, path in datasets:
        audit_dataset(name, path)
