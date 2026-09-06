"""Shared post-check-in pipeline: assessment + alert generation.

Every place a wellbeing check-in lands in the database (POST /api/checkin
and the guided chat check-in) funnels through ONE function here so the
flow can never drift apart:

    check-in stored
        -> distress_engine.assess_user        (existing engine)
        -> risk_assessments.insert_one        (existing collection)
        -> alert_service.sync_alerts_for_assessment (existing service)

Design rules (documented consistency behaviour for this prototype):
- The check-in itself is ALWAYS stored first and is never rolled back.
- Assessment and alert failures are contained and logged — they must
  never lose a check-in or fail the caller. The response reflects what
  actually happened (`assessment` is null / `alerts_created` empty when
  a stage failed or was skipped).
- The operation is append-only (MongoDB documents are immutable after
  insert) so a retried request stores a second check-in + assessment;
  duplicate ALERTS are prevented inside alert_service (one open alert
  per event/transition). True multi-document transactions would require
  MongoDB replica-set sessions and are documented as out of scope here.
- Nothing here ever claims an alert was created when it was not, and no
  sensitive free text is logged — only user ids and stage names.
"""

from __future__ import annotations

import logging

from services import alert_service, distress_engine

logger = logging.getLogger("sahara.checkin_flow")


async def run_assessment_flow(db, user_id: str) -> dict:
    """Assess the user and raise alerts after a stored check-in.

    Returns:
        {
          "assessment": stored assessment dict or None,
          "alerts_created": [{"alert_id","alert_type","severity","title"}, ...],
        }
    Best-effort by design: each stage is contained so a failure cannot
    corrupt the check-in that was already saved. Stage failures are
    logged (user id only) and visible as an empty result.
    """
    result: dict = {"assessment": None, "alerts_created": []}

    try:
        assessment = await distress_engine.assess_user(user_id, db)
    except Exception:  # noqa: BLE001 — contained; see module docstring
        logger.exception(
            "Risk assessment failed after check-in for %s — check-in preserved; "
            "assessment deferred.", user_id,
        )
        return result
    if assessment is None:
        # No check-ins and no chat history (should not happen right after
        # a check-in, but kept as a safety guard).
        logger.warning("Assessment returned no data for %s after a check-in", user_id)
        return result

    try:
        await db.risk_assessments.insert_one(assessment)
    except Exception:  # noqa: BLE001
        logger.exception(
            "Assessment store failed after check-in for %s — check-in preserved.", user_id
        )
        return result
    result["assessment"] = assessment

    try:
        created = await alert_service.sync_alerts_for_assessment(db, assessment)
        result["alerts_created"] = [
            {
                "alert_id": alert.alert_id,
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "title": alert.title,
            }
            for alert in created
        ]
    except Exception:  # noqa: BLE001
        logger.exception(
            "Alert sync failed after check-in for %s — assessment stored; "
            "alerts can be refreshed via the risk endpoints.", user_id
        )

    return result
