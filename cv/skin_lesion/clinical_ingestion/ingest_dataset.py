import os
from .validate_metadata import MetadataValidator
from .validate_annotations import AnnotationValidator

class DatasetIngestor:
    def ingest(self, metadata_path: str, annotations_path: str) -> dict:
        meta_val = MetadataValidator()
        anno_val = AnnotationValidator()
        
        meta_result = meta_val.validate(metadata_path)
        anno_result = anno_val.validate(annotations_path)
        
        success = meta_result["valid"] and anno_result["valid"]
        
        report = {
            "ingestion_successful": success,
            "metadata_errors": meta_result["errors"],
            "annotation_errors": anno_result["errors"]
        }
        
        if success:
            report["summary"] = {
                "total_records": meta_result["total_records"],
                "unique_dogs": meta_result["unique_dogs"],
                "total_annotations": anno_result["total_images_annotated"]
            }
            
        return report

if __name__ == "__main__":
    print("Dataset Ingestor Initialized.")
