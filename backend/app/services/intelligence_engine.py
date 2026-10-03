"""BIN2 intelligence engine — DB aggregation → baselines → trends → changes.

Reads canonical BIN1 tables only (never modifies them). All temporal
reasoning uses effective timestamps (measured_at/occurred_at/fed_at/
observed_at/onset_at/visit_date), never recorded_at alone.

Method versions: RULES_VERSION here; stats primitives versioned in
analytics_stats.RULES_VERSION. Both are returned with every output.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import all_models as M
from app.models import foundation_models as F
from app.core.config import settings
from app.services import analytics_stats as st

logger = logging.getLogger(__name__)

RULES_VERSION = "bin2-intel-v1"
INTEL_MODEL_ID = "deterministic:bin2-intel-v1"  # no ML; fully auditable rules


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ── Metric configuration (documented, metric-specific) ──────────────
# baseline_window: days of history forming "normal for THIS dog"
# recent_days:    days forming the "recent" comparison slice
# min_obs / min_span_days: sufficiency gates (insufficient -> no baseline, no fabrication)
# change_min_pct: descriptive flag threshold (not a clinical threshold)

METRICS: dict[str, dict[str, Any]] = {
    "weight":   {"baseline_window": 90, "recent_days": 14, "min_obs": 3, "min_span_days": 14.0,
                 "change_min_pct": settings.INTEL_WEIGHT_CHANGE_MIN_PCT,
                 "fresh_current_d": 7, "fresh_recent_d": 30, "unit": "kg"},
    "activity": {"baseline_window": 30, "recent_days": 7, "min_obs": 5, "min_span_days": 7.0,
                 "change_min_pct": 10.0, "fresh_current_d": 2, "fresh_recent_d": 7, "unit": "mins/day"},
    "nutrition": {"baseline_window": 30, "recent_days": 7, "min_obs": 5, "min_span_days": 7.0,
                  "change_min_pct": 10.0, "fresh_current_d": 2, "fresh_recent_d": 7, "unit": "kcal/day"},
    "behavior": {"baseline_window": 30, "recent_days": 14, "min_obs": 3, "min_span_days": 7.0,
                 "change_min_pct": 10.0, "fresh_current_d": 7, "fresh_recent_d": 30, "unit": "events/day"},
    "symptoms": {"baseline_window": 90, "recent_days": 30, "min_obs": 1, "min_span_days": 0.0,
                 "change_min_pct": 10.0, "fresh_current_d": 7, "fresh_recent_d": 30, "unit": "episodes/30d"},
}


# ── Series fetchers (effective time; archived excluded) ─────────────

def _weight_series(db: Session, pet_id: UUID) -> list[dict]:
    rows = db.query(F.WeightMeasurement).filter(
        F.WeightMeasurement.pet_id == pet_id,
        F.WeightMeasurement.is_archived == False).all()  # noqa: E712
    out = []
    for r in rows:
        if not r.measured_at:
            continue
        norm = st.normalize_weight(r.value, r.unit)
        if norm["status"] != "AVAILABLE":
            out.append({"t": r.measured_at, "value": None, "invalid": norm.get("reason"),
                        "record_id": str(r.id), "table": "weight_measurements"})
            continue
        out.append({"t": r.measured_at, "value": norm["value"], "unit": "kg",
                    "original_value": norm["original_value"], "original_unit": norm["original_unit"],
                    "record_id": str(r.id), "table": "weight_measurements"})
    return sorted([p for p in out if p.get("value") is not None], key=lambda p: p["t"]), \
        [p for p in out if p.get("value") is None]


def _activity_series(db: Session, pet_id: UUID) -> list[dict]:
    """Daily aggregate minutes (walk/run/play only; rest excluded from exertion)."""
    rows = db.query(F.ActivityRecord).filter(
        F.ActivityRecord.pet_id == pet_id,
        F.ActivityRecord.is_archived == False).all()  # noqa: E712
    days: dict[str, float] = {}
    for r in rows:
        if not r.occurred_at or r.activity_type not in ("walk", "run", "play", "other"):
            continue
        mins = r.duration_mins if (r.duration_mins or 0) > 0 else 0.0
        key = r.occurred_at.date().isoformat()
        days[key] = days.get(key, 0.0) + float(mins)
    return [{"t": datetime.fromisoformat(d), "value": v, "unit": "mins",
             "record_id": None, "table": "activity_records(daily aggregate)"}
            for d, v in sorted(days.items())]


def _nutrition_series(db: Session, pet_id: UUID) -> list[dict]:
    rows = db.query(F.NutritionEntry).filter(
        F.NutritionEntry.pet_id == pet_id,
        F.NutritionEntry.is_archived == False).all()  # noqa: E712
    days: dict[str, float] = {}
    for r in rows:
        if not r.fed_at or r.calories is None:
            continue
        try:
            c = float(r.calories)
        except (TypeError, ValueError):
            continue
        if c < 0:
            continue
        key = r.fed_at.date().isoformat()
        days[key] = days.get(key, 0.0) + c
    return [{"t": datetime.fromisoformat(d), "value": v, "unit": "kcal",
             "record_id": None, "table": "nutrition_entries(daily aggregate)"}
            for d, v in sorted(days.items())]


def _behavior_series(db: Session, pet_id: UUID) -> list[dict]:
    rows = db.query(F.BehaviorEntry).filter(
        F.BehaviorEntry.pet_id == pet_id,
        F.BehaviorEntry.is_archived == False).all()  # noqa: E712
    days: dict[str, int] = {}
    for r in rows:
        if not r.observed_at:
            continue
        key = r.observed_at.date().isoformat()
        days[key] = days.get(key, 0) + 1
    return [{"t": datetime.fromisoformat(d), "value": float(v), "unit": "events",
             "record_id": None, "table": "behavior_entries(daily aggregate)"}
            for d, v in sorted(days.items())]


def symptom_episodes(db: Session, pet_id: UUID) -> list[dict]:
    """One row per symptom record + triage session, keyed by effective time.
    Triage sessions carry created_at only (no effective_at) — labeled as such."""
    eps = []
    for s in db.query(F.Symptom).filter(
            F.Symptom.pet_id == pet_id, F.Symptom.is_archived == False).all():  # noqa: E712
        t = s.onset_at or s.created_at
        eps.append({"t": t, "name": (s.name or "").strip().lower(), "severity": s.severity,
                    "time_basis": "onset_at" if s.onset_at else "recorded_at (no onset given)",
                    "record_id": str(s.id), "table": "symptoms"})
    for t in db.query(M.SymptomTriageSession).filter(
            M.SymptomTriageSession.dog_id == pet_id).all():
        eps.append({"t": t.created_at, "name": "triage_session", "severity": t.severity_level,
                    "time_basis": "recorded_at (triage has no effective time)",
                    "record_id": str(t.id), "table": "symptom_triage_sessions"})
    return sorted([e for e in eps if e["t"] is not None], key=lambda e: e["t"])


def medication_chronology(db: Session, pet_id: UUID) -> list[dict]:
    meds = db.query(F.Medication).filter(
        F.Medication.pet_id == pet_id, F.Medication.is_archived == False).all()  # noqa: E712
    return [{"name": m.name, "status": m.status, "start_at": m.start_at.isoformat() if m.start_at else None,
             "end_at": m.end_at.isoformat() if m.end_at else None,
             "record_id": str(m.id)} for m in sorted(meds, key=lambda m: m.created_at or utcnow(), reverse=True)]


def preventive_status(db: Session, pet_id: UUID, now: datetime) -> dict:
    vax = db.query(M.VaccineRecord).filter(M.VaccineRecord.dog_id == pet_id).all()
    dew = db.query(M.DewormingRecord).filter(M.DewormingRecord.dog_id == pet_id).all()
    visits = db.query(M.VetVisitSummary).filter(M.VetVisitSummary.dog_id == pet_id).all()

    def _item(r, kind: str) -> dict:
        due = getattr(r, "next_due_date", None)
        overdue = bool(due and due.replace(tzinfo=None) < now)
        upcoming = bool(due and not overdue and (due.replace(tzinfo=None) - now).days <= 30)
        return {"kind": kind, "name": getattr(r, "name", None) or getattr(r, "product_name", None),
                "date_given": (getattr(r, "date_given", None).isoformat()
                               if getattr(r, "date_given", None) else None),
                "next_due": due.isoformat() if due else None,
                "overdue": overdue, "upcoming": upcoming, "record_id": str(r.id)}

    items = [_item(r, "vaccination") for r in vax] + [_item(r, "deworming") for r in dew]
    last_visit = max((v.visit_date for v in visits if v.visit_date), default=None)
    return {"items": items,
            "completed_vaccinations": len(vax), "completed_deworming": len(dew),
            "overdue": [i for i in items if i["overdue"]],
            "upcoming_30d": [i for i in items if i["upcoming"]],
            "last_vet_visit": last_visit.isoformat() if last_visit else None,
            "vet_visit_count": len(visits)}


# ── Baseline / trend / change ───────────────────────────────────────

def build_baseline(points: list[dict], cfg: dict, now: datetime) -> dict:
    """Personal baseline over [now-W, now-recent). Insufficient -> explicit status."""
    W, R = cfg["baseline_window"], cfg["recent_days"]
    window_pts = [p for p in points if now - timedelta(days=W) <= p["t"] < now - timedelta(days=R)]
    elig = st.assess_eligibility(window_pts, cfg["min_obs"], cfg["min_span_days"])
    if elig["status"] != "AVAILABLE":
        return {"status": elig["status"], "reason": elig.get("reason"),
                "window_days": W, "recent_excluded_days": R,
                "observations": elig.get("n", 0)}
    usable, suspicious = st.split_outliers(window_pts)
    vals = [p["value"] for p in usable]
    dups = st.find_duplicates(usable)
    dedup = [p for p in usable if p not in dups]
    dvals = [p["value"] for p in dedup] or vals
    return {"status": "AVAILABLE", "period": {"start": (now - timedelta(days=W)).isoformat(),
                                             "end": (now - timedelta(days=R)).isoformat()},
            "window_days": W, "observations": len(window_pts), "used": len(dedup),
            "median": st.median(dvals), "mean": st.mean(dvals), "stdev": st.stdev(dvals),
            "mad": st.mad(dvals), "min": min(dvals), "max": max(dvals),
            "excluded_suspicious": len(suspicious),
            "exclusion_reasons": [s.get("exclusion_reason") for s in suspicious],
            "duplicates_noted": len(dups),
            "freshness_note": f"baseline ends {R}d ago by design (recent slice kept separate)"}


def build_trend(points: list[dict], recent_days: int, now: datetime, stale: bool) -> dict:
    recent = [p for p in points if p["t"] >= now - timedelta(days=recent_days * 3)]
    if len(recent) < 3:
        return {"state": "INSUFFICIENT_DATA", "n": len(recent),
                "limitation": "trend needs >= 3 points in the recent window"}
    t0 = recent[0]["t"]
    xs = [(p["t"] - t0).total_seconds() / 86400.0 for p in recent]
    fit = st.least_squares_slope(xs, [p["value"] for p in recent])
    first = st.median([p["value"] for p in recent[: max(1, len(recent) // 3)]])
    last = st.median([p["value"] for p in recent[-max(1, len(recent) // 3):]])
    change = st.pct_change(last, first)
    return {"state": st.classify_trend(fit["slope"], fit.get("r2"), change, fit["n"], stale),
            "slope_per_day": fit["slope"], "r2": fit.get("r2"), "n": fit["n"],
            "change_pct": round(change, 1) if change is not None else None,
            "method": "least-squares slope + edge-median % change",
            "limitation": fit.get("limitation")}


def detect_change(metric: str, baseline: dict, points: list[dict], cfg: dict, now: datetime) -> dict:
    """Recent slice vs personal baseline. Flags only with magnitude + persistence."""
    R = cfg["recent_days"]
    recent = sorted([p for p in points if p["t"] >= now - timedelta(days=R)], key=lambda p: p["t"])
    if baseline.get("status") != "AVAILABLE":
        return {"status": baseline.get("status", "INSUFFICIENT_DATA"),
                "reason": "no baseline to compare against — not flagged",
                "recent_n": len(recent)}
    if len(recent) < 2:
        return {"status": "INSUFFICIENT_DATA", "reason": "fewer than 2 recent observations",
                "recent_n": len(recent)}
    rvals = [p["value"] for p in recent]
    rmed = st.median(rvals)
    pct = st.pct_change(rmed, baseline["median"])
    z = st.robust_z(rmed, baseline["median"], baseline.get("mad"))
    span = (recent[-1]["t"] - recent[0]["t"]).total_seconds() / 86400.0 if len(recent) > 1 else 0.0
    flagged = (z is not None and abs(z) >= st.CHANGE_MAD_THRESHOLD
               and pct is not None and abs(pct) >= cfg["change_min_pct"]
               and span >= 1.0)
    return {"status": "AVAILABLE", "flagged": flagged,
            "recent_median": rmed, "baseline_median": baseline["median"],
            "delta_pct": round(pct, 1) if pct is not None else None,
            "robust_z": round(z, 2) if z is not None else None,
            "recent_n": len(recent), "recent_span_days": round(span, 1),
            "method": f"recent-{R}d median vs baseline median; flag if |robust z|>={st.CHANGE_MAD_THRESHOLD} "
                      f"and |%|>={cfg['change_min_pct']} with >= 1d persistence",
            "evidence_ids": [p.get("record_id") for p in recent if p.get("record_id")][:20]}


def analyze_metric(db: Session, pet_id: UUID, metric: str, now: datetime) -> dict:
    """Full per-metric intelligence payload with explanation + evidence."""
    cfg = METRICS[metric]
    if metric == "weight":
        pts, invalid = _weight_series(db, pet_id)
    elif metric == "activity":
        pts, invalid = _activity_series(db, pet_id), []
    elif metric == "nutrition":
        pts, invalid = _nutrition_series(db, pet_id), []
    elif metric == "behavior":
        pts, invalid = _behavior_series(db, pet_id), []
    else:
        raise ValueError(f"unknown metric {metric}")

    if not pts:
        return _empty_metric(pet_id, metric, cfg, now, "INSUFFICIENT_DATA", "no observations on record")

    latest = max(pts, key=lambda p: p["t"])
    age_d = (now - latest["t"]).total_seconds() / 86400.0
    fresh = ("CURRENT" if age_d <= cfg["fresh_current_d"]
             else "RECENT" if age_d <= cfg["fresh_recent_d"] else "STALE")
    baseline = build_baseline(pts, cfg, now)
    trend = build_trend(pts, cfg["recent_days"], now, stale=(fresh == "STALE"))
    change = detect_change(metric, baseline, pts, cfg, now)
    dups = st.find_duplicates(pts)

    status = "AVAILABLE"
    if baseline["status"] == "INSUFFICIENT_DATA" and trend["state"] == "INSUFFICIENT_DATA":
        status = "INSUFFICIENT_DATA"

    evidence = [{"record_id": p.get("record_id"), "table": p.get("table"),
                 "effective_at": p["t"].isoformat(), "value": p["value"]}
                for p in pts[-10:] if p.get("record_id")]
    return {
        "pet_id": str(pet_id), "metric": metric, "unit": cfg["unit"], "status": status,
        "period": {"start": pts[0]["t"].isoformat(), "end": pts[-1]["t"].isoformat()},
        "latest": {"value": latest["value"], "at": latest["t"].isoformat(), "age_days": round(age_d, 1)},
        "baseline": baseline, "trend": trend, "change": change,
        "observations": {"n": len(pts), "invalid_noted": len(invalid),
                         "invalid_reasons": [p.get("invalid") for p in invalid][:5],
                         "duplicates_noted": len(dups)},
        "data_quality": {"invalid_values": len(invalid), "duplicates": len(dups)},
        "freshness": {"state": fresh, "latest_at": latest["t"].isoformat(), "age_days": round(age_d, 1)},
        "evidence": evidence,
        "explanation": _explain_metric(metric, cfg, baseline, trend, change, latest, fresh, len(pts)),
        "method": "descriptive longitudinal analytics (median/MAD/least-squares)",
        "rules_version": RULES_VERSION, "generated_at": now.isoformat(),
    }


def _empty_metric(pet_id: UUID, metric: str, cfg: dict, now: datetime, status: str, reason: str) -> dict:
    return {"pet_id": str(pet_id), "metric": metric, "unit": cfg["unit"], "status": status,
            "reason": reason, "latest": None, "baseline": {"status": status, "reason": reason},
            "trend": {"state": status}, "change": {"status": status, "flagged": False},
            "observations": {"n": 0}, "freshness": {"state": "NO_DATA"},
            "evidence": [],
            "explanation": {"what": f"No {metric} observations on record.",
                            "why": "Nothing to analyze yet.",
                            "limitation": "Add observations to enable baselines and trends.",
                            "next_step": f"Record a {metric} observation to begin building history."},
            "method": "descriptive longitudinal analytics",
            "rules_version": RULES_VERSION, "generated_at": now.isoformat()}


def _explain_metric(metric: str, cfg: dict, baseline: dict, trend: dict, change: dict,
                    latest: dict, fresh: str, n: int) -> dict:
    if baseline.get("status") == "AVAILABLE" and change.get("flagged"):
        what = (f"{metric.capitalize()} has moved {change['delta_pct']:+.1f}% vs this dog's "
                f"{cfg['baseline_window']}-day personal baseline.")
        why = (f"Recent median {change['recent_median']} vs baseline median {change['baseline_median']} "
               f"(robust z={change['robust_z']}, {change['recent_n']} recent records over "
               f"{change['recent_span_days']}d).")
    elif trend.get("state") in ("INCREASING", "DECREASING"):
        what = f"{metric.capitalize()} is trending {trend['state'].lower()} ({trend.get('change_pct'):+}% recently)."
        why = f"Least-squares slope {trend.get('slope_per_day'):.3f}/day, R²={trend.get('r2'):.2f} over {trend.get('n')} points."
    else:
        state_word = {"STABLE": "stable", "VARIABLE": "variable",
                      "INSUFFICIENT_DATA": "not yet assessable — not enough data",
                      "STALE": "based on stale data"}.get(
            trend.get("state", "unassessed"), str(trend.get("state", "unassessed")).lower())
        what = f"{metric.capitalize()} trend is {state_word}."
        why = f"Based on {n} observation(s); latest {latest['value']} {cfg['unit']} ({latest['t'].isoformat()[:10]})."
    limitation = "Descriptive only — not a diagnosis. "
    if baseline.get("status") != "AVAILABLE":
        limitation += f"No personal baseline yet: {baseline.get('reason')}. "
    if fresh == "STALE":
        limitation += "Underlying data is stale; recent behavior may differ. "
    if baseline.get("excluded_suspicious"):
        limitation += f"{baseline['excluded_suspicious']} suspicious value(s) excluded from the baseline (kept in the record). "
    return {"what": what, "why": why,
            "comparison": f"Compared with this dog's own {cfg['baseline_window']}-day baseline (not breed averages).",
            "limitation": limitation.strip(),
            "next_step": ("Keep recording consistently for a few more days, then review. "
                          "If the pattern persists or you are worried, discuss these specific records with your veterinarian.")}


def analyze_symptoms(db: Session, pet_id: UUID, now: datetime) -> dict:
    eps = symptom_episodes(db, pet_id)
    W, R = 90, 30
    window = [e for e in eps if e["t"] >= now - timedelta(days=W)]
    recent = [e for e in eps if e["t"] >= now - timedelta(days=R)]
    by_name: dict[str, list] = {}
    for e in window:
        by_name.setdefault(e["name"], []).append(e)
    recurrence = {k: len(v) for k, v in by_name.items() if len(v) >= 2 and k != "triage_session"}
    # co-occurrence: name pairs sharing a 3-day window
    pairs: dict[tuple, int] = {}
    names = sorted({e["name"] for e in window if e["name"] != "triage_session"})
    for i, a in enumerate(names):
        ta = [e["t"] for e in window if e["name"] == a]
        for b in names[i + 1:]:
            tb = [e["t"] for e in window if e["name"] == b]
            if any(abs((x - y).total_seconds()) <= 3 * 86400 for x in ta for y in tb):
                pairs[(a, b)] = 1
    sev = [e for e in recent if (e.get("severity") or "").lower() in ("severe", "red")]
    status = "AVAILABLE" if window else "INSUFFICIENT_DATA"
    return {
        "pet_id": str(pet_id), "metric": "symptoms", "status": status,
        "period": {"days": W}, "episodes_90d": len(window), "episodes_30d": len(recent),
        "rate_per_30d": round(len(window) / 3.0, 1),
        "recurrence": recurrence,
        "co_occurrence_3d": [{"pair": list(k)} for k in pairs],
        "severe_recent_30d": len(sev),
        "freshness": {"state": "CURRENT" if recent else ("RECENT" if window else "NO_DATA"),
                      "latest_at": max((e["t"] for e in window), default=None).isoformat()
                      if window else None},
        "evidence": [{"record_id": e["record_id"], "table": e["table"],
                      "effective_at": e["t"].isoformat(), "name": e["name"],
                      "time_basis": e["time_basis"]} for e in window[-20:]],
        "explanation": {
            "what": (f"{len(recent)} symptom episode(s) in the last 30 days "
                     f"({len(window)} in 90 days)."),
            "why": (f"Recurring: {', '.join(f'{k}×{v}' for k, v in recurrence.items()) or 'none'}. "
                    f"Severe episodes (30d): {len(sev)}."),
            "comparison": "Compared with this dog's own 90-day history.",
            "limitation": ("Triage sessions carry recorded time only (no onset). "
                           "Descriptive counts — not a diagnosis."),
            "next_step": ("If episodes repeat or severe signs appear, bring these dated "
                          "records to your veterinarian.")},
        "method": "episode counting + 3-day co-occurrence windows",
        "rules_version": RULES_VERSION, "generated_at": now.isoformat(),
    }


def multi_signal_context(db: Session, pet_id: UUID, now: datetime,
                         metric_results: dict) -> list[dict]:
    """Temporal overlaps between flagged changes, symptom recurrence, med starts,
    and vet visits. Language is strictly co-occurrence, never causation."""
    signals: list[dict] = []
    for m, res in metric_results.items():
        ch = (res or {}).get("change") or {}
        if ch.get("flagged"):
            recent_pts = res.get("change", {}).get("evidence_ids", [])
            signals.append({"kind": "metric_change", "label": f"{m} change",
                            "at": res.get("latest", {}).get("at"), "refs": recent_pts})
    eps = symptom_episodes(db, pet_id)
    for name, group in _group_by(eps, lambda e: e["name"]).items():
        if name != "triage_session" and len([e for e in group
                                             if e["t"] >= now - timedelta(days=60)]) >= 2:
            signals.append({"kind": "symptom_recurrence", "label": f"recurring: {name}",
                            "at": max(e["t"] for e in group).isoformat(), "refs": []})
    for m in db.query(F.Medication).filter(
            F.Medication.pet_id == pet_id, F.Medication.is_archived == False).all():  # noqa: E712
        if m.start_at and m.start_at >= now - timedelta(days=60):
            signals.append({"kind": "medication_start", "label": f"medication started: {m.name}",
                            "at": m.start_at.isoformat(), "refs": [str(m.id)]})
    for v in db.query(M.VetVisitSummary).filter(M.VetVisitSummary.dog_id == pet_id).all():
        if v.visit_date and v.visit_date.replace(tzinfo=None) >= now - timedelta(days=60):
            signals.append({"kind": "vet_visit",
                            "label": f"vet visit: {v.reason_for_visit or 'checkup'}",
                            "at": v.visit_date.isoformat(), "refs": [str(v.id)]})
    contexts = []
    for i, a in enumerate(signals):
        for b in signals[i + 1:]:
            try:
                ta = datetime.fromisoformat(a["at"]) if a["at"] else None
                tb = datetime.fromisoformat(b["at"]) if b["at"] else None
            except ValueError:
                continue
            if ta and tb and abs((ta - tb).total_seconds()) <= 7 * 86400:
                contexts.append({
                    "signals": [a["label"], b["label"]],
                    "statement": (f"'{a['label']}' and '{b['label']}' occurred within the same "
                                  "7-day period. This is a temporal overlap, not evidence that one caused the other."),
                    "refs": (a.get("refs") or []) + (b.get("refs") or [])})
    return contexts


def _group_by(items: list[dict], key) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for it in items:
        out.setdefault(key(it), []).append(it)
    return out


def completeness(db: Session, pet_id: UUID, now: datetime) -> dict:
    """Record completeness — how complete the record is, NEVER a health score."""
    dims: dict[str, dict] = {}
    w = _weight_series(db, pet_id)[0]
    dims["weight"] = {"score": 1.0 if sum(1 for p in w if p["t"] >= now - timedelta(days=30)) >= 2 else
                      (0.5 if any(p["t"] >= now - timedelta(days=30) for p in w) else 0.0),
                      "detail": f"{sum(1 for p in w if p['t'] >= now - timedelta(days=30))} weight obs in 30d"}
    act = _activity_series(db, pet_id)
    adays = len({p["t"].date().isoformat() for p in act if p["t"] >= now - timedelta(days=30)})
    dims["activity"] = {"score": round(min(1.0, adays / 15.0), 2),
                        "detail": f"{adays}/30 days with activity"}
    nut = _nutrition_series(db, pet_id)
    ndays = len({p["t"].date().isoformat() for p in nut if p["t"] >= now - timedelta(days=30)})
    dims["nutrition"] = {"score": round(min(1.0, ndays / 15.0), 2),
                         "detail": f"{ndays}/30 days with nutrition"}
    beh = _behavior_series(db, pet_id)
    bn = sum(1 for p in beh if p["t"] >= now - timedelta(days=30))
    dims["behavior"] = {"score": 1.0 if bn >= 4 else (0.5 if bn >= 1 else 0.0),
                        "detail": f"{bn} behavior records in 30d"}
    prev = preventive_status(db, pet_id, now)
    tot = max(1, prev["completed_vaccinations"] + prev["completed_deworming"])
    dims["preventive"] = {"score": round(max(0.0, (tot - len(prev["overdue"])) / tot), 2),
                          "detail": f"{len(prev['overdue'])} overdue of {tot} preventive records"}
    dims["vet_records"] = {"score": 1.0 if prev["last_vet_visit"] else 0.0,
                           "detail": f"last vet visit: {prev['last_vet_visit'] or 'none on record'}"}
    overall = round(sum(d["score"] for d in dims.values()) / len(dims) * 100.0, 0)
    return {"pet_id": str(pet_id), "record_completeness_pct": overall,
            "label": "record completeness — how complete the record is, NOT a health score",
            "dimensions": dims,
            "explanation": ("Completeness describes evidence coverage. A low score means "
                            "intelligence is limited by missing data, not that the dog is unhealthy."),
            "method": "mean of dimension coverage fractions (30d windows; vet 180d)",
            "rules_version": RULES_VERSION, "generated_at": now.isoformat()}


def freshness_all(db: Session, pet_id: UUID, now: datetime,
                  metric_results: dict) -> dict:
    out = {}
    for m, res in metric_results.items():
        f = (res or {}).get("freshness") or {"state": "NO_DATA"}
        out[m] = f
    prev = preventive_status(db, pet_id, now)
    if prev["last_vet_visit"]:
        age = (now - datetime.fromisoformat(prev["last_vet_visit"])).days
        out["vet_records"] = {"state": "CURRENT" if age <= 90 else ("RECENT" if age <= 180 else "STALE"),
                              "latest_at": prev["last_vet_visit"], "age_days": age}
    else:
        out["vet_records"] = {"state": "NO_DATA"}
    return {"pet_id": str(pet_id), "metrics": out, "generated_at": now.isoformat()}


# ── Intelligence lineage (ai_analysis_records) ──────────────────────

def store_intelligence(db: Session, pet_id: UUID, analysis_type: str, summary: str,
                       evidence_ids: list, period: dict | None, confidence: float | None,
                       health_event_id: UUID | None = None) -> F.AIAnalysisRecord:
    """Write a GENERATED record; supersede prior GENERATED rows of same type."""
    old = db.query(F.AIAnalysisRecord).filter(
        F.AIAnalysisRecord.pet_id == pet_id,
        F.AIAnalysisRecord.analysis_type == analysis_type,
        F.AIAnalysisRecord.status == "GENERATED").all()
    for r in old:
        r.status = "SUPERSEDED"
    rec = F.AIAnalysisRecord(
        pet_id=pet_id, health_event_id=health_event_id, analysis_type=analysis_type,
        input_ref={"pet_id": str(pet_id), "evidence_ids": evidence_ids[:200]},
        output_summary=summary[:4000], confidence=confidence,
        model_id=INTEL_MODEL_ID, verification_status="unverified",
        status="GENERATED",
        period_start=datetime.fromisoformat(period["start"]) if period and period.get("start") else None,
        period_end=datetime.fromisoformat(period["end"]) if period and period.get("end") else None,
        method="descriptive longitudinal analytics", rules_version=RULES_VERSION,
        evidence={"evidence_ids": evidence_ids[:200]})
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def store_failure(db: Session, pet_id: UUID, analysis_type: str, reason: str) -> F.AIAnalysisRecord:
    rec = F.AIAnalysisRecord(
        pet_id=pet_id, analysis_type=analysis_type,
        input_ref={"pet_id": str(pet_id)}, output_summary=f"Analysis failed truthfully: {reason}"[:1000],
        model_id=INTEL_MODEL_ID, verification_status="unverified", status="FAILED",
        method="descriptive longitudinal analytics", rules_version=RULES_VERSION,
        evidence={})
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def list_intelligence(db: Session, pet_id: UUID, limit: int = 20) -> list[dict]:
    rows = db.query(F.AIAnalysisRecord).filter(
        F.AIAnalysisRecord.pet_id == pet_id).order_by(
        F.AIAnalysisRecord.created_at.desc()).limit(limit).all()
    return [{"id": str(r.id), "analysis_type": r.analysis_type, "status": r.status,
             "summary": r.output_summary,
             "period": {"start": r.period_start.isoformat() if r.period_start else None,
                        "end": r.period_end.isoformat() if r.period_end else None},
             "method": r.method, "rules_version": r.rules_version,
             "evidence_ids": (r.evidence or {}).get("evidence_ids", []),
             "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]


# ── Consent gate (shared by analytics + supervisor routes) ──────────

CONSENT_PURPOSE = "ai_analysis"


def require_ai_consent(db: Session, user) -> None:
    """Raise 403 with a truthful blocked state unless ai_analysis is GRANTED."""
    from fastapi import HTTPException
    from app.core.observability import log_event as _log
    import logging as _logging
    rec = db.query(F.ConsentRecord).filter(
        F.ConsentRecord.user_id == user.id,
        F.ConsentRecord.purpose == CONSENT_PURPOSE).order_by(
        F.ConsentRecord.created_at.desc()).first()
    if rec is None or rec.status != "GRANTED":
        _log(_logging.INFO, "intelligence_blocked_consent", purpose=CONSENT_PURPOSE)
        raise HTTPException(status_code=403, detail=(
            "AI analysis consent is required. Grant 'ai_analysis' consent in "
            "Consent Center to use health intelligence."))
