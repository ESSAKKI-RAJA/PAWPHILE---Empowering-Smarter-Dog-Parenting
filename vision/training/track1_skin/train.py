import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
import wandb
from tqdm import tqdm
import sys
import os

# Add root to sys.path so we can import shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from training.shared.augmentations import get_train_transforms, get_valid_transforms
from training.shared.metrics import calculate_metrics, calculate_class_weights
from training.track1_skin.dataset import DogSkinDataset, split_by_dog_id, SKIN_CLASSES

def build_model(num_classes=6):
    weights = EfficientNet_B0_Weights.IMAGENET1K_V1
    model = efficientnet_b0(weights=weights)
    # Replace classification head
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

def train_one_epoch(model, dataloader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    all_preds = []
    all_labels = []
    
    for images, labels in tqdm(dataloader, desc="Training"):
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item()
        preds = torch.argmax(outputs, dim=1)
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        
    epoch_loss = running_loss / len(dataloader)
    metrics = calculate_metrics(all_labels, all_preds, SKIN_CLASSES)
    return epoch_loss, metrics

@torch.no_grad()
def validate(model, dataloader, criterion, device):
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_labels = []
    
    for images, labels in tqdm(dataloader, desc="Validating"):
        images, labels = images.to(device), labels.to(device)
        
        outputs = model(images)
        loss = criterion(outputs, labels)
        
        running_loss += loss.item()
        preds = torch.argmax(outputs, dim=1)
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        
    epoch_loss = running_loss / len(dataloader)
    metrics = calculate_metrics(all_labels, all_preds, SKIN_CLASSES)
    return epoch_loss, metrics

def run_training():
    # Mock data loading since we don't have the dataset locally
    # all_records = load_dataset() ...
    print("Mocking training setup...")
    
    # wandb.init(project="pawphile-vision", name="skin-classifier-efficientnet")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # model = build_model(num_classes=len(SKIN_CLASSES)).to(device)
    
    # Example to get weights:
    # class_weights = calculate_class_weights([r['label'] for r in train_records], len(SKIN_CLASSES)).to(device)
    # criterion = nn.CrossEntropyLoss(weight=class_weights)
    
    # optimizer = optim.Adam(model.parameters(), lr=1e-4)
    # scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=3, factor=0.5)

    print("Training loop initialized. To execute, ensure data is prepared.")
    
if __name__ == "__main__":
    run_training()
