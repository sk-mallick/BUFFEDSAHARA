"""Case-level human workflow endpoints.

POST /api/cases/{case_id}/interventions  — record one authorised human decision
POST /api/cases/{case_id}/follow-up      — record a follow-up (due date, outcome, status)
GET  /api/cases/{case_id}/timeline       — merged AI / human / system event timeline

Case identification: `case_id` may be the user_id (UUID) or the display
case_number stored on the user profile (e.g. "DEMO-042").

SECURITY: access to every case endpoint is derived from the authenticated
account (services/security.py). The recorded caseworker identity comes
from the token's account — NEVER from the request body — so changing a
case id or a caseworker_id field cannot grant access to an unauthorised
case or impersonate another staff member.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.caseworker import (
    FollowUpRequest,
    HumanWorkflowDocument,
    HumanWorkflowRecordResponse,
    InterventionRequest,
)
from services import security

router = APIRouter(prefix="/api", tags=["cases"])

# Human action types -> plain-language timeline labels (colour-independent).
INTERVENTION_LABELS = {
    "contact_beneficiary": "Beneficiary contacted",
    "schedule_counselling": "Counselling referral made",
    "provide_resources": "Support resources provided",
    "refer_service": "Referred to a support service",
    "welfare_followup": "Welfare follow-up requested",
    "escalate_senior_review": "Case escalated for senior review",
    "other": "Other authorised action recorded",
}


async def resolve_case(db, case_id: str) -> tuple[str, str]:
    """Return (user_id, display_case_id) for a case_id or user_id.

    Prefers a direct user_id match, then falls back to case_number.
    Raises 404 when neither matches — case workflow is only for known cases.
    """
    user = await db.users.find_one({"user_id": case_id}, {"user_id": 1, "case_number": 1})
    if user is None:
        user = await db.users.find_one({"case_number": case_id}, {"user_id": 1, "case_number": 1})
    if user is None:
        raise HTTPException(404, f"Case '{case_id}' not found. Create the user with a check-in first.")
    display = user.get("case_number") or user["user_id"]
    return user["user_id"], display


async def _open_alert_for_user(db, user_id: str) -> dict | None:
    return await db.alerts.find_one(
        {"user_id": user_id, "resolved": False}, sort=[("created_at", -1)]
    )


def _recorded_worker(actor: dict | None, fallback: str) -> tuple[str, dict]:
    """The caseworker identity stored on a human action.

    When auth is enforced the identity is the authenticated account's
    (staff_id or user_id) — the body's caseworker_id is ignored.
    Returns (caseworker_id, extra_audit_fields).
    """
    if actor is None:
        return fallback, {}
    cid = actor.get("staff_id") or actor["user_id"]
    return cid, {
        "actor_user_id": actor["user_id"],
        "actor_role": actor.get("role"),
    }


@router.post("/cases/{case_id}/interventions", response_model=HumanWorkflowRecordResponse)
async def log_intervention(
    case_id: str,
    payload: InterventionRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> HumanWorkflowRecordResponse:
    """Record ONE authorised human decision about a case.

    These are DECISIONS, logged for the workflow. The prototype has no
    real call/SMS/counselling integration — nothing here claims that an
    actual session happened. If the action responds to an open alert and
    the human escalated, the alert advances with it.
    """
    user_id, display = await resolve_case(db, case_id)
    await security.require_case_access(actor, db, user_id=user_id)
    worker_id, audit_fields = _recorded_worker(actor, payload.caseworker_id)

    now = datetime.now(timezone.utc)
    record_id = str(uuid4())
    label = INTERVENTION_LABELS.get(payload.action_type, payload.action_type)

    doc = HumanWorkflowDocument(
        record_kind="intervention",
        record_id=record_id,
        user_id=user_id,
        caseworker_id=worker_id,
        timestamp=now,
        action_type=payload.action_type,
        note=payload.note or label,
        alert_id=payload.alert_id,
        status="action_planned",
    ).model_dump()  # native datetimes
    doc.update(audit_fields)
    await db.caseworker_actions.insert_one(doc)

    # If this intervention responds to an open alert, keep the alert's
    # review status in step with the human decision.
    alert = None
    if payload.alert_id:
        alert = await db.alerts.find_one({"alert_id": payload.alert_id})
    elif not payload.alert_id:
        alert = await _open_alert_for_user(db, user_id)
    if alert is not None:
        escalated = payload.action_type == "escalate_senior_review"
        update = {"$set": {"review_status": "escalated" if escalated else "action_planned",
                           "acknowledged": True,
                           "acknowledged_by": worker_id,
                           "review_status_note": label}}
        if not alert.get("acknowledged_at"):
            update["$set"]["acknowledged_at"] = now
        if escalated:
            update["$set"]["resolved"] = True
            update["$set"]["resolved_at"] = now
        await db.alerts.update_one({"alert_id": alert["alert_id"]}, update)

    await security.audit(
        db, actor_user_id=(actor or {}).get("user_id"),
        actor_role=(actor or {}).get("role"),
        event="INTERVENTION_RECORDED", target_id=display,
        note=payload.action_type,
    )
    return HumanWorkflowRecordResponse(
        record_id=record_id, action_type=payload.action_type, timestamp=now, status="action_planned"
    )


@router.post("/cases/{case_id}/follow-up", response_model=HumanWorkflowRecordResponse)
async def log_follow_up(
    case_id: str,
    payload: FollowUpRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> HumanWorkflowRecordResponse:
    """Record a follow-up: what was done, when it is due, its outcome/status.

    Only an authorised human may create these records. Recording a
    follow-up NEVER changes the AI risk score or marks the beneficiary
    safe — it is an audit record of the human workflow.
    """
    user_id, display = await resolve_case(db, case_id)
    await security.require_case_access(actor, db, user_id=user_id)
    worker_id, audit_fields = _recorded_worker(actor, payload.caseworker_id)

    now = datetime.now(timezone.utc)
    record_id = str(uuid4())

    doc = HumanWorkflowDocument(
        record_kind="follow_up",
        record_id=record_id,
        user_id=user_id,
        caseworker_id=worker_id,
        timestamp=now,
        action_type="follow_up",
        note=payload.action_taken,
        alert_id=payload.alert_id,
        action_date=payload.action_date,
        follow_up_date=payload.follow_up_date,
        outcome=payload.outcome,
        status=payload.status,
        notes=payload.notes,
    ).model_dump()  # native datetimes
    doc.update(audit_fields)
    await db.caseworker_actions.insert_one(doc)

    # When a follow-up closes the loop (completed / escalated), resolve the
    # related open alert — a HUMAN decided it, the AI never does.
    if payload.alert_id:
        alert = await db.alerts.find_one({"alert_id": payload.alert_id})
        if alert and not alert.get("resolved"):
            resolved = payload.status in ("follow_up_completed", "escalated")
            update: dict = {"$set": {"review_status": payload.status,
                                     "acknowledged": True,
                                     "acknowledged_by": worker_id}}
            if not alert.get("acknowledged_at"):
                update["$set"]["acknowledged_at"] = now
            if resolved:
                update["$set"]["resolved"] = True
                update["$set"]["resolved_at"] = now
            await db.alerts.update_one({"alert_id": payload.alert_id}, update)
    else:
        # No explicit alert: resolve the newest open one for this user if a
        # follow-up was actually completed/escalated (human closed the loop).
        if payload.status in ("follow_up_completed", "escalated"):
            alert = await _open_alert_for_user(db, user_id)
            if alert is not None:
                await db.alerts.update_one(
                    {"alert_id": alert["alert_id"]},
                    {"$set": {"resolved": True, "resolved_at": now,
                              "review_status": payload.status}},
                )

    await security.audit(
        db, actor_user_id=(actor or {}).get("user_id"),
        actor_role=(actor or {}).get("role"),
        event="FOLLOWUP_RECORDED", target_id=display,
        note=payload.status,
    )
    return HumanWorkflowRecordResponse(
        record_id=record_id,
        action_type="follow_up",
        timestamp=now,
        status=payload.status,
    )


# ---------------------------------------------------------------------------
# Timeline — the merged AI / human / system event stream
# ---------------------------------------------------------------------------

_ACTION_LABELS = {
    "counsellor_contact": "Beneficiary contacted",
    "escalation": "Case escalated",
    "note": "Note recorded",
    "follow_up_completed": "Follow-up completed",
    "alert_reviewed": "AI-generated risk alert reviewed by caseworker",
    "alert_status_changed": "Alert status updated by caseworker",
}
_SYSTEM_LABEL = "Check-in submitted"
_AI_LABELS = {
    "risk_increase": "Risk increased",
    "rapid_deterioration": "Early-warning signal detected",
    "crisis_signal": "Early-warning signal detected",
    "persistent_elevated_risk": "Persistent elevated risk detected",
    "missed_followup": "Follow-up window missed",
}


@router.get("/cases/{case_id}/timeline")
async def case_timeline(
    case_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """One chronological event stream, each event typed ai|human|system.

    event_type is a text field on every event — the UI must never rely on
    colour alone to tell AI events from human actions from system events.
    """
    user_id, display = await resolve_case(db, case_id)
    await security.require_case_access(actor, db, user_id=user_id)
    events: list[dict] = []

    # SYSTEM — check-ins (no private free-text; only scores).
    async for c in db.checkins.find({"user_id": user_id}).sort("timestamp", 1):
        ai = c.get("ai_result", {})
        events.append({
            "event_type": "system",
            "label": _SYSTEM_LABEL,
            "timestamp": c.get("timestamp"),
            "detail": f"Distress score {ai.get('distress_score', 'n/a')}/100 "
                      f"({ai.get('risk_level', 'n/a')}) · mood {c.get('form_data', {}).get('mood', 'n/a')}/10",
        })

    # AI — risk assessments + their alerts (the system's own output).
    async for a in db.risk_assessments.find({"user_id": user_id}).sort("timestamp", 1):
        label = "Risk assessment generated"
        if a.get("crisis_flag"):
            label = "Early-warning signal detected"
        elif a.get("change") and a["change"] > 0:
            label = "Risk increased"
        detail = (
            f"Distress score {a.get('distress_score')}/100 · {a.get('risk_level')}"
            + (f" (from {a.get('previous_score')})" if a.get("previous_score") is not None else "")
        )
        events.append({
            "event_type": "ai",
            "label": label,
            "timestamp": a.get("timestamp"),
            "detail": detail,
            "assessment_id": a.get("assessment_id"),
        })

    # AI — alerts raised (attached to their assessment where possible).
    async for al in db.alerts.find({"user_id": user_id}).sort("created_at", 1):
        events.append({
            "event_type": "ai",
            "label": _AI_LABELS.get(al.get("alert_type"), "Alert raised"),
            "timestamp": al.get("created_at"),
            "detail": al.get("title", "") + (f" — {al.get('description', '')}" if al.get("description") else ""),
            "alert_id": al.get("alert_id"),
        })

    # HUMAN — caseworker actions / interventions / follow-ups.
    async for h in db.caseworker_actions.find({"user_id": user_id}).sort("timestamp", 1):
        kind = h.get("record_kind", "action")
        if kind == "follow_up":
            status = h.get("status")
            if status == "follow_up_completed":
                label = "Follow-up completed"
            elif status == "follow_up_scheduled":
                label = "Follow-up scheduled"
            else:
                label = "Follow-up recorded"
            detail = h.get("note", "")
            if h.get("follow_up_date"):
                detail += f" · due {h['follow_up_date'].date()}"
            if h.get("outcome"):
                detail += f" · outcome: {h['outcome']}"
        elif kind == "intervention":
            label = INTERVENTION_LABELS.get(h.get("action_type"), "Intervention recorded")
            detail = h.get("note", "")
        else:
            label = _ACTION_LABELS.get(h.get("action_type"), "Human action recorded")
            detail = h.get("note", "")
        events.append({
            "event_type": "human",
            "label": label,
            "timestamp": h.get("timestamp"),
            "detail": detail,
            "caseworker_id": h.get("caseworker_id"),
            "record_id": h.get("record_id"),
        })

    events.sort(key=lambda e: e.get("timestamp") or datetime.min.replace(tzinfo=timezone.utc))
    return {"case_id": display, "user_id": user_id, "events": events}
