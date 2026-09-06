"""Caseworker alert center endpoints.

GET    /api/alerts                          — alerts with filters + sorting
GET    /api/alerts/unread                   — open, unacknowledged alerts
POST   /api/alerts/{alert_id}/acknowledge   — human marks the alert as reviewed
POST   /api/alerts/{alert_id}/status        — human advances the review status
GET    /api/dashboard/alerts-summary        — counters for the dashboard header

SECURITY NOTE: this demo has no authentication layer yet (stub users).
Anyone who can reach the API can read/acknowledge alerts — in a real
deployment every one of these endpoints must sit behind caseworker
authorisation. `caseworker_id` is a client-supplied label, not proof
of identity. This limitation is deliberate and documented, not hidden.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.alert import (
    AlertAckRequest,
    AlertDocument,
    AlertResponse,
    AlertUpdateStatusRequest,
    AlertsSummary,
)
from models.caseworker import HumanWorkflowDocument
from services import alert_service, security

router = APIRouter(prefix="/api", tags=["alerts"])

_SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}

# filter= values accepted by GET /api/alerts.
FILTERS = {
    "all", "unread", "urgent", "needs_attention", "monitoring",
    "acknowledged", "awaiting_followup",
}
SORTS = {"urgency", "newest", "highest_risk", "longest_awaiting"}


def _to_response(doc: dict) -> dict:
    doc.setdefault("review_status", "awaiting_review")
    doc.setdefault("requires_human_review", True)
    doc.setdefault("resolved", False)
    doc.setdefault("acknowledged", False)
    return AlertResponse.model_validate(doc).model_dump(mode="json")


@router.get("/alerts", response_model=list[AlertResponse])
async def list_alerts(
    filter: str = Query(default="all", alias="filter"),
    sort: str = Query(default="urgency"),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> list[dict]:
    """Alerts for the caseworker alert center, filtered + sorted.

    Staff accounts only, scoped to the cases they may see. Refreshes
    missed-follow-up state lazily so the SLA rules are always current.
    """
    if filter not in FILTERS:
        raise HTTPException(400, f"Unknown filter '{filter}'. Use one of: {sorted(FILTERS)}")
    if sort not in SORTS:
        raise HTTPException(400, f"Unknown sort '{sort}'. Use one of: {sorted(SORTS)}")

    await security.require_staff_role(actor, db)
    allowed = await security.allowed_user_ids(db, actor)
    await alert_service.check_missed_followups(db)

    query: dict = {}
    if filter == "unread":
        query = {"acknowledged": False, "resolved": False}
    elif filter == "awaiting_followup":
        query = {"resolved": False}
    elif filter == "acknowledged":
        query = {"acknowledged": True}
    elif filter in ("urgent", "needs_attention", "monitoring"):
        query = {"risk_level": filter}
    # "all" -> no status restriction

    if allowed is not None and not allowed:
        return []
    cursor = db.alerts.find(query)
    cap = 5000 if allowed is not None else limit * 4
    alerts = await cursor.to_list(length=cap)
    if allowed is not None:
        alerts = [a for a in alerts if a.get("user_id") in allowed]
    if len(alerts) > limit:
        alerts = alerts[:limit]

    def key(a: dict):
        if sort == "newest":
            return (a.get("created_at") or datetime.min.replace(tzinfo=timezone.utc),)
        if sort == "highest_risk":
            return (a.get("risk_score", 0),)
        if sort == "longest_awaiting":
            # Oldest unresolved first; resolved ones sort to the end.
            return (1 if a.get("resolved") else 0, -(a.get("created_at") or datetime.min.replace(tzinfo=timezone.utc)).timestamp())
        # urgency (default): critical first, then newest within a tier.
        return (_SEVERITY_RANK.get(a.get("severity", "low"), 0), a.get("created_at") or datetime.min.replace(tzinfo=timezone.utc))

    alerts.sort(key=key, reverse=True)
    return [_to_response(a) for a in alerts[:limit]]


@router.get("/alerts/unread", response_model=list[AlertResponse])
async def unread_alerts(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> list[dict]:
    """Open, unacknowledged alerts — the caseworker's 'inbox' (scoped)."""
    await security.require_staff_role(actor, db)
    allowed = await security.allowed_user_ids(db, actor)
    await alert_service.check_missed_followups(db)
    if allowed is not None and not allowed:
        return []
    cursor = db.alerts.find({"acknowledged": False, "resolved": False}).sort("created_at", -1)
    alerts = await cursor.to_list(length=5000)
    if allowed is not None:
        alerts = [a for a in alerts if a.get("user_id") in allowed]
    return [_to_response(a) for a in alerts[:200]]


async def _scoped_alert_doc(db, alert_id: str, actor: dict | None) -> dict:
    """Fetch an alert and verify the actor may see/act on its case."""
    await security.require_staff_role(actor, db)
    doc = await db.alerts.find_one({"alert_id": alert_id})
    if doc is None:
        raise HTTPException(404, "Alert not found.")
    await security.require_case_access(actor, db, user_id=doc["user_id"])
    return doc


def _worker_label(actor: dict | None, fallback: str) -> tuple[str, dict]:
    if actor is None:
        return fallback, {}
    return (actor.get("staff_id") or actor["user_id"]), {
        "actor_user_id": actor["user_id"], "actor_role": actor.get("role"),
    }


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    doc = await _scoped_alert_doc(db, alert_id, actor)
    await security.audit(
        db, actor_user_id=(actor or {}).get("user_id"),
        actor_role=(actor or {}).get("role"),
        event="ALERT_VIEWED", target_id=doc.get("alert_id"),
    )
    return _to_response(doc)


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    payload: AlertAckRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """A caseworker marks the alert as reviewed (a HUMAN event).

    Acknowledging records the human review; it does NOT lower the risk
    score and does NOT declare the beneficiary safe — the alert stays
    open (resolved=False) until a follow-up is logged.
    """
    doc = await _scoped_alert_doc(db, alert_id, actor)
    worker_id, audit_fields = _worker_label(actor, payload.caseworker_id)
    now = datetime.now(timezone.utc)
    if doc.get("acknowledged"):
        return _to_response(doc)  # idempotent — a second review is a no-op

    await db.alerts.update_one(
        {"alert_id": alert_id},
        {
            "$set": {
                "acknowledged": True,
                "acknowledged_by": worker_id,
                "acknowledged_at": now,
                "review_status": "reviewed",
            }
        },
    )
    # Timeline: the review is a human action and is logged as one.
    doc_h = HumanWorkflowDocument(
        record_kind="action",
        record_id=str(uuid4()),
        user_id=doc["user_id"],
        caseworker_id=worker_id,
        timestamp=now,
        action_type="alert_reviewed",
        note=payload.note or f"Acknowledged alert '{doc.get('title', '')}'.",
        alert_id=alert_id,
        status="reviewed",
    ).model_dump()  # native datetimes — mode="json" would store ISO strings
    doc_h.update(audit_fields)
    await db.caseworker_actions.insert_one(doc_h)

    await security.audit(
        db, actor_user_id=(actor or {}).get("user_id"),
        actor_role=(actor or {}).get("role"),
        event="ALERT_ACKNOWLEDGED", target_id=alert_id,
    )
    updated = await db.alerts.find_one({"alert_id": alert_id})
    return _to_response(updated)


@router.post("/alerts/{alert_id}/status", response_model=AlertResponse)
async def update_alert_status(
    alert_id: str,
    payload: AlertUpdateStatusRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """A caseworker advances the alert's review status (human-only)."""
    doc = await _scoped_alert_doc(db, alert_id, actor)
    worker_id, audit_fields = _worker_label(actor, payload.caseworker_id)

    resolved = payload.status in ("follow_up_completed", "escalated")
    now = datetime.now(timezone.utc)
    update = {"$set": {"review_status": payload.status, "acknowledged": True,
                       "acknowledged_by": worker_id}}
    if not doc.get("acknowledged_at"):
        update["$set"]["acknowledged_at"] = now
    if resolved and not doc.get("resolved"):
        update["$set"]["resolved"] = True
        update["$set"]["resolved_at"] = now
    await db.alerts.update_one({"alert_id": alert_id}, update)

    doc_h = HumanWorkflowDocument(
        record_kind="action",
        record_id=str(uuid4()),
        user_id=doc["user_id"],
        caseworker_id=worker_id,
        timestamp=now,
        action_type="alert_status_changed",
        note=payload.note or f"Review status set to {payload.status}.",
        alert_id=alert_id,
        status=payload.status,
    ).model_dump()  # native datetimes
    doc_h.update(audit_fields)
    await db.caseworker_actions.insert_one(doc_h)

    updated = await db.alerts.find_one({"alert_id": alert_id})
    return _to_response(updated)


@router.get("/dashboard/alerts-summary", response_model=AlertsSummary)
async def alerts_summary(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    """Aggregate counters for the dashboard header (no PII).

    All counts come from the database — nothing is hard-coded. Staff-only
    and scoped to the cases the authenticated role may see.
    """
    await security.require_staff_role(actor, db)
    allowed = await security.allowed_user_ids(db, actor)
    await alert_service.check_missed_followups(db)
    now = datetime.now(timezone.utc)

    def _in_scope(uid: str) -> bool:
        return allowed is None or uid in allowed

    # Total monitored: users with at least one stored risk assessment.
    monitored_ids: set[str] = set()
    # Latest assessment per user (demo volumes are small).
    latest: dict[str, dict] = {}
    cursor = db.risk_assessments.find().sort("timestamp", -1)
    async for doc in cursor:
        if not _in_scope(doc["user_id"]):
            continue
        monitored_ids.add(doc["user_id"])
        if doc["user_id"] not in latest:
            latest[doc["user_id"]] = doc

    needs_attention = urgent = 0
    for a in latest.values():
        if a.get("risk_level") == "needs_attention":
            needs_attention += 1
        elif a.get("risk_level") == "urgent":
            urgent += 1

    awaiting_review = 0
    follow_ups_due = follow_ups_overdue = 0
    async for a in db.alerts.find({"resolved": False}):
        if not _in_scope(a.get("user_id", "")):
            continue
        if not a.get("acknowledged"):
            awaiting_review += 1

    # Follow-up records the human promised (status follow_up_scheduled):
    # due when the date is today/absent, overdue when it has passed.
    async for f in db.caseworker_actions.find(
        {"record_kind": "follow_up", "status": "follow_up_scheduled"}
    ):
        if not _in_scope(f.get("user_id", "")):
            continue
        due = alert_service._utc(f.get("follow_up_date"))
        if due is None or due >= now:
            follow_ups_due += 1
        else:
            follow_ups_overdue += 1

    open_alerts = [
        a for a in await db.alerts.find({"resolved": False}).to_list(length=5000)
        if _in_scope(a.get("user_id", ""))
    ]
    return AlertsSummary(
        total_monitored=len(monitored_ids),
        awaiting_review=awaiting_review,
        needs_attention=needs_attention,
        urgent=urgent,
        follow_ups_due=follow_ups_due,
        follow_ups_overdue=follow_ups_overdue,
        total_open=len(open_alerts),
    ).model_dump()
