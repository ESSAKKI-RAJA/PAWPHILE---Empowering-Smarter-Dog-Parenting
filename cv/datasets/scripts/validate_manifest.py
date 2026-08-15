import csv
import os
from collections import Counter

manifest_path = r'd:\PROJECTS\PAWPHILE\cv\datasets\dataset_manifest.csv'
images_dir = r'd:\PROJECTS\PAWPHILE\cv\datasets\images'

def validate_manifest():
    with open(manifest_path, 'r', encoding='utf-8') as f:
        reader = list(csv.DictReader(f))
    
    total_images = len(reader)
    breeds = Counter()
    splits = Counter()
    
    errors = []
    
    allowed_breeds = {
        'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'Pug',
        'Beagle', 'Shih Tzu', 'Rottweiler', 'Doberman', 'Pomeranian',
        'Siberian Husky', 'Great Dane', 'Boxer', 'Cocker Spaniel',
        'Saint Bernard', 'Chihuahua'
    }

    for row in reader:
        breeds[row['breed']] += 1
        splits[row['split']] += 1
        
        # Check breed allowed
        if row['breed'] not in allowed_breeds:
            errors.append(f"Invalid breed: {row['breed']}")
            
        # Check missing images
        img_path = os.path.join(images_dir, row['image_path'])
        if not os.path.exists(img_path):
            errors.append(f"Missing image: {row['image_path']}")
            
        # Check bbox validity
        w, h = int(row['image_width']), int(row['image_height'])
        x, y = int(row['bbox_x']), int(row['bbox_y'])
        bw, bh = int(row['bbox_width']), int(row['bbox_height'])
        
        if w <= 0 or h <= 0:
            errors.append(f"Invalid dimensions {w}x{h} for {row['image_path']}")
            
        if x < 0 or y < 0 or bw <= 0 or bh <= 0:
            errors.append(f"Invalid bbox dims for {row['image_path']}")
            
        if x >= w or y >= h:
            errors.append(f"Bbox out of bounds for {row['image_path']}")
            
    print("--- MANIFEST VALIDATION ---")
    print(f"Total entries: {total_images}")
    print(f"Splits: {dict(splits)}")
    print(f"Breeds: {dict(breeds)}")
    print(f"Errors found: {len(errors)}")
    if errors:
        print("First 10 errors:")
        for e in errors[:10]:
            print(f"- {e}")

if __name__ == "__main__":
    validate_manifest()
