# PAWPHILE CV Calibration Strategy

PAWPHILE enforces the distinction between "Raw Probability" (e.g. sigmoid logits) and "Calibrated Confidence" (statistically reliable likelihood).

## 1. Pipeline
When Tier A clinical data trains the Bin 2C model, the post-training pipeline is:
1. Extract logits on the isolated validation set.
2. Apply **Temperature Scaling** to tune the logits so the output probability matches the empirical accuracy.
3. Lock the temperature scalar alongside the model weights.
4. Measure Expected Calibration Error (ECE).

## 2. Status
- **Current Status**: BLOCKED — CLINICAL DATA NOT AVAILABLE
- **ECE**: N/A
- **Brier Score**: N/A
