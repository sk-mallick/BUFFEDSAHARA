"""Beneficiary wellbeing space — deterministic, explainable personalisation.

STEP 1 added the activity catalogue + support-request pathway. STEP 3
makes the personalisation genuinely adaptive using ONLY existing data:

    latest risk state + longitudinal trend  (existing risk_assessments /
    check-ins — NEVER recomputed here)  +  the person's own completion
    history (wellbeing_activity_records)  ->  plan branch + next step

    no data yet                       -> supportive (getting started)
    stable band                        -> supportive
    monitoring, steady/worsening       -> early_support
    monitoring, improving              -> supportive again (easing back)
    needs_attention band               -> human_support priority
    urgent (no crisis signal)          -> human_support priority
    urgent + crisis_flag               -> crisis pathway first (no activities)

The same risk bands used by the whole engine (services/risk_policy.py)
are reused — no conflicting threshold exists anywhere in this module.
Each plan also carries ONE recommended "next small step" with a plain-
language reason, chosen deterministically (never-completed / least
recently completed first). No numerical risk score, internal model
reasoning or caseworker note is ever exposed to the beneficiary.

Privacy: reflections and activity completions are beneficiary-owned and
are never joined into caseworker or admin surfaces. A human-support
request is the ONLY thing that reaches the existing caseworker workflow
— through the same caseworker_actions record the chat's human-support
request writes (no parallel alert system).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger("sahara.wellbeing")

# The caseworker_id convention shared with the portal chat's human-support
# request, so a wellbeing request appears in the case timeline alongside
# chat requests (record_kind "action" in caseworker_actions).
SUPPORT_REQUEST_CW_ID = "sahara-support-request"

_HUMAN_RESPONSE_KINDS = ("intervention", "follow_up")


# ---------------------------------------------------------------------------
# Activity catalogue — small, safe, non-clinical supportive ideas.
# Descriptions always defer to the person's own judgement ("from a place
# you feel safe", "someone you trust"); nothing here instructs medication
# or treatment changes.
# ---------------------------------------------------------------------------

def _a(activity_id: str, category: str, title: str, description: str,
       duration_minutes: int) -> dict:
    return {
        "activity_id": activity_id,
        "category": category,
        "title": title,
        "description": description,
        "duration_minutes": duration_minutes,
    }


CATALOG: list[dict] = [
    # ---- grounding ------------------------------------------------------
    _a("grounding_54321", "grounding",
       "Notice five things around you",
       "Look for 5 things you can see, 4 you can touch, 3 you can hear, "
       "2 you can smell and 1 you can taste. Go slowly, from where you "
       "feel safe.", 3),
    _a("grounding_feet_floor", "grounding",
       "Feel your feet on the ground",
       "Sit comfortably and press your feet firmly into the floor. Notice "
       "the surface, the temperature and the support beneath you for one "
       "minute.", 1),
    _a("grounding_notice_now", "grounding",
       "Name one thing right now",
       "Pause and name one thing you can see, one thing you can hear, and "
       "one thing you are feeling in your body. There is no right answer.",
       2),
    # ---- breathing ------------------------------------------------------
    _a("breathing_box", "breathing",
       "Box breathing",
       "Breathe in for 4 counts, hold for 4, breathe out for 4, hold for "
       "4. Repeat slowly 3–4 times. Stop if it feels uncomfortable.", 3),
    _a("breathing_478", "breathing",
       "Long, slow exhale",
       "Breathe in gently through your nose for 4 counts and breathe out "
       "slowly for 7–8 counts. Repeat for a few rounds.", 3),
    _a("breathing_belly", "breathing",
       "Soft belly breathing",
       "Place one hand on your stomach. Breathe so your hand rises gently "
       "as you breathe in and falls as you breathe out. Slow and easy.",
       2),
    # ---- reflection -----------------------------------------------------
    _a("reflection_three_good", "reflection",
       "Three small good moments",
       "At the end of the day, recall three small moments that were okay "
       "or good — a warm drink, a kind word, a moment of rest.", 3),
    _a("reflection_one_sentence", "reflection",
       "One sentence about today",
       "Write one honest sentence about how today was — for your eyes "
       "only. You can save it as a private reflection.", 3),
    _a("reflection_kind_to_self", "reflection",
       "A kind word to yourself",
       "Think of one thing you would say to a friend who had your day, "
       "and say the same thing to yourself.", 2),
    # ---- social connection ---------------------------------------------
    _a("connection_trusted_message", "social_connection",
       "Message one trusted person",
       "Send a short message to someone you trust — even a simple 'I was "
       "thinking of you'. No need to explain anything.", 3),
    _a("connection_ask_company", "social_connection",
       "Ask for company",
       "Tell one trusted person you would value some company — a walk, a "
       "call, or just sitting together. Asking is allowed.", 3),
    _a("connection_plan_call", "social_connection",
       "Plan a call with someone safe",
       "Choose a person you trust and a time you could call them. Write "
       "the plan down so it feels real.", 2),
    # ---- routine / self-care -------------------------------------------
    _a("routine_fresh_air", "routine_self_care",
       "A few minutes outside",
       "Step outside for a short while if you can — morning light and "
       "fresh air from a place you feel safe.", 5),
    _a("routine_meal_hydration", "routine_self_care",
       "A small meal and water",
       "Have a regular small meal and a glass of water now, even if you "
       "do not feel hungry.", 10),
    _a("routine_winddown", "routine_self_care",
       "Slow down before sleep",
       "For 15 minutes before bed, lower the lights and do one calm "
       "thing — no phone if you can manage it.", 15),
    _a("routine_tidy_corner", "routine_self_care",
       "Tidy one small space",
       "Tidy or clean one small corner — a table, a shelf. Small order "
       "can feel grounding.", 10),
    _a("routine_comfort_music", "routine_self_care",
       "Listen to something comforting",
       "Play music or a voice that comforts you, and let yourself listen "
       "without doing anything else.", 5),
]

_CATALOG_BY_ID = {a["activity_id"]: a for a in CATALOG}

# Deterministic pools per plan branch (ordered, no randomness).
_PLAN_POOLS: dict[str, list[str]] = {
    "supportive": [
        "grounding_54321", "breathing_box", "reflection_three_good",
        "connection_trusted_message", "routine_fresh_air", "routine_comfort_music",
    ],
    "early_support": [
        "grounding_feet_floor", "breathing_belly", "reflection_one_sentence",
        "connection_ask_company",
    ],
    "human_support": [
        "grounding_notice_now", "breathing_478",
    ],
    "crisis": [],
}

# Plain-language summaries, keyed by the internal branch id (path, or
# path_easing when the stored trend is improving). The client-localisable
# key sent over the API is `summary_{internal_id}`; `_SUMMARIES` holds the
# English fallback text.
_SUMMARIES = {
    "supportive": (
        "Small moments of care can support your wellbeing. "
        "Pick one that feels right for today."
    ),
    "supportive_easing": (
        "Your recent check-ins suggest things are easing. Gentle routines "
        "and staying connected can help this steadier feeling settle in."
    ),
    "early_support": (
        "You have shared that things have felt harder lately. Gentle "
        "grounding and staying connected with someone you trust can help — "
        "and you can ask for human support any time."
    ),
    "human_support": (
        "It sounds like a lot is weighing on you right now. Reaching a "
        "person is the most helpful step, so human support comes first — "
        "the ideas below are only to help you settle while you wait."
    ),
    "human_support_easing": (
        "Things seem to be easing a little, which is good — and support is "
        "still here. A person remains the most helpful step while you "
        "settle, at your own pace."
    ),
    "crisis": (
        "You do not have to handle this alone. Reaching a person now is "
        "the most important step, and Sahara's crisis resources are here "
        "if you need them. A human being will follow up with you."
    ),
}

# Plain-language "why this step" lines, one per activity category. Sent as
# both a stable key (for the client dictionary) and an English fallback.
_REASON_KEY_BY_CATEGORY = {
    "grounding": "reason_grounding",
    "breathing": "reason_breathing",
    "reflection": "reason_reflection",
    "social_connection": "reason_connection",
    "routine_self_care": "reason_routine",
}
_REASON_EN = {
    "reason_grounding": (
        "Based on your recent check-ins, Sahara suggests starting with a "
        "short grounding exercise."
    ),
    "reason_breathing": (
        "A short breathing exercise can help you settle before anything "
        "else today."
    ),
    "reason_reflection": (
        "A short reflection is a gentle way to notice how you are doing "
        "right now."
    ),
    "reason_connection": (
        "Connecting with someone you trust can be a small, meaningful "
        "next step today."
    ),
    "reason_routine": (
        "A small daily-care routine can help steady the day for you."
    ),
}

# Non-gamified completion feedback (key + English fallback). Chosen from
# the honest count of completions; never points, streaks or rewards.
_FEEDBACK = {
    "fb_first": "You took a small, real step for yourself today.",
    "fb_steady": "Done at your own pace — that is what matters.",
    "fb_here": "A support person is also here whenever you want one.",
    "fb_gentle": "Small steps like this add up quietly. Be kind to yourself.",
}

# `basis` is visible-language only (where the plan came from), never a score.
# Sent as a stable localisable key + the English fallback text.
_BASIS = {
    "assessment": ("basis_assessment", "Based on your latest wellbeing review."),
    "checkin": ("basis_checkin", "Based on your most recent check-in."),
    "none": ("basis_none", "Getting started — these ideas are a gentle place to begin."),
}


# ---------------------------------------------------------------------------
# Personalisation rules
# ---------------------------------------------------------------------------

def _trend_direction(trend: str | None) -> int:
    """+1 improving · -1 worsening · 0 steady/unknown — from the EXISTING
    stored trend (risk assessments use improving/stable/worsening;
    check-in ai_results use improving/stable/declining/insufficient_data)."""
    t = (trend or "").strip().lower()
    if t in ("improving",):
        return 1
    if t in ("worsening", "declining"):
        return -1
    return 0


def _plan_for(risk_level: str | None, crisis_flag: bool, trend: int) -> tuple[str, bool]:
    """Deterministic branch from the EXISTING risk bands + stored trend.

    Returns (path, easing). Risk bands and crisis_flag come from the stored
    assessment/check-in (risk_policy definitions) — nothing is recomputed.
    A monitoring band that is IMPROVING gently returns to normal supportive
    activities; a monitoring band that is steady or worsening stays in
    early_support; elevated bands keep human support first.
    """
    if crisis_flag or risk_level == "urgent":
        # The existing crisis pathway takes priority — human first, no
        # self-directed activity push while the person may be in danger.
        return ("crisis" if crisis_flag else "human_support"), False
    if risk_level == "needs_attention":
        # Persistent/elevated distress: human support first. An improving
        # trend earns the calmer "easing" wording, never a lower safety bar.
        return "human_support", trend > 0
    if risk_level == "monitoring":
        if trend > 0:
            return "supportive", True   # easing back to normal activities
        return "early_support", False
    return "supportive", False


def _activity_view(activity_id: str, completed: dict[str, dict] | None) -> dict:
    """Catalogue item + the user's own completion flags."""
    item = dict(_CATALOG_BY_ID[activity_id])
    rec = (completed or {}).get(activity_id)
    if rec:
        item["completed"] = True
        item["completed_today"] = _is_today(rec.get("last_completed_at"))
    return item


def _pick_next_step(path: str, completed: dict[str, dict]) -> dict | None:
    """One recommended next small step, deterministically chosen.

    Rule (explainable): among the activities appropriate for the current
    path, suggest the one the person has done LEAST recently (never-done
    activities first, catalogue order breaking ties). After a completion
    the recommendation rotates away from what was just done — so the plan
    adapts without any randomness.
    """
    pool = _PLAN_POOLS[path]
    if not pool:
        return None  # crisis path: no self-directed activity push

    def _ts(aid: str):
        """(never_done_flag, timestamp) — never-done activities come first.
        Drivers may return naive datetimes; normalise before comparing."""
        rec = (completed or {}).get(aid)
        ts = (rec or {}).get("last_completed_at")
        if ts is None:
            return (0, datetime.min.replace(tzinfo=timezone.utc))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return (1, ts)

    candidates = sorted(pool, key=lambda aid: (*_ts(aid), pool.index(aid)))
    chosen = candidates[0]
    item = _activity_view(chosen, completed)
    category = item["category"]
    reason_key = _REASON_KEY_BY_CATEGORY.get(category, "reason_routine")
    return {
        "activity": item,
        "reason_key": reason_key,
        "reason": _REASON_EN[reason_key],
    }


def completion_feedback(times_completed: int) -> tuple[str, str]:
    """Gentle, non-gamified feedback after an activity (key, English text)."""
    if times_completed <= 1:
        key = "fb_first"
    else:
        key = ("fb_steady", "fb_here", "fb_gentle")[(times_completed - 2) % 3]
    return key, _FEEDBACK[key]


async def latest_state(db: AsyncIOMotorDatabase, user_id: str) -> dict:
    """The person's latest stored risk state — or None fields if unseen.

    Reads ONLY what the existing engine already stored. Order:
    risk_assessments (authoritative) -> latest check-in ai_result.
    """
    assessment = await db.risk_assessments.find(
        {"user_id": user_id}).sort("timestamp", -1).to_list(length=1)
    if assessment:
        doc = assessment[0]
        return {
            "risk_level": doc.get("risk_level"),
            "crisis_flag": bool(doc.get("crisis_flag", False)),
            "trend": _trend_direction(doc.get("trend")),
            "basis": "assessment",
        }
    checkin = await db.checkins.find(
        {"user_id": user_id}).sort("timestamp", -1).to_list(length=1)
    if checkin:
        ai = checkin[0].get("ai_result", {})
        return {
            "risk_level": ai.get("risk_level"),
            "crisis_flag": bool(ai.get("crisis_keywords_found")),
            "trend": _trend_direction(ai.get("trend_direction")),
            "basis": "checkin",
        }
    return {"risk_level": None, "crisis_flag": False, "trend": 0, "basis": "none"}


async def build_plan(db: AsyncIOMotorDatabase, user_id: str,
                     completion: dict[str, dict] | None = None) -> dict:
    """The personalised plan (dict ready for the WellbeingPlan model).

    Contains: branch (path), adaptive plain-language summary (with a stable
    key for localisation), the full activity list for the branch, and ONE
    recommended next step with its reason. NO risk score, band, model
    reasoning or caseworker note is included.
    """
    state = await latest_state(db, user_id)
    path, easing = _plan_for(state["risk_level"], state["crisis_flag"], state["trend"])
    completed = completion or await _completion_map(db, user_id)

    internal = f"{path}_easing" if easing and path in ("supportive", "human_support") else path
    if state["basis"] == "none":
        internal = "supportive"  # getting-started wording
    summary_key = f"summary_{internal}"

    activities = [_activity_view(aid, completed) for aid in _PLAN_POOLS[path]]
    next_step = _pick_next_step(path, completed)

    basis_key, basis_en = _BASIS[state["basis"]]
    return {
        "user_id": user_id,
        "path": path,
        "summary_key": summary_key,
        "summary": _SUMMARIES[internal],
        "basis_key": basis_key,
        "basis": basis_en,
        "activities": activities,
        "next_step": next_step,
        "human_support_priority": path in ("human_support", "crisis"),
        "crisis_priority": path == "crisis",
        # note/disclaimer omitted -> the WellbeingPlan model defaults apply
    }


# ---------------------------------------------------------------------------
# Completion + progress helpers (wellbeing_activity_records)
# ---------------------------------------------------------------------------

def _is_today(dt) -> bool:
    if dt is None:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    return dt.astimezone(timezone.utc).date() == now.date()


async def _completion_map(db: AsyncIOMotorDatabase, user_id: str) -> dict[str, dict]:
    """activity_id -> completion record for one user."""
    out: dict[str, dict] = {}
    cursor = db.wellbeing_activity_records.find({"user_id": user_id})
    async for doc in cursor:
        out[doc["activity_id"]] = doc
    return out


async def record_completion(db: AsyncIOMotorDatabase, user_id: str,
                            activity_id: str) -> dict:
    """Mark an activity complete — idempotent upsert.

    Repeating the same completion does NOT create a duplicate record; it
    updates the single (user_id, activity_id) document and increments the
    honest completion count.
    """
    now = datetime.now(timezone.utc)
    existing = await db.wellbeing_activity_records.find_one(
        {"user_id": user_id, "activity_id": activity_id}
    )
    if existing is None:
        # First completion. The unique (user_id, activity_id) index keeps
        # racing duplicates from ever stacking (see database.ensure_indexes).
        await db.wellbeing_activity_records.insert_one({
            "user_id": user_id,
            "activity_id": activity_id,
            "category": _CATALOG_BY_ID[activity_id]["category"],
            "first_completed_at": now,
            "last_completed_at": now,
            "times_completed": 1,
        })
        times = 1
    else:
        # Repeat: increment the honest count on the SAME document (idempotent).
        await db.wellbeing_activity_records.update_one(
            {"user_id": user_id, "activity_id": activity_id},
            {"$set": {"last_completed_at": now},
             "$inc": {"times_completed": 1}},
        )
        times = existing.get("times_completed", 1) + 1
    feedback_key, feedback = completion_feedback(times)
    return {"activity_id": activity_id, "completed_at": now,
            "times_completed": times,
            "feedback_key": feedback_key, "feedback": feedback}


async def progress(db: AsyncIOMotorDatabase, user_id: str) -> dict:
    """Progress summary from the stored completion records."""
    completed: list[dict] = []
    categories: dict[str, int] = {}
    cursor = db.wellbeing_activity_records.find(
        {"user_id": user_id}).sort("first_completed_at", 1)
    async for doc in cursor:
        completed.append({
            "activity_id": doc["activity_id"],
            "category": doc.get("category", "grounding"),
            "first_completed_at": doc["first_completed_at"],
            "last_completed_at": doc["last_completed_at"],
            "times_completed": doc.get("times_completed", 1),
        })
        cat = doc.get("category", "grounding")
        categories[cat] = categories.get(cat, 0) + 1
    return {"total_completed": len(completed), "categories": categories,
            "completed": completed}


# ---------------------------------------------------------------------------
# Human-support request — reuses the EXISTING caseworker workflow record
# (the same caseworker_actions row the portal chat writes). No parallel
# alert system, no false "counsellor is calling" claims.
# ---------------------------------------------------------------------------

async def _latest_support_request(db: AsyncIOMotorDatabase, user_id: str) -> dict | None:
    docs = await db.caseworker_actions.find(
        {"user_id": user_id, "record_kind": "action",
         "caseworker_id": SUPPORT_REQUEST_CW_ID}
    ).sort("timestamp", -1).to_list(length=1)
    return docs[0] if docs else None


async def _latest_human_response(db: AsyncIOMotorDatabase, user_id: str,
                                 after) -> dict | None:
    docs = await db.caseworker_actions.find(
        {"user_id": user_id, "record_kind": {"$in": list(_HUMAN_RESPONSE_KINDS)},
         "timestamp": {"$gte": after}}
    ).sort("timestamp", -1).to_list(length=1)
    return docs[0] if docs else None


async def record_support_request(db: AsyncIOMotorDatabase, user_id: str,
                                 note: str = "") -> dict:
    """Record (or confirm) a beneficiary's request to talk to a person.

    Idempotent: while an unanswered request is pending, a repeated
    request returns the existing one instead of stacking duplicates.
    """
    pending = await _latest_support_request(db, user_id)
    if pending is not None:
        human = await _latest_human_response(db, user_id, pending["timestamp"])
        if human is None:
            return {
                "requested": True,
                "status": "support_requested",
                "timestamp": pending["timestamp"],
                "already_pending": True,
            }

    from services import security  # local import mirrors router usage
    now = datetime.now(timezone.utc)
    await db.caseworker_actions.insert_one({
        "record_kind": "action",
        "record_id": str(uuid4()),
        "user_id": user_id,
        "caseworker_id": SUPPORT_REQUEST_CW_ID,
        "timestamp": now,
        "action_type": "note",
        # No private wellbeing text — just the signal a caseworker needs.
        "note": note or "Beneficiary requested human support from their "
                        "wellbeing space. Requires follow-up.",
        "status": "awaiting_review",
    })
    await security.audit(
        db, actor_user_id=user_id, actor_role="beneficiary",
        event="HUMAN_SUPPORT_REQUESTED", note="wellbeing space",
    )
    return {"requested": True, "status": "support_requested",
            "timestamp": now, "already_pending": False}


async def support_status(db: AsyncIOMotorDatabase, user_id: str) -> dict:
    """Honest support-request state, driven by the human workflow only."""
    pending = await _latest_support_request(db, user_id)
    if pending is None:
        return {"support_requested": False, "requested_at": None,
                "status": "none", "human_response_recorded": False}
    human = await _latest_human_response(db, user_id, pending["timestamp"])
    if human is None:
        return {"support_requested": True, "requested_at": pending["timestamp"],
                "status": "awaiting_review", "human_response_recorded": False}
    if human.get("record_kind") == "follow_up":
        status = human.get("status") or "follow_up_scheduled"
    else:
        status = "action_planned"
    return {"support_requested": True, "requested_at": pending["timestamp"],
            "status": status, "human_response_recorded": True}
