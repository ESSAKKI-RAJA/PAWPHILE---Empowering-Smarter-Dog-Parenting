import os
import csv
import shutil
from pathlib import Path

manifest_path = r'd:\PROJECTS\PAWPHILE\cv\datasets\dataset_manifest.csv'
images_dir = r'd:\PROJECTS\PAWPHILE\cv\datasets\images'
yolo_dir = r'd:\PROJECTS\PAWPHILE\cv\datasets\yolo'

for split in ['train', 'val']:
    Path(os.path.join(yolo_dir, 'images', split)).mkdir(parents=True, exist_ok=True)
    Path(os.path.join(yolo_dir, 'labels', split)).mkdir(parents=True, exist_ok=True)

with open(manifest_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # We only have train and test in manifest, map test to val for YOLO
        split = "val" if row['split'] == "test" else "train"
        
        src_image_path = os.path.join(images_dir, row['image_path'])
        filename = os.path.basename(row['image_path'])
        
        # YOLO bounding box format: class x_center y_center width height (normalized 0-1)
        img_w = float(row['image_width'])
        img_h = float(row['image_height'])
        
        x = float(row['bbox_x'])
        y = float(row['bbox_y'])
        w = float(row['bbox_width'])
        h = float(row['bbox_height'])
        
        x_center = (x + w/2) / img_w
        y_center = (y + h/2) / img_h
        norm_w = w / img_w
        norm_h = h / img_h
        
        # Class is always 0 (dog)
        label_str = f"0 {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}\n"
        
        dst_image_path = os.path.join(yolo_dir, 'images', split, filename)
        dst_label_path = os.path.join(yolo_dir, 'labels', split, filename.replace('.jpg', '.txt'))
        
        if os.path.exists(src_image_path):
            shutil.copy(src_image_path, dst_image_path)
            with open(dst_label_path, 'w') as lf:
                lf.write(label_str)

# Create data.yaml
yaml_content = f"""
path: {yolo_dir}
train: images/train
val: images/val

names:
  0: dog
"""

with open(os.path.join(yolo_dir, 'data.yaml'), 'w') as f:
    f.write(yaml_content)

print(f"YOLO dataset prepared at {yolo_dir}")
