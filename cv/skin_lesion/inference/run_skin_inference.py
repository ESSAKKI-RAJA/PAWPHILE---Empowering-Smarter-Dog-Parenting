import os
import json
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

class SkinInferencePipeline:
    def __init__(self, model_path, thresholds_path):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        self.findings_order = [
            "erythema", "alopecia", "crust", "scaling", 
            "erosion", "ulcer", "pustule", "lichenification"
        ]
        
        # Load thresholds
        with open(thresholds_path, 'r') as f:
            self.thresholds = json.load(f)
            
        # Initialize model
        self.model = models.efficientnet_b0()
        num_ftrs = self.model.classifier[1].in_features
        self.model.classifier[1] = nn.Linear(num_ftrs, 8)
        
        if os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        else:
            print(f"Warning: Model not found at {model_path}. Inference will be random.")
            
        self.model = self.model.to(self.device)
        self.model.eval()
        
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def infer(self, image_path, dog_detected=True, quality_pass=True):
        if not quality_pass or not dog_detected:
            return self._build_json([], dog_detected, quality_pass, rejected_upstream=True)
            
        image = Image.open(image_path).convert('RGB')
        input_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probs = torch.sigmoid(outputs)[0].cpu().numpy()
            
        finding_results = []
        for i, finding in enumerate(self.findings_order):
            prob = float(probs[i])
            thresh = self.thresholds.get(finding, 0.5)
            accepted = prob >= thresh
            
            # If probability is highly uncertain (e.g., between 0.4 and 0.6), flag it
            if 0.4 < prob < 0.6 and accepted:
                 # Prefer rejecting uncertain borderline predictions
                 accepted = False
                 
            if prob > 0.1: # Only include if it has SOME probability
                finding_results.append({
                    "name": finding,
                    "raw_confidence": round(prob, 3),
                    "calibrated_confidence": None, # Calibration not mathematically possible on small experimental data
                    "accepted": accepted
                })
                
        return self._build_json(finding_results, dog_detected, quality_pass, rejected_upstream=False)

    def _build_json(self, findings, dog_detected, quality_pass, rejected_upstream):
        # Map active findings to conditions
        active_findings = [f['name'] for f in findings if f['accepted']]
        
        conditions = []
        if rejected_upstream:
            uncertainty_status = "high"
        else:
            # Simple heuristic mapping for experimental baseline
            if "erythema" in active_findings and "crust" in active_findings:
                conditions.append({"name": "bacterial dermatosis", "confidence": None, "status": "research_association"})
            elif "alopecia" in active_findings and "scaling" in active_findings:
                conditions.append({"name": "fungal infection", "confidence": None, "status": "research_association"})
            elif "erythema" in active_findings and "lichenification" in active_findings:
                conditions.append({"name": "hypersensitivity / allergic dermatitis", "confidence": None, "status": "research_association"})
            elif len(active_findings) == 0:
                conditions.append({"name": "healthy", "confidence": None, "status": "research_association"})
            else:
                conditions.append({"name": "nonspecific dermatitis", "confidence": None, "status": "research_association"})
                
            uncertainty_status = "low" if len(active_findings) > 0 else "moderate"

        response = {
            "model_version": "pawphile-skin-baseline-v0.1",
            "dog_detected": dog_detected,
            "quality": {
                "acceptable": quality_pass,
                "issues": [] if quality_pass else ["Quality Gate Failed"]
            },
            "findings": findings,
            "possible_conditions": conditions if not rejected_upstream else [],
            "uncertainty": {
                "status": uncertainty_status
            },
            "clinical_validation": False,
            "decision": "research_only",
            "disclaimer": "This output is a research prototype and is not a veterinary diagnosis."
        }
        
        return json.dumps(response, indent=2)

def main():
    model_path = r'd:\PROJECTS\PAWPHILE\cv\models\efficientnet_skin_experimental.pth'
    thresh_path = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\thresholds.json'
    
    pipeline = SkinInferencePipeline(model_path, thresh_path)
    
    # Test with an image
    test_img = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\dataset_manifest.csv' # using manifest just to resolve a dummy, will fail obviously if not image
    # Let's find a real image path from the dataset
    import pandas as pd
    manifest = pd.read_csv(r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\prepared_manifest.csv')
    real_img = manifest.iloc[0]['source_path']
    
    print("\n--- INFERENCE TEST ---")
    print(pipeline.infer(real_img))
    
    print("\n--- OOD REJECTION TEST (Dog not detected) ---")
    print(pipeline.infer(real_img, dog_detected=False))

if __name__ == "__main__":
    main()
