import pandas as pd
import os

class MetadataValidator:
    REQUIRED_COLUMNS = [
        "image_id", "dog_id", "breed", "age_group", "sex",
        "body_region", "capture_date", "consent_status"
    ]

    def validate(self, csv_path: str) -> dict:
        if not os.path.exists(csv_path):
            return {"valid": False, "errors": [f"File not found: {csv_path}"]}

        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            return {"valid": False, "errors": [f"Cannot parse CSV: {e}"]}

        errors = []
        
        # 1. Check required columns
        missing_cols = [col for col in self.REQUIRED_COLUMNS if col not in df.columns]
        if missing_cols:
            errors.append(f"Missing required columns: {missing_cols}")
            
        if errors:
             return {"valid": False, "errors": errors}

        # 2. Check for nulls in critical fields
        for col in ["image_id", "dog_id"]:
            if df[col].isnull().any():
                errors.append(f"Column {col} contains null values.")

        # 3. Check for unique image IDs
        if not df['image_id'].is_unique:
            errors.append("image_id column contains duplicates.")

        # 4. Enforce explicit dog_id tracking (no placeholders like 'unknown')
        if (df['dog_id'].astype(str).str.lower() == 'unknown').any():
            errors.append("dog_id cannot be 'unknown'. Patient isolation requires real pseudonymous IDs.")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_records": len(df),
            "unique_dogs": df['dog_id'].nunique() if 'dog_id' in df.columns else 0
        }
