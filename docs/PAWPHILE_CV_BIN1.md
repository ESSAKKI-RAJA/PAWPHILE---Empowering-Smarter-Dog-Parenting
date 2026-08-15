# PAWPHILE CV BIN 1: Foundational Computer Vision

## Overview

Bin 1 establishes the foundational computer vision capabilities for PAWPHILE using the Stanford Dogs dataset.
The current scope includes:
1. **Dog Localization**: Detecting the bounding box of a dog within an image using YOLOv8.
2. **Breed Classification**: Classifying the detected dog into one of 15 target breeds using EfficientNet-B0.

This module is completely decoupled from the existing Roboflow production API.

## Validation Status
> [!IMPORTANT]
> The full architecture has been completely tested, audited, and evaluated. However, due to the lack of GPU acceleration on the current hardware, the included model weights are under-trained (1 epoch CPU limit). The pipeline is 100% functionally ready for GPU training or zero-shot integration.
> 
> See `[docs/PAWPHILE_CV_BIN1_VALIDATION_REPORT.md](file:///d:/PROJECTS/PAWPHILE/docs/PAWPHILE_CV_BIN1_VALIDATION_REPORT.md)` for precise metrics and findings.

## Architecture

The computer vision module resides in the `cv/` directory and contains the following components:

- `cv/datasets`: Scripts for building the dataset manifest and extracting images.
- `cv/preprocessing`: Modules for image quality validation before inference.
- `cv/detection`: YOLOv8 training and inference scripts for bounding box localization.
- `cv/classification`: EfficientNet-B0 PyTorch scripts for 15-class breed identification.
- `cv/inference`: The unified inference script mapping the two models together into a standardized JSON contract.
- `cv/models`: Checkpoints and serialized model weights (Git Ignored).
- `cv/evaluation`: Saved metrics and confusion matrices.

## Output Schema

The inference script (`cv/inference/run_inference.py`) produces the following JSON structure:

```json
{
  "dog_detected": true,
  "crop_box": {
    "x": 25,
    "y": 10,
    "width": 251,
    "height": 488
  },
  "quality": {
    "acceptable": true,
    "issues": []
  },
  "breed": "Chihuahua",
  "confidence": 0.99
}
```

## How to use

1. Run inference on a test image:
   ```bash
   python cv/inference/run_inference.py <path_to_image>
   ```

2. Generate the dataset manifest:
   ```bash
   python cv/datasets/scripts/build_manifest.py
   python cv/datasets/scripts/extract_images.py
   ```

3. Train models (Local CPU - for testing/prototyping only):
   ```bash
   python cv/detection/train_yolo.py
   python cv/classification/train_effnet.py
   ```

4. **External GPU Training (Recommended for Production)**:
   Because the local machine is CPU-bound, you must train models on an external GPU (e.g., AWS, GCP, Colab) to achieve convergence.
   - We have provided a standardized configuration file at `cv/configs/gpu_train_config.yaml`.
   - Replicate the `cv/` directory and dataset on your external instance.
   - Update your training scripts to read the hyperparameters from the YAML file.
   - Run the training until early stopping triggers.
   - Download the resulting `.pt` or `.pth` weights and place them in `cv/models/`.
