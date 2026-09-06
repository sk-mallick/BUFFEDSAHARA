"""POST /api/transcript/analyze — sentiment + crisis scan of NHAA transcripts."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.transcript import TranscriptAnalyzeRequest, TranscriptResponse
from services import keyword_service, nlp_service

router = APIRouter(prefix="/api", tags=["transcript"])

# Plain-language actions keyed by crisis-keyword severity.
_ACTIONS = {
    "none": "No crisis signals detected. No immediate action needed.",
    "single": "Crisis signal detected. Assign counsellor. Reach out within 48 hours.",
    "multiple": (
        "⚠ Multiple crisis signals detected. IMMEDIATE: Contact victim within 24 hours. "
        "Escalate to senior counsellor."
    ),
}


def _distress_signals(keywords: list[str], sentiment_summary: str) -> list[str]:
    """Human-readable signals, consistent with the check-in vocabulary."""
    signals: list[str] = []
    if keywords:
        signals.append("crisis_keywords")
    if sentiment_summary == "negative":
        signals.append("negative_sentiment")
    return signals


@router.post("/transcript/analyze", response_model=TranscriptResponse)
async def analyze_transcript(
    payload: TranscriptAnalyzeRequest, db: AsyncIOMotorDatabase = Depends(get_db)
) -> TranscriptResponse:
    """Analyze a transcript and store it for later audit.

    Uses the same multilingual sentiment model and the same bilingual
    crisis-keyword safety net as the check-in pipeline, so the risk
    vocabulary stays identical across the product.
    """
    scores = nlp_service.sentiment_scores(payload.transcript)
    sentiment_summary = max(scores, key=scores.get)  # highest-probability label
    keywords = keyword_service.find_crisis_keywords(payload.transcript)

    if len(keywords) >= 2:
        action = _ACTIONS["multiple"]
    elif len(keywords) == 1:
        action = _ACTIONS["single"]
    else:
        action = _ACTIONS["none"]

    transcript_id = str(uuid4())
    await db.transcripts.insert_one(
        {
            "transcript_id": transcript_id,
            "user_id": payload.user_id,
            "timestamp": datetime.now(timezone.utc),
            "raw_text": payload.transcript,
            "analysis": {
                "sentiment_summary": sentiment_summary,
                "sentiment_scores": scores,
                "crisis_keywords_found": keywords,
                "distress_signals": _distress_signals(keywords, sentiment_summary),
                "recommended_action": action,
            },
        }
    )

    return TranscriptResponse(
        transcript_id=transcript_id,
        sentiment_summary=sentiment_summary,
        sentiment_scores=scores,
        crisis_keywords_found=keywords,
        distress_signals=_distress_signals(keywords, sentiment_summary),
        recommended_action=action,
    )