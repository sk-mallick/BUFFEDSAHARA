"""Models for the alert system (alerts collection).

An alert is the operational hand-off from the AI layer to the human
layer: the risk engine or safety net raises it, an authorised
caseworker acknowledges it, and it stays open until a human resolves it.
AI never closes its own alerts — only a human action does.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

# Alert severity tiers — mirrors the Sahara risk language. `critical` is
# reserved for genuine safety conditions (crisis signals) and never used
# on victim-facing screens.
Severity = Literal["low", "medium", "high", "critical"]

AlertType = Literal[
    "risk_increase",           # risk level rose a band (e.g. monitoring -> needs_attention)
    "rapid_deterioration",     # distress score jumped sharply inside a window
    "crisis_signal",           # deterministic safety signal detected
    "persistent_elevated_risk",  # elevated risk across several assessments
    "missed_followup",         # a case that needs a human has not had one in time
]

ReviewStatus = Literal[
    "awaiting_review",
    "reviewed",
    "action_planned",
    "follow_up_scheduled",
    "follow_up_completed",
    "escalated",
]


class AlertDocument(BaseModel):
    """A document in the `alerts` collection."""

    alert_id: str
    user_id: str
    case_id: str = ""  # display case id (case_number when known, else user_id)
    assessment_id: Optional[str] = None  # the assessment that triggered it (dedup key part)

    alert_type: AlertType
    severity: Severity
    title: str
    description: str  # explainable reason — never raw private chat content

    risk_score: int = Field(..., ge=0, le=100)
    previous_risk_score: Optional[int] = None
    risk_level: Literal["stable", "monitoring", "needs_attention", "urgent"]

    created_at: datetime
    requires_human_review: bool = True

    # Human lifecycle — set by an authorised caseworker only.
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    review_status: ReviewStatus = "awaiting_review"


class AlertAckRequest(BaseModel):
    """Request of POST /api/alerts/{alert_id}/acknowledge."""

    caseworker_id: str = Field(..., min_length=1, description="Staff identifier of the reviewing caseworker")
    note: str = Field(default="", max_length=1000, description="Optional review note — kept separate from AI text")


class AlertUpdateStatusRequest(BaseModel):
    """Advance an alert's review status (POST /api/alerts/{alert_id}/status)."""

    caseworker_id: str = Field(..., min_length=1)
    status: ReviewStatus
    note: str = Field(default="", max_length=1000)


class AlertResponse(BaseModel):
    """An alert as served to the caseworker dashboard."""

    alert_id: str
    user_id: str
    case_id: str
    assessment_id: Optional[str] = None
    alert_type: AlertType
    severity: Severity
    title: str
    description: str
    risk_score: int
    previous_risk_score: Optional[int] = None
    risk_level: Literal["stable", "monitoring", "needs_attention", "urgent"]
    created_at: datetime
    requires_human_review: bool
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved: bool
    resolved_at: Optional[datetime] = None
    review_status: ReviewStatus
    # Prototype honesty — surfaced wherever an alert is shown.
    disclaimer: str = "AI-assisted risk estimate. This is not a clinical diagnosis."


class AlertsSummary(BaseModel):
    """Aggregate counts for the caseworker dashboard header."""

    total_monitored: int
    awaiting_review: int
    needs_attention: int
    urgent: int
    follow_ups_due: int
    follow_ups_overdue: int
    total_open: int = 0  # open (unresolved) alerts of any severity
