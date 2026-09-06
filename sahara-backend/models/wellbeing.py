"""Models for the beneficiary wellbeing space.

Small, safe, personalised wellbeing activities are suggested from a
deterministic catalogue (services/wellbeing_service.py) based on the
person's OWN existing wellbeing history. The suggestions are supportive
ideas — never treatment, never a diagnosis — and the personalised path
never exposes internal risk scores to the beneficiary.

Everything here is beneficiary-owned: there is no user_id in any URL or
request body because the authenticated account IS the subject.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

WellbeingPath = Literal["supportive", "early_support", "human_support", "crisis"]
ActivityCategory = Literal[
    "grounding", "breathing", "reflection", "social_connection", "routine_self_care"
]

# The plain-language note carried wherever the wellbeing space is shown.
# Kept short and honest: ideas support, humans decide.
WELLBEING_NOTE = (
    "These are supportive ideas, not medical advice and not a diagnosis. "
    "If things feel very hard, talking to a person is always available. "
    "Sahara's AI helps identify patterns and guide support — human "
    "professionals remain responsible for decisions and care."
)
WELLBEING_DISCLAIMER = (
    "Sahara suggests supportive activities based on what you have shared. "
    "It does not diagnose or treat mental health conditions — "
    "professionals remain responsible for care decisions."
)


class ActivityItem(BaseModel):
    """One suggested activity, with the user's completion state."""

    activity_id: str
    category: ActivityCategory
    title: str
    description: str
    duration_minutes: int
    completed: bool = False
    completed_today: bool = False


class NextStep(BaseModel):
    """ONE recommended next small step + its plain-language reason.

    Deterministic and explainable: never a risk number or internal model
    reasoning — just the activity and why it fits right now.
    """

    activity: ActivityItem
    reason_key: str  # stable key the client localises (reason_*)
    reason: str  # English fallback text


class WellbeingPlan(BaseModel):
    """GET /api/wellbeing/plan — the personalised plan for the beneficiary.

    `path` is the deterministic personalisation branch; `summary_key` is a
    stable key the client localises (with `summary` as the English
    fallback). NO risk score or risk band is ever included — internal
    risk stays internal.
    """

    user_id: str
    path: WellbeingPath
    summary: str
    summary_key: str = "summary_supportive"
    # Where the plan was based on ("latest wellbeing assessment",
    # "recent check-in", or "getting started") — visible language, no scores.
    basis: str
    basis_key: str = "basis_none"
    activities: list[ActivityItem] = Field(default_factory=list)
    # The single most helpful next small step (None in the crisis path —
    # a person comes first, never self-help through a crisis).
    next_step: Optional[NextStep] = None
    human_support_priority: bool = False
    crisis_priority: bool = False
    note: str = WELLBEING_NOTE
    disclaimer: str = WELLBEING_DISCLAIMER


class CatalogItem(BaseModel):
    """One entry in the full activity catalogue (with completion state)."""

    activity_id: str
    category: ActivityCategory
    title: str
    description: str
    duration_minutes: int
    completed: bool = False
    completed_today: bool = False


class ActivityCatalogResponse(BaseModel):
    """GET /api/wellbeing/activities — full catalogue with completion state."""

    activities: list[CatalogItem] = Field(default_factory=list)


class ActivityCompleteResponse(BaseModel):
    """POST /api/wellbeing/activities/{activity_id}/complete.

    `feedback_key`/`feedback` carry gentle, non-gamified feedback (key for
    the client dictionary, English fallback text).
    """

    activity_id: str
    completed_at: datetime
    times_completed: int
    feedback_key: str = ""
    feedback: str = ""


class ActivityProgressView(BaseModel):
    """One completed activity in the progress response."""

    activity_id: str
    category: ActivityCategory
    first_completed_at: datetime
    last_completed_at: datetime
    times_completed: int


class ActivityProgress(BaseModel):
    """GET /api/wellbeing/progress."""

    total_completed: int
    categories: dict[str, int] = Field(default_factory=dict)
    completed: list[ActivityProgressView] = Field(default_factory=list)


class ReflectionCreate(BaseModel):
    """POST /api/wellbeing/reflections body — the person's own private words."""

    text: str = Field(..., min_length=1, max_length=2000)


class ReflectionView(BaseModel):
    """A stored private reflection (owner-only view)."""

    reflection_id: str
    text: str
    created_at: datetime


class SupportRequestResponse(BaseModel):
    """POST /api/wellbeing/support-request.

    Prototype honesty: this records a REQUEST for the assigned support
    team — it never claims a counsellor is calling right now (no real
    telephony integration exists in the prototype).
    """

    requested: bool = True
    status: str = "support_requested"
    timestamp: datetime
    already_pending: bool = False


class SupportStatus(BaseModel):
    """GET /api/wellbeing/support-status — honest state of the request.

    `status` reflects the human workflow only: awaiting_review until an
    authorised caseworker records an action, then that action's state.
    """

    support_requested: bool = False
    requested_at: Optional[datetime] = None
    status: str = "none"
    human_response_recorded: bool = False
