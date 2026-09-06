"""Alert generation service — the ALERT stage of the workflow.

The risk engine produces assessments; this service decides when an
assessment needs a human's eyes and raises an alert. It reuses the
engine's own fields (risk_level bands, distress score, `change`,
`crisis_flag`) — it does NOT invent a separate scoring system.

Rules (all idempotent — an alert exists for one (alert_type,
assessment_id) at most, and per-user rules like persistent/missed
alerts allow only ONE open alert at a time):

  1. risk_increase            — risk level moved up a band vs the previous assessment
  2. rapid_deterioration      — score jumped >= 15 while the 7-day trend is worsening
  3. crisis_signal            — deterministic safety override fired (crisis_flag)
  4. persistent_elevated_risk — >= 3 of the last 4 assessments sat at
                                needs_attention or above
  5. missed_followup          — an elevated case has gone too long without a
                                human touch (urgent: 2d, needs_attention: 7d,
                                monitoring: 14d)

Severity follows the Sahara language: only genuine safety conditions
(crisis signals, urgent bands) use `critical`. Most alerts are amber-tier,
never red — red is reserved for the caseworker-only critical treatment.

AI NEVER closes an alert. Alerts are acknowledged and resolved only
through the human endpoints in routers/alerts.py and routers/cases.py.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from models.alert import AlertDocument
from services import risk_policy

logger = logging.getLogger("sahara.alerts")

# Band rank comes from the ONE shared risk policy (services/risk_policy.py)
# so alert transitions can never disagree with the engine's bands.
_BAND = risk_policy.RISK_RANK


def _utc(ts) -> datetime | None:
    """Normalise a stored timestamp to an aware UTC datetime.

    mongomock (test driver) stores naive datetimes; MongoDB drivers
    return aware ones. Comparisons against `datetime.now(timezone.utc)`
    need both sides on the same footing.
    """
    if ts is None:
        return None
    if ts.tzinfo is None:
        return ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc)

# How long an elevated case may go without ANY human touch before a
# missed_followup alert fires (prototype SLA, documented as such).
_FOLLOWUP_SLA_DAYS = {"urgent": 2, "needs_attention": 7, "monitoring": 14}

_SEVERITY_BY_LEVEL = {"stable": "low", "monitoring": "low", "needs_attention": "high", "urgent": "critical"}
_SEVERITY_BY_ALERT = {
    "risk_increase": "medium",
    "rapid_deterioration": "high",
    "crisis_signal": "critical",
    "persistent_elevated_risk": "high",
    "missed_followup": "high",
}

_ALERT_TYPE_TITLES = {
    "risk_increase": "Risk level increased",
    "rapid_deterioration": "Rapid deterioration detected",
    "crisis_signal": "Crisis safety signal",
    "persistent_elevated_risk": "Persistent elevated risk",
    "missed_followup": "Human follow-up overdue",
}


async def _open_alert_exists(db, user_id: str, alert_type: str) -> bool:
    doc = await db.alerts.find_one(
        {"user_id": user_id, "alert_type": alert_type, "resolved": False}
    )
    return doc is not None


async def _open_alert_matching(db, user_id: str, alert_type: str, **fields) -> bool:
    """True when an OPEN alert with the same transition identity already exists.

    Guards the assessment-driven rules (risk_increase, rapid_deterioration)
    against duplicates when the same event is re-evaluated — a retried
    request or a repeated identical check-in must not stack a second open
    alert for the same (risk level, previous score) transition. When a
    human resolves the alert the rule re-arms for the next genuine event.
    """
    doc = await db.alerts.find_one(
        {"user_id": user_id, "alert_type": alert_type, "resolved": False, **fields}
    )
    return doc is not None


async def _store(db, **fields) -> AlertDocument | None:
    """Insert one alert if a duplicate is not already present."""
    # Dedup key: one alert per (user, alert_type, assessment) for the
    # assessment-driven rules; the caller supplies `dedup` filters for the
    # per-user rules it wants guarded by the one-open-alert invariant.
    dedup = fields.pop("dedup", {})
    existing = await db.alerts.find_one(dedup)
    if existing is not None:
        logger.info("Skipping duplicate alert %s for %s", fields.get("alert_type"), fields.get("user_id"))
        return None

    now = fields.get("created_at") or datetime.now(timezone.utc)
    alert = AlertDocument(
        alert_id=str(uuid4()),
        created_at=now,
        **fields,
    )
    await db.alerts.insert_one(alert.model_dump())  # native datetimes
    return alert


async def _last_human_touch(db, user_id: str) -> datetime | None:
    """Newest human record for this user (any acknowledged alert, action,
    intervention, or follow-up). None means the case never had a human touch."""
    latest: datetime | None = None
    async for doc in db.alerts.find({"user_id": user_id, "acknowledged": True}):
        ts = _utc(doc.get("acknowledged_at"))
        if ts and (latest is None or ts > latest):
            latest = ts
    async for doc in db.caseworker_actions.find({"user_id": user_id}):
        ts = _utc(doc.get("timestamp") or doc.get("action_date"))
        if ts and (latest is None or ts > latest):
            latest = ts
    return latest


async def _case_id_for(db, user_id: str) -> str:
    user = await db.users.find_one({"user_id": user_id}, {"case_number": 1})
    if user and user.get("case_number"):
        return str(user["case_number"])
    return user_id


async def sync_alerts_for_assessment(db, assessment: dict) -> list[AlertDocument]:
    """Raise the assessment-driven alerts for one freshly stored assessment.

    Called by POST /api/risk/assess/{user_id} right after the assessment
    is stored. Returns the alerts that were created (empty when nothing
    new fired — duplicate prevention keeps this quiet on re-assessments).
    """
    created: list[AlertDocument] = []
    user_id = assessment["user_id"]
    case_id = await _case_id_for(db, user_id)
    level = assessment["risk_level"]
    score = assessment["distress_score"]
    base = {
        "user_id": user_id,
        "case_id": case_id,
        "assessment_id": assessment["assessment_id"],
        "risk_score": score,
        "previous_risk_score": assessment.get("previous_score"),
        "risk_level": level,
        "requires_human_review": True,
    }

    # Previous stored assessment (the router stores the current one before
    # calling us, so exclude it and take the newest remaining).
    prev_doc = await db.risk_assessments.find_one(
        {"user_id": user_id, "assessment_id": {"$ne": assessment["assessment_id"]}},
        sort=[("timestamp", -1)],
    )
    prev_level = prev_doc.get("risk_level") if prev_doc else None
    prev = prev_doc.get("distress_score") if prev_doc else assessment.get("previous_score")

    # ---- 1. risk_increase -------------------------------------------------
    if prev_level and _BAND.get(level, 0) > _BAND.get(prev_level, 0):
        # Idempotency: one OPEN alert per (user, level, previous score)
        # transition — a retried check-in must not stack duplicates.
        if not await _open_alert_matching(
            db, user_id, "risk_increase",
            risk_level=level,
            previous_risk_score=assessment.get("previous_score"),
        ):
            alert = await _store(
                db,
                alert_type="risk_increase",
                severity=_SEVERITY_BY_LEVEL.get(level, "medium"),
                title=_ALERT_TYPE_TITLES["risk_increase"],
                description=(
                    f"Risk level increased from {prev_level} to {level} "
                    f"(distress score {prev if prev is not None else 'n/a'} → {score}). "
                    "Human review recommended."
                ),
                dedup={"user_id": user_id, "assessment_id": assessment["assessment_id"], "alert_type": "risk_increase"},
                **base,
            )
            if alert:
                created.append(alert)

    # ---- 2. rapid_deterioration ------------------------------------------
    if (
        assessment.get("change") is not None
        and assessment["change"] >= 15
        and assessment.get("trend") == "worsening"
    ):
        # Idempotency: same open (level, previous score) event -> no stack.
        if not await _open_alert_matching(
            db, user_id, "rapid_deterioration",
            risk_level=level,
            previous_risk_score=assessment.get("previous_score"),
        ):
            alert = await _store(
                db,
                alert_type="rapid_deterioration",
                severity="high",
                title=_ALERT_TYPE_TITLES["rapid_deterioration"],
                description=(
                    f"Distress score rose sharply ({prev if prev is not None else 'n/a'} → {score}) "
                    "while the 7-day trend is worsening. Human review recommended."
                ),
                dedup={"user_id": user_id, "assessment_id": assessment["assessment_id"], "alert_type": "rapid_deterioration"},
                **base,
            )
            if alert:
                created.append(alert)

    # ---- 3. crisis_signal (deterministic safety rule, NOT a prediction) ---
    if assessment.get("crisis_flag") and not await _open_alert_exists(
        db, user_id, "crisis_signal"
    ):
        # One OPEN critical alert per user: a repeating crisis must not
        # stack alert after alert while the first is still awaiting human
        # review. A human resolving it re-arms the rule for the next event.
        alert = await _store(
            db,
            alert_type="crisis_signal",
            severity="critical",
            title=_ALERT_TYPE_TITLES["crisis_signal"],
            description=(
                "A crisis safety signal was detected by the keyword safety net. "
                "Urgent safety signal — human review required immediately."
            ),
            dedup={"user_id": user_id, "assessment_id": assessment["assessment_id"], "alert_type": "crisis_signal"},
            **base,
        )
        if alert:
            created.append(alert)

    # ---- 4. persistent_elevated_risk --------------------------------------
    if level in ("needs_attention", "urgent") and not await _open_alert_exists(
        db, user_id, "persistent_elevated_risk"
    ):
        recent = (
            await db.risk_assessments.find({"user_id": user_id})
            .sort("timestamp", -1)
            .to_list(length=4)
        )
        elevated = sum(
            1 for a in recent if a.get("risk_level") in ("needs_attention", "urgent")
        )
        if len(recent) >= 3 and elevated >= 3:
            alert = await _store(
                db,
                alert_type="persistent_elevated_risk",
                severity="high",
                title=_ALERT_TYPE_TITLES["persistent_elevated_risk"],
                description=(
                    f"Risk has stayed at {level} across the last {elevated} assessments. "
                    "Persistent elevation warrants a human review and support plan."
                ),
                dedup={"user_id": user_id, "assessment_id": assessment["assessment_id"], "alert_type": "persistent_elevated_risk"},
                **base,
            )
            if alert:
                created.append(alert)

    return created


async def check_missed_followups(db) -> list[AlertDocument]:
    """Raise missed_followup alerts for elevated cases without a recent human touch.

    Idempotent (one open missed_followup per user at a time). Called lazily
    from GET /api/alerts so the dashboard always reflects the current SLA
    state without needing a scheduler.
    """
    created: list[AlertDocument] = []
    now = datetime.now(timezone.utc)

    # Latest assessment per user (small demo volumes; no aggregation needed).
    latest_by_user: dict[str, dict] = {}
    cursor = db.risk_assessments.find().sort("timestamp", -1)
    async for doc in cursor:
        if doc["user_id"] not in latest_by_user:
            latest_by_user[doc["user_id"]] = doc

    for user_id, assessment in latest_by_user.items():
        level = assessment.get("risk_level")
        if level not in _FOLLOWUP_SLA_DAYS:
            continue  # stable/monitoring-with-no-sla cases don't fire this rule
        if await _open_alert_exists(db, user_id, "missed_followup"):
            continue
        last_touch = await _last_human_touch(db, user_id)
        due_within = timedelta(days=_FOLLOWUP_SLA_DAYS[level])
        if last_touch is not None and (now - last_touch) < due_within:
            continue  # a human has been in the loop recently enough

        case_id = await _case_id_for(db, user_id)
        days = (now - _utc(assessment["timestamp"])).days if assessment.get("timestamp") else None
        alert = await _store(
            db,
            user_id=user_id,
            case_id=case_id,
            alert_type="missed_followup",
            severity="high" if level == "urgent" else "medium",
            title=_ALERT_TYPE_TITLES["missed_followup"],
            description=(
                f"Case has been at {level} risk and has gone past the "
                f"{_FOLLOWUP_SLA_DAYS[level]}-day follow-up window "
                + ("without any human follow-up." if last_touch is None else "since the last human contact.")
            ),
            risk_score=assessment.get("distress_score", 0),
            previous_risk_score=None,
            risk_level=level,
            requires_human_review=True,
            assessment_id=assessment.get("assessment_id"),
            dedup={"user_id": user_id, "alert_type": "missed_followup", "resolved": False},
        )
        if alert:
            created.append(alert)
            logger.info("Missed-follow-up alert raised for %s (level=%s, days_since_last_touch=%s)",
                        user_id, level, days)
    return created
