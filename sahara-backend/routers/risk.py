"""Risk assessment endpoints.

POST /api/risk/assess/{user_id}  — run + store a new assessment,
                                 then raise any alerts the engine warrants
GET  /api/risk/{user_id}/history — stored assessments (trend chart)
GET  /api/risk/{user_id}/latest  — most recent stored assessment

SECURITY: access checks are server-side (services/security.py). A
beneficiary may only read/run assessments for their own user_id; a
caseworker only for cases assigned to them; a district/state/national
admin within their scope. The path user_id is never trusted by itself.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db

logger = logging.getLogger("sahara.risk")
from models.risk import RiskAssessment
from services import alert_service, distress_engine, security

router = APIRouter(prefix="/api", tags=["risk"])


@router.post("/risk/assess/{user_id}", response_model=RiskAssessment)
async def assess_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """Run a fresh assessment, store it, and raise any alerts it warrants.

    Alert generation is the ALERT stage of the workflow: the engine
    assesses, this endpoint hands anything that needs a human to the
    alert center. Duplicate prevention lives in alert_service.
    """
    await security.require_case_access(actor, db, user_id=user_id)
    assessment = await distress_engine.assess_user(user_id, db)
    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="No data available for this user yet — no check-ins or conversation history.",
        )
    await db.risk_assessments.insert_one(assessment)
    try:
        created = await alert_service.sync_alerts_for_assessment(db, assessment)
        for alert in created:
            logger.info("Alert raised: %s for %s", alert.alert_type, user_id)
    except Exception:  # noqa: BLE001 — an alert failure must never break the assessment
        logger.exception("Alert generation failed after assessment %s", user_id)
    return assessment


@router.get("/risk/{user_id}/history")
async def assessment_history(
    user_id: str,
    days: int = Query(default=90, ge=1, le=365),
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """Historical assessments, oldest first — the risk trend chart data."""
    await security.require_case_access(actor, db, user_id=user_id)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cursor = db.risk_assessments.find(
        {"user_id": user_id, "timestamp": {"$gte": cutoff}}
    ).sort("timestamp", 1)

    history = []
    async for doc in cursor:
        history.append(
            {
                "assessment_id": doc["assessment_id"],
                "timestamp": doc["timestamp"],
                "distress_score": doc["distress_score"],
                "risk_level": doc["risk_level"],
                "trend": doc["trend"],
                "change": doc.get("change"),
                "escalation_probability": doc["escalation_probability"],
                "crisis_flag": doc.get("crisis_flag", False),
                "model_version": doc.get("model_version", "prototype-v1"),
            }
        )
    return {"user_id": user_id, "history": history}


@router.get("/risk/{user_id}/latest", response_model=RiskAssessment)
async def latest_assessment(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """The most recent stored assessment for a user."""
    await security.require_case_access(actor, db, user_id=user_id)
    docs = await db.risk_assessments.find({"user_id": user_id}).sort("timestamp", -1).to_list(length=1)
    if not docs:
        raise HTTPException(
            status_code=404,
            detail="No assessment stored yet. Run POST /api/risk/assess/{user_id} first.",
        )
    return docs[0]