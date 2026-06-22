import albumentations as A
from albumentations.pytorch import ToTensorV2
import cv2

# Preprocessing pipeline across all three tracks
# "resize to 224x224, normalize to backbone-specific mean/std, augment only the training split"
# ImageNet statistics
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]

def get_train_transforms():
    """
    Augmentation for training: horizontal flip, +/-15 rotation, +/-15% brightness/contrast jitter, mild zoom (scale).
    """
    return A.Compose([
        A.Resize(224, 224),
        # horizontal flip
        A.HorizontalFlip(p=0.5),
        # +/- 15 degree rotation
        A.Rotate(limit=15, p=0.7),
        # mild zoom (scale between 0.9 and 1.1)
        A.ShiftScaleRotate(shift_limit=0, scale_limit=0.1, rotate_limit=0, p=0.5),
        # +/- 15% brightness/contrast jitter
        A.RandomBrightnessContrast(brightness_limit=0.15, contrast_limit=0.15, p=0.5),
        A.Normalize(mean=MEAN, std=STD),
        ToTensorV2()
    ])

def get_valid_transforms():
    """
    Transform for validation/inference: only resize and normalize.
    """
    return A.Compose([
        A.Resize(224, 224),
        A.Normalize(mean=MEAN, std=STD),
        ToTensorV2()
    ])

def apply_clahe(image_bgr):
    """
    "apply CLAHE contrast enhancement for low-light clinical images"
    """
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    enhanced_img = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    return enhanced_img
