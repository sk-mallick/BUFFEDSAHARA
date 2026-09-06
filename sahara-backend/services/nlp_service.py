"""Sentiment analysis with a cached multilingual model.

MODEL: cardiffnlp/twitter-xlm-roberta-base-sentiment

Why this model for this project:
- It is a cross-lingual (XLM) model fine-tuned on Twitter data, so it
  handles English AND Hindi in one pass — no separate translation step.
- Because its training data included a large share of romanized Hinglish
  tweets, it also understands Hindi written in Roman letters, e.g.
  "mujhe dar lag raha hai" (I am scared). This is not perfect — Hinglish
  sentiment is genuinely hard — which is exactly why the keyword layer
  (keyword_service.py) exists as a hard safety net that can override the
  model's risk level.

Loading strategy:
- The model (~500 MB) is downloaded once on first run and cached in the
  Hugging Face cache directory (~/.cache/huggingface). `load_model()`
  is called from the FastAPI startup hook (main.py) and stores the
  pipeline in the module-level global `_MODEL`, so it loads ONCE per
  server process and is never re-downloaded per request.
- If the model cannot be loaded (offline machine, no disk space, ...),
  the API keeps running: `is_loaded()` reports False via /api/health,
  and a small transparent fallback approximates the probabilities so the
  rest of the pipeline keeps working. The fallback is clearly labelled
  in the health endpoint — never silently substitutes for the model in
  a production deployment.
"""

from __future__ import annotations

import logging

from config import settings

logger = logging.getLogger("sahara.nlp")

# The Hugging Face model id. Overridable via MODEL_NAME in .env.
MODEL_NAME_DEFAULT = "cardiffnlp/twitter-xlm-roberta-base-sentiment"

# This checkpoint emits generic labels; map them to our vocabulary.
_LABEL_MAP: dict[str, str] = {
    "LABEL_0": "negative",
    "LABEL_1": "neutral",
    "LABEL_2": "positive",
}

_MAX_INPUT_CHARS = 500  # a little under the model's 512-token limit, in characters

_MODEL = None  # the transformers pipeline; loaded once at startup


def load_model() -> bool:
    """Download (first run only) and cache the sentiment pipeline. Idempotent."""
    global _MODEL
    if _MODEL is not None:
        return True
    if not settings.model_auto_download:
        logger.warning("MODEL_AUTO_DOWNLOAD=false — skipping model load; keyword fallback is active.")
        return False
    name = settings.model_name
    try:
        # Heavy imports live inside this function so that a machine that
        # never loads the model (e.g. a demo without torch) can still boot.
        from transformers import pipeline  # noqa: PLC0415

        _MODEL = pipeline(
            "sentiment-analysis",
            model=name,
            top_k=None,          # return the full probability distribution
            truncation=True,     # silently truncate very long inputs
            max_length=512,
        )
        logger.info("Sentiment model loaded: %s", name)
        return True
    except Exception as exc:  # noqa: BLE001 — startup must never crash the API
        logger.error("Could not load sentiment model '%s': %s", name, exc)
        logger.error("The API will use the keyword fallback until the model is available (see /api/health).")
        _MODEL = None
        return False


def is_loaded() -> bool:
    """Whether the real model is currently in memory."""
    return _MODEL is not None


def sentiment_scores(text: str) -> dict[str, float]:
    """Return {"positive": p, "neutral": n, "negative": n} probabilities.

    Values are rounded to 4 decimals and sum to ~1.0.
    """
    text = (text or "").strip()
    if not text:
        return {"positive": 0.0, "neutral": 1.0, "negative": 0.0}

    if _MODEL is None:
        return _fallback_scores(text)

    try:
        raw = _MODEL(text[:_MAX_INPUT_CHARS])[0]  # list of {"label", "score"}
        scores: dict[str, float] = {}
        for item in raw:
            label = _LABEL_MAP.get(item["label"], item["label"])
            scores[label] = round(float(item["score"]), 4)
        for key in ("positive", "neutral", "negative"):
            scores.setdefault(key, 0.0)
        return scores
    except Exception as exc:  # noqa: BLE001 — inference errors must not 500 the check-in
        logger.warning("Sentiment inference failed, using fallback: %s", exc)
        return _fallback_scores(text)


def negative_probability(text: str) -> float:
    """Probability the text expresses negative sentiment (0.0–1.0)."""
    return sentiment_scores(text)["negative"]


def analyze_sentiment(text: str) -> dict:
    """Label-shaped sentiment result used by the chat router.

    Returns {"label": "positive|neutral|negative", "scores": {...}} —
    the label is simply the highest-probability class.
    """
    scores = sentiment_scores(text)
    return {"label": max(scores, key=scores.get), "scores": scores}


# ---------------------------------------------------------------------------
# Fallback — only used when the real model failed to load
# ---------------------------------------------------------------------------

_NEGATIVE_HINTS = (
    "sad", "scared", "fear", "afraid", "helpless", "hopeless", "alone", "cry", "crying",
    "tired", "exhausted", "worried", "anxious", "angry", "hurt", "pain", "suicide",
    "dar", "darr", "akela", "darr lagta", "niras", "udaas", "rula", "rote", "dukh", "gussa",
)
_POSITIVE_HINTS = (
    "good", "better", "happy", "okay", "fine", "calm", "hopeful", "safe", "supported",
    "relieved", "achha", "thik", "accha", "khush", "sukoon", "sahi",
)


def _fallback_scores(text: str) -> dict[str, float]:
    """Rough lexicon-based probabilities when the model is unavailable.

    Not a substitute for the real model — counts negative/positive cue
    words and maps them to a probability. The health endpoint exposes
    model_loaded=False whenever this path is live.
    """
    lowered = text.lower()
    neg = sum(1 for w in _NEGATIVE_HINTS if w in lowered)
    pos = sum(1 for w in _POSITIVE_HINTS if w in lowered)
    total = neg + pos
    if total == 0:
        return {"positive": 0.1, "neutral": 0.8, "negative": 0.1}
    raw_neg = neg / total
    raw_pos = pos / total
    neutral = max(0.0, 1.0 - raw_neg - raw_pos)
    # Soften: don't let a tiny lexicon produce extreme values.
    negative = 0.1 + raw_neg * 0.8
    positive = 0.1 + raw_pos * 0.8
    neutral = max(0.0, 1.0 - negative - positive)
    return {
        "positive": round(positive, 4),
        "neutral": round(neutral, 4),
        "negative": round(negative, 4),
    }