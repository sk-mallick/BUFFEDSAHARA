"""The 7-step distress scoring pipeline.

Every step is commented for readers without an ML background. The output
is a single 0–100 "distress score" plus a risk level, a confidence
value, and a plain-language recommended action.

Weights at a glance:
    NLP sentiment   40%   (what the person wrote)
    Form answers    35%   (what the person selected)
    Longitudinal    25%   (how the person is trending over time)
When fewer than 3 historical check-ins exist there is no trend yet, so
the weights are redistributed (NLP 57% / form 43%) and the trend
component is skipped.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import numpy as np

from models.checkin import AIResult, CheckinRequest, ComponentScores, NLPScores
from services import keyword_service, nlp_service, risk_policy

logger = logging.getLogger("sahara.scoring")

# Step 5 — score bands -> risk level. The bands come from ONE shared
# definition (services/risk_policy.py) so a check-in's risk level always
# agrees with the risk assessment + alert layers that consume it.
RISK_BANDS: list[tuple[int, str]] = risk_policy.RISK_BANDS

# Step 6 — rule-based recommended actions, one per risk level.
RECOMMENDED_ACTIONS: dict[str, str] = {
    "stable": "Continue regular check-ins. No immediate action needed.",
    "monitoring": "Review check-in responses. Schedule a follow-up within 7 days.",
    "needs_attention": "Assign counsellor. Reach out within 48 hours.",
    "urgent": "IMMEDIATE: Contact victim within 24 hours. Escalate to senior counsellor.",
}

_TREND_WINDOW_DAYS = 30
_TREND_MIN_POINTS = 3

_RISK_RANK = risk_policy.RISK_RANK


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _map_risk_level(score: int) -> str:
    return risk_policy.risk_level_for_score(score)


def _build_signals(request: CheckinRequest, keywords: list[str], trend_direction: str) -> list[str]:
    """Human-readable reasons behind the score (stored for caseworkers)."""
    signals: list[str] = []
    if request.mood <= 3:
        signals.append("low_mood")
    if request.sleep <= 3:
        signals.append("sleep_disturbance")
    if request.feeling_safe != "yes":
        signals.append("safety_concern")
    if request.recent_incident:
        signals.append("recent_incident")
    if not request.support_received:
        signals.append("no_support_received")
    if keywords:
        signals.append("crisis_keywords")
    if trend_direction == "declining":
        signals.append("declining_trend")
    return signals


async def compute_ai_result(request: CheckinRequest, db) -> AIResult:
    """Run the full pipeline for one check-in. `db` is the Motor database."""

    # ------------------------------------------------------------------
    # STEP 1 — NLP sentiment score (weight 40%)
    # Negative probability of the free-text response, scaled to 0–100.
    # If a transcript is also provided, average the two negative
    # probabilities (and average the full distributions for the stored
    # nlp_scores dict) so one very negative text cannot dominate.
    # ------------------------------------------------------------------
    nlp_scores: dict[str, float] = nlp_service.sentiment_scores(request.text_response)
    nlp_negative = nlp_scores["negative"]
    if request.transcript:
        transcript_scores = nlp_service.sentiment_scores(request.transcript)
        nlp_scores = {
            key: (nlp_scores[key] + transcript_scores[key]) / 2.0 for key in nlp_scores
        }
        nlp_negative = (nlp_negative + transcript_scores["negative"]) / 2.0
    nlp_score = nlp_negative * 100.0

    # ------------------------------------------------------------------
    # STEP 2 — structured form score (weight 35%)
    # Each answer is mapped to a 0–100 distress contribution, then
    # averaged. Low mood/sleep and feeling unsafe raise the score;
    # a recent incident adds +20, missing support adds +15.
    # ------------------------------------------------------------------
    mood_score = (10 - request.mood) * 10          # mood 1 -> 90 pts distress
    sleep_score = (10 - request.sleep) * 8         # sleep 1 -> 72 pts distress
    safety_score = {"no": 100.0, "sometimes": 50.0, "yes": 0.0}[request.feeling_safe]
    incident_bonus = 20.0 if request.recent_incident else 0.0
    support_penalty = 15.0 if not request.support_received else 0.0

    form_score = (mood_score + sleep_score + safety_score) / 3.0 + incident_bonus + support_penalty
    form_score = _clamp(form_score, 0.0, 100.0)

    # ------------------------------------------------------------------
    # STEP 3 — longitudinal trend (weight 25%)
    # Look at this user's distress scores from the last 30 days. With
    # 3+ points, fit a straight line (degree-1 polynomial) through them
    # with numpy; its slope tells us the direction of travel:
    #     slope > +2.0 -> declining (getting worse), penalty +15
    #     slope < -2.0 -> improving (getting better), bonus  -10
    #     otherwise    -> stable, penalty 0
    # The trend component is the mean of the last 3 scores — "where the
    # person currently sits" on their own trajectory.
    # With fewer than 3 points there is no trend yet:
    #     trend = "insufficient_data", weights redistribute (57/43/0).
    # ------------------------------------------------------------------
    cutoff = datetime.now(timezone.utc) - timedelta(days=_TREND_WINDOW_DAYS)
    cursor = db.checkins.find(
        {"user_id": request.user_id, "timestamp": {"$gte": cutoff}},
        {"ai_result.distress_score": 1, "timestamp": 1},
    ).sort("timestamp", 1)

    past_scores: list[float] = []
    async for doc in cursor:
        past_scores.append(float(doc["ai_result"]["distress_score"]))

    if len(past_scores) < _TREND_MIN_POINTS:
        trend_direction = "insufficient_data"
        trend_penalty = 0.0
        trend_component = 0.0
        weight_nlp, weight_form, weight_trend = 0.57, 0.43, 0.0
    else:
        x = np.arange(len(past_scores), dtype=float)
        slope = float(np.polyfit(x, np.asarray(past_scores, dtype=float), 1)[0])
        if slope > 2.0:
            trend_direction, trend_penalty = "declining", 15.0
        elif slope < -2.0:
            trend_direction, trend_penalty = "improving", -10.0
        else:
            trend_direction, trend_penalty = "stable", 0.0
        trend_component = float(np.mean(past_scores[-_TREND_MIN_POINTS:]))
        weight_nlp, weight_form, weight_trend = 0.40, 0.35, 0.25

    # ------------------------------------------------------------------
    # STEP 4 — final score
    # Weighted sum of the three components plus the trend penalty/bonus,
    # clamped to 0–100 and rounded to the nearest integer.
    # ------------------------------------------------------------------
    final_score = (
        nlp_score * weight_nlp
        + form_score * weight_form
        + trend_component * weight_trend
        + trend_penalty
    )
    final_score = int(round(_clamp(final_score, 0.0, 100.0)))

    # ------------------------------------------------------------------
    # STEP 5 — risk level mapping + crisis keyword override
    # Map the score to a level, then apply the keyword override AFTER
    # mapping: ANY keyword forces at least "needs_attention", 2+ force
    # "urgent". The keyword layer is authoritative over the model —
    # a matched phrase like "want to die" is concrete evidence.
    # ------------------------------------------------------------------
    risk_level = _map_risk_level(final_score)
    keywords: list[str] = keyword_service.find_crisis_keywords(request.text_response)
    if request.transcript:
        keywords += keyword_service.find_crisis_keywords(request.transcript)
    keywords = list(dict.fromkeys(keywords))  # dedupe, keep order

    if len(keywords) >= 2:
        risk_level = "urgent"
    elif len(keywords) == 1 and _RISK_RANK[risk_level] < _RISK_RANK["needs_attention"]:
        risk_level = "needs_attention"

    # ------------------------------------------------------------------
    # STEP 6 — recommended action (rule-based, plain language)
    # ------------------------------------------------------------------
    recommended_action = RECOMMENDED_ACTIONS[risk_level]
    if keywords:
        recommended_action = "⚠ Crisis signal detected. " + recommended_action

    # ------------------------------------------------------------------
    # STEP 7 — confidence
    # How much the two independent evidence sources (NLP vs. form)
    # agree. Large disagreement between them = uncertain signal.
    #     confidence = 1 - (std of [nlp_score, form_score] / 100)
    # Clamped to 0–1 and rounded to 2 decimals.
    # ------------------------------------------------------------------
    agreement = float(np.std([nlp_score, form_score]))
    confidence = round(_clamp(1.0 - agreement / 100.0, 0.0, 1.0), 2)

    return AIResult(
        distress_score=final_score,
        risk_level=risk_level,
        confidence=confidence,
        trend_direction=trend_direction,
        signals_detected=_build_signals(request, keywords, trend_direction),
        crisis_keywords_found=keywords,
        recommended_action=recommended_action,
        nlp_scores=NLPScores(**nlp_scores),
        component_scores=ComponentScores(
            nlp_score=round(nlp_score, 2),
            form_score=round(form_score, 2),
            trend_component=round(trend_component, 2),
        ),
    )