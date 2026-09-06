"""Models for NHAA call/chat transcript analysis."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TranscriptAnalyzeRequest(BaseModel):
    """Request of POST /api/transcript/analyze."""

    user_id: str
    transcript: str = Field(..., min_length=1, description="Raw transcript text, EN or HI")


class TranscriptAnalysis(BaseModel):
    """The analysis attached to a stored transcript."""

    sentiment_summary: Literal["positive", "neutral", "negative"]
    sentiment_scores: dict[str, float] = Field(default_factory=dict)
    crisis_keywords_found: list[str] = Field(default_factory=list)
    distress_signals: list[str] = Field(default_factory=list)
    recommended_action: str


class TranscriptResponse(BaseModel):
    """Response of POST /api/transcript/analyze."""

    transcript_id: str
    sentiment_summary: Literal["positive", "neutral", "negative"]
    sentiment_scores: dict[str, float]
    crisis_keywords_found: list[str]
    distress_signals: list[str]
    recommended_action: str


class TranscriptDocument(BaseModel):
    """A document in the `transcripts` collection (mirrors Mongo storage)."""

    transcript_id: str
    user_id: str
    timestamp: datetime
    raw_text: str
    analysis: TranscriptAnalysis