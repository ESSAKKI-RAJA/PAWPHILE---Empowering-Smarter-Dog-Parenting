import os
import glob
import pandas as pd
import numpy as np
from PIL import Image
import uuid
import json

def compute_hash(image_path, size=8):
    """Compute average hash (aHash) for fast perceptual duplicate detection."""
    try:
        with Image.open(image_path) as img:
            img = img.convert('L').resize((size, size), Image.Resampling.LANCZOS)
            pixels = np.array(img.get_flattened_data()).reshape((size, size))
            avg = pixels.mean()
            diff = pixels > avg
            return sum([2**(i % 8) for i, v in enumerate(diff.flatten()) if v])
    except Exception as e:
        return None

def parse_multispectral_labels(root_path):
    labels = {}
    txt_path = os.path.join(root_path, 'image_label.txt')
    if os.path.exists(txt_path):
        with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 2:
                    labels[parts[0]] = parts[1]
    return labels

def map_ontology(source, source_label):
    source_label_lower = source_label.lower()
    
    # Defaults
    condition = "unknown"
    findings = []
    
    if "bacterial" in source_label_lower:
        condition = "bacterial dermatosis"
        findings = ["erythema", "pustule", "crust"]
    elif "fungal" in source_label_lower or "ringworm" in source_label_lower:
        condition = "fungal infection"
        findings = ["alopecia", "scaling"]
    elif "hypersensitivity" in source_label_lower or "allergic" in source_label_lower:
        condition = "hypersensitivity / allergic dermatitis"
        findings = ["erythema", "lichenification"]
    elif "demodicosis" in source_label_lower:
        condition = "demodicosis"
        findings = ["alopecia", "erythema", "crust"]
    elif "dermatitis" in source_label_lower:
        condition = "nonspecific dermatitis"
        findings = ["erythema", "scaling"]
    elif "healthy" in source_label_lower:
        condition = "healthy"
        findings = []
    
    return condition, json.dumps(findings)

def main():
    datasets = {
        "Roboflow": r"C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Dog Skin Disease Dataset.v2i.folder",
        "Kaggle": r"C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\archive",
        "Multispectral": r"C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE\Classification of pet dog skin diseases using deep learning with images captured from multispectral imaging device\5dbht54kw7-1"
    }

    records = []
    hash_map = {} # aHash -> duplicate_group_id
    
    ms_labels = parse_multispectral_labels(datasets["Multispectral"])

    for ds_name, root_path in datasets.items():
        print(f"Scanning {ds_name}...")
        if not os.path.exists(root_path):
            print(f"WARNING: Path not found: {root_path}")
            continue

        image_paths = []
        for ext in ('*.jpg', '*.jpeg', '*.png'):
            image_paths.extend(glob.glob(os.path.join(root_path, '**', ext), recursive=True))

        for path in image_paths:
            rel_path = path.replace(root_path, '').strip(os.sep)
            parts = rel_path.split(os.sep)
            
            # Determine split and class
            split = "none"
            cls = "unknown"
            dog_id = "unknown"
            
            if ds_name in ["Roboflow", "Kaggle"]:
                if len(parts) >= 2 and parts[0] in ['train', 'valid', 'test', 'val']:
                    split = parts[0]
                    cls = parts[1]
                else:
                    cls = parts[0]
            elif ds_name == "Multispectral":
                # File format: Dog210422_04_02_33_xyz.jpg
                filename = os.path.basename(path)
                dog_id = "_".join(filename.split("_")[:4]) # e.g., Dog210422_04_02_33
                
                # Try to map from txt
                if filename in ms_labels:
                    cls = ms_labels[filename]
                else:
                    cls = "unknown"
            
            # Hash
            h = compute_hash(path)
            if h is None: continue
            
            if h not in hash_map:
                hash_map[h] = str(uuid.uuid4())
            dup_group = hash_map[h]

            condition, findings = map_ontology(ds_name, cls)
            
            records.append({
                "image_id": str(uuid.uuid4()),
                "source_dataset": ds_name,
                "source_path": path,
                "perceptual_hash": h,
                "duplicate_group_id": dup_group,
                "source_label": cls,
                "pawphile_condition_label": condition,
                "pawphile_finding_label": findings,
                "label_type": "disease-level (provisional)",
                "label_quality": "research-only",
                "clinical_validation": "unsupported",
                "split": split,
                "body_region": "skin",
                "dog_id": dog_id,
                "tier": "C" if ds_name != "Multispectral" else "B",
                "exclusion_reason": None
            })

    df = pd.DataFrame(records)
    print(f"Total raw records: {len(df)}")

    # LEAKAGE CONTROL
    # Keep only 1 image per duplicate group
    # Prefer keeping the one in 'test' split if there's a conflict
    
    # Define split priority (test is most important to preserve)
    split_priority = {'test': 1, 'val': 2, 'valid': 2, 'train': 3, 'none': 4}
    df['split_prio'] = df['split'].map(split_priority).fillna(5)
    
    df_sorted = df.sort_values(['duplicate_group_id', 'split_prio'])
    
    # Mark first instance as Keep, rest as duplicate
    df_sorted['is_first'] = ~df_sorted.duplicated(subset=['duplicate_group_id'], keep='first')
    
    df_sorted.loc[~df_sorted['is_first'], 'tier'] = 'D'
    df_sorted.loc[~df_sorted['is_first'], 'exclusion_reason'] = 'Perceptual Duplicate / Augmentation Leakage'
    
    # Save manifest
    out_dir = r"d:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "dataset_manifest.csv")
    df_sorted.drop(columns=['split_prio', 'is_first']).to_csv(out_path, index=False)
    
    print(f"Saved cleaned manifest to {out_path}")
    
    tier_counts = df_sorted['tier'].value_counts()
    print("\nTier Distribution:")
    print(tier_counts)

if __name__ == "__main__":
    main()
