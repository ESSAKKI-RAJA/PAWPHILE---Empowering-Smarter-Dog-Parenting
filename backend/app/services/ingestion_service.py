"""BIN4 ingestion pipeline — the ONLY door for external data.

Adapter contract (every connector implements these concepts):
  connect -> authenticate -> validate -> fetch -> normalize -> map ->
  import -> sync -> revoke -> health

This module ships the contract as a base class plus a stub connector used by
tests and explicit manual imports. Production connectors (lab APIs, PIMS,
devices) arrive as new Connector subclasses — never as route-level logic.

Pipeline per record: RAW -> VALIDATED -> NORMALIZED -> IMPORTED (canonical
row + HealthEvent with provenance) or REJECTED with a reason. Uncertain data
is never silently converted into verified facts: imports land with
verification_status="imported" and source labels (LAB/DEVICE/CLINIC/IMPORT).
"""
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import all_models as M
from app.models import foundation_models as F
from app.models import ecosystem_models as E

logger = logging.getLogger(__name__)
INGEST_RULES = "bin4-ingest-v1"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Adapter contract ──────────────────────────────────────────────

class Connector:
    """Base adapter. Subclasses isolate external-system differences."""
    provider_type = "BASE"

    def connect(self, connection: E.ExternalConnection) -> dict:
        return {"status": "connected", "provider": connection.provider_name}

    def authenticate(self, connection: E.ExternalConnection) -> bool:
        return connection.status == "CONNECTED"

    def validate(self, kind: str, record: dict) -> tuple[bool, str]:
        if not isinstance(record, dict):
            return False, "record must be an object"
        return True, ""

    def fetch(self, connection: E.ExternalConnection) -> list[dict]:
        return []  # production connectors override; stub imports via `records`

    def normalize(self, kind: str, record: dict) -> dict:
        return dict(record)

    def map(self, kind: str, normalized: dict) -> dict:
        return {"kind": kind, "data": normalized}

    def health(self, connection: E.ExternalConnection) -> dict:
        return {"ok": connection.status == "CONNECTED",
                "last_sync": connection.last_sync_at.isoformat()
                if connection.last_sync_at else None}

    def revoke(self, connection: E.ExternalConnection) -> None:
        connection.status = "REVOKED"


class StubConnector(Connector):
    """Explicit manual/test imports. No fake live integration is claimed."""
    provider_type = "STUB"

    def validate(self, kind: str, record: dict) -> tuple[bool, str]:
        if not isinstance(record, dict) or not record:
            return False, "record must be a non-empty object"
        if kind == "lab" and not record.get("test_name"):
            return False, "lab records require test_name"
        if kind == "imaging" and not record.get("modality"):
            return False, "imaging records require modality"
        if kind == "device" and (record.get("metric_type") is None
                                 or record.get("measured_at") is None):
            return False, "device records require metric_type and measured_at"
        if kind == "note" and not (record.get("note") or "").strip():
            return False, "note records require note text"
        return True, ""


CONNECTORS: dict[str, Connector] = {"STUB": StubConnector()}


def connector_for(connection: E.ExternalConnection) -> Connector:
    # Provider-specific connectors register here; unknown providers fall back
    # to explicit manual import rather than a fabricated live sync.
    return CONNECTORS.get((connection.provider_name or "").upper(), StubConnector())


# ── Pipeline ──────────────────────────────────────────────────────

def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except (ValueError, TypeError):
        return None


def ingest_records(db: Session, connection: E.ExternalConnection, pet_id: UUID,
                   kind: str, records: list[dict]) -> dict:
    """Run the full pipeline for an explicit import batch. Bounded (<=50)."""
    connector = connector_for(connection)
    if not connector.authenticate(connection):
        return {"imported": 0, "rejected": len(records), "error": "connection not CONNECTED"}
    out = {"imported": 0, "rejected": 0, "items": []}
    for raw in (records or [])[:50]:
        imp = E.ExternalImport(connection_id=connection.id, pet_id=pet_id,
                               external_id=str(raw.get("external_id") or "")[:200] or None,
                               kind=kind, status="RAW", raw=dict(raw),
                               source_label={"lab": "LAB", "device": "DEVICE"}.get(kind, "IMPORTED"),
                               verification_status="imported")
        db.add(imp)
        db.flush()
        ok, reason = connector.validate(kind, raw)
        if not ok:
            imp.status = "REJECTED"
            imp.error = reason[:500]
            out["rejected"] += 1
            out["items"].append({"id": str(imp.id), "status": "REJECTED", "error": reason})
            continue
        imp.status = "VALIDATED"
        try:
            normalized = connector.normalize(kind, raw)
            imp.normalized = normalized
            imp.status = "NORMALIZED"
            ev_id = _to_canonical(db, pet_id, connection, kind, raw, normalized, imp)
            imp.result_event_id = ev_id
            imp.status = "IMPORTED"
            out["imported"] += 1
            out["items"].append({"id": str(imp.id), "status": "IMPORTED",
                                 "event_id": str(ev_id)})
        except ValueError as exc:
            imp.status = "REJECTED"
            imp.error = str(exc)[:500]
            out["rejected"] += 1
            out["items"].append({"id": str(imp.id), "status": "REJECTED",
                                 "error": str(exc)[:200]})
    connection.last_sync_at = utcnow()
    db.commit()
    return out


def _event(db: Session, pet_id: UUID, event_type: str, effective_at: datetime,
           title: str, source: str, ref_table: str | None, ref_id=None) -> UUID:
    ev = F.HealthEvent(pet_id=pet_id, event_type=event_type, source=source,
                       effective_at=effective_at or utcnow(), recorded_at=utcnow(),
                       verification_status="imported", title=title[:300],
                       event_metadata={"ingest_rules": INGEST_RULES},
                       ref_table=ref_table, ref_id=ref_id)
    db.add(ev)
    db.flush()
    return ev.id


def _to_canonical(db: Session, pet_id: UUID, connection: E.ExternalConnection,
                  kind: str, raw: dict, normalized: dict, imp: E.ExternalImport) -> UUID:
    """Map one normalized record to canonical rows. Raises ValueError on bad data."""
    label_source = "lab" if kind == "lab" else ("device" if kind == "device" else "import")
    if kind == "lab":
        collected = _parse_dt(raw.get("collected_at")) or utcnow()
        row = F.LabResult(pet_id=pet_id, test_name=str(raw["test_name"])[:200],
                          result_value=str(raw.get("result_value") or "")[:200] or None,
                          result_unit=str(raw.get("result_unit") or "")[:60] or None,
                          reference_range=str(raw.get("reference_range") or "")[:200] or None,
                          collected_at=collected,
                          lab_name=connection.provider_name[:200],
                          notes=str(raw.get("notes") or "")[:1000] or None,
                          source="lab", verification_status="imported")
        db.add(row)
        db.flush()
        return _event(db, pet_id, "lab_result", collected,
                      f"Lab (imported): {row.test_name}", label_source,
                      "lab_results", row.id)
    if kind == "imaging":
        performed = _parse_dt(raw.get("performed_at")) or utcnow()
        if str(raw.get("modality", "")).lower() not in {"xray", "ultrasound", "ct", "mri", "other"}:
            raise ValueError("imaging modality must be xray|ultrasound|ct|mri|other")
        row = F.ImagingStudy(pet_id=pet_id, modality=str(raw["modality"]).lower(),
                             body_area=str(raw.get("body_area") or "")[:120] or None,
                             performed_at=performed,
                             clinic_name=connection.provider_name[:200],
                             findings=str(raw.get("findings") or "")[:2000] or None,
                             notes=str(raw.get("notes") or "")[:1000] or None,
                             source="import", verification_status="imported")
        db.add(row)
        db.flush()
        return _event(db, pet_id, "imaging", performed,
                      f"Imaging (imported): {row.modality}", label_source,
                      "imaging_studies", row.id)
    if kind == "device":
        measured = _parse_dt(raw.get("measured_at"))
        if measured is None:
            raise ValueError("device measured_at is not a valid timestamp")
        try:
            value = float(raw.get("value")) if raw.get("value") is not None else None
        except (TypeError, ValueError):
            raise ValueError("device value must be numeric")
        row = E.DeviceReading(pet_id=pet_id, connection_id=connection.id,
                             metric_type=str(raw["metric_type"])[:60],
                             value=value, unit=str(raw.get("unit") or "")[:40] or None,
                             measured_at=measured,
                             device_meta={"provider": connection.provider_name})
        db.add(row)
        db.flush()
        # Device readings enter the timeline as observations; they are
        # deliberately NOT fed into BIN2 baselines (documented boundary).
        return _event(db, pet_id, "observation", measured,
                      f"Device (imported): {row.metric_type}", "device",
                      "device_readings", row.id)
    # kind == "note"
    observed = _parse_dt(raw.get("observed_at")) or utcnow()
    row = F.Observation(pet_id=pet_id, category=str(raw.get("category") or "general")[:60],
                        observed_at=observed, note=str(raw["note"])[:2000],
                        source="import", verification_status="imported")
    db.add(row)
    db.flush()
    return _event(db, pet_id, "observation", observed,
                  "Note (imported)", label_source, "observations", row.id)
