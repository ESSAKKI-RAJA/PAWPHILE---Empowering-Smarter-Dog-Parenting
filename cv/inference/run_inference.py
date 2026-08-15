import json
import os
import sys
import torch
from torchvision import transforms, models
import torch.nn as nn
from PIL import Image

# Add parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from preprocessing.quality_gate import ImageQualityGate

# Dummy YOLO wrapper to avoid ultralytics dependency in API (for now)
# Real implementation would use: from ultralytics import YOLO
class YOLODetector:
    def __init__(self, model_path):
        self.model_path = model_path
        # In real life: self.model = YOLO(model_path)
    
    def predict(self, image_path):
        # MOCK IMPLEMENTATION returning center crop
        img = Image.open(image_path)
        w, h = img.size
        # Mock detection: center 50%
        return {
            "x": int(w * 0.25),
            "y": int(h * 0.25),
            "w": int(w * 0.5),
            "h": int(h * 0.5),
            "conf": 0.99
        }

class BreedClassifier:
    def __init__(self, model_path):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.classes = sorted([
            'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'Pug',
            'Beagle', 'Shih Tzu', 'Rottweiler', 'Doberman', 'Pomeranian',
            'Siberian Husky', 'Great Dane', 'Boxer', 'Cocker Spaniel',
            'Saint Bernard', 'Chihuahua'
        ])
        
        # Load model architecture
        self.model = models.efficientnet_b0(weights=None)
        num_ftrs = self.model.classifier[1].in_features
        self.model.classifier[1] = nn.Linear(num_ftrs, 15)
        
        # Load weights if available
        if os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
        self.model.to(self.device)
        self.model.eval()
        
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def predict(self, image: Image.Image):
        img_t = self.transform(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            outputs = self.model(img_t)
            probs = torch.nn.functional.softmax(outputs, dim=1)
            conf, pred = torch.max(probs, 1)
        
        return self.classes[pred.item()], conf.item()

def run_inference(image_path: str):
    import cv2
    result = {
        "dog_detected": False,
        "crop_box": None,
        "quality": {"acceptable": False, "issues": ["Unknown error"]},
        "prediction": None,
        "raw_confidence": 0.0,
        "calibrated_confidence": 0.0,
        "uncertainty": 0.0,
        "accepted": False,
        "model_version": "pawphile-cv-bin1-v1"
    }
    
    if not os.path.exists(image_path):
        result["quality"]["issues"] = ["Image not found"]
        return json.dumps(result, indent=2)

    # 1. Quality Gate
    cv_img = cv2.imread(image_path)
    gate = ImageQualityGate()
    quality = gate.assess_quality(cv_img)
    result["quality"] = {
        "acceptable": quality["acceptable"],
        "issues": quality["issues"]
    }
    
    # 2. Dog Detection
    yolo_model_path = r'd:\PROJECTS\PAWPHILE\cv\models\yolo_dog_det\weights\best.pt'
    detector = YOLODetector(yolo_model_path)
    box = detector.predict(image_path)
    
    if box['conf'] > 0.5:
        result["dog_detected"] = True
        result["crop_box"] = {
            "x": box["x"],
            "y": box["y"],
            "width": box["w"],
            "height": box["h"]
        }
    else:
        # No dog detected
        result["prediction"] = "Insufficient visual evidence (no dog detected)"
        return json.dumps(result, indent=2)
        
    # 3. Breed Classification
    effnet_path = r'd:\PROJECTS\PAWPHILE\cv\models\effnet_b0_breeds.pth'
    classifier = BreedClassifier(effnet_path)
    
    # Crop image for classification
    pil_img = Image.open(image_path).convert('RGB')
    cropped_img = pil_img.crop((box["x"], box["y"], box["x"]+box["w"], box["y"]+box["h"]))
    
    breed, raw_conf = classifier.predict(cropped_img)
    
    # Mock calibration until temperature scaling is implemented
    # Typically calibrated_confidence = TemperatureScale(raw_conf)
    calibrated_conf = raw_conf * 0.95 
    uncertainty = 1.0 - calibrated_conf
    
    threshold = 0.75 # Minimum acceptable confidence for breed identification
    accepted = calibrated_conf >= threshold
    
    if accepted:
        result["prediction"] = breed
    else:
        result["prediction"] = "Insufficient confidence for reliable classification."
        
    result["raw_confidence"] = round(raw_conf, 4)
    result["calibrated_confidence"] = round(calibrated_conf, 4)
    result["uncertainty"] = round(uncertainty, 4)
    result["accepted"] = accepted
    
    return json.dumps(result, indent=2)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
    else:
        # Pick a sample image from the test set
        manifest_path = r'd:\PROJECTS\PAWPHILE\cv\datasets\dataset_manifest.csv'
        import csv
        with open(manifest_path, 'r') as f:
            reader = csv.DictReader(f)
            first_test = next(r for r in reader if r['split'] == 'test')
        img_path = os.path.join(r'd:\PROJECTS\PAWPHILE\cv\datasets\images', first_test['image_path'])
        
    print(run_inference(img_path))
