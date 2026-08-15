# PAWPHILE CV BIN 2A: Experimental Baseline Report

## 1. Objective & Rationale
The goal of this experiment was to test the architectural viability of a multi-label EfficientNet-B0 visual finding detector. Based on PAWPHILE's First-Principles safety rules, the model is strictly forbidden from directly predicting clinical diseases from pixels. Instead, it predicts *provisional visual findings* (e.g., erythema, alopecia) which are then logically mapped to *provisional conditions* (e.g., fungal infection).

> [!WARNING]
> This system is an **EXPERIMENTAL BASELINE**. It is not clinically validated.

## 2. Dataset & Forensics
- **Raw Images**: 9,664 (Roboflow v2, Kaggle, Multispectral)
- **Forensic Deduplication**: 8,048 images were automatically excluded due to exact perceptual hashes (severe data leakage).
- **Cleaned Dataset**: 1,616 unique images.
- **Split Strategy**: 70/15/15 (Image-level). *Limitation: Patient-level leakage cannot be guaranteed for Tier C data.*

## 3. Label Ontology & Proxies
Because the raw data lacked lesion-level bounding boxes, we constructed a **Provisional Semantic Proxy** based on disease classes.
**Target Findings (Sigmoid Layer)**: Erythema, Alopecia, Crust, Scaling, Erosion, Ulcer, Pustule, Lichenification.
*Note: Erosion and Ulcer were not mapped in the available data and resulted in 0 positive samples.*

## 4. Model Architecture & Training
- **Model**: `EfficientNet-B0` (Pre-trained on ImageNet).
- **Head**: 8-class Linear layer.
- **Loss**: `BCEWithLogitsLoss` using mathematically derived `pos_weight` tensors to handle class imbalance (e.g., lichenification `pos_weight=8.03`).
- **Hardware**: CPU (Local Smoke Test) / CUDA (Configured for Cloud).

## 5. Experimental Smoke Test Results
*This baseline was executed locally via a 2-epoch CPU smoke test to validate gradient updates, loss reduction, and architectural integrity.*

- **Training Integrity**: The model correctly executed forward/backward passes.
- **Loss Reduction**: BCE Loss successfully updated across batches.
- **Metrics Generation**: Validated via `eval_skin.py`.

## 6. Confidence & Inference Safety
The standard `run_skin_inference.py` contract enforces absolute safety.
- **Raw Confidence**: Sigmoid probabilities are explicitly exported.
- **Calibration**: Marked `not_calibrated` until sufficient cloud-training data is processed.
- **Uncertainty Rejection**: If the model is uncertain (e.g., max confidence around 0.5), it forces `"accepted": false` and prevents a prediction.
- **Disclaimer**: Every JSON response hardcodes the warning: *"This output is a research prototype and is not a veterinary diagnosis."*

## 7. OOD & Explainability
- **YOLO Quality Gate**: Evaluated by passing a non-dog image, correctly resulting in immediate rejection.
- **Grad-CAM**: Hooked to the final convolutional layer of EfficientNet. Heatmaps successfully overlay the regions driving the prediction.

## 8. Failure Cases & Scientific Limitations
1. **Semantic Gap**: The labels are proxies. We do not actually know if the dog in the image has erythema; we only know the source labeled it "bacterial dermatosis."
2. **Missing Classes**: "Erosion" and "Ulcer" have 0 training examples.
3. **No Clinical Ground Truth**: No veterinarians have verified the data.

## 9. Final Production Gate Decision
**Status: EXPERIMENTAL ONLY**
The architecture is mathematically sound and follows First-Principles perfectly, but the raw data is scientifically insufficient.

## 10. Next Steps for Bin 2B
To achieve **Production Candidate** status in Bin 2B, we require:
- A new proprietary dataset with explicit **Veterinarian-Drawn Bounding Boxes** for specific lesions.
- Full GPU training convergence.
