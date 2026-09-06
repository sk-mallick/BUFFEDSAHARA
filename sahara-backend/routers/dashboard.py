"""Caseworker dashboard endpoints.

GET /api/dashboard/risk-queue    — prioritised cases for authorised caseworkers
GET /api/dashboard/risk-summary  — aggregate statistics (no PII)
GET /api/dashboard/chat-flags    — users with a crisis chat flag in the last 24 h

SECURITY: staff-only surfaces. The rows an account can see are scoped to
its role by the auth layer (assigned cases for caseworkers, their
state/district for officers/admins) — the API never trusts a query or
body value for identity or scope.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from services import distress_engine, security

router = APIRouter(prefix="/api", tags=["dashboard"])

# Follow-up older than this counts as "awaiting human follow-up".
FOLLOWUP_STALE_DAYS = 7


def _case_id(user_id: str) -> str:
    """Stable, human-readable case id derived from the user id.

    Never reveals the underlying user id; demo ids look like SA-04213.
    """
    digest = hashlib.md5(user_id.encode("utf-8")).hexdigest()[:5]
    return f"SA-{int(digest, 16) % 100000:05d}"


async def _build_risk_queue(
    db: AsyncIOMotorDatabase, allowed: set[str] | None = None
) -> list[dict]:
    """One prioritised row per user with any activity (check-ins or chat).

    Rows combine the latest check-in (for the raw score) with a fresh
    risk-engine assessment (risk level, trend, prediction, priority).
    Sorting: crisis safety signals first, then by priority score.
    `allowed` is the role-scoped user set (None = whole programme).
    """
    def _in_scope(uid: str) -> bool:
        return allowed is None or uid in allowed

    # Users with any check-in activity (existing behaviour).
    pipeline = [
        {"$sort": {"timestamp": -1}},
        {"$group": {"_id": "$user_id", "latest": {"$first": "$$ROOT"}}},
    ]
    latest_by_user: dict[str, dict] = {}
    async for doc in db.checkins.aggregate(pipeline):
        if _in_scope(doc["_id"]):
            latest_by_user[doc["_id"]] = doc["latest"]

    # Users with chat activity but no check-ins are still monitored.
    chat_pipeline = [
        {"$sort": {"timestamp": -1}},
        {"$group": {"_id": "$user_id", "latest": {"$first": "$$ROOT"}}},
    ]
    async for doc in db.chat_logs.aggregate(chat_pipeline):
        if _in_scope(doc["_id"]):
            latest_by_user.setdefault(doc["_id"], None)

    names: dict[str, str] = {}
    user_ids = list(latest_by_user)
    if user_ids:
        async for u in db.users.find({"user_id": {"$in": user_ids}}, {"user_id": 1, "display_name": 1}):
            names[u["user_id"]] = u.get("display_name") or ""

    now = datetime.now(timezone.utc)
    queue: list[dict] = []
    for user_id, checkin_doc in latest_by_user.items():
        # Fresh risk assessment (engine re-scores on every request; at
        # demo scale this is cheap and always current).
        assessment = await distress_engine.assess_user(user_id, db)
        if assessment is None:
            continue  # no usable signals

        days_since_checkin = None
        if checkin_doc is not None:
            latest_ts = checkin_doc["timestamp"]
            if latest_ts.tzinfo is None:
                latest_ts = latest_ts.replace(tzinfo=timezone.utc)
            days_since_checkin = (now - latest_ts).days

        last_follow_up = None
        followup = await db.caseworker_actions.find(
            {"user_id": user_id, "action_type": {"$in": list(distress_engine._FOLLOWUP_ACTIONS)}}
        ).sort("timestamp", -1).to_list(length=1)
        if followup:
            last_follow_up = followup[0]["timestamp"]

        queue.append(
            {
                "user_id": user_id,
                "case_id": _case_id(user_id),
                "display_name": names.get(user_id) or "Beneficiary",
                # Latest check-in score (raw) — existing contract.
                "latest_score": checkin_doc["ai_result"]["distress_score"] if checkin_doc else assessment["distress_score"],
                # Current risk from the engine (prototype bands + crisis override).
                "risk_level": assessment["risk_level"],
                "trend_direction": checkin_doc["ai_result"]["trend_direction"] if checkin_doc else assessment["trend"],
                "trend": assessment["trend"],
                "change": assessment.get("change"),
                "escalation_probability": assessment["escalation_probability"],
                "priority_score": assessment["priority_score"],
                "priority_level": assessment["priority_level"],
                "priority_reason": assessment["priority_reason"],
                "crisis_flag": assessment["crisis_flag"],
                "crisis_reason": assessment.get("crisis_reason"),
                "days_since_checkin": days_since_checkin,
                "last_follow_up": last_follow_up,
            }
        )

    # Crisis safety signals first, then by priority score.
    queue.sort(key=lambda row: (not row["crisis_flag"], -row["priority_score"]))
    return queue


@router.get("/dashboard/risk-queue")
async def risk_queue(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """Prioritised case list for the caseworker dashboard (role-scoped)."""
    await security.require_staff_role(actor, db)
    allowed = await security.allowed_user_ids(db, actor)
    queue = await _build_risk_queue(db, allowed)
    return {
        "queue": queue,
        "total": len(queue),
        "urgent_count": sum(1 for row in queue if row["risk_level"] == "urgent"),
        "needs_attention_count": sum(1 for row in queue if row["risk_level"] == "needs_attention"),
    }


@router.get("/dashboard/risk-summary")
async def risk_summary(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """Aggregate dashboard statistics. Counts only — no PII leaves here."""
    await security.require_staff_role(actor, db)
    allowed = await security.allowed_user_ids(db, actor)
    queue = await _build_risk_queue(db, allowed)
    now = datetime.now(timezone.utc)

    awaiting_follow_up = 0
    for row in queue:
        last = row["last_follow_up"]
        if last is None:
            awaiting_follow_up += 1
            continue
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if (now - last).days > FOLLOWUP_STALE_DAYS:
            awaiting_follow_up += 1

    return {
        "total": len(queue),
        "stable": sum(1 for r in queue if r["risk_level"] == "stable"),
        "monitoring": sum(1 for r in queue if r["risk_level"] == "monitoring"),
        "needs_attention": sum(1 for r in queue if r["risk_level"] == "needs_attention"),
        "urgent": sum(1 for r in queue if r["risk_level"] == "urgent"),
        "worsening_trends": sum(1 for r in queue if r["trend"] == "worsening"),
        "recent_crisis_flags": sum(1 for r in queue if r["crisis_flag"]),
        "awaiting_follow_up": awaiting_follow_up,
    }


@router.get("/dashboard/chat-flags")
async def chat_flags(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """Users with a crisis chat flag set within the last 24 hours.

    Powers the caseworker dashboard's "Crisis Chat Flags" card: every
    user whose chat turn triggered the crisis safety net (or whose
    latest flag was refreshed) in the last day, most recent first, with
    the sentiment and keywords of their most recent chat turn. Scoped
    to the authenticated role like the rest of the dashboard.
    """
    await security.require_staff_role(actor, db)
    allowed = await security.allowed_user_ids(db, actor)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    flagged: list[dict] = []
    cursor = db.users.find(
        {"crisis_flag": True, "crisis_flagged_at": {"$gte": cutoff}},
        {"user_id": 1, "display_name": 1, "crisis_flagged_at": 1},
    ).sort("crisis_flagged_at", -1)
    async for user in cursor:
        user_id = user["user_id"]
        if allowed is not None and user_id not in allowed:
            continue
        # Most recent chat turn for this user -> sentiment + keywords.
        logs = await db.chat_logs.find({"user_id": user_id}).sort("timestamp", -1).to_list(length=1)
        last = logs[0] if logs else None
        flagged.append(
            {
                "user_id": user_id,
                "display_name": user.get("display_name") or "Beneficiary",
                "crisis_flagged_at": user["crisis_flagged_at"],
                "last_message_sentiment": (last or {}).get("sentiment") or "neutral",
                "keywords_detected": (last or {}).get("keywords_found") or [],
            }
        )

    return {"flagged_users": flagged}