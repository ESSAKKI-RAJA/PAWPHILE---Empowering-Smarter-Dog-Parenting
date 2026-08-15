import torch
import torch.nn.functional as F
from torchvision import models, transforms
import cv2
import numpy as np
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import torch.nn as nn

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_backward_hook(self.save_gradient)

    def save_activation(self, module, input, output):
        self.activations = output

    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def generate(self, input_tensor, class_idx=None):
        self.model.eval()
        
        # Forward pass
        output = self.model(input_tensor)
        if class_idx is None:
            class_idx = output.argmax(dim=1).item()
            
        self.model.zero_grad()
        score = output[0, class_idx]
        score.backward()
        
        # Calculate Grad-CAM
        gradients = self.gradients.data.cpu().numpy()[0]
        activations = self.activations.data.cpu().numpy()[0]
        
        weights = np.mean(gradients, axis=(1, 2))
        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        
        for i, w in enumerate(weights):
            cam += w * activations[i]
            
        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (input_tensor.shape[3], input_tensor.shape[2]))
        cam -= np.min(cam)
        cam /= np.max(cam) + 1e-8
        
        return cam

def test_grad_cam():
    print("Testing Grad-CAM setup...")
    device = torch.device("cpu")
    model = models.efficientnet_b0(weights=None)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, 15)
    model_path = r'd:\PROJECTS\PAWPHILE\cv\models\effnet_b0_breeds.pth'
    
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    
    # The last conv layer in EfficientNet-B0
    target_layer = model.features[-1]
    grad_cam = GradCAM(model, target_layer)
    
    # Create dummy tensor to verify it doesn't crash
    dummy_input = torch.randn(1, 3, 224, 224)
    cam = grad_cam.generate(dummy_input)
    print("Grad-CAM shape:", cam.shape)
    print("Grad-CAM generation successful.")

if __name__ == "__main__":
    test_grad_cam()
