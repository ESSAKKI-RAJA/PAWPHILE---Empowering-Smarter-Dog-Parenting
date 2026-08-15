import os
import cv2
import json
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Hook the target layer
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_full_backward_hook(self.save_gradient)
        
    def save_activation(self, module, input, output):
        self.activations = output

    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def __call__(self, x, class_idx=None):
        # Forward pass
        self.model.zero_grad()
        output = self.model(x)
        
        # If no specific class, use the one with highest prediction
        if class_idx is None:
            class_idx = torch.argmax(output, dim=1).item()
            
        score = output[:, class_idx]
        score.backward(retain_graph=True)
        
        # Get gradients and activations
        gradients = self.gradients.data.cpu().numpy()[0]
        activations = self.activations.data.cpu().numpy()[0]
        
        # Pool gradients across spatial dimensions
        weights = np.mean(gradients, axis=(1, 2))
        
        # Weight activations
        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i, :, :]
            
        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (x.shape[3], x.shape[2]))
        cam = cam - np.min(cam)
        cam = cam / np.max(cam) if np.max(cam) > 0 else cam
        
        return cam, class_idx

def generate_heatmap(image_path, model_path, output_path):
    device = torch.device("cpu")
    
    # Load model
    model = models.efficientnet_b0()
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, 8)
    
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    
    target_layer = model.features[-1] # Last conv block
    grad_cam = GradCAM(model, target_layer)
    
    # Prep image
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    image = Image.open(image_path).convert('RGB')
    image_tensor = transform(image).unsqueeze(0)
    
    # Generate CAM
    cam, class_idx = grad_cam(image_tensor)
    
    findings_order = [
        "erythema", "alopecia", "crust", "scaling", 
        "erosion", "ulcer", "pustule", "lichenification"
    ]
    predicted_lesion = findings_order[class_idx]
    
    # Overlay heatmap
    image_np = np.array(image.resize((224, 224)))
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    heatmap = np.float32(heatmap) / 255
    overlay = heatmap + np.float32(image_np) / 255
    overlay = overlay / np.max(overlay)
    
    output = np.uint8(255 * overlay)
    cv2.imwrite(output_path, cv2.cvtColor(output, cv2.COLOR_RGB2BGR))
    
    print(f"Generated Grad-CAM for target '{predicted_lesion}' at {output_path}")

def main():
    model_path = r'd:\PROJECTS\PAWPHILE\cv\models\efficientnet_skin_experimental.pth'
    
    import pandas as pd
    manifest = pd.read_csv(r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\prepared_manifest.csv')
    real_img = manifest.iloc[0]['source_path']
    
    out_dir = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\classification'
    generate_heatmap(real_img, model_path, os.path.join(out_dir, 'gradcam_sample.jpg'))

if __name__ == "__main__":
    main()
