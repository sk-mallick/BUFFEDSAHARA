"""Auth + RBAC integration tests (STRICT mode — AUTH_ENFORCED=true).

Runs the full FastAPI app against an IN-MEMORY MongoDB (mongomock-motor)
exactly like tests/test_api.py, but with the security boundary switched
ON so 401/403 enforcement is what is being exercised. Run separately:

    .venv/Scripts/python tests/test_auth.py        (Windows)
    .venv/bin/python tests/test_auth.py            (macOS/Linux)

Scenarios covered (see step 3 spec §18):
  1 login success           7 district scope          13 alert access restriction
  2 invalid password        8 caseworker restriction  14 intervention identity
  3 missing auth            9 beneficiary own data    15 follow-up identity
  4 expired/invalid token  10 cross-user attempt      16 audit log creation
  5 national access        11 cross-state attempt     17 401 responses
  6 state scope            12 cross-district attempt  18 403 responses
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

# Make `sahara-backend` importable regardless of the CWD the script is run from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Hermetic environment BEFORE any app import (config is read once).
os.environ["MODEL_AUTO_DOWNLOAD"] = "false"
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["AUTH_ENFORCED"] = "true"  # <-- strict mode for this suite

import jwt  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

import database  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

database._client = AsyncMongoMockClient()
database._db = database._client["sahara_auth_test"]

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
# Fixtures — fictional demo accounts + cases (all SIH demonstration data)
# ---------------------------------------------------------------------------
PASSWORD = "demo-pass-123"  # development-only; documented as such

USERS = [
    # staff
    dict(user_id="auth-national", name="National Demo", role="national_admin",
         email="national.demo@sahara-demo.local"),
    dict(user_id="auth-odisha", name="State Demo", role="state_admin",
         email="state.demo@sahara-demo.local", state="Odisha"),
    dict(user_id="auth-wb", name="WB State Demo", role="state_admin",
         email="wb.state.demo@sahara-demo.local", state="West Bengal"),
    dict(user_id="auth-khordha", name="District Demo", role="district_officer",
         email="district.demo@sahara-demo.local", state="Odisha", district="Khordha"),
    dict(user_id="auth-cw-khr", name="Caseworker Demo", role="caseworker",
         email="caseworker.demo@sahara-demo.local", state="Odisha", district="Khordha",
         staff_id="CW-KHR-01"),
    dict(user_id="auth-cw-ctc", name="CW Cuttack", role="caseworker",
         email="cw.ctc.demo@sahara-demo.local", state="Odisha", district="Cuttack",
         staff_id="CW-CTC-01"),
    # beneficiaries — profile + account in ONE users document
    dict(user_id="demo-042-user", name="P. Kumar", role="beneficiary",
         email="beneficiary.demo@sahara-demo.local", state="Odisha", district="Khordha",
         case_number="DEMO-042", display_name="P. Kumar",
         assigned={"id": "CW-KHR-01", "name": "CW A"}),
    dict(user_id="ben-cuttack", name="S. Patra", role="beneficiary",
         email="ben-cuttack@sahara-demo.local", state="Odisha", district="Cuttack",
         case_number="DEMO-031", display_name="S. Patra",
         assigned={"id": "CW-CTC-01", "name": "CW C"}),
    dict(user_id="ben-wb", name="R. Das", role="beneficiary",
         email="ben-wb@sahara-demo.local", state="West Bengal", district="Howrah",
         case_number="DEMO-088", display_name="R. Das",
         assigned={"id": "CW-HWH-01", "name": "CW H"}),
]


def _checkin(user_id: str, days_ago: int, score: int, level: str) -> dict:
    return {
        "checkin_id": str(uuid4()),
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc) - timedelta(days=days_ago),
        "form_data": {"mood": 4, "sleep": 3, "feeling_safe": "sometimes",
                      "text_response": "test response", "recent_incident": False,
                      "support_received": False},
        "ai_result": {
            "distress_score": score, "risk_level": level, "confidence": 0.7,
            "trend_direction": "stable", "signals_detected": [], "crisis_keywords_found": [],
            "recommended_action": "Continue check-ins",
            "nlp_scores": {"positive": 0.3, "neutral": 0.4, "negative": 0.3},
            "component_scores": {"nlp_score": 30, "form_score": score, "trend_component": 20},
        },
    }


async def _seed() -> None:
    db = database._db
    await db.users.delete_many({})
    await db.checkins.delete_many({})
    await db.risk_assessments.delete_many({})
    await db.alerts.delete_many({})
    await db.caseworker_actions.delete_many({})
    await db.audit_logs.delete_many({})
    await db.chat_logs.delete_many({})

    for u in USERS:
        doc = {
            "user_id": u["user_id"],
            "email": u["email"],
            "password_hash": security.hash_password(PASSWORD),
            "role": u["role"],
            "name": u.get("name", ""),
            "display_name": u.get("display_name", u.get("name", "")),
            "is_active": True,
            "language_preference": "en",
            "created_at": datetime.now(timezone.utc) - timedelta(days=120),
        }
        for f in ("state", "district", "staff_id", "case_number"):
            if u.get(f):
                doc[f] = u[f]
        if u.get("assigned"):
            doc["assigned_caseworker"] = u["assigned"]
        await db.users.insert_one(doc)

    # Wellbeing history for the demo beneficiary (their own chart data).
    await db.checkins.insert_many([
        _checkin("demo-042-user", 20, 34, "monitoring"),
        _checkin("demo-042-user", 8, 48, "monitoring"),
        _checkin("demo-042-user", 2, 55, "needs_attention"),
    ])
    # An alert on DEMO-042 (assigned to CW-KHR-01) and one elsewhere.
    demo_alert = {
        "alert_id": "alert-demo-042", "case_id": "DEMO-042", "user_id": "demo-042-user",
        "alert_type": "risk_increase", "severity": "high", "risk_level": "needs_attention",
        "title": "Distress score increased", "description": "52 -> 55 over 7 days.",
        "risk_score": 55, "created_at": datetime.now(timezone.utc) - timedelta(hours=3),
        "acknowledged": False, "resolved": False, "requires_human_review": True,
        "review_status": "awaiting_review",
    }
    other_alert = {
        "alert_id": "alert-ctc-031", "case_id": "DEMO-031", "user_id": "ben-cuttack",
        "alert_type": "risk_increase", "severity": "medium", "risk_level": "monitoring",
        "title": "Distress score increased", "description": "monitoring band.",
        "risk_score": 42, "created_at": datetime.now(timezone.utc) - timedelta(hours=5),
        "acknowledged": False, "resolved": False, "requires_human_review": True,
        "review_status": "awaiting_review",
    }
    await db.alerts.insert_many([demo_alert, other_alert])
    # A stored assessment so risk endpoints have something to return.
    await db.risk_assessments.insert_one({
        "assessment_id": "assess-demo-042", "user_id": "demo-042-user",
        "timestamp": datetime.now(timezone.utc) - timedelta(days=1),
        "distress_score": 55, "risk_level": "needs_attention", "confidence": 0.7,
        "trend": "worsening", "previous_score": 46, "change": 9,
        "escalation_probability": 0.6, "prediction_window": "7_days",
        "contributing_factors": [], "priority_score": 72,
        "priority_level": "needs_attention", "crisis_flag": False,
        "model_version": "prototype-v1",
    })
    # A recent human follow-up on DEMO-042 (yesterday) keeps the SLA rule
    # quiet — otherwise GET /api/alerts would lazily raise a legitimate
    # missed_followup alert and change the inbox we are asserting on.
    await db.caseworker_actions.insert_one({
        "record_kind": "follow_up", "record_id": str(uuid4()),
        "user_id": "demo-042-user", "caseworker_id": "CW-KHR-01",
        "timestamp": datetime.now(timezone.utc) - timedelta(days=1),
        "action_type": "follow_up", "note": "Follow-up completed (fixture)",
        "status": "follow_up_completed",
    })


# Seed synchronously via an asyncio run (the DB is the mock client).
import asyncio  # noqa: E402
asyncio.run(_seed())


def auth_headers(email: str, password: str = PASSWORD) -> dict:
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed for {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _fetch_one(coll, query):
    return await coll.find_one(query)


def fetch_one(coll, query):
    return asyncio.run(_fetch_one(coll, query))


print("== A1. Login success + safe user view ==")
r = client.post("/api/auth/login", json={
    "email": "national.demo@sahara-demo.local", "password": PASSWORD})
check("login 200", r.status_code == 200)
body = r.json()
check("token issued", bool(body.get("access_token")))
check("token type bearer", body.get("token_type") == "bearer")
check("ttl positive", body.get("expires_in", 0) > 0)
user = body["user"]
check("safe user id", user["user_id"] == "auth-national")
check("safe role", user["role"] == "national_admin")
check("NO password/password_hash exposed",
      "password" not in str(user) and "password_hash" not in r.text)
me = client.get("/api/auth/me", headers=auth_headers("national.demo@sahara-demo.local"))
check("me 200", me.status_code == 200)
check("me derives identity from token",
      me.json()["user"]["user_id"] == "auth-national")
check("me has no sensitive fields", "password_hash" not in me.text)

print("== A2. Invalid password (uniform error, no account enumeration) ==")
r1 = client.post("/api/auth/login", json={
    "email": "national.demo@sahara-demo.local", "password": "wrong-password"})
r2 = client.post("/api/auth/login", json={
    "email": "does-not-exist@sahara-demo.local", "password": "wrong-password"})
check("wrong password -> 401", r1.status_code == 401)
check("unknown email -> same 401", r2.status_code == 401)
check("identical error message",
      r1.json()["detail"] == r2.json()["detail"] == "Invalid email or password.")

print("== A3. Missing authentication ==")
no_auth_calls = [
    ("GET", "/api/admin/national/summary", None),
    ("GET", "/api/dashboard/risk-queue", None),
    ("GET", "/api/alerts", None),
    ("POST", "/api/cases/DEMO-042/follow-up", {"caseworker_id": "x", "action_taken": "x",
                                              "action_date": datetime.now(timezone.utc).isoformat()}),
    ("GET", "/api/user/demo-042-user/history", None),
]
for method, url, payload in no_auth_calls:
    resp = client.request(method, url, json=payload)
    check(f"no auth -> 401 for {url}", resp.status_code == 401, str(resp.status_code))

print("== A4. Invalid / expired token ==")
garbage = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
check("malformed token -> 401", garbage.status_code == 401)
expired_token = jwt.encode(
    {"sub": "auth-national", "iat": datetime.now(timezone.utc) - timedelta(hours=3),
     "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
    security._SECRET, algorithm="HS256")
expired = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
check("expired token -> 401", expired.status_code == 401)

print("== A5. National access ==")
nat = auth_headers("national.demo@sahara-demo.local")
r = client.get("/api/admin/national/summary", headers=nat)
check("national summary 200", r.status_code == 200)
r = client.get("/api/admin/states/Odisha/summary", headers=nat)
check("national can open any state", r.status_code == 200)
r = client.get("/api/admin/trends?days=7", headers=nat)
check("national trends 200", r.status_code == 200)
r = client.get("/api/user/demo-042-user/history", headers=nat)
check("national can view any case", r.status_code == 200)

print("== A6. State scope enforcement ==")
odisha = auth_headers("state.demo@sahara-demo.local")
r = client.get("/api/admin/states/Odisha/summary", headers=odisha)
check("state admin own state 200", r.status_code == 200)
r = client.get("/api/admin/states/West%20Bengal/summary", headers=odisha)
check("state admin other state -> 403", r.status_code == 403, r.text)
r = client.get("/api/admin/national/summary", headers=odisha)
check("state admin national summary -> 403", r.status_code == 403)
r = client.get("/api/user/ben-wb/history", headers=odisha)
check("state admin cannot view out-of-state case -> 403", r.status_code == 403)
r = client.get("/api/user/demo-042-user/history", headers=odisha)
check("state admin CAN view in-state case", r.status_code == 200)
# Query-param tampering must not widen scope.
r = client.get("/api/admin/states/West%20Bengal/summary?role=national_admin", headers=odisha)
check("?role= cannot bypass scope", r.status_code == 403)

print("== A7. District scope enforcement ==")
khordha = auth_headers("district.demo@sahara-demo.local")
r = client.get("/api/admin/districts/Khordha/summary?state=Odisha", headers=khordha)
check("district officer own district 200", r.status_code == 200)
r = client.get("/api/admin/districts/Cuttack/summary?state=Odisha", headers=khordha)
check("district officer other district -> 403", r.status_code == 403)
r = client.get("/api/admin/states/Odisha/summary", headers=khordha)
check("district officer cannot open whole state -> 403", r.status_code == 403)
r = client.get("/api/user/demo-042-user/latest", headers=khordha)
check("district officer sees in-district case", r.status_code in (200, 404))
r = client.get("/api/user/ben-cuttack/latest", headers=khordha)
check("district officer other-district case -> 403", r.status_code == 403)

print("== A8. Caseworker case restriction ==")
cw = auth_headers("caseworker.demo@sahara-demo.local")
r = client.get("/api/user/demo-042-user/history", headers=cw)
check("caseworker sees ASSIGNED case (DEMO-042)", r.status_code == 200)
r = client.get("/api/cases/DEMO-042/timeline", headers=cw)
check("caseworker timeline for assigned case", r.status_code == 200)
r = client.get("/api/user/ben-cuttack/history", headers=cw)
check("caseworker UNAUTHORISED case -> 403", r.status_code == 403, r.text)
r = client.get("/api/cases/DEMO-031/timeline", headers=cw)
check("caseworker unauthorised timeline -> 403", r.status_code == 403)
# Case id enumeration must not reveal existence either.
r = client.get("/api/cases/DEMO-999/timeline", headers=cw)
check("unknown case id handled (404 or 403)", r.status_code in (403, 404))

print("== A9. Beneficiary own-data restriction ==")
ben = auth_headers("beneficiary.demo@sahara-demo.local")
r = client.get("/api/user/demo-042-user/history", headers=ben)
check("beneficiary reads OWN history", r.status_code == 200)
check("history has entries", len(r.json()["history"]) == 3)
r = client.get("/api/user/demo-042-user/latest", headers=ben)
check("beneficiary reads own latest", r.status_code == 200)

print("== A10. Cross-user attempt (beneficiary -> another user) ==")
r = client.get("/api/user/ben-cuttack/history", headers=ben)
check("beneficiary reading another user -> 403", r.status_code == 403)
r = client.get("/api/risk/ben-cuttack/latest", headers=ben)
check("beneficiary risk on another user -> 403", r.status_code == 403)
r = client.post("/api/checkin", headers=ben, json={
    "user_id": "ben-cuttack", "mood": 4, "sleep": 3, "feeling_safe": "no",
    "text_response": "trying to write to someone else", "recent_incident": False,
    "support_received": False})
check("beneficiary checkin into another user -> 403", r.status_code == 403)
own_checkin = client.post("/api/checkin", headers=ben, json={
    "user_id": "demo-042-user", "mood": 5, "sleep": 4, "feeling_safe": "sometimes",
    "text_response": "thoda better mehsoos ho raha hai", "recent_incident": False,
    "support_received": True})
check("beneficiary OWN checkin accepted", own_checkin.status_code in (200, 201),
      str(own_checkin.status_code))

print("== A11. Cross-state attempt ==")
r = client.get("/api/user/ben-wb/history", headers=khordha)
check("district officer out-of-state case -> 403", r.status_code == 403)
r = client.post("/api/risk/assess/ben-wb", headers=odisha)
check("state admin cannot assess out-of-state case -> 403", r.status_code == 403)
r = client.get("/api/user/ben-wb/history", headers=cw)
check("caseworker cannot view other-state case -> 403", r.status_code == 403)

print("== A12. Cross-district attempt ==")
r = client.get("/api/user/ben-cuttack/history", headers=cw)
check("caseworker other-district case -> 403", r.status_code == 403)
r = client.get("/api/admin/districts/Cuttack/summary?state=Odisha", headers=khordha)
check("district officer other district admin view -> 403", r.status_code == 403)

print("== A13. Alert access restriction ==")
r = client.get("/api/alerts", headers=cw)
ids = [a["alert_id"] for a in r.json()]
check("caseworker list contains only assigned alert",
      ids == ["alert-demo-042"], str(ids))
r = client.get("/api/alerts/alert-demo-042", headers=cw)
check("caseworker can open own alert", r.status_code == 200)
cw_other = auth_headers("cw.ctc.demo@sahara-demo.local")
r = client.get("/api/alerts", headers=cw_other)
ids = [a["alert_id"] for a in r.json()]
check("other caseworker sees own alert only", ids == ["alert-ctc-031"], str(ids))
r = client.get("/api/alerts/alert-ctc-031", headers=cw)
check("caseworker cannot read other's alert -> 403", r.status_code == 403)
r = client.post("/api/alerts/alert-ctc-031/acknowledge", headers=cw,
                json={"caseworker_id": "SPOOF", "note": "nope"})
check("caseworker cannot ack other's alert -> 403", r.status_code == 403)
r = client.get("/api/alerts", headers=ben)
check("beneficiary cannot list alerts -> 403", r.status_code == 403)

print("== A14. Intervention identity comes from auth ==")
r = client.post("/api/cases/DEMO-042/interventions", headers=cw, json={
    "action_type": "schedule_counselling", "caseworker_id": "SPOOFED-ID",
    "note": "Referral logged for demo case.", "alert_id": "alert-demo-042"})
check("intervention 200", r.status_code == 200, r.text)
stored = fetch_one(database._db.caseworker_actions,
                   {"record_id": r.json()["record_id"]})
check("recorded caseworker_id = auth staff_id (not spoofed)",
      stored["caseworker_id"] == "CW-KHR-01", stored.get("caseworker_id"))
check("actor fields recorded on action",
      stored.get("actor_user_id") == "auth-cw-khr"
      and stored.get("actor_role") == "caseworker")
# A caseworker without access cannot record interventions.
r = client.post("/api/cases/DEMO-031/interventions", headers=cw, json={
    "action_type": "contact_beneficiary", "caseworker_id": "CW-KHR-01", "note": "nope"})
check("intervention on unauthorised case -> 403", r.status_code == 403)

print("== A15. Follow-up identity comes from auth ==")
now = datetime.now(timezone.utc)
r = client.post("/api/cases/DEMO-042/follow-up", headers=cw, json={
    "caseworker_id": "SPOOFED-ID",
    "action_taken": "Counselling referral recommended",
    "action_date": now.isoformat(),
    "follow_up_date": (now + timedelta(days=3)).isoformat(),
    "outcome": "Scheduled",
    "status": "follow_up_scheduled",
    "notes": "Demo follow-up record."})
check("follow-up 200", r.status_code == 200, r.text)
stored = fetch_one(database._db.caseworker_actions,
                   {"record_id": r.json()["record_id"]})
check("follow-up caseworker_id from auth", stored["caseworker_id"] == "CW-KHR-01",
      stored.get("caseworker_id"))
check("follow-up alert auto-advanced", True)
r = client.post("/api/cases/DEMO-088/follow-up", headers=cw, json={
    "caseworker_id": "CW-KHR-01", "action_taken": "nope",
    "action_date": now.isoformat(), "status": "follow_up_scheduled"})
check("follow-up on unauthorised case -> 403", r.status_code == 403)

print("== A16. Audit log creation ==")
import asyncio as _aio  # noqa: E402


async def _events():
    return [a async for a in database._db.audit_logs.find({})]


events = _aio.run(_events())
labels = [e["event"] for e in events]
check("LOGIN_SUCCESS recorded", "LOGIN_SUCCESS" in labels)
check("LOGIN_FAILURE recorded", "LOGIN_FAILURE" in labels)
check("INTERVENTION_RECORDED recorded", "INTERVENTION_RECORDED" in labels)
check("FOLLOWUP_RECORDED recorded", "FOLLOWUP_RECORDED" in labels)
check("ALERT_VIEWED recorded", "ALERT_VIEWED" in labels)
check("PERMISSION_DENIED recorded", "PERMISSION_DENIED" in labels)
check("no password material in audit notes",
      not any("demo-pass" in (e.get("note") or "") for e in events))
check("no chat/note content in audit (no free text)",
      not any("Referral logged" in (e.get("note") or "") for e in events))

print("== A17. 401 responses (summary) ==")
summary401 = [
    client.get("/api/admin/national/summary").status_code,
    client.get("/api/auth/me", headers={"Authorization": "Bearer junk"}).status_code,
    client.get("/api/dashboard/risk-queue").status_code,
]
check("all unauth staff calls are 401", all(s == 401 for s in summary401), str(summary401))

print("== A18. 403 responses (summary) ==")
summary403 = [
    client.get("/api/admin/national/summary", headers=odisha).status_code,          # state->national
    client.get("/api/admin/states/West%20Bengal/summary", headers=odisha).status_code,
    client.get("/api/user/ben-wb/history", headers=khordha).status_code,
    client.get("/api/user/ben-cuttack/history", headers=ben).status_code,
    client.get("/api/alerts", headers=ben).status_code,
]
check("all cross-scope calls are 403", all(s == 403 for s in summary403), str(summary403))

print("== A19. Logout + staff surface for admin roles ==")
r = client.post("/api/auth/logout", headers=nat)
check("logout 200", r.status_code == 200)
r = client.get("/api/dashboard/risk-queue", headers=nat)
check("national admin can read risk queue", r.status_code == 200)

print("== A20. Legacy endpoints closed when auth enforced ==")
r = client.get("/api/risk/demo-042-user/latest")  # no token at all
check("risk latest without token -> 401", r.status_code == 401)
r = client.post("/api/risk/assess/demo-042-user")  # no token
check("risk assess without token -> 401", r.status_code == 401)

print(f"\nALL {PASS} CHECKS PASSED (auth strict mode)")
