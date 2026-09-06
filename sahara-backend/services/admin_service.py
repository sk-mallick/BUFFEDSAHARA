"""Administrative monitoring aggregation (national -> state -> district).

This service answers AGGREGATE questions only. It reads the same stored
data the rest of the platform writes — risk_assessments, alerts,
caseworker_actions (follow-up records), users (state/district/caseworker
metadata) — and never invents a second risk or alert engine.

Aggregation is done server-side in Python over targeted cursor scans.
That satisfies the privacy requirement (individual documents never leave
the server) and keeps the demo portable (mongomock runs the tests); at
real scale these loops would move into MongoDB aggregation pipelines with
identical shape. No beneficiary name, chat message, counselling note, or
free-text response is ever selected here.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from models.admin import (
    AlertTallies,
    CaseRefRow,
    CaseworkerRow,
    FollowUpTallies,
    RegionRow,
    RiskBandCounts,
    TrendPoint,
    TrendsResponse,
)

_BANDS = ("stable", "monitoring", "needs_attention", "urgent")


def _utc(ts) -> datetime | None:
    """Normalise a stored timestamp to aware UTC (mongomock stores naive)."""
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts.astimezone(timezone.utc)
    return None


async def _latest_assessments(db) -> dict[str, dict]:
    """Latest stored risk assessment per user (users with no assessment are not 'monitored')."""
    latest: dict[str, dict] = {}
    cursor = db.risk_assessments.find().sort("timestamp", -1)
    async for doc in cursor:
        if doc["user_id"] not in latest:
            latest[doc["user_id"]] = doc
    return latest


async def _admin_users(db) -> dict[str, dict]:
    """User docs with ONLY the fields administrative aggregation may see."""
    out: dict[str, dict] = {}
    # Inclusion-only projection (mongomock forbids mixing include/exclude).
    # display_name is deliberately NOT selected — admin aggregation never sees names.
    async for u in db.users.find(
        {},
        {"user_id": 1, "state": 1, "district": 1, "case_number": 1,
         "assigned_caseworker": 1},
    ):
        out[u["user_id"]] = u
    return out


def _counts(assessments: list[dict]) -> RiskBandCounts:
    c = RiskBandCounts()
    for a in assessments:
        level = a.get("risk_level")
        if level in _BANDS:
            setattr(c, level, getattr(c, level) + 1)
            c.total += 1
        trend = a.get("trend")
        if trend == "worsening":
            c.worsening += 1
        elif trend == "improving":
            c.improving += 1
    return c


def _region_rows(region_of: dict[str, str | None], latest: dict[str, dict]) -> list[RegionRow]:
    """Rows per region name from (user_id -> region) mapping."""
    grouped: dict[str, list[dict]] = {}
    for uid, region in region_of.items():
        if not region or uid not in latest:
            continue
        grouped.setdefault(region, []).append(latest[uid])
    rows = []
    for name, assessments in grouped.items():
        c = _counts(assessments)
        rows.append(RegionRow(name=name, **c.model_dump()))
    rows.sort(key=lambda r: r.total, reverse=True)
    return rows


async def _alert_tallies(db, user_ids: set[str]) -> AlertTallies:
    t = AlertTallies()
    async for a in db.alerts.find({"resolved": False}):
        if a.get("user_id") not in user_ids:
            continue
        t.total_open += 1
        if not a.get("acknowledged"):
            t.unreviewed += 1
        level = a.get("risk_level")
        if level == "urgent":
            t.urgent += 1
        elif level == "needs_attention":
            t.needs_attention += 1
        if a.get("severity") == "critical":
            t.crisis_signals += 1
    return t


async def _follow_up_tallies(db, user_ids: set[str]) -> FollowUpTallies:
    now = datetime.now(timezone.utc)
    f = FollowUpTallies()
    total = completed = 0
    async for rec in db.caseworker_actions.find({"record_kind": "follow_up"}):
        if rec.get("user_id") not in user_ids:
            continue
        total += 1
        status = rec.get("status")
        if status == "follow_up_completed":
            completed += 1
        elif status == "follow_up_scheduled":
            due = _utc(rec.get("follow_up_date"))
            if due is not None and due < now:
                f.overdue += 1
            else:
                f.due += 1
    f.completion_rate = round(completed / total, 2) if total else 0.0
    return f


def _scope_ids(users: dict[str, dict], state: str | None = None,
               district: str | None = None) -> set[str]:
    return {
        uid for uid, u in users.items()
        if (state is None or (u.get("state") or "").lower() == state.lower())
        and (district is None or (u.get("district") or "").lower() == district.lower())
    }


async def _national(db) -> dict:
    users = await _admin_users(db)
    latest = await _latest_assessments(db)
    user_ids = set(latest.keys())
    counts = _counts(list(latest.values()))
    states = _region_rows({uid: users.get(uid, {}).get("state") for uid in user_ids}, latest)
    alerts = await _alert_tallies(db, user_ids)
    follow_ups = await _follow_up_tallies(db, user_ids)
    return {
        "level": "national", "scope": "India",
        "counts": counts, "alerts": alerts, "follow_ups": follow_ups,
        "states": states,
        "note": "AI-assisted risk monitoring. Not a clinical diagnosis.",
        "source_note": "SIH Demonstration Data",
    }


async def _state(db, state: str) -> dict:
    users = await _admin_users(db)
    latest = await _latest_assessments(db)
    ids = _scope_ids(users, state=state)
    scoped = {uid: latest[uid] for uid in ids if uid in latest}
    counts = _counts(list(scoped.values()))
    districts = _region_rows(
        {uid: users[uid].get("district") for uid in ids if uid in users}, scoped
    )
    alerts = await _alert_tallies(db, ids)
    follow_ups = await _follow_up_tallies(db, ids)
    return {
        "level": "state", "scope": state,
        "counts": counts, "alerts": alerts, "follow_ups": follow_ups,
        "districts": districts,
        "note": "AI-assisted risk monitoring. Not a clinical diagnosis.",
        "source_note": "SIH Demonstration Data",
    }


class AmbiguousDistrict(Exception):
    """A district name exists in more than one state and no ?state= was given."""


async def _district(db, district: str, state: str | None = None) -> dict | None:
    users = await _admin_users(db)
    latest = await _latest_assessments(db)

    if state:
        # Explicit state: strict scoping — a district not in that state is "not found".
        ids = _scope_ids(users, state=state, district=district)
        if not ids:
            return None
        resolved_state = state
    else:
        ids = {uid for uid, u in users.items()
               if (u.get("district") or "").lower() == district.lower()}
        if not ids:
            return None
        states_of = {(users[uid].get("state") or "") for uid in ids if uid in users}
        if len(states_of) > 1:
            raise AmbiguousDistrict(
                f"District '{district}' exists in multiple states "
                f"({sorted(states_of)}). Pass ?state= to disambiguate."
            )
        resolved_state = next(iter(states_of)) if states_of else None

    scoped = {uid: latest[uid] for uid in ids if uid in latest}
    counts = _counts(list(scoped.values()))
    alerts = await _alert_tallies(db, ids)
    follow_ups = await _follow_up_tallies(db, ids)

    # Caseworker workload from the assignment metadata on case profiles.
    workloads: dict[str, dict] = {}
    for uid in ids:
        cw = users.get(uid, {}).get("assigned_caseworker") or {}
        if not cw.get("id"):
            continue
        row = workloads.setdefault(cw["id"], {"id": cw["id"], "name": cw.get("name", ""),
                                              "active_cases": 0, "urgent": 0, "needs_attention": 0})
        row["active_cases"] += 1
        a = scoped.get(uid)
        if a:
            level = a.get("risk_level")
            if level == "urgent":
                row["urgent"] += 1
            elif level == "needs_attention":
                row["needs_attention"] += 1

    cases = []
    for uid, a in scoped.items():
        cases.append(CaseRefRow(
            case_id=users.get(uid, {}).get("case_number") or uid,
            risk_level=a.get("risk_level", "stable"),
            distress_score=a.get("distress_score", 0),
            trend=a.get("trend", "stable"),
        ))
    cases.sort(key=lambda r: (r.risk_level != "urgent", r.risk_level != "needs_attention", -r.distress_score))

    return {
        "level": "district", "scope": district, "state": resolved_state,
        "counts": counts, "alerts": alerts, "follow_ups": follow_ups,
        "caseworkers": sorted(workloads.values(), key=lambda r: -r["active_cases"]),
        "cases": cases,
        "note": "AI-assisted risk monitoring. Not a clinical diagnosis.",
        "source_note": "SIH Demonstration Data",
    }


async def _trends(db, days: int, state: str | None = None, district: str | None = None) -> TrendsResponse:
    users = await _admin_users(db)
    latest = await _latest_assessments(db)
    # Only CASES (users with stored assessments) are monitored. A scoped
    # region with cases but no assessments contributes nothing.
    if state or district:
        ids = _scope_ids(users, state=state, district=district) & set(latest.keys())
    else:
        ids = set(latest.keys())
    if not ids:
        return TrendsResponse(days=days)

    # Per-user (timestamp, level) history, ascending, for the daily stepping.
    timeline: dict[str, list[tuple[datetime, str]]] = {uid: [] for uid in ids}
    cursor = db.risk_assessments.find({"user_id": {"$in": list(ids)}}).sort("timestamp", 1)
    async for doc in cursor:
        ts = _utc(doc.get("timestamp"))
        if ts:
            timeline.setdefault(doc["user_id"], []).append((ts, doc.get("risk_level", "stable")))

    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days - 1)).date()
    window_start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)

    # Worsening / improving: the NEWEST assessment inside the window decides
    # the counter (only evidence within the range counts, nothing more).
    worsening = improving = 0
    newest_in_window: dict[str, dict] = {}
    cursor2 = db.risk_assessments.find({"user_id": {"$in": list(ids)}}).sort("timestamp", -1)
    async for doc in cursor2:
        ts = _utc(doc.get("timestamp"))
        if ts and ts >= window_start and doc["user_id"] not in newest_in_window:
            newest_in_window[doc["user_id"]] = doc
    for a in newest_in_window.values():
        if a.get("trend") == "worsening":
            worsening += 1
        elif a.get("trend") == "improving":
            improving += 1

    # Daily stepped series: on each day a case counts at the band of its
    # newest assessment on or before that day (its risk level that day).
    series: list[TrendPoint] = []
    for offset in range(days):
        d = start_date + timedelta(days=offset)
        day_end = datetime.combine(d, time.max, tzinfo=timezone.utc)
        point = TrendPoint(date=d)
        for uid in ids:
            level = "stable"
            for ts, lvl in timeline.get(uid, []):
                if ts <= day_end:
                    level = lvl
                else:
                    break
            setattr(point, level, getattr(point, level) + 1)
        series.append(point)

    return TrendsResponse(days=days, series=series, worsening=worsening, improving=improving)


async def national_summary(db) -> dict:
    return await _national(db)


async def states(db) -> list[dict]:
    users = await _admin_users(db)
    latest = await _latest_assessments(db)
    user_ids = set(latest.keys())
    rows = _region_rows({uid: users.get(uid, {}).get("state") for uid in user_ids}, latest)
    return [r.model_dump() for r in rows]


async def state_summary(db, state: str) -> dict | None:
    users = await _admin_users(db)
    latest = await _latest_assessments(db)
    ids = _scope_ids(users, state=state)
    if not ids:
        return None
    return await _state(db, state)


async def state_districts(db, state: str) -> list[dict] | None:
    data = await state_summary(db, state)
    if data is None:
        return None
    return [d.model_dump() for d in data["districts"]]


async def district_summary(db, district: str, state: str | None = None) -> dict | None:
    return await _district(db, district, state)


async def district_caseworkers(db, district: str, state: str | None = None) -> list[dict] | None:
    data = await _district(db, district, state)
    if data is None:
        return None
    return data["caseworkers"]  # already plain dicts; router response_model validates them


async def trends(db, days: int, state: str | None = None, district: str | None = None) -> TrendsResponse:
    return await _trends(db, days, state, district)
