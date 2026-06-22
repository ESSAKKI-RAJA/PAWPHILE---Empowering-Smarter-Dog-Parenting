import torch
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score
import numpy as np

def calculate_metrics(y_true, y_pred, class_names):
    """
    Computes per-class precision, recall, F1, and overall macro-F1.
    """
    report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True, zero_division=0)
    
    macro_f1 = f1_score(y_true, y_pred, average='macro', zero_division=0)
    macro_prec = precision_score(y_true, y_pred, average='macro', zero_division=0)
    macro_rec = recall_score(y_true, y_pred, average='macro', zero_division=0)
    
    metrics = {
        "macro_f1": macro_f1,
        "macro_precision": macro_prec,
        "macro_recall": macro_rec
    }
    
    for i, name in enumerate(class_names):
        if name in report:
            metrics[f"class_{name}_f1"] = report[name]['f1-score']
            metrics[f"class_{name}_precision"] = report[name]['precision']
            metrics[f"class_{name}_recall"] = report[name]['recall']
            
    return metrics

def calculate_class_weights(dataset_labels, num_classes):
    """
    Calculate inverse frequency class weights for Weighted Cross Entropy.
    """
    class_counts = np.bincount(dataset_labels, minlength=num_classes)
    total_samples = len(dataset_labels)
    # Avoid division by zero
    class_weights = total_samples / (num_classes * (class_counts + 1e-5))
    return torch.tensor(class_weights, dtype=torch.float32)
