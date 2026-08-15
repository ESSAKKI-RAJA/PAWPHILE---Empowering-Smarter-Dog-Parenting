import json
import os

class AnnotationValidator:
    def validate(self, json_path: str) -> dict:
        if not os.path.exists(json_path):
            return {"valid": False, "errors": [f"File not found: {json_path}"]}

        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
        except Exception as e:
            return {"valid": False, "errors": [f"Cannot parse JSON: {e}"]}

        if not isinstance(data, list):
            # Assume it's a single record, wrap in list for processing
            data = [data]
            
        errors = []
        validated_images = 0
        
        for record in data:
            image_id = record.get("image_id")
            if not image_id:
                errors.append("Record missing 'image_id'")
                continue
                
            if "findings" not in record:
                errors.append(f"Image {image_id} missing 'findings' array")
                continue
                
            for finding in record["findings"]:
                if "lesion_type" not in finding:
                    errors.append(f"Image {image_id} has a finding missing 'lesion_type'")
                
                format_type = finding.get("format")
                if format_type not in ["bounding_box", "polygon"]:
                    errors.append(f"Image {image_id} finding {finding.get('annotation_id', 'unknown')} has invalid format: {format_type}")
                
                if "coordinates" not in finding:
                    errors.append(f"Image {image_id} finding missing coordinates")
                    
            validated_images += 1

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_images_annotated": validated_images
        }
