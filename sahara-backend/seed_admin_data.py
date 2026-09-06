"""Administrative demo dataset for the National -> State -> District hierarchy.

Every record here is FICTIONAL — clearly labelled SIH demonstration data.
No real beneficiary data is touched. DEMO-042 (Odisha / Khordha) is
deliberately NOT part of this module so the Step 1 demo flow stays intact.

Data model used:
  users.state / users.district / users.assigned_caseworker  -> case placement
  risk_assessments (stored engine output snapshots)          -> latest + trends
  alerts                                                     -> admin alert tallies
  caseworker_actions (record_kind="follow_up")               -> follow-up figures

The dataset is deterministic (fixed RNG seed) so re-running it yields the
same fictional population. Derived documents for "adm-" users are reset
on every run; nothing else is ever touched.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from models.alert import AlertDocument

# Region layout: state -> districts -> (caseworkers per district).
REGIONS = {
    "Odisha": {
        "Khordha": [("CW-KHR-01", "CW A"), ("CW-KHR-02", "CW B")],
        "Cuttack": [("CW-CTC-01", "CW C")],
        "Puri": [("CW-PURI-01", "CW D")],
        "Ganjam": [("CW-GAN-01", "CW E")],
        "Sambalpur": [("CW-SAM-01", "CW F")],
    },
    "West Bengal": {
        "Howrah": [("CW-HWH-01", "CW G")],
        "Nadia": [("CW-NDA-01", "CW H")],
        "Purba Medinipur": [("CW-PM-01", "CW I")],
    },
    "Bihar": {
        "Patna": [("CW-PAT-01", "CW J"), ("CW-PAT-02", "CW K")],
        "Muzaffarpur": [("CW-MUZ-01", "CW L")],
        "Gaya": [("CW-GAY-01", "CW M")],
    },
    "Jharkhand": {
        "Ranchi": [("CW-RAN-01", "CW N")],
        "Bokaro": [("CW-BOK-01", "CW O")],
        "East Singhbhum": [("CW-ESB-01", "CW P")],
    },
}

# Roughly how many cases per district (3-5), each with an ID part.
DISTRICT_CASE_IDS = {
    "Khordha": ["KHR-101", "KHR-102", "KHR-103"],
    "Cuttack": ["CTC-201", "CTC-202"],
    "Puri": ["PRI-301", "PRI-302", "PRI-303"],
    "Ganjam": ["GAN-401", "GAN-402"],
    "Sambalpur": ["SMB-501", "SMB-502"],
    "Howrah": ["HWH-101", "HWH-102", "HWH-103"],
    "Nadia": ["NDA-201", "NDA-202"],
    "Purba Medinipur": ["PM-301", "PM-302"],
    "Patna": ["PAT-101", "PAT-102", "PAT-103", "PAT-104"],
    "Muzaffarpur": ["MUZ-201", "MUZ-202", "MUZ-203"],
    "Gaya": ["GAY-301", "GAY-302"],
    "Ranchi": ["RAN-101", "RAN-102", "RAN-103"],
    "Bokaro": ["BOK-201", "BOK-202"],
    "East Singhbhum": ["ESB-301", "ESB-302", "ESB-303"],
}

BAND = {"stable": 0, "monitoring": 1, "needs_attention": 2, "urgent": 3}
_BAND_NAME = ["stable", "monitoring", "needs_attention", "urgent"]


def _level_for(score: int) -> str:
    if score <= 24:
        return "stable"
    if score <= 49:
        return "monitoring"
    if score <= 74:
        return "needs_attention"
    return "urgent"


def _profile(days: int, start_score: int, slope: float, noise: float = 4.0, rng: random.Random = random):
    """Assessment timeline: score drifts from start_score by slope/day + noise."""
    out = []
    for d in range(days, 0, -1):
        score = max(4, min(97, int(round(start_score + slope * (days - d) + rng.uniform(-noise, noise)))))
        out.append((d, score))
    return out


async def seed_admin_dataset(db) -> dict:
    """Reset + reseed the fictional administrative population.

    Returns a small summary dict for the caller to print.
    """
    rng = random.Random(26094)  # fixed seed -> deterministic fictional data

    # 1. Reset derived docs ONLY for our own adm-* users (never DEMO-042, never real data).
    adm_user_ids = {u["user_id"] async for u in db.users.find(
        {"user_id": {"$regex": "^adm-"}}, {"user_id": 1}
    )}
    if adm_user_ids:
        await db.risk_assessments.delete_many({"user_id": {"$in": list(adm_user_ids)}})
        await db.alerts.delete_many({"user_id": {"$in": list(adm_user_ids)}})
        await db.caseworker_actions.delete_many({"user_id": {"$in": list(adm_user_ids)}})
    await db.users.delete_many({"user_id": {"$regex": "^adm-"}})

    created_users = 0
    assessments = 0
    open_alerts = 0
    follow_ups = 0
    now = datetime.now(timezone.utc)

    for state, districts in REGIONS.items():
        for district, caseworkers in districts.items():
            # Caseworker IDs: round-robin assignment of the district's cases.
            cws = caseworkers or [("CW-UNASSIGNED", "Unassigned")]
            case_list = DISTRICT_CASE_IDS.get(district, [])
            if not case_list:
                continue  # no planned fictional case ids for this district
            for idx, case_id_part in enumerate(case_list):
                uid = f"adm-{state.lower().split()[0]}-{district.lower()[:4]}-{case_id_part.lower()}"
                cw_id, cw_name = cws[idx % len(cws)]

                # Deterministic risk trajectory per case id hash (stable / mixed / elevated).
                h = sum(ord(ch) for ch in case_id_part) % 10
                days_back = rng.randint(75, 95)
                if h % 3 == 0:      # improving case
                    start = rng.randint(52, 62)
                    slope = -0.35
                elif h % 3 == 1:    # worsening case
                    start = rng.randint(18, 30)
                    slope = 0.45
                else:               # broadly stable / moderate
                    start = rng.randint(14, 30)
                    slope = (0.05 if (h % 2 == 0) else -0.02)

                created = now - timedelta(days=days_back)
                await db.users.insert_one({
                    "user_id": uid,
                    "display_name": "",  # aggregate views never show names
                    "phone_hash": "seed-fictional-only",
                    "language_preference": "en",
                    "created_at": created,
                    "case_number": f"{state[:2].upper()}-{case_id_part}",
                    "state": state,
                    "district": district,
                    "administrative_level": "caseworker",
                    "assigned_caseworker": {"id": cw_id, "name": cw_name},
                })
                created_users += 1

                # Assessment timeline (~every 5-9 days across the window).
                profile = _profile(days_back, start, slope, rng=rng)
                prev_score = None
                prev_level = None
                for step, (d_ago, score) in enumerate(profile):
                    if step % 2 != 0 and step != len(profile) - 1:
                        prev_score = score
                        continue  # coarser cadence: keep roughly half the points
                    level = _level_for(score)
                    if prev_level and BAND[level] > BAND[prev_level]:
                        trend = "worsening"
                    elif prev_level and BAND[level] < BAND[prev_level]:
                        trend = "improving"
                    else:
                        trend = "stable" if abs(score - (prev_score or score)) <= 8 else ("worsening" if score > (prev_score or score) else "improving")
                    await db.risk_assessments.insert_one({
                        "assessment_id": str(uuid4()),
                        "user_id": uid,
                        "timestamp": now - timedelta(days=d_ago),
                        "distress_score": score,
                        "risk_level": level,
                        "confidence": 0.7,
                        "trend": trend,
                        "previous_score": prev_score,
                        "change": (score - prev_score) if prev_score is not None else None,
                        "escalation_probability": round(min(0.95, max(0.05, score / 110)), 2),
                        "priority_score": score,
                        "priority_level": level,
                        "crisis_flag": False,
                        "model_version": "prototype-v1",
                    })
                    assessments += 1
                    prev_score, prev_level = score, level

                # A handful of genuinely urgent cases carry OPEN alerts
                # (reuses the real alerts collection — no duplicate logic).
                if h in (4, 9) and slope > 0:
                    latest_score = max(score for (d_ago, score) in profile if d_ago <= 30)
                    level = _level_for(latest_score)
                    is_crisis = h == 9
                    await db.alerts.insert_one(AlertDocument(
                        alert_id=str(uuid4()),
                        user_id=uid,
                        case_id=f"{state[:2].upper()}-{case_id_part}",
                        assessment_id=None,
                        alert_type="crisis_signal" if is_crisis else "risk_increase",
                        severity="critical" if is_crisis else "high",
                        title="Crisis safety signal" if is_crisis else "Risk level increased",
                        description=(
                            "A crisis safety signal requires immediate human review."
                            if is_crisis else
                            "Risk level increased across recent assessments. Human review recommended."
                        ),
                        risk_score=latest_score,
                        previous_risk_score=max(score for (d_ago, score) in profile if d_ago <= 30 and d_ago > 7) if any(d_ago > 7 for d_ago, _ in profile) else None,
                        risk_level="urgent" if level == "urgent" or is_crisis else level,
                        created_at=now - timedelta(hours=rng.randint(2, 20)),
                        requires_human_review=True,
                    ).model_dump())
                    open_alerts += 1

                # Follow-up records: mix of completed, scheduled, overdue.
                if h % 2 == 0:
                    # Overdue = a scheduled follow-up whose date has passed.
                    overdue = h % 5 == 0
                    await db.caseworker_actions.insert_one({
                        "record_kind": "follow_up",
                        "record_id": str(uuid4()),
                        "user_id": uid,
                        "caseworker_id": cw_id,
                        "timestamp": now - timedelta(days=rng.randint(3, 20)),
                        "action_type": "follow_up",
                        "note": "Scheduled check-in (fictional record)",
                        "status": "follow_up_scheduled",
                        "follow_up_date": now - (timedelta(days=2) if overdue else timedelta(days=-rng.randint(1, 9))),
                    })
                    follow_ups += 1
                    if h % 4 == 0:
                        await db.caseworker_actions.insert_one({
                            "record_kind": "follow_up",
                            "record_id": str(uuid4()),
                            "user_id": uid,
                            "caseworker_id": cw_id,
                            "timestamp": now - timedelta(days=rng.randint(30, 50)),
                            "action_type": "follow_up",
                            "note": "Follow-up completed (fictional record)",
                            "status": "follow_up_completed",
                            "follow_up_date": now - timedelta(days=rng.randint(25, 45)),
                            "outcome": "Check-in completed; support continues.",
                        })
                        follow_ups += 1

    return {
        "created_users": created_users,
        "assessments": assessments,
        "open_alerts": open_alerts,
        "follow_ups": follow_ups,
    }
