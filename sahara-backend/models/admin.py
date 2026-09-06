"""Response models for the administrative monitoring hierarchy.

National / State / District dashboards return AGGREGATES only: counts per
risk band, alert tallies, follow-up figures, and distribution rows. No
private messages, notes, free-text responses, or names of beneficiaries
cross these endpoints. Rows at district level carry only case IDs + risk
values for drill-down.
"""

from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field

RiskLevel = Literal["stable", "monitoring", "needs_attention", "urgent"]


class RiskBandCounts(BaseModel):
    """Cases in each Sahara risk band (latest assessment per case)."""

    total: int = 0
    stable: int = 0
    monitoring: int = 0
    needs_attention: int = 0
    urgent: int = 0
    worsening: int = 0
    improving: int = 0


class AlertTallies(BaseModel):
    """Aggregate alert counts (reuses the existing alerts collection)."""

    total_open: int = 0
    unreviewed: int = 0          # open and not acknowledged
    urgent: int = 0              # open alerts on urgent cases
    needs_attention: int = 0     # open alerts on needs_attention cases
    crisis_signals: int = 0      # open critical-severity safety alerts


class FollowUpTallies(BaseModel):
    """Follow-up figures aggregated from human follow-up records."""

    due: int = 0
    overdue: int = 0
    completion_rate: float = 0.0  # 0..1 — completed / total human records


class RegionRow(BaseModel):
    """One row of a region breakdown (state or district)."""

    name: str
    total: int = 0
    stable: int = 0
    monitoring: int = 0
    needs_attention: int = 0
    urgent: int = 0
    worsening: int = 0


class CaseworkerRow(BaseModel):
    """District workload row — caseworker id/label + aggregate case counts."""

    id: str
    name: str = ""
    active_cases: int = 0
    urgent: int = 0
    needs_attention: int = 0


class CaseRefRow(BaseModel):
    """Minimal drill-down row for an authorised caseworker view.

    ID + risk only — no names, no notes, no private content.
    """

    case_id: str
    risk_level: RiskLevel
    distress_score: int = 0
    trend: str = "stable"


class NationalSummary(BaseModel):
    level: Literal["national"] = "national"
    scope: str = "India"
    counts: RiskBandCounts = Field(default_factory=RiskBandCounts)
    alerts: AlertTallies = Field(default_factory=AlertTallies)
    follow_ups: FollowUpTallies = Field(default_factory=FollowUpTallies)
    states: list[RegionRow] = Field(default_factory=list)
    # Honest labelling — administrative monitoring is not clinical.
    note: str = "AI-assisted risk monitoring. Not a clinical diagnosis."
    source_note: str = "SIH Demonstration Data"
    privacy_note: str = (
        "Administrative views display aggregated programme information. "
        "Individual case information is restricted to authorised personnel."
    )


class StateSummary(BaseModel):
    level: Literal["state"] = "state"
    scope: str
    counts: RiskBandCounts = Field(default_factory=RiskBandCounts)
    alerts: AlertTallies = Field(default_factory=AlertTallies)
    follow_ups: FollowUpTallies = Field(default_factory=FollowUpTallies)
    districts: list[RegionRow] = Field(default_factory=list)
    note: str = "AI-assisted risk monitoring. Not a clinical diagnosis."
    source_note: str = "SIH Demonstration Data"
    privacy_note: str = (
        "Administrative views display aggregated programme information. "
        "Individual case information is restricted to authorised personnel."
    )


class DistrictSummary(BaseModel):
    level: Literal["district"] = "district"
    scope: str
    state: str = ""
    counts: RiskBandCounts = Field(default_factory=RiskBandCounts)
    alerts: AlertTallies = Field(default_factory=AlertTallies)
    follow_ups: FollowUpTallies = Field(default_factory=FollowUpTallies)
    caseworkers: list[CaseworkerRow] = Field(default_factory=list)
    cases: list[CaseRefRow] = Field(default_factory=list)
    note: str = "AI-assisted risk monitoring. Not a clinical diagnosis."
    source_note: str = "SIH Demonstration Data"
    privacy_note: str = (
        "Administrative views display aggregated programme information. "
        "Individual case information is restricted to authorised personnel."
    )


class TrendPoint(BaseModel):
    """Count of cases at each risk level on one day (stepped per latest assessment)."""

    date: date
    stable: int = 0
    monitoring: int = 0
    needs_attention: int = 0
    urgent: int = 0


class TrendsResponse(BaseModel):
    days: int
    series: list[TrendPoint] = Field(default_factory=list)
    worsening: int = 0   # cases whose latest assessment in window worsened
    improving: int = 0
    note: str = "AI-assisted risk monitoring. Not a clinical diagnosis."
