"""POST /api/caseworker/action — log counsellor contacts, escalations, notes.

Every action logged here with action_type="counsellor_contact" becomes a
"Counsellor reached out" annotation on the user's wellbeing trend chart
(see routers/user.py), so the human side of the loop is always visible.

SECURITY: staff-only. The recorded caseworker identity is derived from
 the authenticated account, never from the request body.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.caseworker import CaseworkerActionRequest, CaseworkerActionResponse
from services import security

router = APIRouter(prefix="/api", tags=["caseworker"])


@router.post("/caseworker/action", response_model=CaseworkerActionResponse)
async def log_action(
    payload: CaseworkerActionRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> CaseworkerActionResponse:
    """Append a caseworker action to the user's record."""
    await security.require_staff_role(actor, db)
    await security.require_case_access(actor, db, user_id=payload.user_id)
    worker_id = payload.caseworker_id
    extra: dict = {}
    if actor is not None:
        worker_id = actor.get("staff_id") or actor["user_id"]
        extra = {"actor_user_id": actor["user_id"], "actor_role": actor.get("role")}

    action_id = str(uuid4())
    timestamp = datetime.now(timezone.utc)
    doc = {
        "action_id": action_id,
        "user_id": payload.user_id,
        "action_type": payload.action_type,
        "timestamp": timestamp,
        "note": payload.note,
        "caseworker_id": worker_id,
    }
    doc.update(extra)
    await db.caseworker_actions.insert_one(doc)
    return CaseworkerActionResponse(action_id=action_id, timestamp=timestamp)