# PAWPHILE CV — Tier A Clinical Data Delivery Checklist

This checklist must be completed by the clinical data team prior to handing the dataset over to the PAWPHILE engineering pipeline.

## DATASET IDENTITY
- [ ] Dataset conforms to PAWPHILE JSON/CSV schema templates
- [ ] All `dog_id` values are pseudonymized (no real pet names/owner names)

## PATIENT COVERAGE
- [ ] Dataset contains a minimum of 500 unique dogs
- [ ] Identical `dog_id` used for multiple images of the same patient
- [ ] At least 20% healthy control images included
- [ ] Diversity of breeds and coat types represented

## IMAGE QUALITY
- [ ] Images are at least 512x512 resolution
- [ ] Images are in focus (no severe motion blur)
- [ ] Images are properly exposed (not blown out or pitch black)
- [ ] Target lesion is clearly visible and unobstructed

## ANNOTATIONS
- [ ] All annotations performed by a licensed veterinarian
- [ ] Annotations strictly map to PAWPHILE Level-2 Visual Findings (e.g., `erythema`, `pustule`)
- [ ] Bounding boxes used for focal lesions
- [ ] Polygons used for diffuse regions

## VALIDATION
- [ ] 10% of the dataset underwent double-blind review by a second veterinarian
- [ ] Disagreements were logged and resolved
- [ ] Final `clinical_validation_status` recorded as `"consensus"` for all records

## PRIVACY
- [ ] Owner names/faces removed
- [ ] Private clinic identifiers removed
- [ ] Consent legally recorded

## FINAL
- [ ] Dataset is ready for automated PAWPHILE ingestion and readiness gates
