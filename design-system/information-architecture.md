# Sahara · Information Architecture v1.0

Three distinct experiences share one design system and three different UI weights (see style-guide.md §10). This document is the full sitemap and routing plan.

**URL scheme** (locale-prefix; EN default, `/hi/` full mirror)

```
sahara.in/                →  Experience A · Public site
sahara.in/hi/...          →  Experience A · Hindi mirror (same tree)
sahara.in/portal/...      →  Experience B · "My Sahara" (मेरा सहारा), role-gated
sahara.in/caseworker/...  →  Experience C · Caseworker dashboard, role-gated
```

Locale rules: language is a path prefix, never a cookie-only setting (links must be shareable). The toggle in the nav switches between `/[lang]` trees and persists. Public = EN + HI full parity; portal follows the user's chosen language; dashboard is EN-first with HI tooltips and a per-user language setting.

---

## Experience A · Public / marketing site

**Weight:** editorial, image-forward, generous. **Job:** build trust and move people to action — either "get help now" or "learn how this works."

```
/ (Home)
├── hero — mission line, arch-threshold photograph, dual CTA:
│     "Talk to someone now" (primary) · "How Sahara works" (secondary)
├── helpline strip — NHAA 14566 first, always visible in the hero zone
├── "What support looks like" — 3 quiet cards (someone to talk to / a plan
│     that fits / support that follows you), arch rules between
├── How it works teaser → /how-it-works
├── voices — 2–3 anonymous quotes from people supported (with consent)
└── partners strip + privacy promise line → /privacy-data-ethics

/about                 About & Mission
│   story, values, team & partners, impact numbers (annual report),
│   transparency notes, press contact
/how-it-works          How It Works — the journey in 4 steps
│   (Reach out → Get matched → Build a plan → Move forward at your pace)
│   — numbers are honest sequence markers, not decoration;
│   three audience lanes (I need support / I'm a caseworker / I'm a partner);
│   step one maps every reach-out channel: NHAA 14566, the grievance portal,
│   or direct contact — consent flows from whichever door they entered
/who-we-support
├── /victims-families        For Victims & Families
│       what support looks like, first-contact options ("what happens
│       when you call" — transparency), rights teaser, helplines,
│       safety-exit button, FAQ anchors
├── /counsellors-caseworkers For Counsellors & Caseworkers
│       the working tool, workload relief, ethics & risk-score explainer,
│       training, caseworker login entry (role-gated)
└── /government-partners     For Government Partners
        compliance, data governance, integration with state systems
        (OSCs / 181 / One Stop Centres), SLAs, procurement standards

/resources             Resources & Helplines
│   searchable library: NHAA 14566, 181, 112, state helplines,
│   safety planning, legal primers, downloads (PDF), EN/HI, crisis pages
/privacy-data-ethics   Privacy & Data Ethics — the Data Charter
│   what is collected, who can see what, consent model, right to erasure,
│   the AI risk-score explained in plain language (what it is, what it isn't)
/contact               Contact — form with response-time honesty, partner
│                      addresses, escalation paths
/terms · /accessibility · /sitemap      statutory / utility pages
```

**Navigation:** top nav (mark, sections, language toggle, "Get help" button) → sticky at 40; mobile sheet; footer with helpline strip repeated (helplines are never more than one scroll away).

---

## Experience B · Victim portal — "My Sahara" (मेरा सहारा)

**Weight:** calm, low-density, narrow reading column (44rem), minimal chrome. **Job:** give one person a safe, private place to see where their support stands and act when they need to. **Naming rule:** user-facing copy never says "victim" — this is "your space."

```
/portal                    Home
│   warm greeting, one suggested next step (not a dashboard of todos),
│   quick actions: Check in · Talk to someone now · My plan
│   privacy reminder strip (who can see what, one-tap to manage)
/portal/check-in           Wellbeing check-in
│   5 gentle questions, optional note; "skip, no questions asked" is
│   always available; progress is narrated in words, not graphed
│   ("You've felt steadier lately") — graphs belong to caseworkers
/portal/timeline           My support timeline
│   milestones, appointments, messages, documents — a timeline, not a feed
/portal/talk               Talk to someone now
│   chat / voice / video request, helpline numbers, honest wait times,
│   escalation option ("I need someone sooner")
/portal/resources          My resources — saved articles, PDFs, helplines
/portal/rights             My rights — know-your-rights in plain language,
│                          state-wise, with "how to use this" guidance
/portal/privacy            Privacy controls
│   consent toggles with plain-language "who sees this" per item,
│   view stored data, export, delete
/portal/settings           Profile, language, notifications, session
```

**Cross-cutting, portal + public:** the **exit (escape) button** — a fixed control that instantly redirects to a neutral page (e.g., a weather site), clears the current session where technically possible, and is keyboard-reachable. It appears on every public and portal page. Also: no passwords to remember (phone OTP + device), no persistent "logged in" banners, and the back button is treated as trusted.

**Auth:** phone-OTP with consent-first registration; session hygiene for shared devices (a device is explicitly marked "shared" at sign-in). Full auth flow is designed in Step 2/3, not here.

---

## Experience C · Caseworker dashboard

**Weight:** dense, professional, data-first. Ink-900 sidebar on sand-50 work surface; white cards; mono numerals; full palette including critical red. **Job:** triage, act, and account — fast, without errors.

```
/caseworker                     Overview
│   caseload stat cards, risk distribution, due items, my queue snapshot
/caseworker/queue               Distress-risk queue
│   all cases sorted by AI risk score (descending) with human-review
│   banner; filters (risk, region, recency, assignee); batch actions;
│   row = anonymized ID, RiskBadge, trend sparkline, last activity
/caseworker/cases/[id]          Case detail
│   header: anonymized ID, RiskBadge, assignee, actions
│   tabs: Timeline · Notes · Documents · Alerts & escalations
│   trend charts (distress score over time, contact cadence),
│   escalation panel (thresholds, SLA timer, escalation path, audit trail),
│   ModelDisclosure — the AI score's rationale + caveat, inline
/caseworker/alerts              Alerts & escalations
│   SLA timers, assignment, handoff log
/caseworker/reports             Reports & analytics
│   cohort trends, response times, outcomes, exports (CSV/PDF)
/caseworker/team                Team — roster, workload, permissions
/caseworker/settings            Settings — org config, integrations, audit log
```

**Gating & ethics:** SSO/OAuth (gov identity) + 2FA; role-based access per region/team; every action audit-logged. The risk queue is an *aid to human judgment*: the queue page and every case header carry the ModelDisclosure pattern ("AI-assisted prioritisation — score is a triage aid, not a verdict"), and caseworkers always act on cases, never on scores alone.

---

## Cross-cutting notes

- **Consent model:** data flows public → portal → dashboard only along consent edges the user can see and revoke (portal/privacy is the single control surface).
- **Helplines are structural:** the national helpline strip is a shared component present on Home, Resources, every `who-we-support` page, and the portal Home — never buried in a footer alone.
- **Referral loop:** a complaint filed via NHAA 14566 or the integrated grievance portal can open a Sahara wellbeing record with one consent — the platform meets people where they already asked for help.
- **Voice-first channel:** every public/portal flow offers a "call 14566 instead" path; all content is written to be read aloud, for users with low digital literacy.
- **Not in this step** (Step 2/3): auth flows, API/DB schema, the actual page copy, and the risk-score model. This document constrains all of them.