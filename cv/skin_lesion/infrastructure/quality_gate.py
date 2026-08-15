import cv2
import numpy as np
from PIL import Image

class ImageQualityGate:
    def __init__(self, min_resolution=(512, 512), min_variance=100):
        self.min_resolution = min_resolution
        self.min_variance = min_variance

    def is_blurry(self, image_np: np.ndarray) -> bool:
        """Uses Laplacian variance to detect blur."""
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        return variance < self.min_variance

    def is_too_dark_or_bright(self, image_np: np.ndarray) -> bool:
        """Checks if average brightness is extremely low or high."""
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        mean_brightness = np.mean(gray)
        if mean_brightness < 20 or mean_brightness > 240:
            return True
        return False

    def evaluate_image(self, file_path: str) -> dict:
        try:
            pil_img = Image.open(file_path).convert('RGB')
            w, h = pil_img.size
            
            if w < self.min_resolution[0] or h < self.min_resolution[1]:
                return {"acceptable": False, "reason": f"Resolution too low: {w}x{h}"}
                
            img_np = np.array(pil_img)
            
            if self.is_blurry(img_np):
                return {"acceptable": False, "reason": "Image is too blurry"}
                
            if self.is_too_dark_or_bright(img_np):
                return {"acceptable": False, "reason": "Extreme lighting conditions (dark/overexposed)"}
                
            return {"acceptable": True, "reason": ""}
            
        except Exception as e:
            return {"acceptable": False, "reason": f"Corrupt image: {str(e)}"}

if __name__ == "__main__":
    print("Quality Gate Initialized.")
