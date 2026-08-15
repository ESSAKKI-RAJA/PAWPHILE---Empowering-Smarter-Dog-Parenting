import os
import csv
import cv2
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from preprocessing.quality_gate import ImageQualityGate

manifest_path = r'd:\PROJECTS\PAWPHILE\cv\datasets\dataset_manifest.csv'
images_dir = r'd:\PROJECTS\PAWPHILE\cv\datasets\images'

def test_gate():
    gate = ImageQualityGate()
    
    with open(manifest_path, 'r', encoding='utf-8') as f:
        reader = list(csv.DictReader(f))
        
    rejected_count = 0
    total = min(500, len(reader))
    
    for row in reader[:total]:
        img_path = os.path.join(images_dir, row['image_path'])
        img = cv2.imread(img_path)
        if img is None: continue
        
        res = gate.assess_quality(img)
        if not res['acceptable']:
            rejected_count += 1
            # print(f"Rejected {os.path.basename(img_path)}: {res['issues']}")
            
    print(f"Tested {total} images.")
    print(f"Rejected: {rejected_count} ({rejected_count/total*100:.1f}%)")

if __name__ == "__main__":
    test_gate()
