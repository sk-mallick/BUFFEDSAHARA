# Sahara — System Architecture

**SIH26094 · MoSJE · AI-powered wellbeing monitoring & distress prediction for victims of caste-based atrocities**

> This document describes how the platform actually works. It is a prototype architecture: every AI component is an explainable prototype, not a clinically validated system (see [Prototype boundaries](#prototype-boundaries)).

---

## 1. System overview

Two independent codebases that talk over HTTP/JSON:

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│  FRONTEND (React SPA)       │  HTTP   │  BACKEND (FastAPI)               │
│  src/                       │ ──────▶ │  sahara-backend/                 │
│                             │  CORS   │                                  │
│  React 18 + Vite            │ ◀────── │  Python 3.11+ / uvicorn          │
│  Tailwind + design tokens   │  JSON   │  Motor (async MongoDB driver)    │
│  Framer Motion              │         │  Pydantic v2                     │
│  React Router               │         │                                  │
│  Recharts                   │         │  MongoDB ──▶ sahara_db           │
│  Lucide icons               │         │  HuggingFace XLM-RoBERTa         │
│  Anthropic Claude (via API) │         │  Anthropic SDK (server-side)     │
└─────────────────────────────┘         └──────────────────────────────────┘
```

- Frontend dev server: `http://localhost:5173` (or 5174)
- Backend API: `http://localhost:8000` — frontend calls it through `VITE_API_URL` (defaults to `http://localhost:8000`)
- CORS is configured for both frontend origins in `.env` (`CORS_ORIGINS`)

---

## 2. Frontend architecture

### 2.1 Layering (component-driven, atomic-style)

```
src/
├── main.jsx            # React root, imports index.css
├── App.jsx             # Router, public layout, route transitions, chat host
├── lib/
│   ├── i18n.jsx        # LangProvider: EN/HI dictionary + t() + language state
│   └── cn.js           # className join helper
├── ui/                 # Design-system primitives (pure, no business logic)
│   ├── Button.jsx      # All variants + loading state
│   ├── Section.jsx, Reveal.jsx, CountUp.jsx, Accordion.jsx
│   ├── Img.jsx         # lazy/eager loading, decode/async, alt enforcement
│   ├── Skeleton.jsx, PageSkeleton.jsx   # branded shimmer + route fallback
├── components/         # Reusable composites
│   ├── StatusBadge.jsx # risk-level visual language (stable→urgent)
│   ├── WellbeingDemo.jsx  # 60-day interactive trend chart (Recharts)
│   ├── ImpactCarousel.jsx # accessible auto-rotating testimonial carousel
│   ├── DashboardMock.jsx  # caseworker dashboard (queue, case detail, timeline)
│   ├── HelplineCard.jsx, HelplineDirectory.jsx  # filterable resource directory
│   ├── CaseTrendChart.jsx, Sparkline.jsx, BrowserFrame.jsx
│   ├── LangSwitcher.jsx, ExitButton.jsx, PageHeader.jsx
│   └── chat/           # ChatbotButton, ChatWindow, MessageBubble,
│                       # TypingIndicator, CrisisBanner
├── hooks/
│   └── useChat.js      # chat state machine: messages, history, crisis, language
├── sections/           # Home-page sections (one per component file)
│   ├── NavBar.jsx, Hero.jsx, ProblemStats.jsx, HowItWorks.jsx,
│   ├── ForVictims.jsx, ForCaseworkers.jsx, TrustEthics.jsx,
│   ├── ResourcesSection.jsx, Footer.jsx
├── pages/              # Route-level pages (lazy-loaded)
│   ├── Home.jsx, HowItWorksPage.jsx, ForVictimsPage.jsx,
│   ├── ForOfficialsPage.jsx, ResourcesPage.jsx, ContactPage.jsx,
│   ├── AboutPage.jsx, PrivacyPage.jsx
└── data/
    ├── mock.js         # MOCK demo data (wellbeing trend, queue, factors)
    └── helplines.js    # static helpline directory content
```

### 2.2 Routing & shell

`App.jsx` wires everything:

- `BrowserRouter` with a `PublicLayout` (skip-link, NavBar, `<main>` with 300 ms fade transition via `AnimatePresence`, Footer).
- All non-home pages are `React.lazy()` → code-split chunks with a branded `PageSkeleton` fallback.
- `ScrollToTop` handles hash anchors and resets scroll on navigation.
- `ChatHost` mounts site-wide: one stable demo `user_id` per browser (`localStorage` + `crypto.randomUUID()`), toggles between `ChatbotButton` (floating, gentle pulse) and `ChatWindow` (slides up) — never both.

### 2.3 Design system

- Tailwind config with a custom token scale: **named z-index tokens** (`z-nav`, `z-drawer`, `z-modal`, `z-toast` — the default numeric scale is replaced, so `z-50` does **not** exist), warm-sand neutral palette, marigold primary `#9E4A26`, sage success, calm amber warning, Fraunces display + Inter body, 8 px spacing scale, gentle motion tokens (160–300 ms, ease-out, reduced-motion aware).
- `src/index.css` adds chat tokens (CSS variables at top — flip to teal `#1D9E75` there if desired), shimmer, underline-draw, card-lift, progress-fill.

### 2.4 State & data boundary

- i18n: `LangProvider` holds `lang` + dictionary; `t("key")` used throughout; EN default, HI mirror, Marathi "coming soon".
- Data is fetched via `fetch` to `VITE_API_URL` (see `useChat.js`). The dashboard mock is **frontend-only mock data** (`src/data/mock.js`, labeled "Demonstration data — fictional case for SIH prototype") shaped exactly like the real API responses so it can be swapped for live calls.
- The chat is the one component wired to the real backend end-to-end.

---

## 3. Backend architecture

### 3.1 Layers

```
sahara-backend/
├── main.py                 # FastAPI app, CORS, lifespan (DB + model load), /api/health
├── config.py               # pydantic-settings Settings (.env), CORS list parsing
├── database.py             # Motor client, lazy connect, indexes, ping_db()
├── models/                 # Pydantic v2 schemas (request/response/storage)
│   ├── user.py  checkin.py  transcript.py  caseworker.py  chat.py  risk.py
├── routers/                # HTTP layer — thin, delegates to services
│   ├── checkin.py  user.py  dashboard.py  transcript.py
│   ├── caseworker.py  chat.py  risk.py
├── services/               # Business logic + AI
│   ├── nlp_service.py          # XLM-RoBERTa sentiment (cached global)
│   ├── keyword_service.py      # bilingual crisis keywords
│   ├── scoring_service.py      # 7-step check-in scoring pipeline
│   ├── distress_engine.py      # dynamic score, trends, prediction, factors
│   └── prioritisation_service.py  # case ranking
└── tests/test_api.py       # 100-check integration suite (in-memory MongoDB)
```

### 3.2 Startup (lifespan in `main.py`)

1. `connect_db()` — create the Motor client, grab `sahara_db`, create indexes. If MongoDB is down, the API **still boots** (health reports `db_connected: false`).
2. `nlp_service.load_model()` — loads `cardiffnlp/twitter-xlm-roberta-base-sentiment` once into a module global (~500 MB download on first run, cached on disk afterwards). If it fails, a keyword-based fallback keeps endpoints working (`model_loaded: false`).

### 3.3 Configuration (`config.py`)

Everything via pydantic-settings + `.env` (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URL` | `mongodb://localhost:27017` | Mongo connection |
| `DB_NAME` | `sahara_db` | Database name |
| `MODEL_NAME` | `cardiffnlp/twitter-xlm-roberta-base-sentiment` | HF sentiment model |
| `MODEL_AUTO_DOWNLOAD` | `true` | First-run download toggle |
| `ANTHROPIC_API_KEY` | *(empty)* | Claude key — chat stays in 503 mode without it |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Claude model |
| `CORS_ORIGINS` | `http://localhost:5173,5174,…` | Comma-separated; `NoDecode` + validator parse it into a list |

### 3.4 Database — collections in `sahara_db`

| Collection | Stores | Notes |
|---|---|---|
| `users` | profile: `user_id` (UUID), `display_name`, `phone_hash` (bcrypt — raw phones never stored), `language_preference`, `created_at`, `case_number`, plus `crisis_flag`/`crisis_flagged_at` set by chat crisis turns | unique index on `user_id`; users are auto-created (stub) on first check-in |
| `checkins` | every wellbeing check-in: `form_data` (mood, sleep, feeling_safe, text_response, recent_incident, support_received) + `ai_result` (score, risk_level, confidence, trend, signals, keywords, action, nlp_scores, component_scores) | unique `checkin_id`; compound `(user_id, timestamp)` index powers history + latest |
| `transcripts` | NHAA call/chat transcripts + analysis (sentiment, keywords, distress signals, action) | indexed like checkins |
| `caseworker_actions` | `counsellor_contact`, `escalation`, `note`, `follow_up_completed` + note + caseworker_id | feeds chart annotations + "last human follow-up" |
| `chat_logs` | every chatbot turn: user_message, bot_reply, crisis_detected, language, sentiment | audit trail; feeds sentiment/crisis signals |
| `risk_assessments` | full engine output: distress_score, risk_level, confidence, trend, change, escalation_probability, contributing_factors, priority_score/level, crisis_flag, `model_version` ("prototype-v1") | versioned so future models can be compared |

---

## 4. API surface (13 endpoints)

All under `/api`, all Pydantic-validated, interactive docs at `/docs`.

| Method | Path | What it does |
|---|---|---|
| POST | `/api/checkin` | Store check-in + run the 7-step scoring pipeline → `ai_result` |
| GET | `/api/user/{user_id}/history?days=60` | Trend chart data + annotations (`ai_flag` on first crossing of 56, `counsellor_contact` from actions) |
| GET | `/api/user/{user_id}/latest` | Latest `ai_result` + `display_name` + `case_number` |
| GET | `/api/dashboard/risk-queue` | Prioritised queue: crisis first, then score desc — case id, risk, score, trend, escalation %, priority, last follow-up, reason |
| GET | `/api/dashboard/risk-summary` | Aggregates (counts per band, worsening trends, crisis flags, awaiting follow-up) — no PII |
| GET | `/api/dashboard/chat-flags` | Users with `crisis_flag` in last 24 h + latest sentiment/keywords |
| POST | `/api/transcript/analyze` | Sentiment + crisis analysis of a transcript; stored |
| POST | `/api/caseworker/action` | Log counsellor contact / escalation / note / follow-up |
| POST | `/api/chat` | Claude-powered trauma-informed chat (see §6) |
| POST | `/api/risk/assess/{user_id}` | Run a full risk assessment (engine + prioritisation) |
| GET | `/api/risk/{user_id}/history` | Historical assessments for trend charts |
| GET | `/api/risk/{user_id}/latest` | Latest assessment |
| GET | `/api/health` | `status`, `model_loaded`, `db_connected`, `chat_configured` |

---

## 5. The AI pipeline (INTERACT → ANALYSE → SCORE → PREDICT → ALERT → SUPPORT)

### 5.1 Check-in scoring — `scoring_service.py` (7 steps, fully commented)

1. **NLP sentiment (40%)** — XLM-RoBERTa negative-probability × 100 on `text_response` (+ transcript if given, averaged). Multilingual: handles English, Hindi, and Roman-transliterated Hindi ("mujhe dar lag raha hai").
2. **Structured form (35%)** — mood `(10-mood)×10`, sleep `(10-sleep)×8`, safety `{no:100, sometimes:50, yes:0}`, +20 incident bonus, +15 no-support penalty; mean, clamped.
3. **Longitudinal trend (25%)** — last 30 days of check-ins; <3 entries → `insufficient_data`, weights redistribute to 57/43; else numpy `polyfit` slope: `>2.0` declining (+15), `<-2.0` improving (−10), else stable.
4. **Final score** — weighted sum, clamped, rounded.
5. **Risk mapping** — 0–30 stable, 31–55 monitoring, 56–75 needs_attention, 76–100 urgent; then **crisis-keyword override**.
6. **Recommended action** — rule-based per band; crisis keywords prepend "⚠ Crisis signal detected.".
7. **Confidence** — `1 − std(nlp, form)/100`, clamped, 2 dp.

**Crisis safety net** — `keyword_service.py`: 10 English + 10 Hindi/transliterated phrases, word-boundary matching. 1 match → minimum `needs_attention`; 2+ → minimum `urgent`. Deterministic — never waits for a model.

### 5.2 Risk engine — `distress_engine.py`

A second, longitudinal pass over **all** signals (check-ins + chat logs + history):

- **Dynamic score** 0–100 blending current state, 7/14/30-day trends, conversation sentiment/frequency, missed check-ins, recent deterioration.
- **Trend analysis** — current vs previous score, change, per-window slope, direction (improving/stable/worsening), consecutive elevated observations.
- **Escalation prediction** — explainable prototype model (signal accumulation, no protected characteristics) → `probability_of_escalation` 0–1 over a 7-day window. Labeled: *"Prototype predictive model — requires validation on real anonymised data before operational deployment."*
- **Explainability** — every assessment returns 3–5 `contributing_factors` (`{factor, impact, description}`) so caseworkers see *why*.
- **Crisis override** — any trusted crisis signal forces `risk_level = urgent`, `crisis_flag = true` regardless of score. The queue distinguishes "Urgent — safety signal detected" from "Elevated predicted risk".
- Risk-level mapping here: 0–24 Stable, 25–49 Monitoring, 50–74 Needs Attention, 75–100 Urgent — **documented prototype thresholds, not clinical**.

### 5.3 Prioritisation — `prioritisation_service.py`

Ranks cases by: crisis signal → current distress → rate of deterioration → predicted escalation → persistence → time since last human follow-up. Returns `priority_score` (0–100), `priority_level`, and a plain-language `reason`. Results persist in `risk_assessments` with `model_version`.

---

## 6. Chatbot (trauma-informed, multilingual)

```
Browser (ChatWindow) ──POST /api/chat──▶ routers/chat.py
                                          │
                    1. langdetect (fallback: request.language)
                    2. crisis keywords on user message (safety net)
                    3. build Claude messages (coalesce same-role turns;
                       history is client-supplied, max ~20 turns)
                    4. anthropic SDK call in threadpool (lazy client:
                       no API key → clean 503, never a boot crash)
                    5. crisis keywords on Claude's reply too
                    6. sentiment on user message
                    7. persist turn in chat_logs
                    8. crisis turn → $set crisis_flag on user record
                          │
                          ▼
            GET /api/dashboard/chat-flags (24 h window)
            → "Crisis Chat Flags" card in caseworker dashboard (Urgent badge)
```

- System prompt: the exact trauma-informed MoSJE prompt (verbatim in `routers/chat.py`) — same-language responses, one gentle question at a time, immediate 14566 helpline guidance on crisis, never clinical, never dismissive.
- Client: `useChat.js` — welcome message, history mirror, loading/typing, calm error fallback that always points to 14566, EN/HI toggle, crisis state drives the amber `CrisisBanner`.
- `api_key` never leaves the server; frontend only ever sees the reply + metadata.

---

## 7. End-to-end workflows

### 7.1 Victim journey

1. Reports via NHAA (14566) → case filed → profile created (`users`, `case_number`).
2. Wellbeing check-ins begin (`POST /api/checkin`): each returns an `ai_result` (score + band + action) immediately.
3. Chat companion available site-wide (`POST /api/chat`) — private, bilingual, always escalates to 14566 on crisis.
4. The wellbeing trend (`GET /api/user/{id}/history`) shows the distress line with annotations — when AI first flagged and when a counsellor reached out.

### 7.2 Caseworker journey

1. `GET /api/dashboard/risk-queue` → prioritised list: **crisis safety signals first**, then by priority score. Columns: case, risk badge, score, trend, escalation %, priority, last follow-up, reason.
2. Open a case → `GET /api/risk/{user_id}/latest` + history → current risk, 7/14/30-day trends, prediction, "Why has this case been prioritised?" factors, and a timeline distinguishing **AI events (`· AI`)** from **human actions (`· human`)**.
3. "Mark human follow-up completed" (`POST /api/caseworker/action` with `follow_up_completed`) → timestamp + action recorded, timeline updated. **It never auto-reduces the score or marks the user safe** — the human decides.
4. Chat crisis flags from the last 24 h appear in the alert panel as "Crisis Chat Flags" (Urgent badge, sentiment + keywords only — **no raw conversation text** in the dashboard).

### 7.3 Data flow summary

```
Check-in / chat / transcript
        │
        ▼
  services (scoring / nlp / keywords)
        │
        ▼
  MongoDB (checkins, chat_logs, transcripts, risk_assessments)
        │
        ▼
  distress_engine + prioritisation_service   ← triggered by /api/risk/assess
        │
        ▼
  /api/dashboard/risk-queue · risk-summary · chat-flags
        │
        ▼
  Caseworker review → human follow-up (logged, never auto-cleared)
```

---

## 8. Security & privacy posture (prototype)

- **Raw phone numbers never stored** — bcrypt `phone_hash` only.
- **API key server-side only** — Claude key lives in backend `.env`.
- **Dashboard minimises exposure** — queue shows case IDs, scores, and explainable reasons, not private conversations; chat-flags show keywords/sentiment, not transcripts.
- **No protected characteristics as features** — caste/religion/ethnicity are never inputs to the risk model.
- **CORS locked to frontend origins.**
- ⚠ **Gap:** no real authentication/authorisation yet — `user_id` is client-supplied (stub-user model). Production would require authN/authZ before trusting it (flagged in code + README).

## 9. Prototype boundaries

Everywhere a number or a band is shown, the system labels itself honestly:

- *"AI-assisted risk estimate. This is not a clinical diagnosis."*
- *"Prototype model. Any operational deployment would require validation, clinical oversight, bias assessment, security review, and appropriate government approvals."*
- Thresholds are prototype thresholds; `model_version` is stored per assessment so a validated model can be compared later.
- The final decision always rests with an authorised human counsellor/caseworker.

## 10. Running the platform

```bash
# Backend (one terminal)
cd sahara-backend
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate
pip install -r requirements.txt                  # + requirements-dev.txt for tests
cp .env.example .env                             # add ANTHROPIC_API_KEY to enable chat
uvicorn main:app --reload                        # http://localhost:8000, docs at /docs

# Tests (no MongoDB or model needed — in-memory Mongo)
cd sahara-backend && .venv/Scripts/python tests/test_api.py   # 100 checks

# Frontend (another terminal)
npm install
npm run dev                                      # http://localhost:5173

# Point the frontend at the backend (optional — defaults already match)
# .env.local in project root: VITE_API_URL=http://localhost:8000
```

See `sahara-backend/README.md` for the full setup guide, MongoDB Atlas free-tier instructions, and curl examples for every endpoint.