"""Multilingual "Talk to Sahara" portal chat tests (STRICT auth + MOCK AI).

Runs the full FastAPI app against an in-memory MongoDB with
AUTH_ENFORCED=true (identity comes from the bearer token) and
MOCK_AI_MODE=true (deterministic replies, no network, no keys — mock
replies report provider="mock" and are never presented as real AI).

    .venv/Scripts/python tests/test_chat.py        (Windows)
    .venv/bin/python tests/test_chat.py            (macOS/Linux)

Scenarios (STEP 4 spec §22):
  1  authenticated chat access     12 existing risk engine integration
  2  unauthenticated denied        13 existing alert integration
  3  session creation              14 mock AI mode
  4  message handling              15 missing AI credentials
  5  context retention             16 conversation privacy
  6  English                       17 conversation deletion
  7  Hindi                         18 cross-user session access denied
  8  Odia                          19 no API key exposed to frontend
  9  crisis classification         20 regression: legacy API still passes
 10  crisis response               21 human-support request
 11  (merged into 9/10)            22 guided check-in via existing engine
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
os.environ["AUTH_ENFORCED"] = "true"      # strict: bearer token is identity
os.environ["MOCK_AI_MODE"] = "true"       # deterministic replies, no network

import asyncio  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

import database  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

database._client = AsyncMongoMockClient()
database._db = database._client["sahara_chat_test"]

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
# Fixtures — fictional accounts (SIH demonstration data only)
# ---------------------------------------------------------------------------
PASSWORD = "demo-pass-123"

USERS = [
    dict(user_id="cw-khr", name="Caseworker A", role="caseworker",
         email="cw.chat@sahara-demo.local", state="Odisha", district="Khordha",
         staff_id="CW-KHR-01"),
    dict(user_id="cw-ctc", name="Caseworker C", role="caseworker",
         email="cw2.chat@sahara-demo.local", state="Odisha", district="Cuttack",
         staff_id="CW-CTC-01"),
    dict(user_id="ben-042", name="P. Kumar", role="beneficiary",
         email="ben.chat@sahara-demo.local", state="Odisha", district="Khordha",
         case_number="DEMO-042", display_name="P. Kumar",
         assigned={"id": "CW-KHR-01", "name": "Caseworker A"},
         language_preference="hi"),
    dict(user_id="ben-other", name="S. Patra", role="beneficiary",
         email="ben2.chat@sahara-demo.local", state="Odisha", district="Cuttack",
         case_number="DEMO-031", display_name="S. Patra",
         assigned={"id": "CW-CTC-01", "name": "Caseworker C"}),
    dict(user_id="ben-or", name="L. Behera", role="beneficiary",
         email="ben3.chat@sahara-demo.local", state="Odisha", district="Khordha",
         case_number="DEMO-047", display_name="L. Behera",
         assigned={"id": "CW-KHR-01", "name": "Caseworker A"}),
]


async def _seed() -> None:
    db = database._db
    for coll in ("users", "checkins", "risk_assessments", "alerts",
                 "caseworker_actions", "audit_logs", "chat_logs", "chat_sessions"):
        await db[coll].delete_many({})
    for u in USERS:
        doc = {
            "user_id": u["user_id"],
            "email": u["email"],
            "password_hash": security.hash_password(PASSWORD),
            "role": u["role"],
            "name": u.get("name", ""),
            "display_name": u.get("display_name", u.get("name", "")),
            "is_active": True,
            "language_preference": u.get("language_preference", "en"),
            "created_at": datetime.now(timezone.utc) - timedelta(days=120),
        }
        for f in ("state", "district", "staff_id", "case_number"):
            if u.get(f):
                doc[f] = u[f]
        if u.get("assigned"):
            doc["assigned_caseworker"] = u["assigned"]
        await db.users.insert_one(doc)


asyncio.run(_seed())


def auth(email: str) -> dict:
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, f"login failed for {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


BEN = auth("ben.chat@sahara-demo.local")
BEN2 = auth("ben2.chat@sahara-demo.local")
BEN_OR = auth("ben3.chat@sahara-demo.local")
CW = auth("cw.chat@sahara-demo.local")
CW2 = auth("cw2.chat@sahara-demo.local")


async def _find(coll, query):
    return await database._db[coll].find_one(query)


def find_one(coll, query):
    return asyncio.run(_find(coll, query))


print("== C1. Authenticated access (create/resume session) ==")
r = client.post("/api/chat/sessions", headers=BEN, json={"language": "en"})
check("beneficiary session 200", r.status_code == 200, r.text[:200])
body = r.json()
sid = body["session"]["session_id"]
check("session id present", bool(sid))
check("session owner is the token identity (never client-supplied)",
      body["session"]["user_id"] == "ben-042")
check("status active", body["session"]["status"] == "active")
check("welcome explains purpose", "share how you are doing" in body["welcome"]["text"])
check("welcome states not-a-replacement",
      "not a replacement" in body["welcome"]["disclaimer"].lower())
check("privacy note present", bool(body["welcome"]["privacy_note"]))
check("5 quick actions", len(body["welcome"]["quick_actions"]) == 5)

r2 = client.post("/api/chat/sessions", headers=BEN, json={"language": "en"})
check("second create RESUMES same conversation",
      r2.json()["session"]["session_id"] == sid)

print("== C2. Unauthenticated access denied ==")
check("create session no token -> 401",
      client.post("/api/chat/sessions", json={"language": "en"}).status_code == 401)
check("messages no token -> 401",
      client.get(f"/api/chat/sessions/{sid}/messages").status_code == 401)
check("safety-check no token -> 401",
      client.post("/api/chat/safety-check",
                  json={"message": "hello", "language": "en"}).status_code == 401)
check("delete no token -> 401",
      client.delete(f"/api/chat/sessions/{sid}").status_code == 401)

print("== C3. Message handling + mock AI mode (provider reported truthfully) ==")
r = client.post(f"/api/chat/sessions/{sid}/messages", headers=BEN,
                json={"content": "I have been feeling okay this week.", "language": "en"})
check("send 200", r.status_code == 200, r.text[:300])
turn = r.json()
check("mock provider reported (never real AI)", turn["provider"] == "mock", turn["provider"])
check("safety ok", turn["safety_level"] == "ok")
check("no crisis", turn["crisis_detected"] is False)
check("reply non-empty", bool(turn["reply"]))
check("no crisis card on ok", turn["crisis_card"] is None)

print("== C4. Context retention across turns ==")
r = client.post(f"/api/chat/sessions/{sid}/messages", headers=BEN,
                json={"content": "Earlier I mentioned this week. I would like to keep talking."})
check("second turn 200", r.status_code == 200)
view = client.get(f"/api/chat/sessions/{sid}/messages", headers=BEN).json()
check("conversation stored (4 messages)", len(view["messages"]) == 4, len(view["messages"]))

print("== C5. English / Hindi / Odia ==")
r_en = client.post(f"/api/chat/sessions/{sid}/messages", headers=BEN,
                   json={"content": "I have been feeling low and tired."})
check("english turn ok", r_en.status_code == 200)

# Language sessions are created on a FRESH user (resume keeps the first
# session's language — by design, a user's choice persists across visits).
r_hi = client.post("/api/chat/sessions", headers=BEN2, json={"language": "hi"})
h_sid = r_hi.json()["session"]["session_id"]
check("hindi session quick actions in Devanagari",
      any("भावनाओं" in qa["label"] for qa in r_hi.json()["welcome"]["quick_actions"]))
r_hi_msg = client.post(f"/api/chat/sessions/{h_sid}/messages", headers=BEN2,
                       json={"content": "मैं पिछले कुछ दिनों से थकान महसूस कर रही हूँ।", "language": "hi"})
check("hindi message 200", r_hi_msg.status_code == 200)
has_devanagari = any("\u0900" <= ch <= "\u097F" for ch in r_hi_msg.json()["reply"])
check("hindi reply in Devanagari", has_devanagari, r_hi_msg.json()["reply"][:80])
check("hindi language echoed", r_hi_msg.json()["language"] == "hi")

r_or = client.post("/api/chat/sessions", headers=BEN_OR, json={"language": "or"})
o_sid = r_or.json()["session"]["session_id"]
check("odia session quick actions in Odia script",
      any("ଅନୁଭୂତି" in qa["label"] for qa in r_or.json()["welcome"]["quick_actions"]))
r_or_msg = client.post(f"/api/chat/sessions/{o_sid}/messages", headers=BEN_OR,
                       json={"content": "ଆଜି ମୁଁ ଭଲ ଅନୁଭବ କରୁଛି।", "language": "or"})
check("odia message 200", r_or_msg.status_code == 200)
has_odia = any("\u0B00" <= ch <= "\u0B7F" for ch in r_or_msg.json()["reply"])
check("odia reply in Odia script", has_odia, r_or_msg.json()["reply"][:80])
check("odia language echoed", r_or_msg.json()["language"] == "or")

print("== C6. Crisis classification + deterministic crisis response ==")
r_crisis = client.post(f"/api/chat/sessions/{sid}/messages", headers=BEN,
                       json={"content": "I want to kill myself tonight.", "language": "en"})
check("crisis turn 200", r_crisis.status_code == 200, r_crisis.text[:200])
crisis = r_crisis.json()
check("safety_level crisis", crisis["safety_level"] == "crisis")
check("crisis_detected true", crisis["crisis_detected"] is True)
check("keywords flagged", "kill myself" in crisis["keywords_found"], crisis["keywords_found"])
check("crisis card present", crisis["crisis_card"] is not None)
numbers = [n["number"] for n in crisis["crisis_card"]["numbers"]]
check("14566 always in crisis card", "14566" in numbers)
check("112 emergency always in crisis card", "112" in numbers)
check("reply leads with helpline", "14566" in crisis["reply"], crisis["reply"][:120])
check("deterministic provider crisis_flow", crisis["provider"] == "crisis_flow")

user = find_one("users", {"user_id": "ben-042"})
check("user crisis_flag set (existing alert pathway)",
      user.get("crisis_flag") is True and user.get("crisis_flagged_at") is not None)
log = find_one("chat_logs", {"user_id": "ben-042", "crisis_detected": True})
check("safety metadata logged", log is not None)
check("PRIVACY: raw text never written to audit log",
      log["user_message"] == "" and log["bot_reply"] == "")
check("keywords + sentiment logged for caseworker card",
      bool(log.get("keywords_found")) and log.get("sentiment"))
action = find_one("caseworker_actions", {"user_id": "ben-042"})
check("caseworker_actions safety row (timeline event)",
      action is not None and "Crisis safety signal" in action.get("note", ""))

print("== C7. Crisis in Hindi (Devanagari) and Odia ==")
r = client.post(f"/api/chat/sessions/{h_sid}/messages", headers=BEN2,
                json={"content": "मैं आत्महत्या के बारे में सोच रहा हूँ।", "language": "hi"})
check("hindi crisis detected", r.json()["crisis_detected"] is True,
      r.json().get("keywords_found", []))
check("hindi crisis reply has 14566", "14566" in r.json()["reply"])

r = client.post(f"/api/chat/sessions/{o_sid}/messages", headers=BEN_OR,
                json={"content": "ମୁଁ ଆଉ ବଞ୍ଚିବି ନାହିଁ।", "language": "or"})
check("odia crisis detected", r.json()["crisis_detected"] is True,
      r.json().get("keywords_found", []))
check("odia crisis reply has 14566", "14566" in r.json()["reply"])

print("== C8. Concern classification (no crisis) ==")
r = client.post(f"/api/chat/sessions/{sid}/messages", headers=BEN,
                json={"content": "I have been feeling very overwhelmed and isolated lately."})
check("concern level", r.json()["safety_level"] == "concern", r.json()["safety_level"])
check("concern is not crisis", r.json()["crisis_detected"] is False)
check("concern reply supportive", bool(r.json()["reply"]))

print("== C9. Human-support request (honest prototype states) ==")
r = client.post(f"/api/chat/sessions/{sid}/human-support", headers=BEN,
                json={"note": "I would like someone to call me."})
check("human support 200", r.status_code == 200, r.text[:200])
check("status support_requested", r.json()["status"] == "support_requested")
view = client.get(f"/api/chat/sessions/{sid}/messages", headers=BEN).json()
check("session shows human support requested", view["human_support_requested"] is True)
support_row = find_one("caseworker_actions",
                       {"user_id": "ben-042", "caseworker_id": "sahara-support-request"})
check("caseworker sees support request (timeline row)",
      support_row is not None and "human support" in support_row.get("note", "").lower())
audit = find_one("audit_logs", {"event": "HUMAN_SUPPORT_REQUESTED"})
check("audit HUMAN_SUPPORT_REQUESTED", audit is not None)

print("== C10. Safety-check endpoint (stateless classification) ==")
ok = client.post("/api/chat/safety-check", headers=BEN,
                 json={"message": "I am doing well today.", "language": "en"})
check("safety-check ok", ok.json()["safety_level"] == "ok")
cc = client.post("/api/chat/safety-check", headers=BEN,
                 json={"message": "mujhe dar lag raha hai, main khatam kar dena chahta hun",
                       "language": "hi"})
check("safety-check roman-hindi crisis", cc.json()["safety_level"] == "crisis")
co = client.post("/api/chat/safety-check", headers=BEN,
                 json={"message": "ମୋତେ ବହୁତ ଚିନ୍ତା ହେଉଛି", "language": "or"})
check("safety-check odia concern", co.json()["safety_level"] == "concern", co.json())

print("== C11. Guided wellbeing check-in reuses the EXISTING engine ==")
r = client.post("/api/chat/sessions", headers=BEN, json={"language": "en"})
c_sid = r.json()["session"]["session_id"]
r = client.post(f"/api/chat/sessions/{c_sid}/messages", headers=BEN,
                json={"content": "__quick_action_checkin__"})
check("checkin starts with mood question", r.status_code == 200 and "mood" in r.json()["reply"].lower())
answers = ["3", "8", "sometimes", "yes", "no"]
for a in answers:
    r = client.post(f"/api/chat/sessions/{c_sid}/messages", headers=BEN,
                    json={"content": a, "language": "en"})
    check(f"checkin answer '{a}' accepted", r.status_code == 200, r.text[:200])
done = r.json()
check("checkin_completed returned", bool(done.get("checkin_completed")))
check("checkin stored via existing pipeline (source chat)",
      find_one("checkins", {"user_id": "ben-042", "checkin_id": done["checkin_completed"]["checkin_id"]})
      is not None)
stored = find_one("checkins", {"checkin_id": done["checkin_completed"]["checkin_id"]})
check("form answers recorded exactly", stored["form_data"]["mood"] == 3
      and stored["form_data"]["sleep"] == 8
      and stored["form_data"]["feeling_safe"] == "sometimes"
      and stored["form_data"]["recent_incident"] is True
      and stored["form_data"]["support_received"] is False)
check("engine attached ai_result (no second scoring system)",
      "ai_result" in stored and "distress_score" in stored["ai_result"])
session_doc = find_one("chat_sessions", {"session_id": c_sid})
check("no distress_score stored in the chat session (chat never scores)",
      "distress_score" not in str(session_doc))

print("== C12. Conversation privacy + deletion (real delete) ==")
r = client.delete(f"/api/chat/sessions/{sid}", headers=BEN)
check("delete 200", r.status_code == 200)
check("delete reports removed messages", r.json()["messages_removed"] > 0)
check("session document gone", find_one("chat_sessions", {"session_id": sid}) is None)
check("safety-metadata rows removed with session",
      find_one("chat_logs", {"source": "session", "session_id": sid}) is None)

print("== C13. Cross-user + staff access boundaries ==")
r = client.post("/api/chat/sessions", headers=BEN, json={"language": "en"})
own_sid = r.json()["session"]["session_id"]
r = client.post(f"/api/chat/sessions/{own_sid}/messages", headers=BEN,
                json={"content": "This is my private conversation."})
check("owner can write", r.status_code == 200)
r = client.get(f"/api/chat/sessions/{own_sid}/messages", headers=BEN2)
check("another beneficiary CANNOT read -> 403", r.status_code == 403)
r = client.post(f"/api/chat/sessions/{own_sid}/messages", headers=BEN2,
                json={"content": "intruder"})
check("another beneficiary CANNOT write -> 403", r.status_code == 403)
r = client.get(f"/api/chat/sessions/{own_sid}/messages", headers=CW)
check("assigned caseworker MAY read (own case only)", r.status_code == 200)
r = client.get(f"/api/chat/sessions/{own_sid}/messages", headers=CW2)
check("unassigned caseworker CANNOT read -> 403", r.status_code == 403)
r = client.delete(f"/api/chat/sessions/{own_sid}", headers=CW)
check("caseworker CANNOT delete beneficiary conversation -> 403", r.status_code == 403)

print("== C14. Missing AI credentials + mock determinism ==")
# Keys are empty in this process; MOCK_AI_MODE=true means the chat still
# answers deterministically instead of erroring.
r = client.post("/api/chat/sessions", headers=BEN2, json={"language": "en"})
s2 = r.json()["session"]["session_id"]
first = client.post(f"/api/chat/sessions/{s2}/messages", headers=BEN2,
                    json={"content": "I am feeling worried about tomorrow.", "language": "en"})
second = client.post(f"/api/chat/sessions/{s2}/messages", headers=BEN2,
                     json={"content": "I am feeling worried about tomorrow.", "language": "en"})
check("no-keys session works (mock mode)", first.status_code == 200)
check("mock replies are deterministic", first.json()["reply"] == second.json()["reply"])
check("no key material in any response", "AIza" not in first.text and "sk-ant" not in first.text
      and "GEMINI_API_KEY" not in first.text)

print("== C15. Legacy widget API regression ==")
r = client.post("/api/chat", json={"user_id": "legacy-guest", "message": "Hello there",
                                   "language": "en", "conversation_history": []})
check("legacy /api/chat still answers in mock mode", r.status_code == 200)
check("legacy reply non-empty", bool(r.json()["reply"]))

print("== C16. Bad session id + clean 404 ==")
check("unknown session -> 404",
      client.get("/api/chat/sessions/does-not-exist/messages", headers=BEN).status_code == 404)

print(f"\nALL {PASS} CHECKS PASSED (portal chat, strict mode)")
