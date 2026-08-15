import os
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import models, transforms
from sklearn.metrics import precision_recall_curve, f1_score, roc_auc_score, average_precision_score
import numpy as np
import pandas as pd
from tqdm import tqdm
from ..datasets.lesion_dataset import SkinLesionDataset

def determine_thresholds(y_true, y_prob, target_findings):
    thresholds_dict = {}
    print("\n--- Threshold Optimization (Valid Set) ---")
    
    for i, finding in enumerate(target_findings):
        # Skip if no positive examples
        if np.sum(y_true[:, i]) == 0:
            thresholds_dict[finding] = 0.5
            print(f"{finding:15s}: No positive examples. Defaulting to 0.50")
            continue
            
        precision, recall, thresholds = precision_recall_curve(y_true[:, i], y_prob[:, i])
        
        # Calculate F1 scores for each threshold
        f1_scores = 2 * (precision * recall) / (precision + recall + 1e-8)
        
        # We want safety. Prefer higher precision over recall to avoid false alarms,
        # but for baseline we'll take the threshold that maximizes F1.
        best_idx = np.argmax(f1_scores)
        best_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5
        
        thresholds_dict[finding] = round(float(best_threshold), 2)
        print(f"{finding:15s}: Best Threshold = {best_threshold:.2f} (F1={f1_scores[best_idx]:.3f})")
        
    return thresholds_dict

def evaluate_metrics(y_true, y_prob, thresholds_dict, target_findings):
    print("\n--- Final Metrics (Test Set) ---")
    results = {}
    
    for i, finding in enumerate(target_findings):
        if np.sum(y_true[:, i]) == 0:
            print(f"{finding:15s}: N/A (No positive examples)")
            results[finding] = {"precision": 0, "recall": 0, "f1": 0, "pr_auc": 0}
            continue
            
        thresh = thresholds_dict[finding]
        y_pred = (y_prob[:, i] >= thresh).astype(int)
        
        # Calculate metrics manually for explicit reporting
        tp = np.sum((y_pred == 1) & (y_true[:, i] == 1))
        fp = np.sum((y_pred == 1) & (y_true[:, i] == 0))
        fn = np.sum((y_pred == 0) & (y_true[:, i] == 1))
        tn = np.sum((y_pred == 0) & (y_true[:, i] == 0))
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        pr_auc = average_precision_score(y_true[:, i], y_prob[:, i])
        
        results[finding] = {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
            "pr_auc": round(pr_auc, 3),
            "threshold_used": thresh
        }
        print(f"{finding:15s}: PR-AUC={pr_auc:.3f} | Prec={precision:.3f} | Rec={recall:.3f} | F1={f1:.3f}")
        
    return results

def get_predictions(model, loader, device):
    model.eval()
    all_targets = []
    all_probs = []
    
    with torch.no_grad():
        for images, targets in tqdm(loader, desc="Evaluating"):
            images = images.to(device)
            outputs = model(images)
            probs = torch.sigmoid(outputs)
            
            all_targets.append(targets.cpu().numpy())
            all_probs.append(probs.cpu().numpy())
            
    return np.vstack(all_targets), np.vstack(all_probs)

def main():
    manifest_path = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\prepared_manifest.csv'
    weights_path = r'd:\PROJECTS\PAWPHILE\cv\models\efficientnet_skin_experimental.pth'
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    if not os.path.exists(weights_path):
        print(f"Error: Model weights not found at {weights_path}")
        return

    findings_order = [
        "erythema", "alopecia", "crust", "scaling", 
        "erosion", "ulcer", "pustule", "lichenification"
    ]
    
    # Model
    model = models.efficientnet_b0()
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, 8)
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model = model.to(device)
    
    val_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_dataset = SkinLesionDataset(manifest_path, split='valid', transform=val_transforms)
    test_dataset = SkinLesionDataset(manifest_path, split='test', transform=val_transforms)
    
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
    
    # Validation -> Threshold optimization
    print("\nExtracting Validation Probabilities...")
    y_true_val, y_prob_val = get_predictions(model, val_loader, device)
    thresholds_dict = determine_thresholds(y_true_val, y_prob_val, findings_order)
    
    # Test -> Final evaluation
    print("\nExtracting Test Probabilities...")
    y_true_test, y_prob_test = get_predictions(model, test_loader, device)
    results = evaluate_metrics(y_true_test, y_prob_test, thresholds_dict, findings_order)
    
    # Save thresholds for inference script
    out_thresh = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\thresholds.json'
    with open(out_thresh, 'w') as f:
        json.dump(thresholds_dict, f, indent=2)
    print(f"\nSaved optimal thresholds to {out_thresh}")

if __name__ == "__main__":
    main()
