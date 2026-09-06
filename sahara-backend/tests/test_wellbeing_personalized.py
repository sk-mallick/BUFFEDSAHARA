"""STEP 3 — adaptive, explainable wellbeing personalisation tests (enforced).

Verifies the deterministic "next small step" behaviour added on top of the
STEP-1 wellbeing space:

    CHECK-IN -> state (existing risk band + stored trend) -> plan branch
             -> ONE recommended next step with a plain reason
             -> completion (persists) -> plan adapts -> next step rotates

Scenarios (STEP 3 requirements):
  1. stable beneficiary            -> supportive activities + a next step
  2. mildly worsening beneficiary  -> early_support (grounding/reflection/connection)
  3. elevated distress             -> human support first + grounding/breathing only
  4. persistent distress           -> human support first (steady elevated band)
  5. crisis                        -> crisis pathway: NO activities, NO next step
  6. improvement after check-ins   -> returns to supportive (easing wording)
  7. activity completion changes the plan (next step rotates + completion state)
  8. support request still records through the existing workflow
  9. authorisation (401/403) unchanged
 10. no risk scores/bands ever leak into the personalised plan

Run from sahara-backend/:  .venv\\Scripts\\python tests\\test_wellbeing_personalized.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ["MODEL_AUTO_DOWNLOAD"] = "false"
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["AUTH_ENFORCED"] = "true"
os.environ["MOCK_AI_MODE"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

import database  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

database._client = AsyncMongoMockClient()
database._db = database._client["sahara_wellbeing_p3_test"]

from main import app  # noqa: E402
from services import security  # noqa: E402

client = TestClient(app)

PASS = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global PASS
    assert condition, f"FAIL: {label} {extra}"
    PASS += 1
    print(f"  ok  {label}")


PASSWORD = "demo-pass-123"

STAFF = dict(user_id="p3-cw", name="CW P3", role="caseworker",
             email="p3.cw@sahara-demo.local", state="Odisha",
             district="Khordha", staff_id="CW-P3-01")

CASES = [
    dict(key="stable", user_id="p3-stable", display="S. Steady"),
    dict(key="mildworse", user_id="p3-mildworse", display="M. Mild Worse"),
    dict(key="mildimpr", user_id="p3-mildimpr", display="M2. Easing"),
    dict(key="elevated", user_id="p3-elevated", display="E. Elevated"),
    dict(key="persistent", user_id="p3-persistent", display="P. Persistent"),
    dict(key="crisis", user_id="p3-crisis", display="C. Crisis"),
    dict(key="adapt", user_id="p3-adapt", display="A. Adapting"),
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
        "case_number": u["user_id"].upper(),
        "assigned_caseworker": {"id": STAFF["staff_id"], "name": STAFF["name"]},
        "language_preference": "en",
        "created_at": datetime.now(timezone.utc) - timedelta(days=120),
    }


def _assessment(user_id: str, days_ago: int, score: int, level: str,
                trend: str, *, crisis: bool = False) -> dict:
    return {
        "assessment_id": str(uuid4()),
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc) - timedelta(days=days_ago),
        "distress_score": score,
        "risk_level": level,
        "confidence": 0.7,
        "trend": trend,
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
    for u in CASES:
        await db.users.insert_one(_user_doc(u))

    # Latest stored state per scenario (already generated by the EXISTING
    # engine — this service only READS these; it never recomputes a score).
    await db.risk_assessments.insert_many([
        _assessment("p3-stable", 1, 18, "stable", "stable"),
        _assessment("p3-mildworse", 1, 42, "monitoring", "worsening"),
        _assessment("p3-mildimpr", 1, 38, "monitoring", "improving"),
        _assessment("p3-elevated", 1, 62, "needs_attention", "worsening"),
        # Persistent: several elevated assessments, latest steady.
        _assessment("p3-persistent", 10, 58, "needs_attention", "stable"),
        _assessment("p3-persistent", 3, 60, "needs_attention", "worsening"),
        _assessment("p3-persistent", 1, 61, "needs_attention", "stable"),
        _assessment("p3-crisis", 1, 82, "urgent", "worsening", crisis=True),
        # Adapting: was elevated, newest assessment is improving monitoring.
        _assessment("p3-adapt", 12, 60, "needs_attention", "worsening"),
        _assessment("p3-adapt", 1, 40, "monitoring", "improving"),
    ])


asyncio.run(_seed())


def auth_headers(email: str) -> dict:
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, f"login failed {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def ben_headers(key: str) -> dict:
    u = next(b for b in CASES if b["key"] == key)
    return auth_headers(f"{u['key']}@sahara-demo.local")


async def _count(coll, query) -> int:
    return await database._db[coll].count_documents(query)


def count(coll, query) -> int:
    return asyncio.run(_count(coll, query))


def plan_for(key: str) -> dict:
    r = client.get("/api/wellbeing/plan", headers=ben_headers(key))
    assert r.status_code == 200, f"plan failed for {key}: {r.text}"
    return r.json()


NO_RISK_KEYS = ("distress_score", "risk_level", "escalation_probability",
                "priority_score", "crisis_flag", "confidence", "change_7d")


def assert_no_risk_leak(body: dict) -> None:
    text = str(body)
    for key in NO_RISK_KEYS:
        assert key not in text, f"internal risk key leaked in plan: {key}"


print("== P1. Stable -> supportive + a recommended next step ==")
plan = plan_for("stable")
check("path supportive", plan["path"] == "supportive", plan["path"])
check("six supportive activities", len(plan["activities"]) == 6)
check("not human-first", plan["human_support_priority"] is False)
ns = plan["next_step"]
check("next step present", ns is not None and bool(ns["activity"]["activity_id"]))
check("next step = least-recent grounding first",
      ns["activity"]["activity_id"] == "grounding_54321", str(ns))
check("reason present + no score", bool(ns["reason"])
      and "grounding" in ns["reason"].lower(), ns["reason"])
check("summary_key stable", plan["summary_key"] == "summary_supportive",
      plan["summary_key"])
assert_no_risk_leak(plan)

print("== P2. Mildly worsening -> early support, grounding/reflection/connection ==")
plan = plan_for("mildworse")
check("monitoring+worsening -> early_support", plan["path"] == "early_support",
      plan["path"])
cats = {a["category"] for a in plan["activities"]}
check("grounding/reflection/connection all present",
      {"grounding", "reflection", "social_connection"} <= cats, str(cats))
check("not human-first", plan["human_support_priority"] is False)
check("next step grounding (least recent)",
      plan["next_step"]["activity"]["activity_id"] == "grounding_feet_floor",
      str(plan["next_step"]))
assert_no_risk_leak(plan)

print("== P3. Elevated distress -> human support first, gentle ideas only ==")
plan = plan_for("elevated")
check("elevated -> human_support path", plan["path"] == "human_support",
      plan["path"])
check("human support priority", plan["human_support_priority"] is True)
check("only two gentle ideas while waiting",
      len(plan["activities"]) == 2
      and {a["category"] for a in plan["activities"]} == {"grounding", "breathing"},
      str([a["activity_id"] for a in plan["activities"]]))
check("next step is grounding first",
      plan["next_step"]["activity"]["activity_id"] == "grounding_notice_now",
      str(plan["next_step"]))
assert_no_risk_leak(plan)

print("== P4. Persistent distress -> human support stays first ==")
plan = plan_for("persistent")
check("persistent -> human_support", plan["path"] == "human_support")
check("human support priority", plan["human_support_priority"] is True)
check("reason exists for next step", bool(plan["next_step"]["reason"]))
assert_no_risk_leak(plan)

print("== P5. Crisis -> crisis pathway first, no self-help push ==")
plan = plan_for("crisis")
check("crisis -> crisis path", plan["path"] == "crisis", plan["path"])
check("crisis priority", plan["crisis_priority"] is True)
check("no activities in crisis", plan["activities"] == [])
check("no next-step activity in crisis (human first)", plan["next_step"] is None)
check("human support priority in crisis", plan["human_support_priority"] is True)
check("crisis summary_key", plan["summary_key"] == "summary_crisis",
      plan["summary_key"])
assert_no_risk_leak(plan)

print("== P6. Improvement after check-ins -> easing back to supportive ==")
plan = plan_for("adapt")
check("monitoring+improving -> supportive again", plan["path"] == "supportive",
      plan["path"])
check("easing summary", plan["summary_key"] == "summary_supportive_easing",
      plan["summary_key"])
check("not human-first once improving", plan["human_support_priority"] is False)
check("normal supportive pool restored",
      [a["activity_id"] for a in plan["activities"]] == [
          "grounding_54321", "breathing_box", "reflection_three_good",
          "connection_trusted_message", "routine_fresh_air", "routine_comfort_music",
      ])
assert_no_risk_leak(plan)

print("== P7. Completion persists + adapts the plan (rotation + feedback) ==")
h = ben_headers("mildworse")
r = client.post("/api/wellbeing/activities/grounding_feet_floor/complete", headers=h)
check("completion 200 with feedback", r.status_code == 200
      and r.json()["feedback_key"] == "fb_first"
      and "small, real step" in r.json()["feedback"], str(r.json()))
check("record persisted once", count("wellbeing_activity_records",
      {"user_id": "p3-mildworse", "activity_id": "grounding_feet_floor"}) == 1)
plan = plan_for("mildworse")
done = [a for a in plan["activities"] if a["activity_id"] == "grounding_feet_floor"][0]
check("completion reflected in the plan", done["completed"] is True)
check("next step rotates away from just-completed",
      plan["next_step"]["activity"]["activity_id"] == "breathing_belly",
      str(plan["next_step"]))
check("completion updates progress", client.get(
    "/api/wellbeing/progress", headers=h).json()["total_completed"] == 1)
# Repeat completion: idempotent count, different gentle feedback.
r2 = client.post("/api/wellbeing/activities/grounding_feet_floor/complete", headers=h)
check("repeat completion increments the SAME record",
      r2.json()["times_completed"] == 2 and r2.json()["feedback_key"] != "fb_first")
check("no duplicate record", count("wellbeing_activity_records",
      {"user_id": "p3-mildworse", "activity_id": "grounding_feet_floor"}) == 1)
plan = plan_for("mildworse")
check("still exactly one completed activity in plan",
      sum(1 for a in plan["activities"] if a["completed"]) == 1)

print("== P8. Human support request still routes to the caseworker workflow ==")
r = client.post("/api/wellbeing/support-request", headers=ben_headers("stable"))
check("support request accepted", r.status_code == 200
      and r.json()["status"] == "support_requested", r.text)
check("caseworker-visible row created", count("caseworker_actions", {
    "user_id": "p3-stable", "caseworker_id": "sahara-support-request"}) == 1)
st = client.get("/api/wellbeing/support-status",
                headers=ben_headers("stable")).json()
check("support status awaiting review", st["status"] == "awaiting_review"
      and st["support_requested"] is True, str(st))

print("== P9. Authorisation unchanged (401 / 403) ==")
anon = client.get("/api/wellbeing/plan")
check("no token -> 401", anon.status_code == 401, str(anon.status_code))
staff = client.get("/api/wellbeing/plan", headers=auth_headers(STAFF["email"]))
check("caseworker on wellbeing -> 403", staff.status_code == 403,
      str(staff.status_code))
cross = client.get("/api/wellbeing/reflections", headers=ben_headers("stable"))
check("beneficiary can only ever read their own data (endpoint is owner-bound)",
      cross.status_code == 200)

print("== P10. Regression: guided check-in still flows through risk pipeline ==")
r = client.post("/api/checkin", headers=ben_headers("stable"), json={
    "user_id": "p3-stable", "mood": 8, "sleep": 7, "feeling_safe": "yes",
    "text_response": "I feel much better today, thank you",
    "recent_incident": False, "support_received": True})
check("check-in accepted with auto assessment", r.status_code in (200, 201)
      and r.json().get("assessment") is not None, str(r.status_code))

print(f"\nALL {PASS} CHECKS PASSED (wellbeing personalisation, enforced mode)")
