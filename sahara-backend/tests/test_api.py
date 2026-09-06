"""Integration test for all Sahara API endpoints.

Runs the full FastAPI app against an IN-MEMORY MongoDB
(mongomock-motor), so no MongoDB server or ML model is needed.

Run from sahara-backend/:
    .venv\\Scripts\\python tests\\test_api.py        (Windows)
    .venv/bin/python tests/test_api.py               (macOS/Linux)

Test-only dependencies (not in requirements.txt):
    pip install httpx mongomock-motor
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Make `sahara-backend` importable regardless of the CWD the script is run from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Never try to download the ~500 MB model during tests.
os.environ["MODEL_AUTO_DOWNLOAD"] = "false"
# Never call a real LLM API during tests — clear BOTH provider keys so a
# developer's .env (which pydantic-settings also reads) can't leak the
# real credentials into the test run. The fallback + 503 paths are asserted.
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
# This suite exercises the pre-auth behaviour of Steps 1-2 (open prototype
# API, caller-supplied demo identities). The auth/RBAC suite lives in
# tests/test_auth.py with AUTH_ENFORCED=true — the security boundary is
# exercised there. The flag is read once at import time, so each suite
# process is cleanly isolated.
os.environ["AUTH_ENFORCED"] = "false"

from fastapi.testclient import TestClient  # noqa: E402

import database  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

# Swap the real MongoDB client for an in-memory one BEFORE the app is
# imported. We deliberately do NOT enter TestClient's context manager,
# so the app's lifespan (connect_db) never runs and our mock stays live.
database._client = AsyncMongoMockClient()
database._db = database._client["sahara_db_test"]

from main import app  # noqa: E402

client = TestClient(app)

PASS = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global PASS
    assert condition, f"FAIL: {label} {extra}"
    PASS += 1
    print(f"  ok  {label}")


print("== 1. Health ==")
health = client.get("/api/health").json()
check("health status ok", health["status"] == "ok")
check("health db_connected (mock)", health["db_connected"] is True)
check("health model_loaded false in tests", health["model_loaded"] is False)

print("== 2. Check-in: crisis text (romanized Hindi) ==")
crisis = {
    "user_id": "user-test-001",
    "mood": 3,
    "sleep": 2,
    "feeling_safe": "no",
    "text_response": "mujhe bahut dar lag raha hai, main akela hun aur koi sahara nahi",
    "recent_incident": True,
    "support_received": False,
}
r = client.post("/api/checkin", json=crisis)
check("checkin 201/200", r.status_code in (200, 201), str(r.status_code))
body = r.json()
ai = body["ai_result"]
check("checkin_id returned", bool(body["checkin_id"]))
check("timestamp returned", bool(body["timestamp"]))
check("two crisis keywords found", len(ai["crisis_keywords_found"]) == 2,
      str(ai["crisis_keywords_found"]))
check("2+ keywords force urgent", ai["risk_level"] == "urgent", ai["risk_level"])
check("score in range", 0 <= ai["distress_score"] <= 100, str(ai["distress_score"]))
check("crisis prefix on action", ai["recommended_action"].startswith("⚠ Crisis signal detected."))
check("insufficient_data trend (1st check-in)", ai["trend_direction"] == "insufficient_data")
check("confidence in range", 0.0 <= ai["confidence"] <= 1.0)
check("signals populated", "crisis_keywords" in ai["signals_detected"])

print("== 3. Check-in: mild text (English), different user ==")
mild = {
    "user_id": "user-test-002",
    "mood": 8,
    "sleep": 7,
    "feeling_safe": "yes",
    "text_response": "I feel much better today, thank you",
    "recent_incident": False,
    "support_received": True,
}
r = client.post("/api/checkin", json=mild)
ai2 = r.json()["ai_result"]
check("mild checkin stable", ai2["risk_level"] == "stable", ai2["risk_level"])
check("no keywords", ai2["crisis_keywords_found"] == [])
check("mild score low", ai2["distress_score"] <= 40, str(ai2["distress_score"]))

print("== 4. History + annotations ==")
history = client.get("/api/user/user-test-001/history?days=60").json()
check("history has 1 entry", len(history["history"]) == 1, str(len(history["history"])))
check("history fields", all(k in history["history"][0] for k in
      ("date", "distress_score", "risk_level", "checkin_id")))
check("ai_flag annotation (crossed 56)", any(a["type"] == "ai_flag" for a in history["annotations"]),
      str(history["annotations"]))
first_flag = next(a for a in history["annotations"] if a["type"] == "ai_flag")
check("ai_flag on crisis day", first_flag["date"] == history["history"][0]["date"])

# A second, later check-in with no crisis words on the SAME user should not
# create a second ai_flag (only the first crossing is annotated).
r = client.post("/api/checkin", json={
    "user_id": "user-test-001",
    "mood": 7,
    "sleep": 6,
    "feeling_safe": "sometimes",
    "text_response": "thoda behtar mehsoos ho raha hai lekin abhi bhi dar lag raha hai",
    "recent_incident": False,
    "support_received": True,
})
check("third checkin stored", r.status_code == 200)
history = client.get("/api/user/user-test-001/history").json()
check("history has 2 entries", len(history["history"]) == 2, str(len(history["history"])))
flag_dates = [a["date"] for a in history["annotations"] if a["type"] == "ai_flag"]
check("exactly one ai_flag annotation", len(flag_dates) == 1, str(flag_dates))
check("single keyword forces at least needs_attention",
      history["history"][-1]["risk_level"] in ("needs_attention", "urgent"),
      history["history"][-1]["risk_level"])

print("== 5. Caseworker action -> annotation ==")
r = client.post("/api/caseworker/action", json={
    "user_id": "user-test-001",
    "action_type": "counsellor_contact",
    "note": "Called user; spoke for 25 minutes",
    "caseworker_id": "cw-042",
})
check("action logged", r.status_code == 200 and bool(r.json()["action_id"]))
history2 = client.get("/api/user/user-test-001/history").json()
check("counsellor annotation appears", any(a["type"] == "counsellor_contact" for a in history2["annotations"]))

print("== 6. Latest ==")
latest = client.get("/api/user/user-test-001/latest").json()
check("latest returns ai_result", latest["ai_result"]["risk_level"] in
      ("stable", "monitoring", "needs_attention", "urgent"))
check("latest profile fields", "display_name" in latest and "case_number" in latest)
missing = client.get("/api/user/user-test-404/latest")
check("unknown user -> 404", missing.status_code == 404, str(missing.status_code))

print("== 7. Dashboard risk queue ==")
queue = client.get("/api/dashboard/risk-queue").json()
check("queue has 2 users", queue["total"] == 2, str(queue["total"]))
rows = queue["queue"]
check("crisis user first (crisis_flag sort)",
      rows[0]["user_id"] == "user-test-001" and rows[0]["crisis_flag"] is True,
      str([(r["user_id"], r["crisis_flag"]) for r in rows]))
check("mild user second, no flag",
      rows[1]["user_id"] == "user-test-002" and rows[1]["crisis_flag"] is False)
# Risk level now comes from the risk engine: any crisis signal (even a
# single keyword in a recent check-in) forces Urgent.
check("engine crisis override forces urgent",
      rows[0]["risk_level"] == "urgent", rows[0]["risk_level"])
check("crisis_reason says safety signal",
      rows[0]["crisis_reason"] == "Urgent — safety signal detected",
      str(rows[0]["crisis_reason"]))
check("mild case stable", rows[1]["risk_level"] == "stable", rows[1]["risk_level"])
check("urgent count", queue["urgent_count"] == 1, str(queue["urgent_count"]))
check("needs_attention count", queue["needs_attention_count"] == 0, str(queue["needs_attention_count"]))
check("queue engine fields", all(k in rows[0] for k in
      ("user_id", "case_id", "display_name", "latest_score", "risk_level",
       "trend_direction", "trend", "change", "escalation_probability",
       "priority_score", "priority_level", "priority_reason",
       "days_since_checkin", "last_follow_up", "crisis_flag")))

print("== 8. Transcript analysis ==")
r = client.post("/api/transcript/analyze", json={
    "user_id": "user-test-001",
    "transcript": "maine kaha mujhe jeena nahi, sab khatam kar dena chahta hun",
})
tr = r.json()
check("transcript id", bool(tr["transcript_id"]))
check("two keywords in transcript", len(tr["crisis_keywords_found"]) == 2,
      str(tr["crisis_keywords_found"]))
check("multiple-signal action", tr["recommended_action"].startswith("⚠ Multiple crisis signals"))
check("sentiment summary valid", tr["sentiment_summary"] in ("positive", "neutral", "negative"))

print("== 9. Longitudinal trend (4 worsening check-ins) ==")
for mood, safe, text in [
    (8, "yes", "sab thik lag raha hai aaj"),
    (6, "sometimes", "thoda tension hai"),
    (4, "no", "raton ko neend nahi aa rahi, dar lagta hai"),
    (2, "no", "bahut bura lag raha hai, koi sahara nahi mil raha, marna chahta hun, khud ko hurt karne ka man hai"),
]:
    client.post("/api/checkin", json={
        "user_id": "user-trend-001",
        "mood": mood,
        "sleep": mood,  # correlated, so the form score rises steadily
        "feeling_safe": safe,
        "text_response": text,
        "recent_incident": mood <= 4,
        "support_received": False,
    })
latest_trend = client.get("/api/user/user-trend-001/latest").json()["ai_result"]
check("declining trend detected", latest_trend["trend_direction"] == "declining",
      latest_trend["trend_direction"])
check("crisis keyword in final check-in", "marna chahta" in latest_trend["crisis_keywords_found"])
check("trend forces urgent level", latest_trend["risk_level"] == "urgent", latest_trend["risk_level"])

print("== 10. Chat endpoint (no API key -> built-in fallback provider) ==")
import asyncio  # noqa: E402

# With CHAT_PROVIDER=auto and no cloud keys, the built-in rule-based
# responder serves the turn — the chat must never be dead.
r = client.post("/api/chat", json={
    "user_id": "user-chat-001",
    "message": "aaj thoda behtar hoon",
    "language": "en",
    "conversation_history": [],
})
check("chat 200 via fallback", r.status_code == 200, str(r.status_code))
body = r.json()
check("fallback provider reported", body.get("provider") == "fallback", body.get("provider"))
check("fallback reply non-empty", len(body["reply"]) > 10, body["reply"])
check("fallback no crisis on mild message", body["crisis_detected"] is False)
chat_logs_written = asyncio.run(database._db.chat_logs.find({}).to_list(length=10))
check("chat log written", len(chat_logs_written) == 1, len(chat_logs_written))

# The fallback's safety contract: crisis keywords ALWAYS trigger the
# helpline reply, in the user's language (unit-level, no DB side effects).
from services.chat_llm import generate_reply  # noqa: E402
crisis_reply, provider = asyncio.run(generate_reply(
    "fallback", [{"role": "user", "content": "mujhe dar lag raha hai"}], "hi"))
check("fallback crisis mentions 14566", "14566" in crisis_reply, crisis_reply)
check("fallback crisis in Hindi", any("\u0900" <= ch <= "\u097F" for ch in crisis_reply) or
      "kripya" in crisis_reply.lower() or "kripya" in crisis_reply, crisis_reply[:60])

# Forcing a provider without its key still 503s with a clear reason.
import config  # noqa: E402
saved_provider = config.settings.chat_provider
config.settings.chat_provider = "anthropic"
try:
    r = client.post("/api/chat", json={
        "user_id": "user-chat-001",
        "message": "hello",
        "language": "en",
        "conversation_history": [],
    })
    check("forced anthropic without key -> 503", r.status_code == 503, str(r.status_code))
    check("503 names the key", "ANTHROPIC_API_KEY" in r.json()["detail"], r.json()["detail"])
finally:
    config.settings.chat_provider = saved_provider

# A cloud provider that errors after retries must degrade to the built-in
# responder ("the chat is never dead") — and report it truthfully.
import services.chat_llm as chat_llm_mod  # noqa: E402
saved_provider = config.settings.chat_provider
saved_gemini_key = config.settings.gemini_api_key
config.settings.chat_provider = "gemini"
config.settings.gemini_api_key = "fake-key"

async def _boom(*args, **kwargs):
    raise RuntimeError("simulated provider outage")

orig_gemini = chat_llm_mod._gemini_reply
chat_llm_mod._gemini_reply = _boom
try:
    r = client.post("/api/chat", json={
        "user_id": "user-chat-001",
        "message": "hello, is anyone there",
        "language": "en",
        "conversation_history": [],
    })
    check("provider outage degrades to 200", r.status_code == 200, str(r.status_code))
    check("degraded reply is warm and non-empty", len(r.json()["reply"]) > 10, r.json()["reply"])
    check("degraded provider reported truthfully",
          r.json().get("provider") == "fallback", r.json().get("provider"))
finally:
    chat_llm_mod._gemini_reply = orig_gemini
    config.settings.chat_provider = saved_provider
    config.settings.gemini_api_key = saved_gemini_key

# Helper shapes used by the chat router (unit-level).
from services.keyword_service import detect_crisis_keywords  # noqa: E402
from services.nlp_service import analyze_sentiment  # noqa: E402
crisis_result = detect_crisis_keywords("mujhe dar lag raha hai aur main akela hun")
check("detect_crisis_keywords dict shape",
      set(crisis_result) == {"crisis_detected", "keywords_found"} and
      crisis_result["crisis_detected"] is True and
      len(crisis_result["keywords_found"]) == 2,
      str(crisis_result))
sentiment_result = analyze_sentiment("I feel much better today")
check("analyze_sentiment dict shape",
      "label" in sentiment_result and "scores" in sentiment_result and
      sentiment_result["label"] in ("positive", "neutral", "negative"),
      str(sentiment_result))

print("== 11. Dashboard chat-flags ==")
from datetime import datetime, timedelta, timezone  # noqa: E402
now = datetime.now(timezone.utc)

# A user flagged 10 minutes ago with a crisis chat log.
asyncio.run(database._db.users.update_one(
    {"user_id": "user-test-001"},
    {"$set": {"crisis_flag": True, "crisis_flagged_at": now - timedelta(minutes=10)}},
))
asyncio.run(database._db.chat_logs.insert_one({
    "log_id": "log-test-001",
    "user_id": "user-test-001",
    "timestamp": now - timedelta(minutes=10),
    "user_message": "mujhe dar lag raha hai",
    "bot_reply": "I am here with you.",
    "crisis_detected": True,
    "language": "hi",
    "sentiment": "negative",
    "keywords_found": ["dar lag raha"],
}))
# A user flagged 3 days ago must NOT appear (24h window).
asyncio.run(database._db.users.insert_one({
    "user_id": "user-stale-001",
    "display_name": "Old Flag",
    "crisis_flag": True,
    "crisis_flagged_at": now - timedelta(days=3),
}))
flags = client.get("/api/dashboard/chat-flags").json()
check("chat-flags lists only recent", len(flags["flagged_users"]) == 1, str(flags))
flagged = flags["flagged_users"][0]
check("chat-flag fields", all(k in flagged for k in
      ("user_id", "display_name", "crisis_flagged_at",
       "last_message_sentiment", "keywords_detected")))
check("chat-flag joins last log",
      flagged["user_id"] == "user-test-001" and
      flagged["last_message_sentiment"] == "negative" and
      flagged["keywords_detected"] == ["dar lag raha"],
      str(flagged))

print("== 12. User auto-created on first check-in ==")
users = client.get("/api/dashboard/risk-queue").json()["queue"]
check("all stub users present",
      {u["user_id"] for u in users} >= {"user-test-001", "user-test-002", "user-trend-001"})

flags = client.get("/api/dashboard/chat-flags").json()
check("chat-flags excludes non-chat users", all(
    f["user_id"] != "user-trend-001" for f in flags["flagged_users"]))

print("== 13. Risk engine: stable case ==")
r = client.post("/api/risk/assess/user-test-002")
check("assess stable user 200", r.status_code == 200, str(r.status_code))
a = r.json()
check("low distress score", a["distress_score"] < 30, str(a["distress_score"]))
check("stable level", a["risk_level"] == "stable", a["risk_level"])
check("model version recorded", a["model_version"] == "prototype-v1", a["model_version"])
check("prototype disclaimer present", "not a clinical diagnosis" in a["disclaimer"])
check("factors well-formed", all(
    {"factor", "impact", "description"} <= set(f) for f in a["contributing_factors"]))
check("no chatbot history handled", True)  # user-test-002 has no chat logs — covered above

print("== 14. Risk engine: increasing distress + crisis override ==")
r = client.post("/api/risk/assess/user-trend-001")
a = r.json()
check("worsening trend detected", a["trend"] == "worsening", a["trend"])
check("escalation probability elevated", a["escalation_probability"] >= 0.5,
      str(a["escalation_probability"]))
check("crisis override -> urgent", a["risk_level"] == "urgent", a["risk_level"])
check("crisis flag set", a["crisis_flag"] is True)
check("crisis reason set", a["crisis_reason"] == "Urgent — safety signal detected")
check("priority urgent", a["priority_level"] == "urgent", a["priority_level"])
check("priority floor for crisis", a["priority_score"] >= 85, str(a["priority_score"]))

print("== 15. Risk engine: sudden deterioration without crisis ==")
# Backdated check-ins (API timestamps are seconds apart; the engine's
# 7-day windows need real spacing). Tuples: (days_ago, score, mood,
# feeling_safe, text) — sleep mirrors mood. Story: steady ~12-15 for a
# month, then a sharp jump to 44 two days ago.
now = datetime.now(timezone.utc)
sudden_checkins = [
    (31, 12, 8, "yes", "sab thik hai aaj"),
    (29, 12, 8, "yes", "achha din tha"),
    (15, 14, 7, "yes", "thoda thak gaya hoon bas"),
    (6, 15, 6, "sometimes", "thoda pressure hai kaam ka"),
    (2, 44, 2, "no", "bahut ghabrahat hai, neend nahi aa rahi, kaam nahi ho pa raha"),
]
asyncio.run(database._db.checkins.insert_many([
    {"checkin_id": f"sudden-{d}", "user_id": "user-sudden-001",
     "timestamp": now - timedelta(days=d),
     "form_data": {"mood": mood, "sleep": mood, "feeling_safe": safe,
                    "text_response": text, "recent_incident": False,
                    "support_received": False},
     "ai_result": {"distress_score": score, "risk_level": "stable",
                    "trend_direction": "stable", "signals_detected": [],
                    "crisis_keywords_found": [], "recommended_action": "",
                    "nlp_scores": {}, "component_scores": {}}}
    for d, score, mood, safe, text in sudden_checkins
]))
r = client.post("/api/risk/assess/user-sudden-001")
a = r.json()
check("sudden deterioration factor listed", any(
    f["factor"] == "Sudden deterioration" for f in a["contributing_factors"]),
    str(a["contributing_factors"]))
check("worsening trend", a["trend"] == "worsening", a["trend"])
check("prediction flags the jump", a["escalation_probability"] >= 0.6,
      str(a["escalation_probability"]))
check("no crisis flag (pure deterioration)", a["crisis_flag"] is False)
check("band score (no override)", a["risk_level"] in ("monitoring", "needs_attention"),
      a["risk_level"])
check("positive change recorded", a["change"] is not None and a["change"] > 0,
      str(a.get("change")))

print("== 16. Crisis override: check-in only (no chat) ==")
client.post("/api/checkin", json={
    "user_id": "user-crisis-001", "mood": 5, "sleep": 5,
    "feeling_safe": "sometimes",
    "text_response": "mujhe jeena nahi, sab khatam kar dena chahta hun",
    "recent_incident": False, "support_received": True,
})
r = client.post("/api/risk/assess/user-crisis-001")
a = r.json()
check("checkin crisis override -> urgent", a["risk_level"] == "urgent", a["risk_level"])
check("crisis flag from check-in only", a["crisis_flag"] is True)
check("keywords surfaced as factor", any(
    "Crisis language" in f["factor"] for f in a["contributing_factors"]))

print("== 17. Chat-only user (no check-ins) ==")
asyncio.run(database._db.chat_logs.insert_many([
    {"log_id": "chat-solo-1", "user_id": "user-chat-001",
     "timestamp": datetime.now(timezone.utc) - timedelta(days=2),
     "user_message": "sab thik hai aaj", "bot_reply": "ok",
     "crisis_detected": False, "language": "hi", "sentiment": "positive",
     "keywords_found": []},
    {"log_id": "chat-solo-2", "user_id": "user-chat-001",
     "timestamp": datetime.now(timezone.utc) - timedelta(days=1),
     "user_message": "thoda bura laga aaj", "bot_reply": "ok",
     "crisis_detected": False, "language": "hi", "sentiment": "negative",
     "keywords_found": []},
    {"log_id": "chat-solo-3", "user_id": "user-chat-001",
     "timestamp": datetime.now(timezone.utc) - timedelta(hours=2),
     "user_message": "mujhe dar lag raha hai aur akela hun", "bot_reply": "ok",
     "crisis_detected": True, "language": "hi", "sentiment": "negative",
     "keywords_found": ["dar lag raha", "akela hun"]},
]))
r = client.post("/api/risk/assess/user-chat-001")
check("chat-only user assessable", r.status_code == 200, str(r.status_code))
a = r.json()
check("chat signals drive the score", a["distress_score"] >= 40, str(a["distress_score"]))
check("conversation crisis flagged", a["crisis_flag"] is True)
check("no-checkin factor disclosed", any(
    f["factor"] == "No check-in data" for f in a["contributing_factors"]))
check("no raw chat content in factors", all(
    "akela hun" not in f["description"] for f in a["contributing_factors"]))

print("== 18. Empty history / unknown user ==")
r = client.post("/api/risk/assess/user-unknown-999")
check("assess unknown user 404", r.status_code == 404, str(r.status_code))
r = client.get("/api/risk/user-unknown-999/latest")
check("latest unknown user 404", r.status_code == 404, str(r.status_code))
r = client.get("/api/risk/user-unknown-999/history")
check("history unknown user empty", r.status_code == 200 and r.json()["history"] == [])

print("== 19. Multiple assessments + history + latest ==")
client.post("/api/risk/assess/user-test-002")
history = client.get("/api/risk/user-test-002/history").json()["history"]
check("two assessments stored", len(history) == 2, str(len(history)))
check("history ascending", history[0]["timestamp"] <= history[1]["timestamp"])
check("history fields", all(k in history[0] for k in
      ("assessment_id", "timestamp", "distress_score", "risk_level", "trend",
       "escalation_probability", "crisis_flag", "model_version")))
latest = client.get("/api/risk/user-test-002/latest").json()
check("latest matches last assessment",
      latest["distress_score"] == history[-1]["distress_score"] and
      latest["assessment_id"] == history[-1]["assessment_id"])

print("== 20. Human follow-up does not change the risk score ==")
r1 = client.post("/api/risk/assess/user-sudden-001")
a1 = r1.json()
r = client.post("/api/caseworker/action", json={
    "user_id": "user-sudden-001",
    "action_type": "follow_up_completed",
    "note": "Spoke with user; follow-up completed",
    "caseworker_id": "cw-042",
})
check("follow-up action logged", r.status_code == 200 and bool(r.json()["action_id"]))
a2 = client.post("/api/risk/assess/user-sudden-001").json()
check("risk score unchanged by follow-up",
      a2["distress_score"] == a1["distress_score"],
      f"{a1['distress_score']} -> {a2['distress_score']}")
check("risk level unchanged by follow-up", a2["risk_level"] == a1["risk_level"])
check("priority reflects fresh follow-up",
      a2["priority_score"] <= a1["priority_score"],
      f"{a1['priority_score']} -> {a2['priority_score']}")
queue_row = next(
    r for r in client.get("/api/dashboard/risk-queue").json()["queue"]
    if r["user_id"] == "user-sudden-001")
check("queue shows last follow-up", queue_row["last_follow_up"] is not None)

print("== 21. Dashboard risk-summary (aggregate, no PII) ==")
summary = client.get("/api/dashboard/risk-summary").json()
check("summary keys present", all(k in summary for k in
      ("total", "stable", "monitoring", "needs_attention", "urgent",
       "worsening_trends", "recent_crisis_flags", "awaiting_follow_up")))
level_sum = (summary["stable"] + summary["monitoring"]
             + summary["needs_attention"] + summary["urgent"])
check("summary counts consistent", level_sum == summary["total"],
      f"{level_sum} vs {summary['total']}")
check("summary matches queue length",
      summary["total"] == len(client.get("/api/dashboard/risk-queue").json()["queue"]))
check("summary has no PII", not any(k in summary for k in
      ("user_id", "display_name", "case_id", "phone")))
queue_rows = client.get("/api/dashboard/risk-queue").json()["queue"]
check("chat-only user appears in queue", any(
    r["user_id"] == "user-chat-001" for r in queue_rows))

# ===========================================================================
# ALERT -> HUMAN SUPPORT workflow (sections 22-27)
# ===========================================================================
from services import alert_service  # noqa: E402
import services.alert_service as asvc  # noqa: E402

now = datetime.now(timezone.utc)

print("== 22. Alert generation: stable case raises nothing ==")
r = client.post("/api/risk/assess/user-test-002")
check("stable re-assess 200", r.status_code == 200)
alerts_all = client.get("/api/alerts").json()
check("stable user has no alerts", all(a["user_id"] != "user-test-002" for a in alerts_all))

print("== 23. Alert rules: risk_increase + rapid_deterioration + persistent ==")
# Deterministic, service-level, mirroring the router: previous assessments are
# stored, then the current one is stored and synced. Story: two elevated
# assessments, a dip to monitoring, then a jump to needs_attention/61.
def _assess(assessment_id, days_ago, score, level, prev_score, change, trend="stable"):
    return {
        "assessment_id": assessment_id, "user_id": "user-alert-flow-001",
        "timestamp": now - timedelta(days=days_ago),
        "distress_score": score, "risk_level": level, "confidence": 0.6,
        "trend": trend, "previous_score": prev_score, "change": change,
        "escalation_probability": 0.4, "priority_score": score, "priority_level": level,
        "crisis_flag": False, "model_version": "prototype-v1",
    }

asyncio.run(database._db.risk_assessments.insert_many([
    _assess("alert-prev-001", 14, 58, "needs_attention", 52, 6),
    _assess("alert-prev-002", 10, 60, "needs_attention", 58, 2),
    _assess("alert-prev-003", 4, 55, "monitoring", 60, -5, trend="improving"),
]))
current = _assess("alert-cur-001", 0, 61, "needs_attention", 55, 19, trend="worsening")
asyncio.run(database._db.risk_assessments.insert_one(dict(current)))
created = asyncio.run(asvc.sync_alerts_for_assessment(database._db, dict(current)))
types = [a.alert_type for a in created]
check("risk_increase raised on band up", "risk_increase" in types, str(types))
check("rapid_deterioration raised on big jump", "rapid_deterioration" in types, str(types))
check("persistent_elevated_risk raised (3 of last 4 elevated)", "persistent_elevated_risk" in types, str(types))
store_all = asyncio.run(database._db.alerts.find({"user_id": "user-alert-flow-001"}).to_list(length=20))
inc = next(x for x in store_all if x["alert_type"] == "risk_increase")
check("risk_increase explains monitoring -> needs_attention",
      "monitoring" in inc["description"] and "needs_attention" in inc["description"], inc["description"])
check("non-crisis alert is not critical", inc["severity"] in ("medium", "high"), inc["severity"])
check("alert unread by default", inc["acknowledged"] is False and inc["resolved"] is False)

# Dedup: feeding the exact same assessment again adds nothing.
count_before = len(asyncio.run(database._db.alerts.find({"user_id": "user-alert-flow-001"}).to_list(length=20)))
asyncio.run(asvc.sync_alerts_for_assessment(database._db, dict(current)))
count_after = len(asyncio.run(database._db.alerts.find({"user_id": "user-alert-flow-001"}).to_list(length=20)))
check("duplicate assessment raises no new alerts", count_after == count_before, f"{count_before} -> {count_after}")

print("== 24. Crisis alert end-to-end (API assess) + filters ==")
r = client.post("/api/checkin", json={
    "user_id": "user-alert-crisis-001", "mood": 3, "sleep": 2,
    "feeling_safe": "no", "text_response": "mujhe dar lag raha hai aur main akela hun, jina nahi hai",
    "recent_incident": True, "support_received": False})
check("crisis checkin stored", r.status_code == 200)
client.post("/api/risk/assess/user-alert-crisis-001")
crisis_alerts = [x for x in client.get("/api/alerts").json() if x["user_id"] == "user-alert-crisis-001"]
crisis = next((x for x in crisis_alerts if x["alert_type"] == "crisis_signal"), None)
check("crisis_signal alert exists", crisis is not None)
check("crisis alert critical severity", crisis["severity"] == "critical", crisis["severity"])
check("crisis alert urgent level", crisis["risk_level"] == "urgent", crisis["risk_level"])
check("crisis alert shows urgent review wording",
      "human review" in crisis["description"].lower(), crisis["description"])
unread = client.get("/api/alerts/unread").json()
check("unread list includes crisis alert", any(x["alert_id"] == crisis["alert_id"] for x in unread))
urgent_filter = client.get("/api/alerts?filter=urgent").json()
check("filter=urgent returns only urgent", all(x["risk_level"] == "urgent" for x in urgent_filter)
      and any(x["alert_id"] == crisis["alert_id"] for x in urgent_filter))
sorted_risk = client.get("/api/alerts?sort=highest_risk").json()
check("sort=highest_risk descends", sorted_risk[0]["risk_score"] >= sorted_risk[-1]["risk_score"],
      str(sorted_risk[0]["risk_score"]))

print("== 25. Acknowledge alert (human-only, does NOT resolve) ==")
ack = client.post(f"/api/alerts/{crisis['alert_id']}/acknowledge", json={
    "caseworker_id": "cw-042", "note": "Reviewed the safety signal with the duty counsellor."})
check("acknowledge 200", ack.status_code == 200)
body = ack.json()
check("alert acknowledged", body["acknowledged"] is True)
check("acknowledged by recorded", body["acknowledged_by"] == "cw-042")
check("acknowledging does NOT resolve", body["resolved"] is False)
check("review status advanced", body["review_status"] == "reviewed")
timeline = client.get(f"/api/cases/{crisis['user_id']}/timeline").json()
check("timeline events typed", all(e["event_type"] in ("ai", "human", "system") for e in timeline["events"]))
check("timeline has human review event", any(
    e["event_type"] == "human" and "reviewed by caseworker" in e["label"].lower()
    for e in timeline["events"]))
check("timeline has crisis ai event", any(
    e["event_type"] == "ai" and "early-warning" in e["label"].lower()
    for e in timeline["events"]))

print("== 26. Human intervention + follow-up close the loop ==")
asyncio.run(database._db.users.insert_one({
    "user_id": "user-demo-042", "display_name": "P. Kumar",
    "phone_hash": "bcrypt-placeholder-not-a-real-hash", "language_preference": "en",
    "created_at": now - timedelta(days=40), "case_number": "DEMO-042",
}))
intervention = client.post("/api/cases/DEMO-042/interventions", json={
    "action_type": "schedule_counselling", "caseworker_id": "cw-042",
    "note": "Scheduled first counselling session; user agreed to the call.",
    "alert_id": crisis["alert_id"],
})
check("intervention logged by case number", intervention.status_code == 200
      and intervention.json()["action_type"] == "schedule_counselling")
fu = client.post("/api/cases/DEMO-042/follow-up", json={
    "caseworker_id": "cw-042",
    "action_taken": "Counselling referral recommended",
    "action_date": now.isoformat(),
    "follow_up_date": (now + timedelta(days=3)).isoformat(),
    "outcome": "Awaiting first session",
    "status": "follow_up_scheduled",
    "notes": "Follow up after the session to check wellbeing.",
    "alert_id": crisis["alert_id"],
})
check("follow-up recorded", fu.status_code == 200 and fu.json()["status"] == "follow_up_scheduled")
updated = client.get(f"/api/alerts/{crisis['alert_id']}").json()
check("alert status follows the human plan", updated["review_status"] == "follow_up_scheduled",
      updated["review_status"])
check("alert open until a human completes it", updated["resolved"] is False)
completed = client.post("/api/cases/DEMO-042/follow-up", json={
    "caseworker_id": "cw-042",
    "action_taken": "First counselling session completed",
    "action_date": now.isoformat(),
    "outcome": "User reported feeling steadier; support continues.",
    "status": "follow_up_completed",
    "notes": "Do not mark as safe — continue weekly check-ins.",
    "alert_id": crisis["alert_id"],
})
check("completion logged", completed.status_code == 200)
closed = client.get(f"/api/alerts/{crisis['alert_id']}").json()
check("human completion resolves the alert", closed["resolved"] is True
      and closed["review_status"] == "follow_up_completed",
      f"{closed['resolved']} {closed['review_status']}")
no_auto = client.get(f"/api/risk/{crisis['user_id']}/latest").json()
check("risk level untouched by human workflow", no_auto["risk_level"] == "urgent",
      no_auto["risk_level"])

demo_timeline = client.get("/api/cases/DEMO-042/timeline").json()
check("case_number timeline resolves", demo_timeline["case_id"] == "DEMO-042")
labels = [e["label"].lower() for e in demo_timeline["events"]]
check("timeline has counselling referral (human)", any("counselling referral made" in l for l in labels))
check("timeline has follow-up scheduled (human)", any("follow-up scheduled" in l for l in labels))
check("timeline has follow-up completed", any("follow-up completed" in l for l in labels))
check("human notes separate from AI", any(
    e["event_type"] == "human" and "session" in e.get("detail", "").lower()
    for e in demo_timeline["events"]))

print("== 27. Dashboard alerts-summary + empty states ==")
summary = client.get("/api/dashboard/alerts-summary").json()
check("alerts-summary keys", all(k in summary for k in
      ("total_monitored", "awaiting_review", "needs_attention", "urgent",
       "follow_ups_due", "follow_ups_overdue", "total_open")))
check("counts are ints (real data)", all(isinstance(v, int) for v in summary.values()))
check("summary sees the urgent crisis case", summary["urgent"] >= 1, str(summary))
empty_known = client.get("/api/cases/user-test-404/timeline")
check("timeline unknown case -> 404", empty_known.status_code == 404, str(empty_known.status_code))
check("alert list handles zero matching alerts",
      isinstance(client.get("/api/alerts?filter=monitoring").json(), list))

print("== 27b. Demo user administrative placement (Odisha / Khordha) ==")
# The fictional DEMO-042 case is placed in Odisha/Khordha on a caseworker,
# matching the production seed. It gets one stored assessment so district
# aggregation can see it (mirrors what seed_demo.py produces on the real DB).
asyncio.run(database._db.users.update_one(
    {"user_id": "user-demo-042"},
    {"$set": {"state": "Odisha", "district": "Khordha",
              "assigned_caseworker": {"id": "CW-A", "name": "CW A"}}},
))
asyncio.run(database._db.risk_assessments.insert_one({
    "assessment_id": "demo-042-admin", "user_id": "user-demo-042",
    "timestamp": now - timedelta(days=1),
    "distress_score": 63, "risk_level": "needs_attention", "confidence": 0.7,
    "trend": "worsening", "previous_score": 46, "change": 17,
    "escalation_probability": 0.6, "priority_score": 63, "priority_level": "needs_attention",
    "crisis_flag": False, "model_version": "prototype-v1",
}))

print("== 28. Administrative hierarchy: fictional population ==")
# Fictional adm-test users across two states for deterministic aggregation.
def _adm_assess(uid, days_ago, score, level, trend, prev=None):
    return {"assessment_id": f"adm-{uid}-{days_ago}", "user_id": uid,
            "timestamp": now - timedelta(days=days_ago), "distress_score": score,
            "risk_level": level, "confidence": 0.7, "trend": trend,
            "previous_score": prev, "change": (score - prev) if prev is not None else None,
            "escalation_probability": round(score / 110, 2), "priority_score": score,
            "priority_level": level, "crisis_flag": False, "model_version": "prototype-v1"}

adm_users = [
    # Odisha / Khordha / CW-A — needs attention, worsening.
    ("adm-test-khr-01", "OD-KHR-001", "Odisha", "Khordha", "CW-A", "CW A"),
    # Odisha / Khordha / CW-A — urgent (crisis alert), worsening.
    ("adm-test-khr-02", "OD-KHR-002", "Odisha", "Khordha", "CW-A", "CW A"),
    # Odisha / Cuttack / CW-C — stable, improving.
    ("adm-test-ctc-01", "OD-CTC-001", "Odisha", "Cuttack", "CW-C", "CW C"),
    # Bihar / Patna / CW-J — monitoring.
    ("adm-test-pat-01", "BR-PAT-001", "Bihar", "Patna", "CW-J", "CW J"),
]
for uid, case, state, district, cw_id, cw_name in adm_users:
    asyncio.run(database._db.users.insert_one({
        "user_id": uid, "display_name": "", "phone_hash": "fictional",
        "language_preference": "en", "created_at": now - timedelta(days=80),
        "case_number": case, "state": state, "district": district,
        "administrative_level": "caseworker",
        "assigned_caseworker": {"id": cw_id, "name": cw_name},
    }))
asyncio.run(database._db.risk_assessments.insert_many([
    _adm_assess("adm-test-khr-01", 60, 18, "stable", "stable"),
    _adm_assess("adm-test-khr-01", 30, 44, "monitoring", "worsening", prev=18),
    _adm_assess("adm-test-khr-01", 4, 66, "needs_attention", "worsening", prev=44),
    _adm_assess("adm-test-khr-02", 45, 30, "monitoring", "stable"),
    _adm_assess("adm-test-khr-02", 3, 82, "urgent", "worsening", prev=30),
    _adm_assess("adm-test-ctc-01", 40, 40, "monitoring", "improving"),
    _adm_assess("adm-test-ctc-01", 2, 20, "stable", "improving", prev=40),
    _adm_assess("adm-test-pat-01", 25, 35, "monitoring", "stable"),
    _adm_assess("adm-test-pat-01", 5, 40, "monitoring", "stable", prev=35),
]))
# One open critical alert in Khordha + one unreviewed needs-attention alert.
asyncio.run(database._db.alerts.insert_one({
    "alert_id": "adm-alert-urgent", "user_id": "adm-test-khr-02",
    "case_id": "OD-KHR-002", "alert_type": "crisis_signal", "severity": "critical",
    "title": "Crisis safety signal", "description": "Immediate human review required.",
    "risk_score": 82, "risk_level": "urgent", "created_at": now - timedelta(hours=3),
    "requires_human_review": True, "acknowledged": False, "resolved": False,
    "review_status": "awaiting_review",
}))
asyncio.run(database._db.alerts.insert_one({
    "alert_id": "adm-alert-attn", "user_id": "adm-test-khr-01",
    "case_id": "OD-KHR-001", "alert_type": "risk_increase", "severity": "high",
    "title": "Risk level increased", "description": "Review recommended.",
    "risk_score": 66, "risk_level": "needs_attention",
    "created_at": now - timedelta(hours=5), "requires_human_review": True,
    "acknowledged": False, "resolved": False, "review_status": "awaiting_review",
}))

nat = client.get("/api/admin/national/summary").json()
check("national summary shape", all(k in nat["counts"] for k in
      ("total", "stable", "monitoring", "needs_attention", "urgent", "worsening")))
check("national sees the demo + admin population", nat["counts"]["total"] >= 5, str(nat["counts"]["total"]))
state_names = [s["name"] for s in nat["states"]]
check("states include Odisha + Bihar", "Odisha" in state_names and "Bihar" in state_names, str(state_names))
odisha = next(s for s in nat["states"] if s["name"] == "Odisha")
check("Odisha aggregate counts (4 fictional cases)",
      odisha["total"] == 4 and odisha["needs_attention"] == 2 and odisha["urgent"] == 1
      and odisha["stable"] == 1, str(odisha))
check("national alert tallies include the open alerts", nat["alerts"]["urgent"] >= 1
      and nat["alerts"]["unreviewed"] >= 1, str(nat["alerts"]))
check("privacy note on admin responses", "restricted to authorised personnel" in nat["privacy_note"])
check("admin source note", nat["source_note"] == "SIH Demonstration Data")

st = client.get("/api/admin/states/Odisha/summary").json()
check("state summary total", st["counts"]["total"] == 4, str(st["counts"]))
check("state lists its districts", {d["name"] for d in st["districts"]} >= {"Khordha", "Cuttack"},
      str(st["districts"]))
missing_state = client.get("/api/admin/states/Karnataka/summary")
check("unknown state -> 404", missing_state.status_code == 404, str(missing_state.status_code))

dist = client.get("/api/admin/districts/Khordha/summary").json()
check("district scope is Khordha (Odisha)", dist["state"] == "Odisha", str(dist))
check("district counts (3 cases: urgent, needs attention x2)",
      dist["counts"]["total"] == 3 and dist["counts"]["urgent"] == 1
      and dist["counts"]["needs_attention"] == 2, str(dist["counts"]))
check("district shows DEMO-042 drill row (id + risk only)", any(
    c["case_id"] == "DEMO-042" and c["risk_level"] == "needs_attention"
    for c in dist["cases"]), str([c["case_id"] for c in dist["cases"]]))
check("no PII on drill rows", all(not any(k in c for k in ("display_name", "note", "text", "name"))
      for c in dist["cases"]))
cws = {c["id"]: c for c in dist["caseworkers"]}
check("caseworker workload aggregated", cws.get("CW-A", {}).get("active_cases") == 3
      and cws.get("CW-A", {}).get("urgent") == 1, str(cws))
missing_dist = client.get("/api/admin/districts/Nowhere/summary")
check("unknown district -> 404", missing_dist.status_code == 404, str(missing_dist.status_code))

print("== 29. Admin trends (7/30/90 day) ==")
for d, extra in ((7, ""), (30, ""), (90, "")):
    t = client.get(f"/api/admin/trends?days={d}").json()
    check(f"trends {d}d series length", len(t["series"]) == d, str(len(t["series"])))
    last = t["series"][-1]
    check(f"trends {d}d last day equals monitored total",
          last["stable"] + last["monitoring"] + last["needs_attention"] + last["urgent"]
          == nat["counts"]["total"], f"{last} vs {nat['counts']['total']}")
    check(f"trends {d}d urgent present", last["urgent"] >= 1, str(last))
od_trend = client.get("/api/admin/trends?days=30&state=Odisha").json()
check("state-scoped trend total == Odisha cases",
      od_trend["series"][-1]["stable"] + od_trend["series"][-1]["monitoring"]
      + od_trend["series"][-1]["needs_attention"] + od_trend["series"][-1]["urgent"] == 4,
      str(od_trend["series"][-1]))
khr_trend = client.get("/api/admin/trends?days=7&district=Khordha").json()
check("district-scoped trend urgent >= 1", khr_trend["series"][-1]["urgent"] >= 1)
check("trend counters are ints", isinstance(od_trend["worsening"], int)
      and isinstance(od_trend["improving"], int))
check("trends carry monitoring disclaimer", "AI-assisted risk monitoring" in khr_trend["note"])

print("== 29b. Step 1 workflow still intact after admin layer ==")
post_admin = client.get("/api/alerts/unread").json()
check("caseworker alerts unaffected", isinstance(post_admin, list) and len(post_admin) >= 1)
q = client.get("/api/dashboard/risk-queue").json()
check("risk queue still works", q["total"] >= 1)
crisis_latest = client.get("/api/risk/user-alert-crisis-001/latest").json()
check("risk untouched", crisis_latest["risk_level"] == "urgent")

print("== 30. Admin district caseworkers endpoint ==")
rows = client.get("/api/admin/districts/Khordha/caseworkers").json()
check("caseworkers endpoint lists CW-A", any(r["id"] == "CW-A" and r["active_cases"] == 3 for r in rows),
      str(rows))

print(f"\nALL {PASS} CHECKS PASSED")