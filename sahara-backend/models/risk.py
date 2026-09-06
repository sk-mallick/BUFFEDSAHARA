"""Models for the risk assessment layer (risk_assessments collection)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

RISK_LEVELS = Literal["stable", "monitoring", "needs_attention", "urgent"]
IMPACTS = Literal["low", "medium", "high", "critical"]


class Factor(BaseModel):
    """One explainable contribution to the distress score."""

    factor: str
    impact: IMPACTS
    description: str


class TrendWindow(BaseModel):
    """Longitudinal trend for one lookback window."""

    window: Literal["7_days", "14_days", "30_days"]
    direction: Literal["improving", "stable", "worsening", "insufficient_data"]
    slope: float = 0.0
    points: int = 0


class RiskAssessment(BaseModel):
    """A stored risk assessment document (risk_assessments collection).

    `model_version` records which engine version produced the assessment
    so future models can be compared against it.
    """

    assessment_id: str
    user_id: str
    timestamp: datetime

    distress_score: int = Field(..., ge=0, le=100)
    risk_level: RISK_LEVELS
    confidence: float = Field(..., ge=0.0, le=1.0)

    # Longitudinal trend (7-day direction is the headline `trend`).
    trend: Literal["improving", "stable", "worsening", "insufficient_data"]
    trends: list[TrendWindow] = Field(default_factory=list)
    previous_score: Optional[int] = None
    change: Optional[int] = None

    # Escalation prediction (prototype — see engine docstring).
    escalation_probability: float = Field(..., ge=0.0, le=1.0)
    prediction_window: str = "7_days"

    # Explainability.
    contributing_factors: list[Factor] = Field(default_factory=list)

    # Prioritisation.
    priority_score: int = Field(..., ge=0, le=100)
    priority_level: RISK_LEVELS

    # Safety override.
    crisis_flag: bool = False
    crisis_reason: Optional[str] = None

    model_version: str = "prototype-v1"

    # Prototype honesty — surfaced by the UI wherever the score is shown.
    disclaimer: str = "AI-assisted risk estimate. This is not a clinical diagnosis."
    prediction_disclaimer: str = (
        "Prototype predictive model — requires validation on real anonymised "
        "data before operational deployment."
    )