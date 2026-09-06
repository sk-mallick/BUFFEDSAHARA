"""Seed the SIH demonstration auth accounts (AUTH mode: strict).

Creates/updates FIVE clearly-labelled fictional accounts used for the
judge demo — one per role of the hierarchy. Also attaches the
beneficiary demo account to the existing fictional DEMO-042 case so the
"login as beneficiary -> own data only" flow has real check-ins to show.

Run from sahara-backend/:
    .venv/Scripts/python seed_auth_accounts.py

IMPORTANT
    * Every account is FICTIONAL ("SIH Demonstration Account").
    * Passwords are development-only and MUST NOT exist in production.
    * These accounts are upserted by email; nothing else is touched.
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

os.environ.setdefault("MODEL_AUTO_DOWNLOAD", "false")

from database import connect_db  # noqa: E402
import database  # noqa: E402
from services import security  # noqa: E402

# Development-only password for the demonstration accounts. Clearly NOT
# for production — see README "Authentication & demo accounts".
DEMO_PASSWORD = "SIH-Demo-2026!"

ACCOUNTS = [
    # (email, user_id, name, role, state, district, staff_id, case link)
    ("national.demo@sahara-demo.local",   "auth-national", "National Demo",  "national_admin",   None,          None,       None),
    ("state.demo@sahara-demo.local",      "auth-odisha",   "State Demo",     "state_admin",      "Odisha",     None,       None),
    ("district.demo@sahara-demo.local",   "auth-khordha",  "District Demo",  "district_officer", "Odisha",     "Khordha",  None),
    ("caseworker.demo@sahara-demo.local", "auth-cw-khr",   "Caseworker Demo","caseworker",       "Odisha",     "Khordha",  "CW-KHR-01"),
    # Beneficiary demo logs in AS the fictional P. Kumar (DEMO-042).
    ("beneficiary.demo@sahara-demo.local", "demo-042-user", "P. Kumar",      "beneficiary",      "Odisha",     "Khordha",  None),
]

BENEFICIARY_CASE_NUMBER = "DEMO-042"
BENEFICIARY_ASSIGNED = {"id": "CW-KHR-01", "name": "CW A"}  # matches the caseworker demo account

# A second fictional beneficiary on a DIFFERENT caseworker's caseload
# (Cuttack). Exists so the UI demos can show a real 403 when a Khordha
# caseworker (or any beneficiary) tries to open someone else's data.
OTHER_BENEFICIARY = {
    "user_id": "ben-cuttack",
    "display_name": "S. Patra",
    "case_number": "DEMO-031",
    "state": "Odisha",
    "district": "Cuttack",
    "assigned_caseworker": {"id": "CW-CTC-01", "name": "CW C"},
}


async def main() -> None:
    await connect_db()
    db = database._db
    if db is None:
        raise SystemExit("MongoDB not reachable — check .env / MONGODB_URL.")

    print("Seeding SIH demonstration auth accounts (fictional — not for production)...")
    for email, user_id, name, role, state, district, staff_id in ACCOUNTS:
        doc = {
            "email": email,
            "user_id": user_id,
            "name": name,
            "display_name": name,
            "password_hash": security.hash_password(DEMO_PASSWORD),
            "role": role,
            "state": state,
            "district": district,
            "staff_id": staff_id,
            "is_active": True,
            "language_preference": "en",
            "created_at": datetime.now(timezone.utc) - timedelta(days=200),
        }
        if user_id == "demo-042-user":
            # Merge into the fictional DEMO-042 profile if seed_demo ran;
            # otherwise create it (same user_id the check-ins use).
            doc.update({
                "display_name": "P. Kumar",
                "case_number": BENEFICIARY_CASE_NUMBER,
                "assigned_caseworker": BENEFICIARY_ASSIGNED,
                "phone_hash": "seed-demo-only—never-a-real-number",
            })
            await db.users.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
        else:
            await db.users.update_one({"email": email}, {"$set": doc}, upsert=True)
        print(f"  ok  {role:<16} {email}")

    # Fictional case held by ANOTHER caseworker (for 403 demonstrations).
    await db.users.update_one(
        {"user_id": OTHER_BENEFICIARY["user_id"]},
        {"$set": {**OTHER_BENEFICIARY, "phone_hash": "seed-demo-only—never-a-real-number"}},
        upsert=True,
    )

    print("\nDone. Demo sign-in (development only):")
    print(f"  password for all accounts : {DEMO_PASSWORD}")
    print("  national   : national.demo@sahara-demo.local")
    print("  state      : state.demo@sahara-demo.local   (Odisha)")
    print("  district   : district.demo@sahara-demo.local (Odisha · Khordha)")
    print("  caseworker : caseworker.demo@sahara-demo.local (CW-KHR-01, holds DEMO-042)")
    print("  beneficiary: beneficiary.demo@sahara-demo.local (P. Kumar / DEMO-042)")
    print("\nSIH Demonstration Accounts — MUST NOT exist in production.")


if __name__ == "__main__":
    asyncio.run(main())
