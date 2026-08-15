import cv2
import numpy as np
from typing import Tuple, List, Dict

class ImageQualityGate:
    def __init__(self, blur_threshold=50.0, dark_threshold=20.0, overexposed_threshold=240.0, overexposed_ratio=0.15):
        """
        Initialize the image quality gate.
        
        Args:
            blur_threshold: Minimum variance of Laplacian. Below this, image is considered blurry.
            dark_threshold: Minimum mean pixel value. Below this, image is considered too dark.
            overexposed_threshold: Pixel value above which a pixel is considered bright/overexposed.
            overexposed_ratio: Maximum fraction of overexposed pixels.
        """
        self.blur_threshold = blur_threshold
        self.dark_threshold = dark_threshold
        self.overexposed_threshold = overexposed_threshold
        self.overexposed_ratio = overexposed_ratio

    def assess_quality(self, image: np.ndarray) -> Dict:
        """
        Assess the quality of an image (BGR).
        
        Returns:
            Dict: {'acceptable': bool, 'issues': List[str]}
        """
        issues = []
        if image is None or image.size == 0:
            return {"acceptable": False, "issues": ["Invalid or empty image"]}

        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # 1. Check Blurriness
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        if variance < self.blur_threshold:
            issues.append(f"Image is too blurry (variance: {variance:.2f} < {self.blur_threshold})")

        # 2. Check Darkness
        mean_brightness = np.mean(gray)
        if mean_brightness < self.dark_threshold:
            issues.append(f"Image is too dark (mean brightness: {mean_brightness:.2f} < {self.dark_threshold})")

        # 3. Check Overexposure
        num_overexposed = np.sum(gray > self.overexposed_threshold)
        ratio_overexposed = num_overexposed / gray.size
        if ratio_overexposed > self.overexposed_ratio:
            issues.append(f"Image is overexposed ({ratio_overexposed:.1%} bright pixels > {self.overexposed_ratio:.1%})")

        acceptable = len(issues) == 0
        return {
            "acceptable": acceptable,
            "issues": issues,
            "metrics": {
                "blur_variance": variance,
                "mean_brightness": mean_brightness,
                "overexposed_ratio": ratio_overexposed
            }
        }

if __name__ == "__main__":
    # Simple test
    gate = ImageQualityGate()
    # Create a dummy dark image
    dark_img = np.zeros((100, 100, 3), dtype=np.uint8)
    res = gate.assess_quality(dark_img)
    print("Dark Image Test:", res)
    
    # Create a dummy overexposed image
    bright_img = np.full((100, 100, 3), 255, dtype=np.uint8)
    res2 = gate.assess_quality(bright_img)
    print("Bright Image Test:", res2)
