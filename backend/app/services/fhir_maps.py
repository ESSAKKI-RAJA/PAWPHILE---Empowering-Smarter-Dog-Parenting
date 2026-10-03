"""BIN4 FHIR readiness map — versioned, honest, non-compliant by default.

This module documents how canonical PAWPHILE concepts RELATE to FHIR-shaped
resources. It is a mapping reference, not a conformance claim: statuses are
MAPPED / PARTIALLY_MAPPED / NOT_SUPPORTED, and nothing here asserts that
PAWPHILE speaks FHIR to any external system. Real adapters arrive per
integration behind the ingestion pipeline.
"""
from typing import Any

FHIR_MAP_VERSION = "bin4-fhir-map-v1"

# Each entry: PAWPHILE source(s) + field-level notes + honest status.
MAPPINGS: dict[str, dict[str, Any]] = {
    "Patient": {
        "status": "MAPPED",
        "sources": ["dog_profiles"],
        "fields": {"id": "dog_profiles.id", "name": "dog_profiles.name",
                   "species": "dog_profiles.species (non-human patient)",
                   "birthDate": "dog_profiles.date_of_birth (free text, not a FHIR date)"},
        "note": "Pet identity only; no species-specific clinical semantics claimed.",
    },
    "Organization": {
        "status": "MAPPED",
        "sources": ["organizations"],
        "fields": {"id": "organizations.id", "name": "organizations.name",
                   "type": "organizations.org_type (CLINIC/PARTNER/LAB/IMAGING/DEVICE/OTHER)"},
        "note": "Internal identity; no endpoint or affiliation semantics exported.",
    },
    "Practitioner": {
        "status": "PARTIALLY_MAPPED",
        "sources": ["vet_professionals"],
        "fields": {"id": "vet_professionals.id", "name": "vet_professionals.display_name",
                   "qualification": "NOT_SUPPORTED (license evidence is a reference, not a coded qualification)"},
        "note": "Verification is org-attested, not an independent credential check.",
    },
    "Encounter": {
        "status": "PARTIALLY_MAPPED",
        "sources": ["consultations", "vet_visit_summaries"],
        "fields": {"id": "consultations.id", "status": "consultations.status (own value set)",
                   "period": "consultations.started_at/ended_at"},
        "note": "Collaboration record, not a scheduled clinical encounter with participants.",
    },
    "Observation": {
        "status": "MAPPED",
        "sources": ["observations", "device_readings", "weight_measurements",
                    "activity_records", "symptoms"],
        "fields": {"effective": "effective_at (when it happened)",
                   "issued": "recorded_at (when entered)",
                   "performer-provenance": "source/actor/verification_status on every row"},
        "note": "Descriptive values with provenance; no interpretation codes attached.",
    },
    "Medication": {
        "status": "PARTIALLY_MAPPED",
        "sources": ["medications"],
        "fields": {"name": "medications.name (free text, no RxNorm/code)",
                   "dose": "medications.dose/dose_unit (free text)"},
        "note": "No coded formularies; effectiveness is never inferred.",
    },
    "Allergy": {
        "status": "PARTIALLY_MAPPED",
        "sources": ["allergies"],
        "fields": {"substance": "allergies.allergen (free text, no SNOMED code)",
                   "severity": "allergies.severity (unknown/mild/moderate/severe)"},
        "note": "No allergy-intolerance coding or criticality mapping.",
    },
    "DiagnosticReport": {
        "status": "PARTIALLY_MAPPED",
        "sources": ["lab_results", "lab_panels", "report_records"],
        "fields": {"result": "lab_results rows with recorded reference_range (free text)",
                   "conclusion": "NOT_SUPPORTED (PAWPHILE never interprets results)"},
        "note": "Values + recorded ranges only; 'outside recorded range' is display language, not a finding.",
    },
    "DocumentReference": {
        "status": "PARTIALLY_MAPPED",
        "sources": ["health_files", "vet_health_packages"],
        "fields": {"content": "file metadata (storage pointers never exported)",
                   "snapshot": "vet_health_packages.snapshot_digest (immutable version)"},
        "note": "Metadata and digests; no binary exchange or content profiles.",
    },
    "CarePlan": {
        "status": "NOT_SUPPORTED",
        "sources": [],
        "fields": {},
        "note": "Follow-ups and reminders are continuity aids, not coded care plans. Planned only with clinical validation.",
    },
}


def fhir_map() -> dict:
    return {"map_version": FHIR_MAP_VERSION,
            "conformance_claim": "NONE — mapping reference only, not FHIR compliance",
            "resources": MAPPINGS}
