"""The single authoritative risk-band policy for the Sahara prototype.

Every layer that maps a 0–100 score (or level) to the Sahara risk
language — the check-in scoring pipeline, the longitudinal distress
engine, case prioritisation, alert generation/severity, and the admin
aggregations — reads its bands and rank from HERE, so the whole system
always speaks one risk language. There is intentionally no second copy
of these numbers anywhere else.

PROTOTYPE/DEMO STATUS — READ BEFORE USING:
- These bands are SIH-prototype thresholds for demonstration, NOT
  medically validated clinical thresholds. 0–100 is one consistent
  scale and the band boundaries below are the single definition used
  by every layer:
      0–24   -> stable
      25–49  -> monitoring
      50–74  -> needs_attention
      75–100 -> urgent
- "AI-assisted risk estimate. This is not a clinical diagnosis." —
  the final decision always belongs to an authorised human.
"""

from __future__ import annotations

# (lower_bound, level) ordered from most to least severe.
RISK_BANDS: list[tuple[int, str]] = [
    (75, "urgent"),
    (50, "needs_attention"),
    (25, "monitoring"),
    (0, "stable"),
]

# Ordinal rank used for "moved up / down a band" comparisons.
RISK_RANK: dict[str, int] = {
    "stable": 0,
    "monitoring": 1,
    "needs_attention": 2,
    "urgent": 3,
}

# Score at/above which an observation counts as "elevated" (== the lower
# bound of the needs_attention band, kept in sync with RISK_BANDS above).
ELEVATED_AT: int = 50


def risk_level_for_score(score: int) -> str:
    """Map a 0–100 score to its risk level using the shared RISK_BANDS."""
    for threshold, level in RISK_BANDS:
        if score >= threshold:
            return level
    return "stable"


def band_rank(level: str) -> int:
    """Ordinal rank of a risk level (higher = more severe)."""
    return RISK_RANK.get(level, 0)


def needs_attention_floor() -> int:
    """The score at which the needs_attention band begins (50).

    Used for "AI flagged early signs" annotations so the flag threshold
    can never drift away from the band definition above.
    """
    for threshold, level in RISK_BANDS:
        if level == "needs_attention":
            return threshold
    raise RuntimeError("needs_attention band not defined in risk_policy")
