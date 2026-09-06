"""Conservative, multilingual safety classification for the support chat.

The chatbot itself NEVER computes a risk score — risk stays with the
existing distress engine (see scoring_service / distress_engine). What
this layer does is classify the *immediate conversational context* so
the chat can respond safely:

    safety_level = "ok" | "concern" | "crisis"

- "crisis"  -> deterministic crisis flow (acknowledge + human numbers +
               human-support offer). Triggered by the shared multilingual
               crisis-keyword safety net (English, Hindi incl. romanized,
               Odia incl. script + romanized) — the same detector that
               can force a risk override elsewhere, so behaviour is
               consistent across the whole system.
- "concern" -> supportive listening + gentle offers (check-in, human
               support). Triggered by clearly negative sentiment or
               low-level distress signals in any supported language.
- "ok"      -> normal conversation.

This is deliberately CONSERVATIVE (favours more support, never less)
and it never diagnoses anything: it classifies language, not people.
"""

from __future__ import annotations

import re
from typing import Optional

from services import keyword_service

# Low-level distress signals (NOT crisis — crisis lives in
# keyword_service). These only nudge the classifier from "ok" to
# "concern" when combined with negative sentiment, so a cheerful
# sentence mentioning sleep ("I slept great!") can never mis-trigger.
_DISTRESS_LEXICON: list[tuple[str, re.Pattern]] = [
    # English
    ("en_overwhelmed", re.compile(r"\b(overwhelmed|anxious|anxiety|worried|worrying|stress(ed)?|pani?ck(y|ing)?|scared|afraid|lonely|isolat\w+|can'?t (sleep|eat)|insomnia|crying|cried|tensed)\b", re.IGNORECASE)),
    # Romanized Hindi / Hinglish
    ("hi_chinta", re.compile(r"\b(chinta|tension|tensan|pareshan|udasi|ghabrahat|dubhava|neend nahi|rone|ro raha|ro rahi|akela|akele|dar)\b", re.IGNORECASE)),
    # Devanagari Hindi
    ("hi_deva", re.compile(r"(चिंता|तनाव|परेशान|उदास|घबराहट|डर|नींद|रोना|अकेला|अकेली|दुखी)")),
    # Odia (script)
    ("or_odia", re.compile(r"(ଚିନ୍ତା|ଟେନସନ|ଉଦାସ|ଡର|ଏକୁଟିଆ|କାନ୍ଦି|ନିଦ୍ରା|ଦୁଃଖ)")),
    # Romanized Odia
    ("or_roman", re.compile(r"\b(chinta|tension|udasa|dara|ekutia|kandi|nidra|dukha)\b", re.IGNORECASE)),
]

_LEVELS = ("ok", "concern", "crisis")


def _sentiment_label(text: str) -> str:
    """Negative/neutral/positive via the shared sentiment service.

    Falls back to lexical heuristics when the multilingual model is not
    loaded (offline demo/tests) — see nlp_service for the transparent
    fallback label.
    """
    try:
        from services.nlp_service import analyze_sentiment
        return analyze_sentiment(text).get("label", "neutral")
    except Exception:  # noqa: BLE001 — classification must never crash the chat
        return "neutral"


def classify_safety(text: str, language: Optional[str] = None) -> dict:
    """Conservative safety classification of one chat message.

    Returns:
        {
          "safety_level": "ok" | "concern" | "crisis",
          "crisis_detected": bool,
          "keywords_found": [..],   # multilingual crisis keywords
          "sentiment": str,
          "signals": [..],          # human-readable reasons (categories)
          "language": str,          # detected/normalised language code
        }
    """
    text = text or ""
    found = keyword_service.find_crisis_keywords(text)
    if found:
        return {
            "safety_level": "crisis",
            "crisis_detected": True,
            "keywords_found": found,
            "sentiment": _sentiment_label(text),
            "signals": ["crisis_keyword"],
            "language": language or "en",
        }

    signals = [name for name, pattern in _DISTRESS_LEXICON if pattern.search(text)]
    sentiment = _sentiment_label(text)

    if sentiment == "negative" or signals:
        return {
            "safety_level": "concern",
            "crisis_detected": False,
            "keywords_found": [],
            "sentiment": sentiment,
            "signals": signals or ["negative_sentiment"],
            "language": language or "en",
        }

    return {
        "safety_level": "ok",
        "crisis_detected": False,
        "keywords_found": [],
        "sentiment": sentiment,
        "signals": [],
        "language": language or "en",
    }


def level_rank(level: str) -> int:
    """Numeric rank so callers can compare levels (ok < concern < crisis)."""
    return _LEVELS.index(level) if level in _LEVELS else 0
