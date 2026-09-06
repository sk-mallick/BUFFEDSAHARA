"""Automatic case prioritisation for caseworkers.

Ranks open cases so attention flows to the people who need it most:

    1. crisis signal                 → hard floor (safety override)
    2. current distress              → 35%
    3. rate of deterioration         → 20%
    4. predicted escalation          → 25%
    5. persistence of elevated risk  → 10%
    6. time since last follow-up     → 10%

PROTOTYPE STATUS: a transparent, explainable mechanism — not a clinical
or legal decision. The final decision always belongs to an authorised
human caseworker. No protected characteristics are used anywhere.
"""

from __future__ import annotations

from services import risk_policy

# Priority bands — the ONE shared risk definition (services/risk_policy.py),
# re-used here so prioritisation always speaks the same language as the
# engine, the check-in labels and the alert layer.
PRIORITY_BANDS: list[tuple[int, str]] = risk_policy.RISK_BANDS


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _map_risk_level(score: int) -> str:
    return risk_policy.risk_level_for_score(score)

# A follow-up older than this (days) counts as "awaiting follow-up".
FOLLOWUP_STALE_DAYS = 7


def compute_priority(
    *,
    distress_score: int,
    change_7d: int | None,
    escalation_probability: float,
    consecutive_elevated: int,
    days_since_followup: int | None,
    crisis_flag: bool,
) -> dict:
    """Compute priority_score (0–100), priority_level and a plain reason.

    Components are each normalised to 0–100 and weighted; a crisis flag
    applies a hard floor of 85 so a safety signal can never be buried by
    the score.
    """
    # 1. Distress — current score (0–100).
    distress_component = float(distress_score)

    # 2. Rate of deterioration — 7-day change, capped at +25 → 100.
    deterioration_component = 0.0
    if change_7d is not None:
        deterioration_component = _clamp(change_7d, 0, 25) / 25.0 * 100.0

    # 3. Predicted escalation — probability scaled to 0–100.
    escalation_component = escalation_probability * 100.0

    # 4. Persistence — consecutive elevated observations, capped at 4.
    persistence_component = min(consecutive_elevated, 4) / 4.0 * 100.0

    # 5. Time since last human follow-up — none/old → 100, today → 0.
    followup_component = 100.0
    if days_since_followup is not None:
        followup_component = _clamp(days_since_followup, 0, FOLLOWUP_STALE_DAYS) / FOLLOWUP_STALE_DAYS * 100.0

    score = round(
        0.35 * distress_component
        + 0.20 * deterioration_component
        + 0.25 * escalation_component
        + 0.10 * persistence_component
        + 0.10 * followup_component
    )

    # Safety override: a crisis signal can never be ranked below urgent.
    if crisis_flag:
        score = max(score, 85)

    priority_level = _map_risk_level(score)
    reason = _build_reason(
        crisis_flag=crisis_flag,
        distress_score=distress_score,
        change_7d=change_7d,
        escalation_probability=escalation_probability,
        days_since_followup=days_since_followup,
        priority_level=priority_level,
    )

    return {"priority_score": score, "priority_level": priority_level, "reason": reason}


def _build_reason(
    *,
    crisis_flag: bool,
    distress_score: int,
    change_7d: int | None,
    escalation_probability: float,
    days_since_followup: int | None,
    priority_level: str,
) -> str:
    """One sentence a caseworker can act on — never chat content."""
    if crisis_flag:
        return "Immediate safety signal detected — escalated regardless of the risk score."
    parts = []
    if distress_score >= 50:
        parts.append(f"distress score {distress_score}")
    if change_7d is not None and change_7d >= 10:
        parts.append("rapidly increasing distress")
    if escalation_probability >= 0.5:
        parts.append(f"{round(escalation_probability * 100)}% predicted escalation")
    if days_since_followup is None or days_since_followup > 7:
        parts.append("no recent human follow-up")
    if parts:
        return "Priority driven by " + ", ".join(parts) + "."
    return "Routine case — no urgent drivers detected."