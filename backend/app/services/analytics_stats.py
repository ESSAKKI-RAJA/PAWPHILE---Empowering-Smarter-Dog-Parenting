"""BIN2 analytics statistics — pure functions, no DB, no I/O.

Transparent methods only (stdlib `statistics`): rolling mean/median,
percentage/absolute change, least-squares slope, MAD-based robust deviation.
Every function documents rationale, assumptions, minimum samples, limits.

Statuses used across the intelligence layer:
  AVAILABLE | INSUFFICIENT_DATA | STALE_DATA | INVALID_DATA | UNAVAILABLE | ERROR
Trend states:
  STABLE | INCREASING | DECREASING | VARIABLE | INSUFFICIENT_DATA | STALE
"""
import math
import statistics
from datetime import datetime
from typing import Any

from app.core.config import settings

RULES_VERSION = "bin2-stats-v1"

# Descriptive (not clinical) thresholds — env-configurable, documented.
STABLE_PCT_THRESHOLD = settings.INTEL_STABLE_PCT_THRESHOLD  # |% change| below this -> STABLE
VARIABLE_R2_THRESHOLD = settings.INTEL_VARIABLE_R2  # R^2 below this with nonzero slope -> VARIABLE
CHANGE_MAD_THRESHOLD = settings.INTEL_CHANGE_MAD_Z  # robust |z| at/above this -> candidate change
CHANGE_MIN_PCT = settings.INTEL_CHANGE_MIN_PCT  # ...and |%| at/above this
OUTLIER_MAD_THRESHOLD = settings.INTEL_OUTLIER_MAD_Z  # robust |z| above this -> suspicious


def _to_float(v: Any) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def median(values: list[float]) -> float | None:
    vals = [v for v in (_to_float(x) for x in values) if v is not None]
    if not vals:
        return None
    return float(statistics.median(vals))


def mean(values: list[float]) -> float | None:
    vals = [v for v in (_to_float(x) for x in values) if v is not None]
    if not vals:
        return None
    return float(statistics.fmean(vals))


def stdev(values: list[float]) -> float | None:
    """Sample stdev; None when n < 2. Assumption: roughly symmetric spread; else use MAD."""
    vals = [v for v in (_to_float(x) for x in values) if v is not None]
    if len(vals) < 2:
        return None
    try:
        return float(statistics.stdev(vals))
    except statistics.StatisticsError:
        return None


def mad(values: list[float]) -> float | None:
    """Median absolute deviation — robust spread. None when empty."""
    vals = [v for v in (_to_float(x) for x in values) if v is not None]
    if not vals:
        return None
    med = statistics.median(vals)
    return float(statistics.median([abs(v - med) for v in vals]))


def robust_z(value: float, baseline_median: float, baseline_mad: float | None) -> float | None:
    """Robust z using MAD (scaled to sigma units, 1.4826). None when MAD is 0/None."""
    if baseline_mad is None or baseline_mad <= 0:
        return None
    return (value - baseline_median) / (1.4826 * baseline_mad)


def pct_change(recent: float | None, baseline: float | None) -> float | None:
    if recent is None or baseline is None or baseline == 0:
        return None
    return (recent - baseline) / abs(baseline) * 100.0


def least_squares_slope(xs: list[float], ys: list[float]) -> dict:
    """Slope/intercept/R^2 of y on x. Minimum 3 points. Assumption: linear trend
    is a useful *description*; a low R^2 means VARIABLE, not failure."""
    pairs = [(x, y) for x, y in zip(xs, ys) if x is not None and y is not None]
    if len(pairs) < 3:
        return {"slope": None, "intercept": None, "r2": None, "n": len(pairs),
                "limitation": "least-squares needs >= 3 points"}
    n = len(pairs)
    mx = sum(p[0] for p in pairs) / n
    my = sum(p[1] for p in pairs) / n
    sxx = sum((p[0] - mx) ** 2 for p in pairs)
    if sxx == 0:
        return {"slope": 0.0, "intercept": my, "r2": 0.0, "n": n,
                "limitation": "all timestamps identical"}
    sxy = sum((p[0] - mx) * (p[1] - my) for p in pairs)
    slope = sxy / sxx
    intercept = my - slope * mx
    syy = sum((p[1] - my) ** 2 for p in pairs)
    r2 = (sxy * sxy / (sxx * syy)) if sxx and syy else 0.0
    return {"slope": slope, "intercept": intercept, "r2": max(0.0, min(1.0, r2)), "n": n}


def classify_trend(slope: float | None, r2: float | None, change_pct: float | None,
                   n: int, stale: bool = False) -> str:
    """Descriptive trend only — never a clinical judgment."""
    if stale:
        return "STALE"
    if slope is None or n < 3:
        return "INSUFFICIENT_DATA"
    if change_pct is not None and abs(change_pct) < STABLE_PCT_THRESHOLD:
        return "STABLE"
    if r2 is not None and r2 < VARIABLE_R2_THRESHOLD:
        return "VARIABLE"
    if slope > 0:
        return "INCREASING"
    if slope < 0:
        return "DECREASING"
    return "STABLE"


def split_outliers(points: list[dict]) -> tuple[list[dict], list[dict]]:
    """Classify points into (usable, suspicious) via MAD z > OUTLIER_MAD_THRESHOLD.
    Originals are never modified or deleted; exclusion reasons are returned."""
    vals = [p["value"] for p in points]
    med = median(vals)
    spread = mad(vals)
    if med is None or not spread:
        return points, []
    usable, suspicious = [], []
    for p in points:
        z = robust_z(p["value"], med, spread)
        if z is not None and abs(z) > OUTLIER_MAD_THRESHOLD:
            suspicious.append({**p, "exclusion_reason": f"robust |z|={abs(z):.1f} exceeds {OUTLIER_MAD_THRESHOLD} (suspicious, kept in record)"})
        else:
            usable.append(p)
    return usable, suspicious


def find_duplicates(points: list[dict]) -> list[dict]:
    """Same timestamp + same value recorded twice. Returns the duplicate rows
    (second and later); callers keep the first and note the count."""
    seen: dict[tuple, dict] = {}
    dups = []
    for p in points:
        key = (p.get("t"), round(float(p["value"]), 6))
        if key in seen:
            dups.append(p)
        else:
            seen[key] = p
    return dups


# ── Unit normalization ──────────────────────────────────────────────
# Original value/unit are ALWAYS preserved alongside normalized output.
# Ambiguous or unknown units are never silently converted (-> INVALID_DATA).

WEIGHT_TO_KG = {"kg": 1.0, "g": 0.001, "lb": 0.453592, "lbs": 0.453592}


def normalize_weight(value: Any, unit: str | None) -> dict:
    v = _to_float(value)
    if v is None or v <= 0:
        return {"status": "INVALID_DATA", "reason": "non-positive or non-numeric weight",
                "original_value": value, "original_unit": unit}
    u = (unit or "kg").strip().lower()
    if u not in WEIGHT_TO_KG:
        return {"status": "INVALID_DATA", "reason": f"unknown weight unit '{unit}' — not converted",
                "original_value": value, "original_unit": unit}
    kg = v * WEIGHT_TO_KG[u]
    if kg <= 0 or kg > 250:
        return {"status": "INVALID_DATA", "reason": "normalized weight outside plausible (0, 250] kg",
                "original_value": value, "original_unit": unit}
    return {"status": "AVAILABLE", "original_value": v, "original_unit": u,
            "value": kg, "unit": "kg", "conversion": f"* {WEIGHT_TO_KG[u]}" if u != "kg" else "identity"}


def assess_eligibility(points: list[dict], min_obs: int, min_span_days: float,
                       max_gap_days: float | None = None) -> dict:
    """Data-quality gate. points: [{t: datetime, value: float}]."""
    if not points:
        return {"status": "INSUFFICIENT_DATA", "reason": "no observations",
                "n": 0, "span_days": 0.0}
    ts = sorted(p["t"] for p in points if isinstance(p.get("t"), datetime))
    if not ts:
        return {"status": "INVALID_DATA", "reason": "no valid timestamps", "n": len(points)}
    span = (ts[-1] - ts[0]).total_seconds() / 86400.0 if len(ts) > 1 else 0.0
    info: dict[str, Any] = {"n": len(points), "span_days": round(span, 1),
                            "first": ts[0].isoformat(), "last": ts[-1].isoformat()}
    if len(points) < min_obs:
        return {**info, "status": "INSUFFICIENT_DATA",
                "reason": f"only {len(points)} observation(s); need >= {min_obs}"}
    if span < min_span_days:
        return {**info, "status": "INSUFFICIENT_DATA",
                "reason": f"span {span:.1f}d shorter than required {min_span_days}d"}
    if max_gap_days:
        gaps = [(ts[i + 1] - ts[i]).total_seconds() / 86400.0 for i in range(len(ts) - 1)]
        biggest = max(gaps) if gaps else 0.0
        info["max_gap_days"] = round(biggest, 1)
        if biggest > max_gap_days:
            return {**info, "status": "STALE_DATA" if biggest > max_gap_days * 2 else "AVAILABLE",
                    "reason": f"largest gap {biggest:.1f}d exceeds {max_gap_days}d",
                    "gap_noted": True}
    return {**info, "status": "AVAILABLE"}


def rolling_average(points: list[dict], window: int) -> list[dict]:
    """Trailing rolling mean over value-ordered points. Short windows return raw."""
    ordered = sorted(points, key=lambda p: p["t"])
    out = []
    for i, p in enumerate(ordered):
        chunk = ordered[max(0, i - window + 1): i + 1]
        vals = [c["value"] for c in chunk]
        out.append({**p, "rolling_mean": sum(vals) / len(vals), "rolling_n": len(vals)})
    return out
