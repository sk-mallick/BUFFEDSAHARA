# Sahara · Design System

**"Calm Institutional Warmth"** — a government-grade support platform for people affected by violence in India. One design system, three experiences, one signature.

```
design-system/
├── tokens.css                 ← CSS custom properties (framework-agnostic)
├── tailwind.config.js         ← Tailwind bridge (keep in sync with tokens.css)
├── style-guide.md             ← art direction, color, type, motion, imagery, voice
├── information-architecture.md← sitemap: public / portal / caseworker
├── component-inventory.md     ← the Step 2 build checklist
├── implementation.md          ← wiring the tokens to React/Vite/Tailwind/Framer/Recharts/Lucide
└── gallery.html               ← living visual reference (open in browser)
```

## Project context

Sahara is the design for **SIH26094** (Smart India Hackathon 2026, sponsored by the Ministry of Social Justice and Empowerment): an AI-powered mental-health monitoring and distress-prediction system for people who have filed complaints under the **SC/ST (Prevention of Atrocities) Act, 1989** via **NHAA helpline 14566** or the integrated grievance portal. The platform tracks wellbeing after a complaint is filed, predicts rising crisis risk, and alerts caseworkers so support arrives before escalation.

**Pinned stack:** React 18 + Vite · Tailwind CSS with these custom tokens · Framer Motion · React Router · Recharts (or Nivo) · Lucide React. Atomic architecture: `src/ui/` → `src/components/` → `src/sections/` → `src/pages/` (mapping in component-inventory.md).

## The identity in one paragraph

Sahara (सहारा — support, shelter) looks like the best public institution you've ever walked into: sand-light backgrounds, deep charcoal-navy ink (never pure black), a single muted marigold-terracotta primary (dried-marigold family — a nod to Indian civic identity without a single garish accent), sage for "safe/stable," soft amber for "needs attention," and real red only inside the caseworker dashboard. Headlines are set in Fraunces — warm but straight, SOFT 40 / WONK 0 — paired with Inter body and IBM Plex Mono for the dashboard's instruments. Devanagari is a first-class citizen of every type stack. The signature is the **Arch**: a single-stroke shelter doorway used as the mark and as a structural device, at most once per viewport.

## Decision log (Step 1)

- **Marigold-terracotta over teal as the primary.** Both were offered by the brief. Terracotta carries the Indian civic identity the brief asks for; teal reads as generic gov-tech. The specific value (`#9E4A26`, dried-marigold) is muted enough to stay dignified, and the doctrine caps it at ≤5% of any public viewport — ink does the heavy lifting, so we avoid the "cream + serif + terracotta" default look by restraint and by the arch signature rather than by brightness.
- **Fraunces set straight** (no wonk, low soft) instead of the usual high-contrast/wonky treatment — institutional warmth over editorial charm.
- **Portal is narrow and gentle** (44rem), dashboard is dense (88rem, ink sidebar) — the three weights are enforced by spacing/type/color knobs from one token set, not by a second system.
- **Risk language is split by audience:** caseworkers get Stable/Monitoring/Elevated/Critical with AI-score disclosure; victim-facing screens say Supported/In progress/Needs support soon — never red, never "critical."

## The three experiences

| Experience | URL | Weight | Job |
|---|---|---|---|
| Public site | `sahara.in/` (+ `/hi/`) | Editorial, generous | Build trust; move people to help |
| My Sahara portal | `sahara.in/portal/` | Calm, narrow, minimal | One person's safe private space |
| Caseworker dashboard | `sahara.in/caseworker/` | Dense, professional | Triage, act, account |

## Roadmap

- **Step 1 (this)** — tokens, style guide, IA, component inventory
- **Step 2** — scaffold Vite + React 18, wire tokens per `implementation.md`, build the component library per `component-inventory.md` (build order at the bottom), token-accurate gallery page
- **Step 3** — assemble the three experiences from IA + library

## Usage rules (short version)

1. Use tokens, not ad-hoc values — the scales in `tailwind.config.js` are strict by design.
2. Marigold ≤5% of any public viewport; critical red never outside the caseworker app.
3. One arch treatment per viewport. One animation purpose per view.
4. Status never color-only. Touch targets ≥44px. AA contrast everywhere.
5. User-facing copy says "people we support," never "victims."