import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import numpy as np

class TemperatureScaler(nn.Module):
    """
    Temperature Scaling for Model Calibration.
    Reference: On Calibration of Modern Neural Networks (Guo et al., 2017)
    """
    def __init__(self):
        super(TemperatureScaler, self).__init__()
        # Initialize temperature to 1.5
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)
        
    def forward(self, logits):
        """
        Scale the logits using the learned temperature.
        """
        return logits / self.temperature

    def calibrate(self, model: nn.Module, val_loader: DataLoader, device: torch.device):
        """
        Tune the temperature on a validation set.
        To be implemented when a fully converged model is available.
        """
        # Note: Optimization loop using LBFGS to minimize NLLLoss will go here.
        # This is a stub for the future GPU-trained weights.
        pass

def calculate_ece(probs, labels, n_bins=15):
    """
    Calculates Expected Calibration Error (ECE)
    """
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    bin_lowers = bin_boundaries[:-1]
    bin_uppers = bin_boundaries[1:]

    confidences, predictions = np.max(probs, axis=1), np.argmax(probs, axis=1)
    accuracies = predictions == labels

    ece = np.zeros(1)
    for bin_lower, bin_upper in zip(bin_lowers, bin_uppers):
        in_bin = np.logical_and(confidences > bin_lower.item(), confidences <= bin_upper.item())
        prop_in_bin = np.mean(in_bin)
        
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(accuracies[in_bin])
            avg_confidence_in_bin = np.mean(confidences[in_bin])
            ece += np.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin
            
    return ece.item()
