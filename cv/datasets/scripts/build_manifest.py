import tarfile
import scipy.io
import os
import csv
import xml.etree.ElementTree as ET

desktop_db = r'C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE'

target_breeds = {
    'n02099712-Labrador_retriever': 'Labrador Retriever',
    'n02106662-German_shepherd': 'German Shepherd',
    'n02099601-golden_retriever': 'Golden Retriever',
    'n02110958-pug': 'Pug',
    'n02088364-beagle': 'Beagle',
    'n02086240-Shih-Tzu': 'Shih Tzu',
    'n02106550-Rottweiler': 'Rottweiler',
    'n02107142-Doberman': 'Doberman',
    'n02112018-Pomeranian': 'Pomeranian',
    'n02110185-Siberian_husky': 'Siberian Husky',
    'n02109047-Great_Dane': 'Great Dane',
    'n02108089-boxer': 'Boxer',
    'n02102318-cocker_spaniel': 'Cocker Spaniel',
    'n02109525-Saint_Bernard': 'Saint Bernard',
    'n02085620-Chihuahua': 'Chihuahua'
}

# Extract lists.tar to memory
with tarfile.open(os.path.join(desktop_db, 'lists.tar'), 'r') as tar:
    train_mat_file = tar.extractfile('train_list.mat')
    test_mat_file = tar.extractfile('test_list.mat')
    
    # Save temporarily to load with scipy
    with open('train_list.mat', 'wb') as f:
        f.write(train_mat_file.read())
    with open('test_list.mat', 'wb') as f:
        f.write(test_mat_file.read())

train_mat = scipy.io.loadmat('train_list.mat')
test_mat = scipy.io.loadmat('test_list.mat')

# Format of train_mat: file_list is a list of arrays containing file names (like 'n02085620-Chihuahua/n02085620_2650.jpg')
train_files = set([item[0][0] for item in train_mat['file_list']])
test_files = set([item[0][0] for item in test_mat['file_list']])

# Clean up temporary files
os.remove('train_list.mat')
os.remove('test_list.mat')

# 2. Extract annotations for the 15 breeds directly from the tar file
manifest_data = []

with tarfile.open(os.path.join(desktop_db, 'annotation.tar'), 'r') as tar:
    for member in tar.getmembers():
        if member.isfile():
            # Example member.name: Annotation/n02085620-Chihuahua/n02085620_10074
            parts = member.name.replace('\\', '/').split('/')
            if len(parts) >= 3:
                folder_name = parts[-2]
                if folder_name in target_breeds:
                    f = tar.extractfile(member)
                    content = f.read()
                    
                    try:
                        root = ET.fromstring(content)
                        filename = root.find('filename').text
                        size = root.find('size')
                        width = int(size.find('width').text)
                        height = int(size.find('height').text)
                        
                        # Only take first dog bounding box if multiple exist
                        obj = root.find('object')
                        if obj is not None:
                            bndbox = obj.find('bndbox')
                            xmin = int(bndbox.find('xmin').text)
                            ymin = int(bndbox.find('ymin').text)
                            xmax = int(bndbox.find('xmax').text)
                            ymax = int(bndbox.find('ymax').text)
                            
                            bbox_w = xmax - xmin
                            bbox_h = ymax - ymin
                            
                            # Construct expected image path (without Images/ prefix)
                            image_rel_path = f"{folder_name}/{filename}.jpg"
                            
                            split = "val" # We'll split the train set later if needed
                            if image_rel_path in train_files:
                                split = "train"
                            elif image_rel_path in test_files:
                                split = "test"
                                
                            manifest_data.append({
                                'image_path': f"Images/{image_rel_path}",
                                'breed': target_breeds[folder_name],
                                'breed_id': folder_name,
                                'split': split,
                                'image_width': width,
                                'image_height': height,
                                'bbox_x': xmin,
                                'bbox_y': ymin,
                                'bbox_width': bbox_w,
                                'bbox_height': bbox_h,
                                'source_dataset': 'Stanford Dogs'
                            })
                    except Exception as e:
                        print(f"Error parsing {member.name}: {e}")

# Save to manifest
output_csv = r'd:\PROJECTS\PAWPHILE\cv\datasets\dataset_manifest.csv'
with open(output_csv, 'w', newline='', encoding='utf-8') as csvfile:
    fieldnames = ['image_path', 'breed', 'breed_id', 'split', 'image_width', 'image_height', 'bbox_x', 'bbox_y', 'bbox_width', 'bbox_height', 'source_dataset']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    
    writer.writeheader()
    for row in manifest_data:
        writer.writerow(row)
        
print(f"Manifest created with {len(manifest_data)} records at {output_csv}")
