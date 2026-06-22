import torch
import torch.nn.functional as F
import base64
import cv2
import numpy as np
from app.triage.triage import get_triage_for_skin
from app.explainability.gradcam import ExplainVetGradCAM, overlay_cam
import uuid
import os

# Simulated model loading
from training.track1_skin.train import build_model, SKIN_CLASSES
from training.shared.augmentations import get_valid_transforms

class DermAIEngine:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = build_model(num_classes=len(SKIN_CLASSES)).to(self.device)
        self.model.eval()
        
        # In a real environment, load weights:
        # self.model.load_state_dict(torch.load("path/to/skin_weights.pth", map_location=self.device))
        
        # Setup GradCAM on the last conv layer of EfficientNet
        target_layer = self.model.features[-1]
        self.grad_cam = ExplainVetGradCAM(self.model, target_layer)
        
        self.transforms = get_valid_transforms()

    def process_base64_image(self, b64_string: str) -> np.ndarray:
        img_data = base64.b64decode(b64_string.split(',')[1] if ',' in b64_string else b64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img

    def analyze(self, b64_string: str):
        image = self.process_base64_image(b64_string)
        
        # Preprocess
        augmented = self.transforms(image=image)
        input_tensor = augmented['image'].unsqueeze(0).to(self.device)
        
        # Inference
        with torch.no_grad():
            output = self.model(input_tensor)
            probabilities = F.softmax(output, dim=1)
            confidence, predicted_idx = torch.max(probabilities, 1)
            
        predicted_class = SKIN_CLASSES[predicted_idx.item()]
        conf_score = confidence.item()
        
        # Generate Grad-CAM (enable gradients momentarily)
        with torch.enable_grad():
            heatmap = self.grad_cam.generate_cam(input_tensor, predicted_idx.item())
        
        overlay = overlay_cam(input_tensor.squeeze(0), heatmap)
        
        # Save GradCAM overlay locally (or to S3 in production)
        filename = f"{uuid.uuid4().hex}_gradcam.jpg"
        # Dummy path for local testing
        cam_path = os.path.join("/tmp", filename)
        # cv2.imwrite(cam_path, cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        # gradcam_url = f"https://api.pawphile.com/assets/{filename}"
        gradcam_url = f"data:image/jpeg;base64,dummy_gradcam_base64" # Placeholder
        
        # Get Triage
        triage_info = get_triage_for_skin(predicted_class, conf_score)
        
        return {
            "predicted_class": predicted_class,
            "confidence_score": conf_score,
            "triage_level": triage_info["triage_level"],
            "reason_text": triage_info["reason"],
            "gradcam_url": gradcam_url,
            "disclaimer": triage_info["disclaimer"]
        }

skin_service = DermAIEngine()
