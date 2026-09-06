// ============================================================================
// MOCK DATA — every dataset in this module is synthetic.
// Swap these exports for real API calls later; the components only depend on
// shape, not on where the data comes from.
// ============================================================================

/**
 * A 60-day anonymized "wellbeing trend" — a distress-risk score (0–100,
 * higher = more distress) built from consent-based check-ins.
 * Story: mild baseline → slow rise → AI flag on day 36 → human contact on
 * day 41 → steady decline as support continues.
 */
const trendAnchors = [
  [1, 28],
  [8, 34],
  [15, 30],
  [22, 36],
  [29, 38],
  [33, 45],
  [36, 55],
  [39, 62],
  [41, 66],
  [44, 64],
  [47, 61],
  [50, 54],
  [53, 46],
  [56, 40],
  [60, 33],
];

function scoreAt(day) {
  for (let i = 1; i < trendAnchors.length; i++) {
    const [d0, s0] = trendAnchors[i - 1];
    const [d1, s1] = trendAnchors[i];
    if (day <= d1) {
      const t = (day - d0) / (d1 - d0);
      return Math.round(s0 + (s1 - s0) * t);
    }
  }
  return trendAnchors[trendAnchors.length - 1][1];
}

export const wellbeingTrend = Array.from({ length: 60 }, (_, i) => {
  const day = i + 1;
  // small sinusoidal jitter so the line feels human, never machine-perfect
  const jitter = Math.sin(day * 2.3) * 1.4 + Math.cos(day * 0.9) * 1.1;
  const score = Math.max(12, Math.min(88, Math.round(scoreAt(day) + jitter)));
  return { day, score };
});

/** Marker points annotated on the chart. */
export const wellbeingFlags = {
  ai: { day: 36, score: 55, note: "AI flagged early signs" },
  human: { day: 41, score: 66, note: "Counsellor reached out" },
};

/** Early-signal threshold — scores crossing this line trigger a human review. */
export const wellbeingThreshold = 55;

/** Photos paired with representative quotes (Unsplash, dignity-safe imagery). */
export const testimonialImages = [
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
];
