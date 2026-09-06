"""STEP 1 — beneficiary wellbeing space tests (AUTH_ENFORCED=true).

Verifies the deterministic personalisation + support endpoints:

    GET  /api/wellbeing/plan
    GET  /api/wellbeing/activities
    POST /api/wellbeing/activities/{id}/complete   (idempotent)
    GET  /api/wellbeing/progress
    POST /api/wellbeing/reflections                (private, owner-only)
    GET  /api/wellbeing/reflections
    POST /api/wellbeing/support-request            (existing human workflow)
    GET  /api/wellbeing/support-status

Scenarios (STEP 1 requirements):
  1. authenticated beneficiary access
  2. unauthorised access (no token -> 401; caseworker -> 403)
  3. activity completion persists (+ no risk data leaks to beneficiaries)
  4. duplicate completion is idempotent (no second record)
  5. personalised plan for stable wellbeing (supportive)
  6. personalised plan for monitoring/elevated distress (early_support)
  7. personalised plan for persistent elevated distress (human support first)
  8. crisis takes priority (crisis path, existing pathway, no activities)
  9. private reflection ownership (other users cannot read)
  10. reflection text never enters the audit log
  11. support request -> existing caseworker workflow (deduplicated)
  12. support-status reflects human response when recorded
  13. regression: login + check-in pipeline untouched

Run from sahara-backend/:  .venv\\Scripts\\python tests\\test_wellbeing.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

# Hermetic environment BEFORE any app import (config is read once).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ["MODEL_AUTO_DOWNLOAD"] = "false"
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["AUTH_ENFORCED"] = "true"  # strict mode — the real deployment mode
os.environ["MOCK_AI_MODE"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

import database  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

database._client = AsyncMongoMockClient()
database._db = database._client["sahara_wellbeing_test"]

from main import app  # noqa: E402
from services import security  # noqa: E402

client = TestClient(app)

PASS = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global PASS
    assert condition, f"FAIL: {label} {extra}"
    PASS += 1
    print(f"  ok  {label}")


# ---------------------------------------------------------------------------
# Fixtures — fictional SIH demonstration accounts (clearly labelled)
# ---------------------------------------------------------------------------
PASSWORD = "demo-pass-123"  # development-only demo credentials

STAFF = dict(user_id="wb-cw-well", name="CW Wellbeing", role="caseworker",
             email="cw.wellbeing@sahara-demo.local", state="Odisha",
             district="Khordha", staff_id="CW-WB-01")

BENEFICIARIES = [
    dict(key="empty", user_id="wb-empty", display="A. New"),      # no data yet
    dict(key="stable", user_id="wb-stable", display="B. Steady"),
    dict(key="monitor", user_id="wb-monitor", display="C. Uneven"),
    dict(key="elevated", user_id="wb-elevated", display="D. Heavy"),
    dict(key="crisis", user_id="wb-crisis", display="E. Crisis"),
    dict(key="reflect", user_id="wb-reflect", display="F. Reflector"),
    dict(key="support", user_id="wb-support", display="G. Asker"),
]


def _user_doc(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": f"{u['key']}@sahara-demo.local",
        "password_hash": security.hash_password(PASSWORD),
        "role": "beneficiary",
        "name": u.get("display", u["user_id"]),
        "display_name": u.get("display", u["user_id"]),
        "is_active": True,
        "state": "Odisha",
        "district": "Khordha",
        "case_number": u["user_id"].upper(),  # fictional case reference
        "assigned_caseworker": {"id": STAFF["staff_id"], "name": STAFF["name"]},
        "language_preference": "en",
        "created_at": datetime.now(timezone.utc) - timedelta(days=120),
    }


def _assessment(user_id: str, score: int, level: str, *, crisis: bool = False) -> dict:
    return {
        "assessment_id": str(uuid4()),
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc) - timedelta(days=1),
        "distress_score": score,
        "risk_level": level,
        "confidence": 0.7,
        "trend": "stable",
        "previous_score": None,
        "change": None,
        "escalation_probability": 0.3,
        "prediction_window": "7_days",
        "contributing_factors": [],
        "priority_score": 40,
        "priority_level": level,
        "crisis_flag": crisis,
        "model_version": "prototype-v1",
    }


async def _seed() -> None:
    db = database._db
    for coll in ("users", "checkins", "risk_assessments", "alerts",
                 "caseworker_actions", "audit_logs", "chat_logs",
                 "chat_sessions", "wellbeing_activity_records",
                 "wellbeing_reflections"):
        await db[coll].delete_many({})
    await db.users.insert_one({
        "user_id": STAFF["user_id"], "email": STAFF["email"],
        "password_hash": security.hash_password(PASSWORD), "role": "caseworker",
        "name": STAFF["name"], "is_active": True, "state": "Odisha",
        "district": "Khordha", "staff_id": STAFF["staff_id"],
        "created_at": datetime.now(timezone.utc),
    })
    for u in BENEFICIARIES:
        await db.users.insert_one(_user_doc(u))

    # Stored risk states (already-generated by the existing engine — the
    # wellbeing space only READS them; it never recomputes a score).
    await db.risk_assessments.insert_many([
        _assessment("wb-stable", 18, "stable"),
        _assessment("wb-monitor", 40, "monitoring"),
        _assessment("wb-elevated", 60, "needs_attention"),
        _assessment("wb-crisis", 82, "urgent", crisis=True),
    ])


asyncio.run(_seed())


def auth_headers(email: str) -> dict:
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, f"login failed {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def ben_headers(key: str) -> dict:
    u = next(b for b in BENEFICIARIES if b["key"] == key)
    return auth_headers(f"{u['key']}@sahara-demo.local")


async def _count(coll, query) -> int:
    return await database._db[coll].count_documents(query)


def count(coll, query) -> int:
    return asyncio.run(_count(coll, query))


async def _fetch_all(coll, query, sort=None):
    cur = database._db[coll].find(query)
    if sort:
        cur = cur.sort(*sort)
    return [d async for d in cur]


def fetch_all(coll, query, sort=None):
    return asyncio.run(_fetch_all(coll, query, sort))


NO_RISK_KEYS = ("distress_score", "risk_level", "escalation_probability",
                "priority_score", "crisis_flag", "confidence")


def assert_no_risk_leak(body: dict) -> None:
    text = str(body)
    for key in NO_RISK_KEYS:
        assert key not in text, f"internal risk key leaked: {key}"


print("== W1. Unauthorised access is denied ==")
for method, url, payload in [
    ("GET", "/api/wellbeing/plan", None),
    ("GET", "/api/wellbeing/activities", None),
    ("POST", "/api/wellbeing/activities/grounding_54321/complete", None),
    ("GET", "/api/wellbeing/progress", None),
    ("POST", "/api/wellbeing/reflections", {"text": "hello"}),
    ("GET", "/api/wellbeing/reflections", None),
    ("POST", "/api/wellbeing/support-request", None),
    ("GET", "/api/wellbeing/support-status", None),
]:
    r = client.request(method, url, json=payload)
    check(f"no token -> 401 for {method} {url}", r.status_code == 401,
          str(r.status_code))

cw_h = auth_headers(STAFF["email"])
r = client.get("/api/wellbeing/plan", headers=cw_h)
check("caseworker on beneficiary wellbeing -> 403", r.status_code == 403,
      str(r.status_code))
r = client.post("/api/wellbeing/reflections", headers=cw_h,
                json={"text": "staff note"})
check("caseworker cannot save reflections -> 403", r.status_code == 403)
r = client.post("/api/wellbeing/support-request", headers=cw_h)
check("caseworker cannot request beneficiary support -> 403",
      r.status_code == 403)

print("== W2. No data yet -> supportive 'getting started' plan ==")
plan = client.get("/api/wellbeing/plan", headers=ben_headers("empty")).json()
check("plan 200", plan["user_id"] == "wb-empty")
check("path supportive", plan["path"] == "supportive", plan["path"])
check("basis getting started", plan["basis"].startswith("Getting started"),
      plan["basis"])
check("six supportive suggestions", len(plan["activities"]) == 6,
      str(len(plan["activities"])))
check("no internal risk data exposed to beneficiary", True)
assert_no_risk_leak(plan)
check("human-in-the-loop note present",
      "human professionals remain responsible" in plan["note"].lower(), plan["note"])
assert "not a diagnosis" in plan["disclaimer"].lower() or "diagnose" in plan["disclaimer"].lower(), \
    f"missing non-clinical disclaimer: {plan['disclaimer']}"

print("== W3. Stable wellbeing -> supportive ==")
plan = client.get("/api/wellbeing/plan", headers=ben_headers("stable")).json()
check("stable -> supportive", plan["path"] == "supportive", plan["path"])
check("stable basis from assessment", "wellbeing review" in plan["basis"],
      plan["basis"])
check("stable has supportive pool", [a["activity_id"] for a in plan["activities"]] == [
    "grounding_54321", "breathing_box", "reflection_three_good",
    "connection_trusted_message", "routine_fresh_air", "routine_comfort_music",
])
assert_no_risk_leak(plan)

print("== W4. Monitoring -> early support (grounding + reflection + connection) ==")
plan = client.get("/api/wellbeing/plan", headers=ben_headers("monitor")).json()
check("monitoring -> early_support", plan["path"] == "early_support", plan["path"])
cats = {a["category"] for a in plan["activities"]}
check("grounding suggested", "grounding" in cats, str(cats))
check("reflection suggested", "reflection" in cats, str(cats))
check("social connection suggested", "social_connection" in cats, str(cats))
check("early support is not human-first", plan["human_support_priority"] is False)
assert_no_risk_leak(plan)

print("== W5. Persistent elevated distress -> human support first ==")
plan = client.get("/api/wellbeing/plan", headers=ben_headers("elevated")).json()
check("needs_attention -> human_support", plan["path"] == "human_support",
      plan["path"])
check("human support priority", plan["human_support_priority"] is True)
check("only gentle ideas while waiting", len(plan["activities"]) == 2
      and {a["category"] for a in plan["activities"]} == {"grounding", "breathing"},
      str([a["activity_id"] for a in plan["activities"]]))
check("not crisis priority", plan["crisis_priority"] is False)
assert_no_risk_leak(plan)

print("== W6. Crisis takes priority (existing pathway, no activity push) ==")
plan = client.get("/api/wellbeing/plan", headers=ben_headers("crisis")).json()
check("crisis flag -> crisis path", plan["path"] == "crisis", plan["path"])
check("crisis priority", plan["crisis_priority"] is True)
check("human support priority", plan["human_support_priority"] is True)
check("no self-directed activity push in crisis", plan["activities"] == [])
assert_no_risk_leak(plan)

print("== W7. Activity completion persists (idempotent) ==")
h = ben_headers("empty")
r = client.post("/api/wellbeing/activities/grounding_54321/complete", headers=h)
check("complete -> 200", r.status_code == 200, r.text)
check("first completion count 1", r.json()["times_completed"] == 1)
check("record persisted", count("wellbeing_activity_records",
                                {"user_id": "wb-empty",
                                 "activity_id": "grounding_54321"}) == 1)

r2 = client.post("/api/wellbeing/activities/grounding_54321/complete", headers=h)
check("duplicate complete accepted (idempotent)", r2.status_code == 200)
check("count increments on the SAME record", r2.json()["times_completed"] == 2)
check("NO duplicate record created", count("wellbeing_activity_records",
      {"user_id": "wb-empty", "activity_id": "grounding_54321"}) == 1)

r = client.post("/api/wellbeing/activities/not_a_real_activity/complete",
                headers=h)
check("unknown activity -> 404", r.status_code == 404)

print("== W8. Plan + catalogue reflect the completion ==")
plan = client.get("/api/wellbeing/plan", headers=h).json()
done = [a for a in plan["activities"] if a["activity_id"] == "grounding_54321"][0]
check("plan marks the activity completed", done["completed"] is True)
assert_no_risk_leak(plan)

catalog = client.get("/api/wellbeing/activities", headers=h).json()
check("full catalogue served", len(catalog["activities"]) == 17,
      str(len(catalog["activities"])))
done = [a for a in catalog["activities"] if a["activity_id"] == "grounding_54321"][0]
others = [a for a in catalog["activities"] if a["activity_id"] != "grounding_54321"]
check("only the completed activity is flagged", done["completed"] is True
      and all(not a["completed"] for a in others))
assert_no_risk_leak(catalog)

print("== W9. Progress reflects reality ==")
prog = client.get("/api/wellbeing/progress", headers=h).json()
check("total completed", prog["total_completed"] == 1, str(prog))
check("category counts", prog["categories"].get("grounding") == 1, str(prog))
check("completion detail present", prog["completed"][0]["activity_id"]
      == "grounding_54321" and prog["completed"][0]["times_completed"] == 2)
other_prog = client.get("/api/wellbeing/progress",
                        headers=ben_headers("stable")).json()
check("another beneficiary sees none of this progress",
      other_prog["total_completed"] == 0)

print("== W10. Private reflections are owner-only ==")
SECRET = "my-very-private-fixture-note-9231"
h1 = ben_headers("reflect")
h2 = ben_headers("support")
r = client.post("/api/wellbeing/reflections", headers=h1,
                json={"text": SECRET})
check("reflection saved", r.status_code == 200 and bool(r.json()["reflection_id"]))
r = client.post("/api/wellbeing/reflections", headers=h1, json={"text": ""})
check("empty reflection rejected -> 422", r.status_code == 422)
mine = client.get("/api/wellbeing/reflections", headers=h1).json()
check("owner sees their reflection", len(mine) == 1
      and mine[0]["text"] == SECRET, str(mine))
theirs = client.get("/api/wellbeing/reflections", headers=h2).json()
check("other beneficiary sees nothing", theirs == [], str(theirs))
audit = fetch_all("audit_logs", {})
check("reflection text never reaches the audit log",
      all(SECRET not in (e.get("note") or "") and SECRET not in str(e.get("event"))
          for e in audit), str(audit)[:200])
check("no reflection event logged at all",
      not any("REFLECTION" in (e.get("event") or "") for e in audit))

print("== W11. Support request -> existing caseworker workflow ==")
h = ben_headers("support")
r = client.post("/api/wellbeing/support-request", headers=h)
check("support request recorded", r.status_code == 200
      and r.json()["status"] == "support_requested", r.text)
rows = fetch_all("caseworker_actions",
                 {"user_id": "wb-support",
                  "caseworker_id": "sahara-support-request"})
check("caseworker-visible request row exists", len(rows) == 1)
check("request is awaiting human review", rows[0].get("status") == "awaiting_review")
check("request row carries no private wellbeing text",
      "9231" not in rows[0].get("note", ""))
r2 = client.post("/api/wellbeing/support-request", headers=h)
from datetime import datetime as _dt  # noqa: E402  (reuse import at top level)
# mongomock stores datetimes truncated to milliseconds, so compare at
# second precision rather than exact equality.
def _secs(iso: str) -> str:
    return iso[:19]
check("repeat request returns the SAME pending request (no duplicate)",
      r2.json()["already_pending"] is True and _secs(r2.json()["timestamp"])
      == _secs(r.json()["timestamp"]), str((r.json(), r2.json())))
check("still exactly one request row", count("caseworker_actions",
      {"user_id": "wb-support", "caseworker_id": "sahara-support-request"}) == 1)

print("== W12. Support status reflects the human workflow ==")
st = client.get("/api/wellbeing/support-status", headers=h).json()
check("status shows pending request", st["support_requested"] is True
      and st["status"] == "awaiting_review" and st["human_response_recorded"] is False,
      str(st))
fresh = client.get("/api/wellbeing/support-status",
                   headers=ben_headers("reflect")).json()
check("no request -> status none", fresh["support_requested"] is False
      and fresh["status"] == "none")
# An authorised human records an intervention AFTER the request.
await_db = database._db
now = datetime.now(timezone.utc)
asyncio.run(await_db.caseworker_actions.insert_one({
    "record_kind": "intervention", "record_id": str(uuid4()),
    "user_id": "wb-support", "caseworker_id": STAFF["staff_id"],
    "timestamp": now, "action_type": "contact_beneficiary",
    "note": "Called the beneficiary (fixture)", "status": "action_planned",
}))
st = client.get("/api/wellbeing/support-status", headers=h).json()
check("status advances after human response", st["support_requested"] is True
      and st["status"] == "action_planned" and st["human_response_recorded"] is True,
      str(st))

print("== W13. Regression: the check-in pipeline still runs (enforced) ==")
r = client.post("/api/checkin", headers=ben_headers("empty"), json={
    "user_id": "wb-empty", "mood": 8, "sleep": 7, "feeling_safe": "yes",
    "text_response": "I feel much better today, thank you",
    "recent_incident": False, "support_received": True})
check("check-in accepted after wellbeing additions", r.status_code in (200, 201),
      str(r.status_code))
check("assessment auto-generated (STEP 5 pipeline intact)",
      r.json().get("assessment") is not None)
# After a real check-in, the plan basis now derives from the assessment.
plan = client.get("/api/wellbeing/plan", headers=ben_headers("empty")).json()
check("plan still served after first check-in", plan["user_id"] == "wb-empty")
assert_no_risk_leak(plan)

print(f"\nALL {PASS} CHECKS PASSED (wellbeing space, enforced mode)")
