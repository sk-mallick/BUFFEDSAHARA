"""Seed the fictional SIH demonstration case (DEMO-042) into MongoDB.

    .venv/Scripts/python seed_demo.py        (Windows)
    .venv/bin/python seed_demo.py            (macOS/Linux)

What it does:
  1. Creates user DEMO-042 ("P. Kumar") — clearly labelled fictional data.
  2. Inserts ~6 weeks of backdated check-ins telling the demo story:
     Day 1 stable -> Day 15 stable -> Day 30 monitoring -> recent decline.
  3. Runs the REAL risk engine (distress_engine.assess_user) and stores the
     assessment exactly as POST /api/risk/assess would.
  4. Runs the REAL alert service (sync_alerts_for_assessment), so an alert
     appears in the caseworker alert center.

The case is then visible through the real endpoints:
    GET /api/alerts                          (find DEMO-042's alert)
    GET /api/cases/DEMO-042/timeline
    POST /api/alerts/{id}/acknowledge        (human review)
    POST /api/cases/DEMO-042/interventions   (human action)
    POST /api/cases/DEMO-042/follow-up       (follow-up record)

DEMO-042 is FICTIONAL — no real beneficiary data. Nothing in this script
touches any real case.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from database import connect_db
import database
from services import alert_service, distress_engine

DEMO_USER_ID = "demo-042-user"
DEMO_CASE = "DEMO-042"

# (days_ago, distress_score, risk_label, text) — the check-in story. Scores
# are the ai_result values a real check-in pipeline would have stored.
CHECKIN_STORY = [
    (42, 18, "stable", "Sab thik hai, shukriya poochne ke liye."),
    (35, 24, "stable", "Achha din tha, thoda kaam zyada tha."),
    (28, 31, "monitoring", "Thoda akela mehsoos kar raha hoon in dinon."),
    (21, 38, "monitoring", "Neend thodi kam ho gayi hai, tension hai case ka."),
    (14, 46, "monitoring", "Pareshan hoon, kisi se baat karna achha laga."),
    (7, 55, "monitoring", "Bahut pressure hai, dar lagta hai kya hoga aage."),
    (2, 63, "needs_attention", "Raatein neend nahi aa rahi, bahut pareshan hoon, akela mehsoos karta hoon."),
]


def _checkin_doc(days_ago: int, score: int, level: str, text: str) -> dict:
    ts = datetime.now(timezone.utc) - timedelta(days=days_ago)
    mood = max(1, min(10, 10 - round(score / 12)))  # higher distress -> lower mood
    return {
        "checkin_id": f"demo-042-c{days_ago}",
        "user_id": DEMO_USER_ID,
        "timestamp": ts,
        "form_data": {
            "mood": mood,
            "sleep": mood,
            "feeling_safe": "sometimes" if score >= 40 else "yes",
            "text_response": text,
            "recent_incident": score >= 55,
            "support_received": False,
        },
        "ai_result": {
            "distress_score": score,
            "risk_level": level,
            "confidence": 0.7,
            "trend_direction": "worsening" if days_ago <= 14 else "stable",
            "signals_detected": [],
            # The demo story is rising distress WITHOUT a crisis signal — the
            # alert center demo wants a needs_attention alert, not the critical
            # safety override. Real check-ins store whatever the pipeline found.
            "crisis_keywords_found": [],
            "recommended_action": "Schedule follow-up" if score >= 46 else "Continue check-ins",
            "nlp_scores": {"positive": 0.2, "neutral": 0.4, "negative": 0.4},
            "component_scores": {"nlp_score": 40, "form_score": score, "trend_component": 20},
        },
    }


async def main() -> None:
    await connect_db()
    # Re-read the module global AFTER connect_db() — importing `_db` earlier
    # would have bound the pre-connection None.
    db = database._db
    if db is None:
        raise SystemExit("MongoDB not reachable — check .env / MONGODB_URL.")

    print("Seeding DEMO-042 (SIH Demonstration Data — fictional case)...")

    # 0. Reset DERIVED demo data so every run tells the same story. Only
    #    DEMO-042's own derived documents are touched — never other users.
    await db.risk_assessments.delete_many({"user_id": DEMO_USER_ID})
    await db.alerts.delete_many({"user_id": DEMO_USER_ID})
    await db.caseworker_actions.delete_many({"user_id": DEMO_USER_ID})

    # 1. User profile.
    await db.users.update_one(
        {"user_id": DEMO_USER_ID},
        {"$set": {
            "display_name": "P. Kumar",  # fictional
            "phone_hash": "seed-demo-only—never-a-real-number",
            "language_preference": "hi",
            "created_at": datetime.now(timezone.utc) - timedelta(days=45),
            "case_number": DEMO_CASE,
            # Administrative placement (step 2/3): DEMO-042 lives in
            # Odisha · Khordha under caseworker CW-KHR-01, so the demo
            # auth accounts can legitimately reach it.
            "state": "Odisha",
            "district": "Khordha",
            "assigned_caseworker": {"id": "CW-KHR-01", "name": "CW A"},
        }},
        upsert=True,
    )

    # 2. Backdated check-ins (kept idempotent by checkin_id).
    existing = {d["checkin_id"] async for d in db.checkins.find({"user_id": DEMO_USER_ID}, {"checkin_id": 1})}
    new_docs = [c for c in (_checkin_doc(*row) for row in CHECKIN_STORY) if c["checkin_id"] not in existing]
    if new_docs:
        await db.checkins.insert_many(new_docs)
    print(f"  check-ins ready ({len(CHECKIN_STORY)} total, {len(new_docs)} inserted)")

    # 3. Baseline assessment ~10 days ago (monitoring/46). This is what the
    #    engine would have stored back then, before the recent decline — it
    #    makes the risk_increase alert (monitoring -> needs_attention) real.
    await db.risk_assessments.insert_one({
        "assessment_id": "demo-042-baseline",
        "user_id": DEMO_USER_ID,
        "timestamp": datetime.now(timezone.utc) - timedelta(days=10),
        "distress_score": 46,
        "risk_level": "monitoring",
        "confidence": 0.6,
        "trend": "stable",
        "previous_score": 42,
        "change": 4,
        "escalation_probability": 0.31,
        "priority_score": 40,
        "priority_level": "monitoring",
        "crisis_flag": False,
        "model_version": "prototype-v1",
    })
    print("  baseline assessment stored: monitoring / 46 (10 days ago)")

    # 4. Run the real risk engine + store the current assessment (same as the
    #    API). Re-running is safe: each run produces a fresh assessment id,
    #    and the alert service's duplicate rules keep the alert center clean.
    assessment = await distress_engine.assess_user(DEMO_USER_ID, db)
    if assessment is None:
        raise SystemExit("Engine found no data — check-ins did not seed?")
    await db.risk_assessments.insert_one(assessment)
    print(f"  assessment stored: score={assessment['distress_score']} "
          f"level={assessment['risk_level']} trend={assessment['trend']} "
          f"crisis={assessment['crisis_flag']}")

    # 5. Real alert generation.
    created = await alert_service.sync_alerts_for_assessment(db, assessment)
    for alert in created:
        print(f"  alert raised: [{alert.severity}] {alert.title} ({alert.alert_type})")

    # 6. Demo checkpoint.
    alerts = [a async for a in db.alerts.find({"user_id": DEMO_USER_ID, "resolved": False})]
    print(f"\nDone. DEMO-042 now has {len(alerts)} open alert(s).")
    print("Try it live:")
    print(f"  GET  http://localhost:8000/api/alerts?filter=all&sort=urgency")
    print(f"  GET  http://localhost:8000/api/cases/{DEMO_CASE}/timeline")
    for a in alerts:
        print(f"  POST http://localhost:8000/api/alerts/{a['alert_id']}/acknowledge  "
              f"{'{'} \"caseworker_id\": \"cw-demo\" {'}'}")

    # 7. Administrative hierarchy dataset (Odisha/WB/Bihar/Jharkhand).
    from seed_admin_data import seed_admin_dataset

    summary = await seed_admin_dataset(db)
    print("\nAdministrative demo dataset ready (all fictional):")
    for key, value in summary.items():
        print(f"  {key}: {value}")
    print("  try: GET /api/admin/national/summary")


if __name__ == "__main__":
    asyncio.run(main())
