"""Models for actions logged by caseworkers/counsellors.

Every human intervention is logged here — this collection is what makes
the "counsellor reached out" annotations on the wellbeing trend chart
real: the history endpoint joins these records into the chart.

The same collection carries the Alert -> Human Support workflow records:
interventions (what an authorised caseworker decided to do) and
follow-up records (when it is due / was completed, and its outcome).
AI output is never allowed to write here — these are human-only events.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class CaseworkerActionRequest(BaseModel):
    """Request of POST /api/caseworker/action."""

    user_id: str
    # `follow_up_completed` is the human-in-the-loop marker: it records
    # that a human finished a follow-up WITHOUT changing the risk score —
    # only the prioritisation's "time since last follow-up" component
    # responds to it (see services/prioritisation_service.py).
    action_type: Literal["counsellor_contact", "escalation", "note", "follow_up_completed"]
    note: str = Field(..., min_length=1, description="What was done — free text from the caseworker")
    caseworker_id: str = Field(..., description="Staff identifier of the person logging the action")


class CaseworkerActionResponse(BaseModel):
    """Response of POST /api/caseworker/action."""

    action_id: str
    timestamp: datetime


class CaseworkerActionDocument(CaseworkerActionRequest):
    """A document in the `caseworker_actions` collection (mirrors Mongo storage)."""

    action_id: str
    timestamp: datetime


# ---------------------------------------------------------------------------
# Human support workflow (Alert -> Intervention -> Follow-up)
# ---------------------------------------------------------------------------

# The authorised human actions the prototype supports. These are DECISIONS
# recorded for the workflow — the prototype has no real call/SMS/counselling
# integration, so the UI must never claim an actual session occurred.
InterventionActionType = Literal[
    "contact_beneficiary",
    "schedule_counselling",
    "provide_resources",
    "refer_service",
    "welfare_followup",
    "escalate_senior_review",
    "other",
]

# Human-only lifecycle states. "safe" is deliberately NOT a state — the
# system never declares a beneficiary safe; only the human workflow
# decides what happens next.
FollowUpStatus = Literal[
    "awaiting_review",
    "reviewed",
    "action_planned",
    "follow_up_scheduled",
    "follow_up_completed",
    "escalated",
]


class InterventionRequest(BaseModel):
    """Request of POST /api/cases/{case_id}/interventions.

    Records ONE authorised human decision about a case. `action_type` is
    the structured action; `note` carries the caseworker's own words
    (kept separate from AI-generated explanations).
    """

    action_type: InterventionActionType
    caseworker_id: str = Field(..., min_length=1)
    note: str = Field(default="", max_length=2000)
    alert_id: Optional[str] = None  # which alert this action responds to, if any


class FollowUpRequest(BaseModel):
    """Request of POST /api/cases/{case_id}/follow-up.

    The full follow-up record an authorised caseworker may log:
    what was done, when, when the next check is due, the outcome so far,
    the human status, and free-text notes.
    """

    caseworker_id: str = Field(..., min_length=1)
    action_taken: str = Field(..., min_length=1, max_length=2000)
    action_date: datetime
    follow_up_date: Optional[datetime] = None
    outcome: str = Field(default="", max_length=2000)
    status: FollowUpStatus = "follow_up_scheduled"
    notes: str = Field(default="", max_length=2000)
    alert_id: Optional[str] = None  # alert being closed by this follow-up, if any


class HumanWorkflowRecordResponse(BaseModel):
    """Response of the intervention and follow-up endpoints."""

    record_id: str
    action_type: str
    timestamp: datetime
    status: Optional[str] = None


class HumanWorkflowDocument(BaseModel):
    """A stored human-workflow document (caseworker_actions collection).

    `record_kind` distinguishes interventions from follow-up records and
    from the legacy free-form actions; everything else is shared so the
    case timeline can render one uniform human event stream.
    """

    record_kind: Literal["action", "intervention", "follow_up"]
    record_id: str
    user_id: str
    caseworker_id: str
    timestamp: datetime
    action_type: str
    note: str = Field(default="")
    # Intervention/follow-up extras (absent for legacy actions).
    alert_id: Optional[str] = None
    action_date: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    outcome: str = Field(default="")
    status: Optional[str] = None
    notes: str = Field(default="")