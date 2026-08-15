import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import models
import os
import sys
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, f1_score

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from datasets.pawphile_dataset import PawphileDataset, get_transforms

def evaluate():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    manifest = r'd:\PROJECTS\PAWPHILE\cv\datasets\dataset_manifest.csv'
    images_dir = r'd:\PROJECTS\PAWPHILE\cv\datasets\images'
    model_path = r'd:\PROJECTS\PAWPHILE\cv\models\effnet_b0_breeds.pth'

    val_ds = PawphileDataset(manifest, images_dir, split="test", transform=get_transforms("test"))
    val_loader = DataLoader(val_ds, batch_size=16, shuffle=False, num_workers=0)

    model = models.efficientnet_b0(weights=None)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, 15)
    
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    else:
        print("Model file not found. Running with untrained weights (smoke test).")

    model = model.to(device)
    model.eval()

    all_labels = []
    all_preds = []
    all_top3 = []

    print("Running evaluation on test set...")
    with torch.no_grad():
        for i, (inputs, labels) in enumerate(val_loader):
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            
            # Top-1
            _, predicted = torch.max(outputs, 1)
            
            # Top-3
            _, top3_pred = outputs.topk(3, 1, True, True)
            
            all_labels.extend(labels.cpu().numpy())
            all_preds.extend(predicted.cpu().numpy())
            
            for j in range(labels.size(0)):
                all_top3.append(labels[j].item() in top3_pred[j].tolist())
                
            if device.type == 'cpu' and i >= 20: # Limit evaluation for time if on CPU
                print("Stopping evaluation early due to CPU limit.")
                break

    all_labels = np.array(all_labels)
    all_preds = np.array(all_preds)

    top1_acc = np.mean(all_preds == all_labels)
    top3_acc = np.mean(all_top3)
    
    print("\n--- CLASSIFICATION METRICS ---")
    print(f"Top-1 Accuracy: {top1_acc*100:.2f}%")
    print(f"Top-3 Accuracy: {top3_acc*100:.2f}%")
    
    macro_f1 = f1_score(all_labels, all_preds, average='macro')
    print(f"Macro F1 Score: {macro_f1:.4f}")
    
    # We only have classes that were actually predicted or present
    target_names = val_ds.classes
    print("\nClassification Report:")
    print(classification_report(all_labels, all_preds, target_names=target_names, labels=range(15), zero_division=0))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(all_labels, all_preds, labels=range(15))
    print(cm)
    
    with open(r'd:\PROJECTS\PAWPHILE\cv\evaluation\effnet_metrics.txt', 'w') as f:
        f.write(f"Top-1 Accuracy: {top1_acc*100:.2f}%\n")
        f.write(f"Top-3 Accuracy: {top3_acc*100:.2f}%\n")
        f.write(f"Macro F1 Score: {macro_f1:.4f}\n")
        f.write("\nClassification Report:\n")
        f.write(classification_report(all_labels, all_preds, target_names=target_names, labels=range(15), zero_division=0))

if __name__ == "__main__":
    evaluate()
