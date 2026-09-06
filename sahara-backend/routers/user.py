"""GET /api/user/* — history, annotations, and latest check-in."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.checkin import AIResult
from services import risk_policy, security

router = APIRouter(prefix="/api", tags=["user"])

# The distress score at/above which the AI starts flagging a person.
# "AI flagged early signs" fires on the first crossing INTO the
# needs_attention band — read from the ONE shared risk policy so the
# chart annotation can never drift from the engine's bands.
_FLAG_THRESHOLD = risk_policy.needs_attention_floor()


def _date_str(dt: datetime) -> str:
    """YYYY-MM-DD (UTC) — the format the frontend Recharts chart expects."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d")


@router.get("/user/{user_id}/history")
async def get_history(
    user_id: str,
    days: int = Query(default=60, ge=1, le=365, description="How far back to look, in days"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """Full check-in history for the wellbeing trend chart.

    `history` is one entry per check-in (date, score, risk level).
    `annotations` marks the moments that matter on the chart:
      - "AI flagged early signs" the first time the distress score
        reached the flag threshold (>= 56) after being below it;
      - "Counsellor reached out" for every logged counsellor_contact
        action in the window (joined from caseworker_actions).

    SECURITY: beneficiary may read only their own history; staff only
    cases within their role scope (enforced server-side).
    """
    await security.require_case_access(actor, db, user_id=user_id)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    cursor = db.checkins.find(
        {"user_id": user_id, "timestamp": {"$gte": cutoff}}
    ).sort("timestamp", 1)

    history: list[dict] = []
    previous_score: int | None = None
    first_flag_date: str | None = None
    async for doc in cursor:
        ai = doc["ai_result"]
        score = ai["distress_score"]
        date = _date_str(doc["timestamp"])
        history.append(
            {
                "date": date,
                "distress_score": score,
                "risk_level": ai["risk_level"],
                "checkin_id": doc["checkin_id"],
            }
        )
        # First crossing of the flag threshold (from below or from the
        # very first check-in) becomes the ai_flag annotation.
        if first_flag_date is None and score >= _FLAG_THRESHOLD and (
            previous_score is None or previous_score < _FLAG_THRESHOLD
        ):
            first_flag_date = date
        previous_score = score

    annotations: list[dict] = []
    if first_flag_date is not None:
        annotations.append(
            {"date": first_flag_date, "label": "AI flagged early signs", "type": "ai_flag"}
        )

    actions = db.caseworker_actions.find(
        {"user_id": user_id, "action_type": "counsellor_contact", "timestamp": {"$gte": cutoff}}
    ).sort("timestamp", 1)
    async for action in actions:
        annotations.append(
            {
                "date": _date_str(action["timestamp"]),
                "label": "Counsellor reached out",
                "type": "counsellor_contact",
            }
        )

    return {"user_id": user_id, "history": history, "annotations": annotations}


@router.get("/user/{user_id}/latest")
async def get_latest(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """The most recent check-in's AI result plus profile context.

    This is what a case detail view (and the risk badge) renders first.
    """
    await security.require_case_access(actor, db, user_id=user_id)
    user = await db.users.find_one({"user_id": user_id})
    docs = await db.checkins.find({"user_id": user_id}).sort("timestamp", -1).to_list(length=1)

    if not docs:
        raise HTTPException(status_code=404, detail="No check-ins found for this user yet.")

    latest = docs[0]
    return {
        "user_id": user_id,
        "display_name": (user or {}).get("display_name") or "",
        "case_number": (user or {}).get("case_number"),
        "ai_result": AIResult(**latest["ai_result"]),
    }