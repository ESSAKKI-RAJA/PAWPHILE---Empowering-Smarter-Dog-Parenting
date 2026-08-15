import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import models, transforms
from tqdm import tqdm
from ..datasets.lesion_dataset import SkinLesionDataset

def main():
    # Load configuration & paths
    manifest_path = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\prepared_manifest.csv'
    weights_path = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\pos_weights.json'
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Determine mode
    is_smoke_test = not torch.cuda.is_available()
    if is_smoke_test:
        print("\n--- WARNING: RUNNING EXPERIMENTAL CPU SMOKE TEST ---")
        print("CUDA not detected. Training will be restricted to 2 epochs and 5 batches.")
        epochs = 2
        batch_size = 16
    else:
        print("\n--- RUNNING FULL TRAINING ON CUDA ---")
        epochs = 10
        batch_size = 32

    # Load positive weights for BCE
    with open(weights_path, 'r') as f:
        pos_weights_dict = json.load(f)
        
    findings_order = [
        "erythema", "alopecia", "crust", "scaling", 
        "erosion", "ulcer", "pustule", "lichenification"
    ]
    
    pos_weight_tensor = torch.tensor([pos_weights_dict[f] for f in findings_order]).to(device)

    # Transforms
    train_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Datasets
    print("Loading datasets...")
    train_dataset = SkinLesionDataset(manifest_path, split='train', transform=train_transforms)
    val_dataset = SkinLesionDataset(manifest_path, split='valid', transform=val_transforms)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # Model
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    
    # Modify classifier for multi-label (8 classes)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, 8)
    model = model.to(device)

    # Loss and Optimizer
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight_tensor)
    optimizer = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)

    # Training Loop
    best_loss = float('inf')
    out_dir = r'd:\PROJECTS\PAWPHILE\cv\models'
    os.makedirs(out_dir, exist_ok=True)
    
    print("\nStarting Training Loop...")
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        # Smoke test restriction
        batch_limit = 5 if is_smoke_test else len(train_loader)
        
        pbar = tqdm(train_loader, total=batch_limit, desc=f"Epoch {epoch+1}/{epochs} [Train]")
        for i, (images, targets) in enumerate(pbar):
            if i >= batch_limit: break
            
            images = images.to(device)
            targets = targets.to(device).float()
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            pbar.set_postfix({'loss': f"{loss.item():.4f}"})
            
        avg_train_loss = train_loss / batch_limit
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_limit = 5 if is_smoke_test else len(val_loader)
        
        with torch.no_grad():
            pbar_val = tqdm(val_loader, total=val_limit, desc=f"Epoch {epoch+1}/{epochs} [Valid]")
            for i, (images, targets) in enumerate(pbar_val):
                if i >= val_limit: break
                
                images = images.to(device)
                targets = targets.to(device).float()
                
                outputs = model(images)
                loss = criterion(outputs, targets)
                val_loss += loss.item()
                
        avg_val_loss = val_loss / val_limit
        print(f"Epoch {epoch+1} Summary -> Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f}")
        
        if avg_val_loss < best_loss:
            best_loss = avg_val_loss
            torch.save(model.state_dict(), os.path.join(out_dir, 'efficientnet_skin_experimental.pth'))
            print("Saved new best experimental model!")

    print("\nTraining complete.")
    if is_smoke_test:
        print("Note: This was a smoke test. The model is untrained and acts as a placeholder baseline.")

if __name__ == "__main__":
    main()
