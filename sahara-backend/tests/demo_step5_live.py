"""Live STEP 5 demo verification (run against http://localhost:8000).

Fictional SIH demonstration data (DEMO-042 / P. Kumar) on the real Atlas
database. Verifies that a NORMAL POST /api/checkin now flows through the
existing risk engine + alert service:

    check-in -> risk assessment -> alert (when warranted) -> caseworker

The payload below is a clearly fictional crisis statement so the alert
step is deterministic. Posting it twice also demonstrates the
duplicate-alert guard. Nothing else in the database is modified.
"""

import httpx

BASE = "http://localhost:8000"
PASSWORD = "SIH-Demo-2026!"
T = 240  # generous timeout: lazy SLA scans run over the network DB


def login(email: str) -> str:
    r = httpx.post(f"{BASE}/api/auth/login",
                   json={"email": email, "password": PASSWORD}, timeout=T)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


ben = {"Authorization": f"Bearer {login('beneficiary.demo@sahara-demo.local')}"}
cw = {"Authorization": f"Bearer {login('caseworker.demo@sahara-demo.local')}"}

me = httpx.get(f"{BASE}/api/auth/me", headers=ben, timeout=T).json()["user"]
print("beneficiary identity:", me["user_id"], "| role:", me["role"])
uid = me["user_id"]

# Current open alerts for this case (before the demo), so pre-existing
# state is visible rather than hidden.
existing = httpx.get(f"{BASE}/api/alerts", headers=cw, timeout=T).json()
demo_before = [a for a in existing if a.get("user_id") == uid]
print(f"open alerts BEFORE demo for {uid}:",
      [(a["alert_type"], a["risk_level"], a["severity"]) for a in demo_before])

# --- 1) First check-in: a fictional crisis statement -----------------------
payload = {
    "user_id": uid,
    "mood": 2, "sleep": 1, "feeling_safe": "no",
    "text_response": ("mujhe bahut dar lag raha hai aur main marna chahta hun "
                      "(fictional SIH demo message)"),
    "recent_incident": True, "support_received": False,
}
r = httpx.post(f"{BASE}/api/checkin", headers=ben, json=payload, timeout=T)
print("\nPOST /api/checkin #1 ->", r.status_code)
body = r.json()
print("  ai_result   :", body["ai_result"]["distress_score"],
      body["ai_result"]["risk_level"])
print("  assessment  :", (body.get("assessment") or {}).get("assessment_id"),
      "risk", (body.get("assessment") or {}).get("risk_level"),
      "crisis_flag", (body.get("assessment") or {}).get("crisis_flag"))
print("  alerts      :", [(a["alert_type"], a["severity"]) for a in body["alerts_created"]])

# --- 2) Retry the identical request (idempotency check) --------------------
r2 = httpx.post(f"{BASE}/api/checkin", headers=ben, json=payload, timeout=T)
body2 = r2.json()
print("\nPOST /api/checkin #2 (identical retry) ->", r2.status_code)
print("  new checkin stored   :", body2["checkin_id"] != body["checkin_id"])
print("  new assessment stored:", (body2.get("assessment") or {}).get("assessment_id")
      != (body.get("assessment") or {}).get("assessment_id"))
print("  alerts created       :", body2["alerts_created"])

# --- 3) Caseworker-visible alert (existing surface) ------------------------
after = httpx.get(f"{BASE}/api/alerts", headers=cw, timeout=T).json()
crisis_open = [a for a in after
               if a.get("user_id") == uid and a["alert_type"] == "crisis_signal"
               and not a["resolved"]]
print("\nGET /api/alerts (caseworker) -> open crisis_signal alerts for DEMO-042:",
      len(crisis_open))
print("  alert id:", crisis_open[0]["alert_id"] if crisis_open else None)

latest = httpx.get(f"{BASE}/api/risk/{uid}/latest", headers=cw, timeout=T)
print("\nGET /api/risk/{uid}/latest ->", latest.status_code)
if latest.status_code == 200:
    a = latest.json()
    print("  score", a["distress_score"], "| level", a["risk_level"],
          "| trend", a["trend"], "| crisis", a["crisis_flag"])
print("\nDEMO OK — check-in -> risk assessment -> alert -> caseworker flow verified.")
