"""POST /api/checkin — submit a wellbeing check-in and get the AI result.

PIPELINE (this is the INTERACT -> ANALYSE -> SCORE -> ALERT chain):

    1. validate the authenticated beneficiary / staff scope
    2. score the check-in through the existing 7-step pipeline and store it
    3. run the EXISTING distress_engine.assess_user on this user
    4. store the risk assessment (risk_assessments collection)
    5. run the EXISTING alert service (deduplicated)
    6. return the check-in + the assessment/alert summary

Steps 3–5 run in the authenticated (production) mode. In the legacy
open mode (AUTH_ENFORCED=false, used only by the pre-auth test suite
and throwaway demos) the check-in is stored without an assessment, so
an unauthenticated caller can never manufacture risk assessments or
alerts for an arbitrary user_id.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.checkin import (
    CheckinAlertSummary,
    CheckinAssessmentSummary,
    CheckinRequest,
    CheckinResponse,
)
from services import checkin_flow, scoring_service, security

logger = logging.getLogger("sahara.checkin")

router = APIRouter(prefix="/api", tags=["checkin"])


@router.post("/checkin", response_model=CheckinResponse)
async def submit_checkin(
    payload: CheckinRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> CheckinResponse:
    """Store a wellbeing check-in, then run the existing risk pipeline.

    The raw form answers are stored next to the AI result so every score
    stays auditable. SECURITY: with auth enforced the caller may only
    check in on their own behalf (beneficiary) or on cases within their
    staff scope — the user_id in the body is never trusted by itself.
    """
    # Auto-create a stub profile on first contact — only in the legacy
    # open mode. When auth is enforced the profile must already exist
    # (e.g. the beneficiary's own account), and access is verified below.
    if not security.ENFORCED:
        existing = await db.users.find_one({"user_id": payload.user_id})
        if existing is None:
            await db.users.insert_one(
                {
                    "user_id": payload.user_id,
                    "display_name": "",            # filled in at registration
                    "phone_hash": "",              # bcrypt hash only, never the raw number
                    "language_preference": "en",
                    "created_at": datetime.now(timezone.utc),
                    "case_number": None,
                }
            )
    else:
        # Enforced: the actor must exist and hold access to this user_id
        # (beneficiary == own id, caseworker == assigned, admins by scope).
        await security.require_case_access(actor, db, user_id=payload.user_id)

    # Run the 7-step pipeline (NLP + form + trend -> score -> risk -> action).
    ai_result = await scoring_service.compute_ai_result(payload, db)

    timestamp = datetime.now(timezone.utc)
    checkin_id = str(uuid4())
    document = {
        "checkin_id": checkin_id,
        "user_id": payload.user_id,
        "timestamp": timestamp,
        # form_data keeps exactly the person's answers (transcript is
        # stored separately in the transcripts flow when analyzed).
        "form_data": payload.model_dump(exclude={"user_id", "transcript"}),
        "ai_result": ai_result.model_dump(),
        "source": "checkin",
    }
    await db.checkins.insert_one(document)

    # ---- Steps 3–5: existing risk engine + alert service -------------------
    # Only in the authenticated mode (see module docstring). The shared
    # flow contains every failure so a risk/alert hiccup can never lose
    # or corrupt the check-in that was already saved.
    assessment_summary = None
    alerts_created: list[CheckinAlertSummary] = []
    if security.ENFORCED:
        try:
            flow = await checkin_flow.run_assessment_flow(db, payload.user_id)
        except Exception:  # noqa: BLE001 — last-resort containment
            logger.exception("Check-in flow failed for %s", payload.user_id)
            flow = {"assessment": None, "alerts_created": []}
        assessment_doc = flow.get("assessment")
        if assessment_doc is not None:
            assessment_summary = CheckinAssessmentSummary(
                assessment_id=assessment_doc["assessment_id"],
                distress_score=assessment_doc["distress_score"],
                risk_level=assessment_doc["risk_level"],
                trend=assessment_doc["trend"],
                change=assessment_doc.get("change"),
                escalation_probability=assessment_doc["escalation_probability"],
                crisis_flag=bool(assessment_doc.get("crisis_flag", False)),
            )
        alerts_created = [
            CheckinAlertSummary(**alert) for alert in flow.get("alerts_created", [])
        ]
        logger.info(
            "Check-in %s stored for %s; assessment=%s; alerts_created=%s",
            checkin_id, payload.user_id,
            assessment_summary.assessment_id if assessment_summary else None,
            len(alerts_created),
        )

    return CheckinResponse(
        checkin_id=checkin_id,
        timestamp=timestamp,
        ai_result=ai_result,
        assessment=assessment_summary,
        alerts_created=alerts_created,
    )