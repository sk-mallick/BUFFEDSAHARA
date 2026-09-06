"""Administrative monitoring hierarchy endpoints (national/state/district).

GET /api/admin/national/summary
GET /api/admin/states
GET /api/admin/states/{state}/summary
GET /api/admin/states/{state}/districts
GET /api/admin/districts/{district}/summary?state=
GET /api/admin/districts/{district}/caseworkers?state=
GET /api/admin/trends?days=7|30|90&state=&district=

Every response is an AGGREGATE. No beneficiary name, chat message,
counselling note, or free-text response is ever returned by these
endpoints — higher administrative levels see programme numbers only.
The aggregation itself reuses stored risk assessments, the alerts
collection, and human follow-up records; nothing here re-implements the
risk or alert engines.

SECURITY: these endpoints sit behind the auth layer (services/security.py).
The server derives the caller's role + state/district scope from the
authenticated account — never from query parameters such as ?role= or
?state=. Scope rules: national_admin sees all; state_admin only their
assigned state; district_officer only their assigned district; a
caseworker or beneficiary is not allowed into the administrative view.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.admin import (
    CaseworkerRow,
    DistrictSummary,
    NationalSummary,
    RegionRow,
    StateSummary,
    TrendsResponse,
)
from services import admin_service, security

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Reusable scope disclaimer — every admin view carries this note.
_PRIVACY_NOTE = (
    "Administrative views display aggregated programme information. "
    "Individual case information is restricted to authorised personnel."
)


def _attach_privacy(data: dict) -> dict:
    data["privacy_note"] = _PRIVACY_NOTE
    return data


def _not_found(kind: str, name: str):
    raise HTTPException(status_code=404, detail=f"{kind} '{name}' not found in the demonstration dataset.")


@router.get("/national/summary", response_model=NationalSummary)
async def national_summary(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    await security.require_admin_scope(actor, db)  # national_admin only
    data = await admin_service.national_summary(db)
    await security.audit(
        db, actor_user_id=(actor or {}).get("user_id"), actor_role=(actor or {}).get("role"),
        event="ADMIN_REPORT_VIEWED", note="national summary",
    )
    return _attach_privacy(data)


@router.get("/states", response_model=list[RegionRow])
async def list_states(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> list[dict]:
    await security.require_admin_scope(actor, db)  # national view only
    return await admin_service.states(db)


@router.get("/states/{state}/summary", response_model=StateSummary)
async def state_summary(
    state: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    await security.require_admin_scope(actor, db, state=state)
    data = await admin_service.state_summary(db, state)
    if data is None:
        _not_found("State", state)
    return _attach_privacy(data)


@router.get("/states/{state}/districts", response_model=list[RegionRow])
async def state_districts(
    state: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> list[dict]:
    await security.require_admin_scope(actor, db, state=state)
    rows = await admin_service.state_districts(db, state)
    if rows is None:
        _not_found("State", state)
    return rows


@router.get("/districts/{district}/summary", response_model=DistrictSummary)
async def district_summary(
    district: str,
    state: str | None = Query(default=None, description="State to disambiguate same-named districts"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> dict:
    await security.require_admin_scope(actor, db, state=state, district=district)
    try:
        data = await admin_service.district_summary(db, district, state)
    except admin_service.AmbiguousDistrict as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if data is None:
        _not_found("District", district)
    return _attach_privacy(data)


@router.get("/districts/{district}/caseworkers", response_model=list[CaseworkerRow])
async def district_caseworkers(
    district: str,
    state: str | None = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> list[dict]:
    await security.require_admin_scope(actor, db, state=state, district=district)
    try:
        rows = await admin_service.district_caseworkers(db, district, state)
    except admin_service.AmbiguousDistrict as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if rows is None:
        _not_found("District", district)
    return rows


@router.get("/trends", response_model=TrendsResponse)
async def trends(
    days: int = Query(default=30, ge=1, le=90),
    state: str | None = Query(default=None),
    district: str | None = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> TrendsResponse:
    # National trends need no scope; state/district trends are scoped by
    # role via the same administrative hierarchy rules.
    if state is not None or district is not None:
        await security.require_admin_scope(actor, db, state=state, district=district)
    else:
        await security.require_admin_scope(actor, db)  # national only
    return await admin_service.trends(db, days, state, district)
