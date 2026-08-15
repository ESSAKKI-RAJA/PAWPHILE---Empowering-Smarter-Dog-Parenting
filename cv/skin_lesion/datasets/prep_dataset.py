import pandas as pd
import json
import numpy as np
import os
from sklearn.model_selection import train_test_split

def main():
    manifest_path = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\dataset_manifest.csv'
    if not os.path.exists(manifest_path):
        print(f"Manifest not found: {manifest_path}")
        return
        
    df = pd.read_csv(manifest_path)
    print(f"Total raw records: {len(df)}")
    
    # Drop Tier D (Leakage/Duplicates)
    df = df[df['tier'] != 'D'].copy()
    print(f"Clean records after dropping Tier D: {len(df)}")
    
    # The findings are stored as a JSON string list in 'pawphile_finding_label'
    # We need to one-hot encode them for stratified splitting and training
    target_findings = [
        "erythema", "alopecia", "crust", "scaling", 
        "erosion", "ulcer", "pustule", "lichenification"
    ]
    
    # Initialize columns
    for f in target_findings:
        df[f] = 0.0
        
    def parse_findings(val):
        try:
            return json.loads(val)
        except:
            return []
            
    df['parsed_findings'] = df['pawphile_finding_label'].apply(parse_findings)
    
    for idx, row in df.iterrows():
        for f in row['parsed_findings']:
            if f in target_findings:
                df.at[idx, f] = 1.0
                
    # Calculate prevalence
    print("\n--- Provisional Finding Prevalence ---")
    pos_weights = {}
    total = len(df)
    
    for f in target_findings:
        pos_count = df[f].sum()
        neg_count = total - pos_count
        prev = (pos_count / total) * 100
        
        # Calculate positive weight for BCEWithLogitsLoss
        # pos_weight = neg_count / pos_count
        weight = neg_count / pos_count if pos_count > 0 else 1.0
        pos_weights[f] = round(weight, 4)
        
        print(f"{f:15s}: {int(pos_count):4d} positive ({prev:5.1f}%) | pos_weight: {weight:.2f}")

    # Generate explicit splits (70/15/15)
    # Note: Stratification is tricky with multi-label, so we stratify on the most common condition label
    # to maintain basic distribution, but we must explicitly acknowledge patient-level leakage risks for Tier C.
    
    print("\nWarning: Patient-level leakage cannot be guaranteed for images without dog IDs (Tier C).")
    
    train_df, temp_df = train_test_split(df, test_size=0.3, random_state=42, stratify=df['pawphile_condition_label'])
    val_df, test_df = train_test_split(temp_df, test_size=0.5, random_state=42, stratify=temp_df['pawphile_condition_label'])
    
    train_df['experimental_split'] = 'train'
    val_df['experimental_split'] = 'valid'
    test_df['experimental_split'] = 'test'
    
    final_df = pd.concat([train_df, val_df, test_df])
    
    # Save the prepared manifest
    out_path = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\prepared_manifest.csv'
    final_df.to_csv(out_path, index=False)
    print(f"\nSaved prepared manifest to: {out_path}")
    
    # Save pos_weights for training script
    weights_path = r'd:\PROJECTS\PAWPHILE\cv\skin_lesion\datasets\pos_weights.json'
    with open(weights_path, 'w') as f:
        json.dump(pos_weights, f, indent=2)
    print(f"Saved pos_weights to: {weights_path}")

if __name__ == "__main__":
    main()
