import pandas as pd
from sklearn.model_selection import train_test_split
import os

def split_by_dog(manifest_path: str, output_path: str, val_size=0.15, test_size=0.15, random_state=42):
    """
    Splits the dataset ensuring that all images from the same dog_id stay in the same split.
    """
    df = pd.read_csv(manifest_path)
    
    if 'dog_id' not in df.columns:
        raise ValueError("manifest must contain 'dog_id' column to perform patient-level splitting.")
        
    unique_dogs = df['dog_id'].unique()
    
    # Calculate sizes
    train_size = 1.0 - (val_size + test_size)
    
    # Split dogs: train vs (val + test)
    dogs_train, dogs_temp = train_test_split(
        unique_dogs, 
        test_size=(val_size + test_size), 
        random_state=random_state
    )
    
    # Split temp into val vs test
    test_ratio_of_temp = test_size / (val_size + test_size)
    dogs_val, dogs_test = train_test_split(
        dogs_temp,
        test_size=test_ratio_of_temp,
        random_state=random_state
    )
    
    # Map back to rows
    def assign_split(dog_id):
        if dog_id in dogs_train:
            return 'train'
        elif dog_id in dogs_val:
            return 'val'
        elif dog_id in dogs_test:
            return 'test'
        return 'unknown'
        
    df['split'] = df['dog_id'].apply(assign_split)
    
    df.to_csv(output_path, index=False)
    print(f"Dog-level split complete. Train: {len(dogs_train)} dogs, Val: {len(dogs_val)} dogs, Test: {len(dogs_test)} dogs")

if __name__ == "__main__":
    print("Run this script via import or argument parsing.")
