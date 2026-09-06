"""Models for the wellbeing check-in flow.

One check-in document is stored per submission, containing the raw
form answers (`form_data`) next to the AI result (`ai_result`) so the
scoring inputs are always auditable after the fact.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request — what the frontend posts to POST /api/checkin
# ---------------------------------------------------------------------------

class CheckinRequest(BaseModel):
    """A single wellbeing check-in submission."""

    user_id: str = Field(..., description="UUID of the user, as used by the frontend")
    mood: int = Field(..., ge=1, le=10, description="1 = worst, 10 = best")
    sleep: int = Field(..., ge=1, le=10, description="1 = worst, 10 = best")
    feeling_safe: Literal["yes", "no", "sometimes"]
    text_response: str = Field(..., min_length=1, description="Free-text answer, EN or HI")
    recent_incident: bool = False
    support_received: bool = False
    transcript: Optional[str] = Field(default=None, description="Optional NHAA call/chat transcript for extra NLP context")


# ---------------------------------------------------------------------------
# AI result — the scored output attached to every check-in
# ---------------------------------------------------------------------------

class NLPScores(BaseModel):
    """Class probabilities from the sentiment model (they sum to ~1.0)."""

    positive: float = 0.0
    neutral: float = 0.0
    negative: float = 0.0


class ComponentScores(BaseModel):
    """The three sub-scores behind the final distress score."""

    nlp_score: float = Field(..., ge=0, le=100, description="From sentiment: negative probability × 100")
    form_score: float = Field(..., ge=0, le=100, description="From structured form answers")
    trend_component: float = Field(..., ge=0, le=100, description="From longitudinal trend; 0 when insufficient data")


class AIResult(BaseModel):
    """Everything the scoring pipeline produced for one check-in."""

    distress_score: int = Field(..., ge=0, le=100)
    risk_level: Literal["stable", "monitoring", "needs_attention", "urgent"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    trend_direction: Literal["improving", "stable", "declining", "insufficient_data"]
    signals_detected: list[str] = Field(default_factory=list)
    crisis_keywords_found: list[str] = Field(default_factory=list)
    recommended_action: str
    nlp_scores: NLPScores
    component_scores: ComponentScores


# ---------------------------------------------------------------------------
# Stored document + API response
# ---------------------------------------------------------------------------

class CheckinDocument(BaseModel):
    """A document in the `checkins` collection (mirrors Mongo storage)."""

    checkin_id: str
    user_id: str
    timestamp: datetime
    form_data: dict
    ai_result: AIResult


class CheckinAssessmentSummary(BaseModel):
    """The risk assessment auto-generated right after this check-in.

    Present when the authenticated pipeline ran (auth enforced mode).
    Absent (None) in the legacy open mode where check-ins are stored
    without a risk refresh.
    """

    assessment_id: str
    distress_score: int = Field(..., ge=0, le=100)
    risk_level: Literal["stable", "monitoring", "needs_attention", "urgent"]
    trend: Literal["improving", "stable", "worsening", "insufficient_data"]
    change: Optional[int] = None
    escalation_probability: float = Field(..., ge=0.0, le=1.0)
    crisis_flag: bool = False


class CheckinAlertSummary(BaseModel):
    """One alert raised for this check-in (empty list = none warranted)."""

    alert_id: str
    alert_type: Literal[
        "risk_increase", "rapid_deterioration", "crisis_signal",
        "persistent_elevated_risk", "missed_followup",
    ]
    severity: Literal["low", "medium", "high", "critical"]
    title: str


class CheckinResponse(BaseModel):
    """Response of POST /api/checkin.

    Kept backward-compatible: the original fields are unchanged and the
    assessment/alert summary is optional (only populated when the
    authenticated pipeline actually ran).
    """

    checkin_id: str
    timestamp: datetime
    ai_result: AIResult
    assessment: Optional[CheckinAssessmentSummary] = None
    alerts_created: list[CheckinAlertSummary] = Field(default_factory=list)
    # Prototype honesty — surfaced wherever a score is shown.
    disclaimer: str = "AI-assisted risk estimate. This is not a clinical diagnosis."