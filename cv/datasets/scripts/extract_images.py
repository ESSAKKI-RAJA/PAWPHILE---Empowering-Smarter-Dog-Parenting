import tarfile
import os
import csv
from pathlib import Path

desktop_db = r'C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE'
manifest_path = r'd:\PROJECTS\PAWPHILE\cv\datasets\dataset_manifest.csv'
output_dir = r'd:\PROJECTS\PAWPHILE\cv\datasets\images'

Path(output_dir).mkdir(parents=True, exist_ok=True)

# Read manifest to get the required images
required_images = set()
with open(manifest_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        required_images.add(row['image_path'])

print(f"Need to extract {len(required_images)} images.")

extracted_count = 0
with tarfile.open(os.path.join(desktop_db, 'images.tar'), 'r') as tar:
    for member in tar.getmembers():
        if member.isfile() and member.name.replace('\\', '/') in required_images:
            # We want to extract it but flatten the directory or keep the folder structure
            # Let's keep the breed folder structure: Images/breed_id/file.jpg
            # Actually, `tar.extract` will create the directory structure `Images/...` inside output_dir
            tar.extract(member, path=output_dir)
            extracted_count += 1
            if extracted_count % 100 == 0:
                print(f"Extracted {extracted_count}/{len(required_images)}...")
                
print(f"Extraction complete! Extracted {extracted_count} images.")
