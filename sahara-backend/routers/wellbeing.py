"""Beneficiary wellbeing space — personalised activities + support access.

GET  /api/wellbeing/plan                          personalised plan
GET  /api/wellbeing/activities                    full catalogue + state
POST /api/wellbeing/activities/{activity_id}/complete
GET  /api/wellbeing/progress
POST /api/wellbeing/reflections                   private reflection
GET  /api/wellbeing/reflections                   own reflections only
POST /api/wellbeing/support-request               ask to talk to a person
GET  /api/wellbeing/support-status                honest request state

Design rules (STEP 1):
- The wellbeing space NEVER runs a risk engine. Personalisation reads the
  person's latest EXISTING assessment/check-in and tunes which supportive
  ideas to suggest — no risk score is recomputed and none is returned.
- Crisis keeps using the EXISTING crisis pathway; an urgent/crisis state
  simply makes human support the priority instead of self-directed ideas.
- Identity is derived from the authenticated token: there is no user_id
  in any URL or body, so no beneficiary can address another person's data.
- Reflections are beneficiary-private: not joined to caseworker/admin
  surfaces and never written to the audit log.
- A support request reaches the caseworker through the SAME
  caseworker_actions record the portal chat writes — no parallel alert
  system.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.wellbeing import (
    ActivityCatalogResponse,
    ActivityCompleteResponse,
    ActivityProgress,
    ReflectionCreate,
    ReflectionView,
    SupportRequestResponse,
    SupportStatus,
    WellbeingPlan,
)
from services import security, wellbeing_service

router = APIRouter(prefix="/api", tags=["wellbeing"])

_SUPPORT_NOTE = (
    "AI-assisted wellbeing suggestions support your daily life. "
    "Human professionals remain responsible for decisions and care."
)


def _require_beneficiary(actor: dict | None) -> str:
    """The authenticated beneficiary's user_id, or 401/403.

    This space has no client-supplied identity: the actor IS the subject.
    """
    if actor is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if actor.get("role") != "beneficiary":
        raise HTTPException(
            status_code=403,
            detail="The wellbeing space is for beneficiaries. "
                   "Staff use the casework console instead.",
        )
    return actor["user_id"]


@router.get("/wellbeing/plan", response_model=WellbeingPlan)
async def wellbeing_plan(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> WellbeingPlan:
    """The beneficiary's personalised plan (no risk data ever returned)."""
    user_id = _require_beneficiary(actor)
    return WellbeingPlan(**await wellbeing_service.build_plan(db, user_id))


@router.get("/wellbeing/activities", response_model=ActivityCatalogResponse)
async def wellbeing_activities(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> ActivityCatalogResponse:
    """The full activity catalogue, each item with the user's state."""
    user_id = _require_beneficiary(actor)
    completed = await wellbeing_service._completion_map(db, user_id)
    items = []
    for catalog_item in wellbeing_service.CATALOG:
        item = dict(catalog_item)
        rec = completed.get(item["activity_id"])
        if rec:
            item["completed"] = True
            item["completed_today"] = wellbeing_service._is_today(
                rec.get("last_completed_at")
            )
        items.append(item)
    return ActivityCatalogResponse(activities=items)


@router.post("/wellbeing/activities/{activity_id}/complete",
             response_model=ActivityCompleteResponse)
async def complete_activity(
    activity_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> ActivityCompleteResponse:
    """Mark an activity complete (idempotent — never a duplicate record)."""
    user_id = _require_beneficiary(actor)
    if activity_id not in wellbeing_service._CATALOG_BY_ID:
        raise HTTPException(status_code=404, detail="Unknown activity.")
    result = await wellbeing_service.record_completion(db, user_id, activity_id)
    return ActivityCompleteResponse(**result)


@router.get("/wellbeing/progress", response_model=ActivityProgress)
async def wellbeing_progress(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> ActivityProgress:
    """The beneficiary's gentle progress summary."""
    user_id = _require_beneficiary(actor)
    return ActivityProgress(**await wellbeing_service.progress(db, user_id))


# ---------------------------------------------------------------------------
# Private reflections — owner-only, never joined to staff surfaces.
# ---------------------------------------------------------------------------


@router.post("/wellbeing/reflections", response_model=ReflectionView)
async def save_reflection(
    payload: ReflectionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> ReflectionView:
    """Save a private reflection for the authenticated beneficiary.

    Deliberately NOT audit-logged: the person's own words stay in their
    own reflection document.
    """
    user_id = _require_beneficiary(actor)
    now = datetime.now(timezone.utc)
    reflection_id = str(uuid4())
    await db.wellbeing_reflections.insert_one({
        "reflection_id": reflection_id,
        "user_id": user_id,
        "text": payload.text,
        "created_at": now,
    })
    return ReflectionView(reflection_id=reflection_id,
                          text=payload.text, created_at=now)


@router.get("/wellbeing/reflections", response_model=list[ReflectionView])
async def list_reflections(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> list[ReflectionView]:
    """The beneficiary's own reflections, newest first.

    There is deliberately no staff/admin read path here — reflections are
    not part of caseworker or administrative surfaces by default.
    """
    user_id = _require_beneficiary(actor)
    docs = await db.wellbeing_reflections.find(
        {"user_id": user_id}).sort("created_at", -1).to_list(length=200)
    return [ReflectionView(**d) for d in docs]


# ---------------------------------------------------------------------------
# Human support — same existing workflow the portal chat uses.
# ---------------------------------------------------------------------------


@router.post("/wellbeing/support-request", response_model=SupportRequestResponse)
async def request_support(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> SupportRequestResponse:
    """Ask to talk to a person.

    Records an honest REQUEST on the existing caseworker workflow (the
    assigned caseworker sees it on the case timeline). No telephony
    integration exists, so nothing claims a counsellor is calling now.
    Repeating the request while it is unanswered does not stack duplicates.
    """
    user_id = _require_beneficiary(actor)
    result = await wellbeing_service.record_support_request(db, user_id)
    return SupportRequestResponse(**result)


@router.get("/wellbeing/support-status", response_model=SupportStatus)
async def support_status(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> SupportStatus:
    """Whether a request is pending and whether a human has responded."""
    user_id = _require_beneficiary(actor)
    return SupportStatus(**await wellbeing_service.support_status(db, user_id))
