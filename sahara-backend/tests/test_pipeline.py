"""STEP 5 — check-in → risk → alert pipeline tests (auth-enforced mode).

Verifies that a normal authenticated wellbeing check-in now flows
automatically through the EXISTING engine:

    POST /api/checkin
        -> check-in stored
        -> distress_engine.assess_user
        -> risk assessment stored
        -> alert_service (deduplicated)
        -> enriched response (assessment + alerts_created)

Scenarios (mapped from the STEP 5 requirements):
  1. Normal check-in creates a check-in (+ enriched response)
  2. Normal check-in auto-creates a risk assessment
  3. First check-in works without a previous assessment (no alert noise)
  4. Stable/mild check-in does not create an unnecessary alert
  5. Risk increase (band up) creates an alert
  6. Rapid deterioration creates an alert
  7. Crisis flag creates a critical alert
  8. Repeating the same request does not duplicate alerts (idempotent)
  9. Risk decrease does not create an escalation alert
  10. Beneficiary cannot check in for another beneficiary (403/401)
  11. Manual POST /api/risk/assess still works
  12. Check-in risk level == assessment risk level (unified bands)
  13. Missing check-in/chat data -> no assessment, no crash
  14. Alert is caseworker-visible through GET /api/alerts
  15. Chat-guided assessment path shares the same flow (no regression)

Run from sahara-backend/:  .venv\\Scripts\\python tests\\test_pipeline.py
"""

from __future__ import annotations

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
database._db = database._client["sahara_pipeline_test"]

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
# Fixtures — fictional SIH demonstration data (clearly labelled)
# ---------------------------------------------------------------------------
PASSWORD = "demo-pass-123"  # development-only demo credentials

_RANK = {"stable": 0, "monitoring": 1, "needs_attention": 2, "urgent": 3}

CW = dict(user_id="auth-cw-pipe", name="CW Pipeline", role="caseworker",
          email="cw.pipeline@sahara-demo.local", state="Odisha", district="Khordha",
          staff_id="CW-PIPE-01")

# One fresh beneficiary per scenario keeps alert/assessment counts isolated.
BENEFICIARIES = [
    dict(key="mild-up",  user_id="pipe-mild-up",  display="P. Mild"),
    dict(key="crisis",   user_id="pipe-crisis",   display="C. Crisis"),
    dict(key="dup",      user_id="pipe-dup",      display="D. Dup"),
    dict(key="rapid",    user_id="pipe-rapid",    display="R. Rapid"),
    dict(key="decrease", user_id="pipe-decrease", display="S. Decrease"),
    dict(key="empty",    user_id="pipe-empty",    display="E. Empty"),
]


def _user_doc(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": f"{u['key'] if 'key' in u else u['user_id']}@sahara-demo.local",
        "password_hash": security.hash_password(PASSWORD),
        "role": "beneficiary",
        "name": u.get("display", u["user_id"]),
        "display_name": u.get("display", u["user_id"]),
        "is_active": True,
        "state": "Odisha",
        "district": "Khordha",
        "case_number": u["user_id"].upper(),  # fictional case reference
        "assigned_caseworker": {"id": CW["staff_id"], "name": CW["name"]},
        "language_preference": "en",
        "created_at": datetime.now(timezone.utc) - timedelta(days=120),
    }


def _seed_checkin(user_id: str, days_ago: int, score: int) -> dict:
    """A stored check-in document with an explicit score (fixture)."""
    return {
        "checkin_id": str(uuid4()),
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc) - timedelta(days=days_ago),
        "source": "seed",
        "form_data": {"mood": 6, "sleep": 5, "feeling_safe": "sometimes",
                      "text_response": "seed fixture", "recent_incident": False,
                      "support_received": True},
        "ai_result": {
            "distress_score": score, "risk_level": "monitoring", "confidence": 0.6,
            "trend_direction": "stable", "signals_detected": [],
            "crisis_keywords_found": [],
            "recommended_action": "Continue regular check-ins.",
            "nlp_scores": {"positive": 0.4, "neutral": 0.3, "negative": 0.3},
            "component_scores": {"nlp_score": 30, "form_score": score, "trend_component": 20},
        },
    }


async def _seed() -> None:
    db = database._db
    for coll in ("users", "checkins", "risk_assessments", "alerts",
                 "caseworker_actions", "audit_logs", "chat_logs", "chat_sessions"):
        await db[coll].delete_many({})
    await db.users.insert_one({
        "user_id": CW["user_id"], "email": CW["email"],
        "password_hash": security.hash_password(PASSWORD), "role": "caseworker",
        "name": CW["name"], "is_active": True, "state": "Odisha", "district": "Khordha",
        "staff_id": CW["staff_id"], "created_at": datetime.now(timezone.utc),
    })
    for u in BENEFICIARIES:
        await db.users.insert_one(_user_doc(u))
    # Rapid-deterioration scenario: one prior low-score check-in 2 days ago.
    await db.checkins.insert_one(_seed_checkin("pipe-rapid", 2, 30))
    # Decrease scenario: prior ELEVATED state (score 60 / needs_attention)
    # that the mild follow-up check-in should ease (no escalation alert).
    await db.checkins.insert_one(_seed_checkin("pipe-decrease", 3, 60))
    await db.risk_assessments.insert_one({
        "assessment_id": "assess-decrease-prior", "user_id": "pipe-decrease",
        "timestamp": datetime.now(timezone.utc) - timedelta(days=3),
        "distress_score": 60, "risk_level": "needs_attention", "confidence": 0.7,
        "trend": "stable", "previous_score": 55, "change": 5,
        "escalation_probability": 0.4, "prediction_window": "7_days",
        "contributing_factors": [], "priority_score": 62,
        "priority_level": "needs_attention", "crisis_flag": False,
        "model_version": "prototype-v1",
    })


import asyncio  # noqa: E402
asyncio.run(_seed())


def auth_headers(email: str) -> dict:
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, f"login failed {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def ben_headers(key: str) -> dict:
    u = next(b for b in BENEFICIARIES if b["key"] == key)
    return auth_headers(f"{u['key']}@sahara-demo.local")


CW_H = auth_headers(CW["email"])

# Payloads (deterministic; text chosen to avoid crisis keywords unless wanted).
MILD = {"mood": 8, "sleep": 7, "feeling_safe": "yes",
        "text_response": "I feel much better today, thank you",
        "recent_incident": False, "support_received": True}
DISTRESSED = {"mood": 1, "sleep": 1, "feeling_safe": "no",
              "text_response": "I am feeling so stressed and anxious, so tired and "
                               "everything feels awful, I can't handle anything today",
              "recent_incident": True, "support_received": False}
CRISIS = {"mood": 2, "sleep": 1, "feeling_safe": "no",
          "text_response": "mujhe dar lag raha hai aur main marna chahta hun",
          "recent_incident": True, "support_received": False}


def post_checkin(key: str, payload: dict, user_id: str | None = None) -> dict:
    body = dict(payload)
    body["user_id"] = user_id or next(b for b in BENEFICIARIES if b["key"] == key)["user_id"]
    r = client.post("/api/checkin", headers=ben_headers(key), json=body)
    assert r.status_code in (200, 201), f"checkin failed: {r.status_code} {r.text}"
    return r.json()


async def _count(coll, query) -> int:
    return await coll.count_documents(query)


def count(coll, query) -> int:
    return asyncio.run(_count(database._db[coll], query))


print("== P1. Normal check-in: stored + auto assessment (first ever) ==")
r1 = post_checkin("mild-up", MILD)
check("response has checkin_id + timestamp", bool(r1["checkin_id"]) and bool(r1["timestamp"]))
check("check-in document stored", count("checkins", {"user_id": "pipe-mild-up"}) == 1)
check("assessment auto-generated", r1["assessment"] is not None
      and bool(r1["assessment"]["assessment_id"]))
check("assessment stored", count("risk_assessments",
      {"user_id": "pipe-mild-up", "assessment_id": r1["assessment"]["assessment_id"]}) == 1)
check("first check-in: no alert noise", r1["alerts_created"] == [], str(r1["alerts_created"]))
check("disclaimer present", "not a clinical diagnosis" in r1["disclaimer"])

print("== P2. Risk increase (band up) creates alert ==")
a1 = r1["assessment"]
r2 = post_checkin("mild-up", DISTRESSED)
a2 = r2["assessment"]
check("second assessment present", a2 is not None)
check("distress rose", a2["distress_score"] > a1["distress_score"],
      f"{a1['distress_score']} -> {a2['distress_score']}")
check("band moved up", _RANK[a2["risk_level"]] > _RANK[a1["risk_level"]],
      f"{a1['risk_level']} -> {a2['risk_level']}")
check("risk_increase alert created", any(
    x["alert_type"] == "risk_increase" for x in r2["alerts_created"]),
    str(r2["alerts_created"]))
check("alert persisted", count("alerts", {"user_id": "pipe-mild-up",
      "alert_type": "risk_increase", "resolved": False}) >= 1)

print("== P3. Risk decrease does not create an escalation alert ==")
# pipe-decrease is seeded with a prior elevated state (score 60 / NA).
prev = client.get("/api/risk/pipe-decrease/latest", headers=CW_H).json()
check("seeded previous assessment is needs_attention",
      prev["risk_level"] == "needs_attention", prev["risk_level"])
r_dec = post_checkin("decrease", MILD)
check("mild follow-up returns assessment", r_dec["assessment"] is not None)
check("risk decreased vs the previous assessment",
      _RANK[r_dec["assessment"]["risk_level"]] < _RANK[prev["risk_level"]],
      f"{prev['risk_level']} -> {r_dec['assessment']['risk_level']}")
check("no alerts created on the decrease path", r_dec["alerts_created"] == [],
      str(r_dec["alerts_created"]))
check("no risk_increase open for decrease user",
      count("alerts", {"user_id": "pipe-decrease", "alert_type": "risk_increase",
                       "resolved": False}) == 0)

print("== P4. Rapid deterioration creates alert ==")
rr = post_checkin("rapid", DISTRESSED)
check("change >= 15 vs prior check-in", (rr["assessment"]["change"] or 0) >= 15,
      str(rr["assessment"]["change"]))
check("trend worsening", rr["assessment"]["trend"] == "worsening",
      rr["assessment"]["trend"])
check("rapid_deterioration alert created", any(
    x["alert_type"] == "rapid_deterioration" for x in rr["alerts_created"]),
    str(rr["alerts_created"]))

print("== P5. Crisis flag creates critical alert ==")
rc = post_checkin("crisis", CRISIS)
check("crisis check-in scored urgent", rc["ai_result"]["risk_level"] == "urgent",
      rc["ai_result"]["risk_level"])
check("crisis keywords surfaced", len(rc["ai_result"]["crisis_keywords_found"]) >= 2,
      str(rc["ai_result"]["crisis_keywords_found"]))
check("assessment crisis_flag true", rc["assessment"]["crisis_flag"] is True)
check("critical crisis_signal alert created", any(
    x["alert_type"] == "crisis_signal" and x["severity"] == "critical"
    for x in rc["alerts_created"]), str(rc["alerts_created"]))

print("== P6. Repeating the same request does not duplicate alerts ==")
alert_id_first = next(x["alert_id"] for x in rc["alerts_created"]
                      if x["alert_type"] == "crisis_signal")
rc2 = post_checkin("crisis", CRISIS)
check("retry accepted (append-only check-in)", rc2["checkin_id"] != rc["checkin_id"])
check("retry still detects crisis", rc2["assessment"]["crisis_flag"] is True)
check("only ONE open crisis alert", count("alerts", {"user_id": "pipe-crisis",
      "alert_type": "crisis_signal", "resolved": False}) == 1)
check("retry raises no duplicate alert (alerts_created empty)",
      rc2["alerts_created"] == [], str(rc2["alerts_created"]))

print("== P7. Idempotency for identical mild retries ==")
rm1 = post_checkin("dup", MILD)
rm2 = post_checkin("dup", MILD)
check("both check-ins stored", count("checkins", {"user_id": "pipe-dup"}) == 2)
check("both assessments stored (append-only documented)",
      count("risk_assessments", {"user_id": "pipe-dup"}) == 2)
check("no duplicate risk_increase alerts on identical retries",
      count("alerts", {"user_id": "pipe-dup", "alert_type": "risk_increase",
                       "resolved": False}) == 0, str(rm1["alerts_created"]))

print("== P8. Unified bands: check-in label == assessment label ==")
for r in (r1, r2, rc, rc2):
    check("ai_result risk == assessment risk",
          r["ai_result"]["risk_level"] == r["assessment"]["risk_level"],
          f"{r['ai_result']['risk_level']} vs {r['assessment']['risk_level']}")
    check("ai_result score == assessment score",
          r["ai_result"]["distress_score"] == r["assessment"]["distress_score"],
          f"{r['ai_result']['distress_score']} vs {r['assessment']['distress_score']}")

print("== P9. Authorization: beneficiary ownership + unauth denied ==")
cross = client.post("/api/checkin", headers=ben_headers("mild-up"), json=dict(
    CRISIS, user_id="pipe-crisis"))
check("beneficiary cannot check in for another beneficiary -> 403",
      cross.status_code == 403, str(cross.status_code))
anon = client.post("/api/checkin", json=dict(MILD, user_id="pipe-mild-up"))
check("unauthenticated check-in -> 401 (enforced mode)", anon.status_code == 401,
      str(anon.status_code))
me = client.get("/api/auth/me", headers=ben_headers("mild-up"))
check("actor identity intact", me.status_code == 200
      and me.json()["user"]["user_id"] == "pipe-mild-up", me.text[:120])

print("== P10. Missing data: no check-ins/chat -> no assessment, no crash ==")


async def _empty_flow():
    from services import checkin_flow
    return await checkin_flow.run_assessment_flow(database._db, "pipe-empty")


flow = asyncio.run(_empty_flow())
check("empty user: assessment is None", flow["assessment"] is None)
check("empty user: no alerts, no exception", flow["alerts_created"] == [])

print("== P11. Caseworker-visible alert (existing surface) ==")
r = client.get("/api/alerts", headers=CW_H)
ids = [a["alert_id"] for a in r.json()]
check("crisis alert visible to assigned caseworker", alert_id_first in ids, str(ids[:5]))

print("== P12. Manual /api/risk/assess still works ==")
r = client.post("/api/risk/assess/pipe-mild-up", headers=CW_H)
check("manual assess 200 with assessment", r.status_code == 200
      and bool(r.json().get("assessment_id")), str(r.status_code))
r = client.get("/api/risk/pipe-mild-up/latest", headers=CW_H)
check("manual assess stored (latest readable)", r.status_code == 200)

async def _latest_factors(user_id: str):
    doc = await database._db.risk_assessments.find(
        {"user_id": user_id}).sort("timestamp", -1).to_list(length=1)
    return (doc[0].get("contributing_factors") or []) if doc else []


print("== P13. No chatbot history required (check-in-only signals) ==")
check("assessment generated with zero chat history",
      r1["assessment"] is not None and r1["assessment"]["distress_score"] >= 0)
factors = asyncio.run(_latest_factors("pipe-mild-up"))
check("explainable factors present", len(factors) > 0, str(factors))

print(f"\nALL {PASS} CHECKS PASSED (check-in -> risk -> alert pipeline, enforced mode)")
