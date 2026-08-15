import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models
from torch.utils.data import DataLoader
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from datasets.pawphile_dataset import PawphileDataset, get_transforms

def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    manifest = r'd:\PROJECTS\PAWPHILE\cv\datasets\dataset_manifest.csv'
    images_dir = r'd:\PROJECTS\PAWPHILE\cv\datasets\images'

    # 1. Load Data
    train_ds = PawphileDataset(manifest, images_dir, split="train", transform=get_transforms("train"))
    val_ds = PawphileDataset(manifest, images_dir, split="test", transform=get_transforms("test"))

    # Small batch size, 0 workers to avoid Windows multiprocessing memory issues
    train_loader = DataLoader(train_ds, batch_size=8, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=8, shuffle=False, num_workers=0)

    # 2. Build Model
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, 15)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # 3. Train for 1 epoch
    epochs = 1
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        for i, (inputs, labels) in enumerate(train_loader):
            inputs, labels = inputs.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            if (i+1) % 10 == 0:
                print(f"Epoch {epoch+1} Batch {i+1} Loss: {running_loss/10:.4f}")
                running_loss = 0.0
                
            # If on CPU, limit to 20 batches for time reasons to unblock validation pipeline.
            if device.type == 'cpu' and i > 20:
                print("Stopping early for CPU limit.")
                break

        # Evaluate
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for i, (inputs, labels) in enumerate(val_loader):
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
                
                # Limit validation to 10 batches if on CPU
                if device.type == 'cpu' and i > 10:
                    break
        
        print(f"Validation Accuracy after epoch {epoch+1}: {100 * correct / total:.2f}%")

    # 4. Save model
    os.makedirs(r'd:\PROJECTS\PAWPHILE\cv\models', exist_ok=True)
    model_path = r'd:\PROJECTS\PAWPHILE\cv\models\effnet_b0_breeds.pth'
    torch.save(model.state_dict(), model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train()
