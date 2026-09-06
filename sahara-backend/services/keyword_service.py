"""Bilingual crisis-keyword detection.

This layer is the SAFETY NET of the whole system. The sentiment model
can misread a sentence, but a matched keyword is concrete evidence and
can FORCE a minimum risk level regardless of what the model says
(see scoring_service.py, Step 5).

Coverage:
- English phrases, e.g. "kill myself", "no hope"
- Hindi in Devanagari script AND romanized Hindi (Hinglish), e.g.
  "dar lag raha hai", "marna chahta" — because victims often type in
  Roman letters even when speaking Hindi.

Matching is case-insensitive substring matching with word boundaries,
so "afraid" does not match inside "unafraid" and "end it" does not
match "the weekend itinerary".
"""

from __future__ import annotations

import re

# English crisis phrases (lowercase canonical forms — the canonical form
# is what gets stored in crisis_keywords_found and shown to caseworkers).
CRISIS_KEYWORDS_EN: list[str] = [
    "suicide",
    "kill myself",
    "end it",
    "no hope",
    "hurt myself",
    "afraid",
    "helpless",
    "cannot go on",
    "want to die",
    "give up",
]

# Hindi crisis phrases — romanized (Hinglish, very common on phones)
# AND Devanagari script, so script choice never weakens the safety net.
CRISIS_KEYWORDS_HI: list[str] = [
    "mar jaunga",      # I will die
    "mar jaana",       # to die
    "khud ko hurt",    # hurt myself
    "dar lag raha",    # I am feeling afraid
    "nirastha",        # hopelessness
    "akela hun",       # I am alone
    "khatam kar",      # end it / finish it
    "jina nahi",       # I don't want to live (Hinglish spelling)
    "jeena nahi",      # I don't want to live (another common spelling)
    "marna chahta",    # I want to die
    # Devanagari-script forms of the same signals.
    "आत्महत्या",           # suicide
    "मर जाऊँगा",            # I will die
    "मर जाऊंगी",            # I will die (feminine)
    "खुद को मारना",         # kill myself
    "मारना चाहता हूँ",      # I want to kill (myself)
    "जीना नहीं चाहता",      # I don't want to live
    "खत्म कर दूँ",          # end it all
    "कोई उम्मीद नहीं",      # there is no hope
    "अकेला हूँ",            # I am alone
    "डर लग रहा है",         # I am feeling afraid
]

# Odia (Odia script) crisis phrases — Odia is one of the official
# languages of Odisha, where the demonstration district (Khordha) sits.
# Safety must never depend on which language the person writes in.
CRISIS_KEYWORDS_OR: list[str] = [
    "ଆତ୍ମହତ୍ୟା",              # suicide
    "ମରିଯିବି",                # I will die
    "ଆଉ ବଞ୍ଚିବି ନାହିଁ",        # I will not live anymore
    "ଜୀବନରେ ଆଉ ଆଶା ନାହିଁ",    # there is no more hope in life
    "ମୋତେ ଆଉ ସହ୍ୟ ହେଉନାହିଁ",  # I cannot bear it anymore
    "ମରି ଯାଏ",               # let me die / I die
]

# Romanized Odia (Odia written in Latin letters — common on phones).
CRISIS_KEYWORDS_OR_ROMAN: list[str] = [
    "atma-hatya",      # suicide (roman Odia)
    "atmahatya",
    "mori jaibi",      # I will die
    "maribi",          # I will die (short form)
    "aau banchibi nahin",  # I will not live anymore
]

ALL_KEYWORDS: list[str] = (
    CRISIS_KEYWORDS_EN + CRISIS_KEYWORDS_HI + CRISIS_KEYWORDS_OR + CRISIS_KEYWORDS_OR_ROMAN
)

# Pre-compiled regexes — one per keyword, with word boundaries so
# matches don't fire inside longer words. NOTE: Python's \b is
# unreliable around non-Latin scripts (Devanagari/Odia), so boundaries
# are expressed as explicit lookarounds on \w instead.
_KEYWORD_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (kw, re.compile(rf"(?<!\w){re.escape(kw)}(?!\w)", re.IGNORECASE))
    for kw in ALL_KEYWORDS
]


def find_crisis_keywords(text: str | None) -> list[str]:
    """Return every crisis keyword found in `text`, in list order.

    Duplicates are removed. Returns [] when nothing matched.
    """
    if not text:
        return []
    found: list[str] = []
    for keyword, pattern in _KEYWORD_PATTERNS:
        if pattern.search(text):
            found.append(keyword)
    return found


def crisis_flag(keywords: list[str]) -> bool:
    """True when at least one crisis keyword was found."""
    return len(keywords) > 0


def detect_crisis_keywords(text: str | None) -> dict:
    """Dict-shaped wrapper used by the chat router.

    Returns {"crisis_detected": bool, "keywords_found": list[str]} so the
    chat flow can check both the user's message and Claude's reply with
    one call each.
    """
    found = find_crisis_keywords(text)
    return {"crisis_detected": bool(found), "keywords_found": found}