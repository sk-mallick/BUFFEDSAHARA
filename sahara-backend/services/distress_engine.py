"""Core distress assessment engine — score, trend, predict, prioritise.

Pipeline (INTERACT → ANALYSE → SCORE → PREDICT → ALERT → HUMAN SUPPORT):

    1. GATHER — wellbeing check-ins, chatbot signals, caseworker actions
    2. SCORE  — dynamic distress score 0–100 from check-in + conversation
    3. TREND  — longitudinal 7/14/30-day analysis (numpy slope)
    4. PREDICT— transparent prototype escalation estimate (NOT a model)
    5. OVERRIDE — deterministic crisis safety rule (never waits on AI)
    6. PRIORITISE — case ranking via services/prioritisation_service.py
    7. STORE  — risk_assessments document, versioned (prototype-v1)

PROTOTYPE STATUS — READ BEFORE USING:
- The risk bands below are PROTOTYPE/DEMO thresholds for SIH26094, not
  medically validated clinical thresholds.
- The escalation probability is a transparent rule-based heuristic, not
  a trained or clinically validated ML model. There is no real training
  dataset in this project. It is labelled accordingly everywhere.
- No protected characteristics (caste, religion, ethnicity, gender,
  location, etc.) are used as predictive features — the engine only
  looks at consent-based behavioural signals.
- The final decision always belongs to an authorised human counsellor.

DISCLAIMERS (surface these in the UI):
  "AI-assisted risk estimate. This is not a clinical diagnosis."
  "Prototype model. Any operational deployment would require validation,
   clinical oversight, bias assessment, security review, and appropriate
   government approvals."
"""

from __future__ import annotations

import logging
import math
import uuid
from datetime import datetime, timedelta, timezone

import numpy as np

from services import prioritisation_service, risk_policy

logger = logging.getLogger("sahara.distress")

# ---------------------------------------------------------------------------
# PROTOTYPE THRESHOLDS — documented as demo thresholds, NOT clinical.
# The score bands come from ONE shared definition (services/risk_policy.py)
# so the engine, check-in labels, alerts and admin aggregations all speak
# the same risk language.
# ---------------------------------------------------------------------------
RISK_BANDS: list[tuple[int, str]] = risk_policy.RISK_BANDS

MODEL_VERSION = "prototype-v1"
PREDICTION_WINDOW = "7_days"

CHECKIN_WINDOW_DAYS = 60    # how far back check-ins are considered
CHAT_WINDOW_DAYS = 30       # how far back conversation signals are considered
CRISIS_LOOKBACK_DAYS = 14   # a crisis signal within this window forces Urgent

TREND_SLOPE_WORSEN = 2.0    # slope > +2  → worsening (matches scoring_service)
TREND_SLOPE_IMPROVE = -2.0  # slope < -2  → improving
SUDDEN_DETERIORATION_JUMP = 25  # +25 pts within 7 days → "sudden deterioration"
ELEVATED_AT = risk_policy.ELEVATED_AT  # >= needs_attention band floor

DISCLAIMER = "AI-assisted risk estimate. This is not a clinical diagnosis."
PREDICTION_DISCLAIMER = (
    "Prototype predictive model — requires validation on real anonymised "
    "data before operational deployment."
)

_FOLLOWUP_ACTIONS = ("counsellor_contact", "follow_up_completed")


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _as_utc(dt: datetime) -> datetime:
    """Normalise stored timestamps to tz-aware UTC (drivers may return naive)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _map_risk_level(score: int) -> str:
    return risk_policy.risk_level_for_score(score)


# ---------------------------------------------------------------------------
# Data gathering
# ---------------------------------------------------------------------------

async def _gather_data(user_id: str, db) -> dict:
    """Pull the consent-based signals the engine is allowed to see."""
    now = datetime.now(timezone.utc)

    checkin_cursor = db.checkins.find(
        {"user_id": user_id, "timestamp": {"$gte": now - timedelta(days=CHECKIN_WINDOW_DAYS)}}
    ).sort("timestamp", 1)
    checkins = [doc async for doc in checkin_cursor]

    chat_cursor = db.chat_logs.find(
        {"user_id": user_id, "timestamp": {"$gte": now - timedelta(days=CHAT_WINDOW_DAYS)}}
    ).sort("timestamp", 1)
    chats = [doc async for doc in chat_cursor]

    followup = await db.caseworker_actions.find(
        {"user_id": user_id, "action_type": {"$in": list(_FOLLOWUP_ACTIONS)}}
    ).sort("timestamp", -1).to_list(length=1)

    return {"checkins": checkins, "chats": chats, "followup": followup[0] if followup else None}


def _checkin_scores(checkins: list[dict]) -> list[int]:
    """Distress scores in chronological order (from the check-in pipeline)."""
    return [int(doc["ai_result"]["distress_score"]) for doc in checkins]


# ---------------------------------------------------------------------------
# Conversation signals (chat logs) — aggregates only, never raw content.
# ---------------------------------------------------------------------------

def _chat_signal(chats: list[dict]) -> dict | None:
    """Aggregate conversation behaviour: sentiment mix, crisis, frequency.

    Returns None when there is no chat history. Only aggregates leave
    this function — raw chat content is never exposed to the dashboard.
    """
    if not chats:
        return None
    sentiments = [c.get("sentiment") for c in chats]
    negative = sum(1 for s in sentiments if s == "negative")
    crisis_count = sum(1 for c in chats if c.get("crisis_detected"))

    # Consecutive negative turns at the END of the conversation (most recent).
    consecutive_negative = 0
    for c in reversed(chats):
        if c.get("sentiment") == "negative":
            consecutive_negative += 1
        else:
            break

    # Sudden change in conversational behaviour: activity in the last 7
    # days vs the previous 7 (a sharp drop or spike can both be signals).
    now = datetime.now(timezone.utc)
    week = timedelta(days=7)
    recent = sum(1 for c in chats if _as_utc(c["timestamp"]) >= now - week)
    prior = sum(1 for c in chats if now - 2 * week <= _as_utc(c["timestamp"]) < now - week)
    behaviour_change = recent >= 2 and prior == 0  # conversation "turned on"

    return {
        "frequency": len(chats),
        "negative_ratio": round(negative / len(chats), 3),
        "consecutive_negative": consecutive_negative,
        "crisis_count": crisis_count,
        "behaviour_change": behaviour_change,
    }


# ---------------------------------------------------------------------------
# Longitudinal trend engine (7 / 14 / 30 days)
# ---------------------------------------------------------------------------

def _window_trend(scores: list[int], timestamps: list[datetime], window_days: int, now: datetime) -> dict:
    """Slope + direction for one lookback window. Needs >= 2 points."""
    cutoff = now - timedelta(days=window_days)
    pts = [(t, s) for t, s in zip(timestamps, scores) if t >= cutoff]
    if len(pts) < 2:
        return {"direction": "insufficient_data", "slope": 0.0, "points": len(pts)}
    xs = np.arange(len(pts), dtype=float)
    ys = np.asarray([p[1] for p in pts], dtype=float)
    slope = float(np.polyfit(xs, ys, 1)[0])
    if slope > TREND_SLOPE_WORSEN:
        direction = "worsening"
    elif slope < TREND_SLOPE_IMPROVE:
        direction = "improving"
    else:
        direction = "stable"
    return {"direction": direction, "slope": round(slope, 2), "points": len(pts)}


def _compute_trends(checkins: list[dict]) -> dict:
    """7/14/30-day trends + rate of change + consecutive elevated count."""
    now = datetime.now(timezone.utc)
    scores = _checkin_scores(checkins)
    timestamps = [_as_utc(doc["timestamp"]) for doc in checkins]

    trends = {
        f"{w}_days": _window_trend(scores, timestamps, w, now) for w in (7, 14, 30)
    }

    # Rate of change: latest score vs the previous one (or last assessment).
    previous_score = scores[-2] if len(scores) >= 2 else None
    change = (scores[-1] - previous_score) if previous_score is not None else None

    # 7-day change: latest score vs the closest observation >= 7 days ago.
    change_7d = None
    if len(scores) >= 2:
        cutoff = now - timedelta(days=7)
        older = [s for t, s in zip(timestamps, scores) if t < cutoff]
        if older:
            change_7d = scores[-1] - older[-1]

    # Consecutive elevated observations ending at the latest one.
    consecutive_elevated = 0
    for s in reversed(scores):
        if s >= ELEVATED_AT:
            consecutive_elevated += 1
        else:
            break

    return {
        "trends": trends,
        "previous_score": previous_score,
        "change": change,
        "change_7d": change_7d,
        "consecutive_elevated": consecutive_elevated,
        "sudden_deterioration": bool(change_7d is not None and change_7d >= SUDDEN_DETERIORATION_JUMP),
    }


# ---------------------------------------------------------------------------
# Escalation prediction — transparent prototype heuristic
# ---------------------------------------------------------------------------

def _escalation_probability(
    distress: int, trends: dict, chat: dict | None, missed: bool, consecutive_elevated: int, sudden: bool
) -> float:
    """Estimate P(escalation within the next 7 days).

    EXPLICITLY a prototype: a transparent weighted heuristic so a
    caseworker can see exactly why the number moved. It is NOT a trained
    model and carries the PREDICTION_DISCLAIMER in the UI.
    """
    p = distress / 100.0
    d7 = trends["trends"]["7_days"]["direction"]
    if d7 == "worsening":
        p += 0.15
    elif d7 == "improving":
        p -= 0.10
    # Rate of change: up to ±0.15 from a ±30-point 7-day swing.
    if trends["change_7d"] is not None:
        p += _clamp(trends["change_7d"], -30, 30) / 100.0 * 0.5
    if chat:
        if chat["negative_ratio"] > 0.5:
            p += 0.10
        if chat["crisis_count"] > 0:
            p += 0.10
        if chat["behaviour_change"]:
            p += 0.05
    if missed:
        p += 0.05
    if consecutive_elevated >= 3:
        p += 0.05
    if sudden:
        p += 0.10
    return round(_clamp(p, 0.02, 0.98), 2)


# ---------------------------------------------------------------------------
# Explainable contributing factors — plain language, no chat content
# ---------------------------------------------------------------------------

_IMPACT_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _build_factors(
    *, distress: int, checkins: list[dict], chats: list[dict], chat: dict | None,
    trends: dict, missed: bool, days_since_followup: int | None, crisis_keywords: list[str],
) -> list[dict]:
    """Plain-language reasons behind the score, most important first."""
    factors: list[dict] = []

    if crisis_keywords:
        factors.append({
            "factor": "Crisis language detected",
            "impact": "critical",
            "description": "Crisis-related language appeared recently in check-ins or conversation. Safety override applied.",
        })
    if distress >= 75:
        factors.append({
            "factor": "High current distress",
            "impact": "high",
            "description": "The current distress score is in the highest band.",
        })
    if trends["trends"]["7_days"]["direction"] == "worsening":
        factors.append({
            "factor": "Recent distress increase",
            "impact": "high",
            "description": "Wellbeing distress increased over the previous 7 days.",
        })
    if trends["sudden_deterioration"]:
        factors.append({
            "factor": "Sudden deterioration",
            "impact": "high",
            "description": "Distress rose sharply within the last 7 days.",
        })
    if chat and chat["crisis_count"] > 0:
        factors.append({
            "factor": "Crisis signals in conversation",
            "impact": "high",
            "description": "Recent conversations triggered the crisis safety net.",
        })
    if chat and chat["negative_ratio"] > 0.5:
        factors.append({
            "factor": "Repeated negative sentiment",
            "impact": "medium",
            "description": "Several recent interactions showed negative sentiment.",
        })
    if chat and chat["consecutive_negative"] >= 2:
        factors.append({
            "factor": "Persistent negative conversation",
            "impact": "medium",
            "description": "The most recent conversations were consistently negative.",
        })
    if trends["consecutive_elevated"] >= 3:
        factors.append({
            "factor": "Persistent elevated distress",
            "impact": "medium",
            "description": "Distress has stayed elevated across several consecutive check-ins.",
        })
    if checkins:
        latest_form = checkins[-1].get("form_data", {})
        if latest_form.get("sleep") is not None and int(latest_form["sleep"]) <= 3:
            factors.append({
                "factor": "Sleep disruption",
                "impact": "medium",
                "description": "Recent check-ins indicate reduced sleep quality.",
            })
        if latest_form.get("feeling_safe") == "no":
            factors.append({
                "factor": "Safety concerns reported",
                "impact": "medium",
                "description": "The most recent check-in reported feeling unsafe.",
            })
    if missed:
        factors.append({
            "factor": "Missed check-ins",
            "impact": "low",
            "description": "Expected check-ins were skipped recently. Skipping is always allowed — noted as context, not blame.",
        })
    if days_since_followup is None or days_since_followup > 7:
        factors.append({
            "factor": "Awaiting human follow-up",
            "impact": "low",
            "description": "No human follow-up has been recorded for this case recently.",
        })
    if not checkins:
        factors.append({
            "factor": "No check-in data",
            "impact": "low",
            "description": "Assessment is based on conversation signals only — no wellbeing check-ins available yet.",
        })

    factors.sort(key=lambda f: _IMPACT_RANK[f["impact"]])
    # API returns up to 6; the case-detail UI shows the top 3–5.
    return factors[:6]


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def assess_user(user_id: str, db) -> dict | None:
    """Run one full assessment for a user.

    Returns a ready-to-store assessment dict, or None when the user has
    no data at all (no check-ins, no chat history) — the router turns
    that into a 404 so callers can distinguish "no data" from "stable".
    """
    data = await _gather_data(user_id, db)
    checkins, chats, followup = data["checkins"], data["chats"], data["followup"]

    if not checkins and not chats:
        return None

    now = datetime.now(timezone.utc)
    trends = _compute_trends(checkins)
    chat = _chat_signal(chats)

    # ---- Current distress score -------------------------------------------
    # Blend the check-in pipeline's score (70%) with conversation signals
    # (30%). When one source is missing, the other carries the score.
    checkin_score = _checkin_scores(checkins)[-1] if checkins else None
    if chat is not None:
        chat_score = round(chat["negative_ratio"] * 100)
        if chat["crisis_count"] > 0:
            chat_score = max(chat_score, 60)
    else:
        chat_score = None

    if checkin_score is not None and chat_score is not None:
        distress_score = int(round(0.7 * checkin_score + 0.3 * chat_score))
    else:
        distress_score = checkin_score if checkin_score is not None else chat_score
    distress_score = int(_clamp(distress_score, 0, 100))

    # ---- Missed check-ins (cadence is weekly; context, not blame) ----------
    missed = False
    if checkins:
        latest_ts = _as_utc(checkins[-1]["timestamp"])
        if len(checkins) >= 2 and (now - latest_ts).days > 7:
            missed = True

    # ---- Escalation prediction (prototype heuristic) ------------------------
    escalation_probability = _escalation_probability(
        distress_score, trends, chat, missed,
        trends["consecutive_elevated"], trends["sudden_deterioration"],
    )

    # ---- Crisis override — deterministic safety rule, NOT an AI decision ----
    crisis_keywords: list[str] = []
    crisis_cutoff = now - timedelta(days=CRISIS_LOOKBACK_DAYS)
    from services import keyword_service  # local import: the trusted detector
    for doc in checkins:
        if _as_utc(doc["timestamp"]) >= crisis_cutoff:
            crisis_keywords += doc.get("ai_result", {}).get("crisis_keywords_found", [])
            crisis_keywords += keyword_service.find_crisis_keywords(doc.get("form_data", {}).get("text_response", ""))
    if chat and chat["crisis_count"] > 0:
        crisis_keywords.append("conversation_crisis_signal")
    crisis_keywords = list(dict.fromkeys(crisis_keywords))

    crisis_flag = bool(crisis_keywords) or (checkins and checkins[-1].get("ai_result", {}).get("risk_level") == "urgent")
    crisis_reason = None
    if crisis_flag:
        crisis_reason = "Urgent — safety signal detected"
    elif distress_score >= 75:
        crisis_reason = "Elevated predicted risk"

    # ---- Risk level (prototype bands, crisis override applied LAST) --------
    risk_level = _map_risk_level(distress_score)
    if crisis_flag:
        risk_level = "urgent"

    # ---- Confidence (data-volume based, honest about sparse signals) -------
    confidence = round(_clamp(
        0.45 + 0.05 * min(len(checkins), 5) + (0.10 if chats else 0.0) + (0.05 if crisis_flag else 0.0),
        0.45, 0.95,
    ), 2)

    # ---- Time since last human follow-up -----------------------------------
    days_since_followup = None
    if followup:
        days_since_followup = (now - _as_utc(followup["timestamp"])).days

    # ---- Explainable factors ------------------------------------------------
    factors = _build_factors(
        distress=distress_score, checkins=checkins, chats=chats, chat=chat,
        trends=trends, missed=missed, days_since_followup=days_since_followup,
        crisis_keywords=crisis_keywords,
    )

    # ---- Prioritisation ------------------------------------------------------
    priority = prioritisation_service.compute_priority(
        distress_score=distress_score,
        change_7d=trends["change_7d"],
        escalation_probability=escalation_probability,
        consecutive_elevated=trends["consecutive_elevated"],
        days_since_followup=days_since_followup,
        crisis_flag=crisis_flag,
    )

    return {
        "assessment_id": str(uuid.uuid4()),
        "user_id": user_id,
        "timestamp": now,
        "distress_score": distress_score,
        "risk_level": risk_level,
        "confidence": confidence,
        "trend": trends["trends"]["7_days"]["direction"],
        "trends": [
            {"window": key, **value} for key, value in trends["trends"].items()
        ],
        "previous_score": trends["previous_score"],
        "change": trends["change"],
        "change_7d": trends["change_7d"],
        "escalation_probability": escalation_probability,
        "prediction_window": PREDICTION_WINDOW,
        "contributing_factors": factors,
        "priority_score": priority["priority_score"],
        "priority_level": priority["priority_level"],
        "priority_reason": priority["reason"],
        "crisis_flag": crisis_flag,
        "crisis_reason": crisis_reason,
        "missed_checkin": missed,
        "model_version": MODEL_VERSION,
        "disclaimer": DISCLAIMER,
        "prediction_disclaimer": PREDICTION_DISCLAIMER,
    }