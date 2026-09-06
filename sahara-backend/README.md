# Sahara Backend

AI-powered wellbeing monitoring and distress prediction for victims of
caste-based atrocities (SIH26094 · MoSJE). This is the FastAPI service that
powers the Sahara frontend: check-ins, the wellbeing trend chart, the
caseworker risk queue, and transcript analysis.

Built with **FastAPI + Motor (async MongoDB) + Pydantic v2**, with a
**multilingual sentiment model** (English + Hindi + romanized Hindi) and a
**bilingual crisis-keyword safety net** that can force a minimum risk level
no matter what the model says.

```
sahara-backend/
├── main.py                  # FastAPI app, CORS, startup model load
├── config.py                # Settings via pydantic-settings + .env
├── database.py              # Motor MongoDB connection + indexes
├── models/                  # Pydantic request/response/storage models
├── routers/                 # The 7 API endpoints
├── services/                # NLP, scoring pipeline, keyword detection
├── .env.example             # Copy to .env and edit
├── requirements.txt         # Pinned dependencies
└── README.md                # This file
```

---

## 1. Prerequisites

- **Python 3.11+** — check with `python --version`
- **MongoDB** — either:
  - installed locally (see Section 8a), or
  - a free **MongoDB Atlas** cluster (see Section 8b) — no credit card needed

No ML background is required — everything below is copy-paste.

---

## 2. Create your `.env` file

From inside `sahara-backend/`:

```bash
cp .env.example .env
```

Open `.env` and set `MONGODB_URL`. The default
(`mongodb://localhost:27017`) works for a local MongoDB install. For Atlas,
paste your connection string (see Section 8b).

---

## 3. Install dependencies

```bash
cd sahara-backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

> **Heads-up:** `torch` + `transformers` install about **2 GB**. If you only
> want to try the API quickly, comment out the `torch`, `transformers`, and
> `sentencepiece` lines in `requirements.txt` — the API still boots and uses
> a transparent rule-based sentiment fallback (`model_loaded` will report
> `false` in `/api/health`).

---

## 4. Run the server

```bash
uvicorn main:app --reload
```

You should see `Uvicorn running on http://127.0.0.1:8000`.

- Interactive API docs (try every endpoint in the browser): **http://127.0.0.1:8000/docs**
- Health check: **http://127.0.0.1:8000/api/health**

---

## 5. First run: the model downloads automatically (~500 MB)

On the first start, the server downloads
`cardiffnlp/twitter-xlm-roberta-base-sentiment` (~500 MB) from Hugging Face
and caches it on disk. This happens **once** — every later start loads from
cache in seconds. You can watch the download progress in the server log.

If the download fails (offline, blocked network), the API keeps running with
the keyword fallback, and `/api/health` reports `model_loaded: false`. Set
`MODEL_AUTO_DOWNLOAD=false` in `.env` to skip the download entirely.

---

## 6. Connect the React frontend

The frontend reads the API base URL from `VITE_API_URL`. Create (or edit)
`.env` in the frontend project root:

```bash
VITE_API_URL=http://localhost:8000
```

Then restart the Vite dev server (`npm run dev`). CORS is already configured
for `http://localhost:5173` and `http://localhost:5174`.

---

## 7. Testing the endpoints

Start the server, then run these from a second terminal. All responses are
JSON.

### 7.1 Health

```bash
curl http://localhost:8000/api/health
# {"status":"ok","model_loaded":true,"db_connected":true}
```

### 7.2 Submit a check-in

```bash
curl -X POST http://localhost:8000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "demo-user-001",
    "mood": 3,
    "sleep": 2,
    "feeling_safe": "no",
    "text_response": "Bahut dar lag raha hai, koi sahara nahi mil raha",
    "recent_incident": true,
    "support_received": false
  }'
```

Response contains `checkin_id`, `timestamp`, and the full `ai_result`
(distress score, risk level, confidence, trend, signals, keywords, action).
The romanized-Hindi text above should trigger the keyword safety net
(`dar lag raha`) and raise the risk level.

Submit it **again** after a few seconds — the second score will also include
a trend component from the first check-in.

**STEP 5 pipeline:** when auth is enforced (the default), every check-in
automatically flows through the EXISTING risk engine before the response
is returned — the response additionally carries an `assessment` object
(assessment id, distress score, risk level, trend, escalation probability)
and an `alerts_created` list when the alert service raised something
(risk increase, rapid deterioration, crisis signal, ...). In the legacy
open mode (`AUTH_ENFORCED=false`) check-ins are stored without an
assessment so an unauthenticated caller can never manufacture assessments
or alerts. Full flow: see the STEP 5 section below.

### 7.3 History + annotations (drives the wellbeing trend chart)

```bash
curl "http://localhost:8000/api/user/demo-user-001/history?days=60"
```

Returns `history` (one row per check-in) and `annotations` — `ai_flag` the
first time the score crossed 56, and `counsellor_contact` entries once you
log actions (7.6).

### 7.4 Latest check-in (case detail view)

```bash
curl http://localhost:8000/api/user/demo-user-001/latest
```

### 7.5 Risk queue (caseworker dashboard)

```bash
curl http://localhost:8000/api/dashboard/risk-queue
```

Crisis-flagged users sort first, then by score descending.

### 7.6 Log a counsellor action (creates chart annotations)

```bash
curl -X POST http://localhost:8000/api/caseworker/action \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "demo-user-001",
    "action_type": "counsellor_contact",
    "note": "Called user; spoke for 25 minutes; follow-up scheduled",
    "caseworker_id": "cw-042"
  }'
```

Re-run 7.3 and you'll see the `counsellor_contact` annotation appear.

### 7.7 Transcript analysis

```bash
curl -X POST http://localhost:8000/api/transcript/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "demo-user-001",
    "transcript": "maine kaha mujhe jeena nahi, sab khatam kar dena chahta hun"
  }'
```

Two crisis keywords (`jeena nahi`, `khatam kar`) → multiple-signal action.

---

## 8. MongoDB setup

### 8a. Local MongoDB (easiest)

- **Windows:** download the MSI from mongodb.com, install with default
  options (it runs as a Windows service automatically), then verify:
  ```bash
  mongosh --eval "db.runCommand({ ping: 1 })"
  ```
- **macOS (Homebrew):**
  ```bash
  brew tap mongodb/brew && brew install mongodb-community
  brew services start mongodb-community
  ```
- **Linux (Ubuntu/Debian):** follow mongodb.com's install guide, then:
  ```bash
  sudo systemctl start mongod
  ```

No database or collection creation is needed — the API creates
`sahara_db` and its indexes automatically on startup.

### 8b. MongoDB Atlas (free tier, no credit card)

1. Go to **mongodb.com/cloud/atlas** → **Try Free** → sign up.
2. **Create a cluster** (M0 free tier, any region — pick one close to India
   like `ap-south-1`).
3. Under **Database Access**, add a database user (e.g. `sahara` with a
   strong password) — this is the `user`/`password` in your connection
   string.
4. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere — fine for
   a demo; lock this down for production).
5. Click **Connect → Drivers**, copy the connection string, and paste it
   into `.env` as `MONGODB_URL`:
   ```
   MONGODB_URL=mongodb+srv://sahara:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
6. Restart the server. `GET /api/health` should report `db_connected: true`.

---

## Running the tests

A full integration test suite (`tests/test_api.py`) runs all 7 endpoints
against an in-memory MongoDB — no database server, no ML model needed:

```bash
pip install -r requirements-dev.txt
# Windows:  .venv\Scripts\python tests\test_api.py
# macOS/Linux: .venv/bin/python tests/test_api.py
```

It covers: check-ins (crisis override EN + HI, mild, trend), history
annotations, caseworker actions, the risk queue, transcript analysis,
and stub-user auto-creation (44 checks).

Five suites run independently (each in its own process so the
AUTH_ENFORCED flag is clean):

```bash
.venv/Scripts/python tests/test_api.py        # legacy open-mode endpoints (Steps 1-2)
.venv/Scripts/python tests/test_auth.py       # auth + RBAC strict mode (Step 3)
.venv/Scripts/python tests/test_chat.py       # multilingual portal chat strict mode (Step 4)
.venv/Scripts/python tests/test_pipeline.py   # check-in -> risk -> alert (Step 5, enforced)
.venv/Scripts/python tests/test_wellbeing.py  # beneficiary wellbeing space (STEP 1, enforced)
.venv/Scripts/python tests/test_wellbeing_personalized.py  # adaptive personalisation (STEP 3, enforced)
```

Latest counts: test_api 184, test_auth 80, test_chat 86, test_pipeline 48,
test_wellbeing 65, test_wellbeing_personalized 43 (506 checks total).

---

## STEP 4 — Multilingual "Talk to Sahara" (beneficiary portal)

An authenticated, session-based support companion lives inside the
beneficiary portal. It is an ACCESS AND SUPPORT INTERFACE, never a
therapist or a second risk engine: the chat guides, and every wellbeing
check-in it completes is submitted through the EXISTING `/api/checkin`
scoring pipeline and the existing risk-assessment/alert chain.

### Languages

`en`, `hi`, `or` (Odia) — extensible by adding one entry to
`services/chat_i18n.py` (conversation content) plus keywords/fallback
pools where needed. Language affects the whole experience: welcome,
quick actions, prompts, crisis copy, and UI labels. The LLM system
prompt requires the model to mirror the user's language and script.

### AI provider + mock mode

Reuses the existing provider layer (`services/chat_llm.py`): Anthropic,
Gemini, or the built-in rule-based responder. Set `MOCK_AI_MODE=true` in
`.env` for deterministic, clearly-labelled sample replies with NO API
key or network (responses report `provider="mock"`). Crisis replies are
always deterministic and never left to a model.

### Crisis flow (existing alert pathway)

`services/chat_safety.py` conservatively classifies every message
(`ok | concern | crisis`) across English, Hindi (Devanagari + romanized)
and Odia (script + romanized) — crisis keywords shared with the risk
engine. On crisis the chat shows a calm amber card with the real numbers
(14566 / 112) and a human-support CTA; the user's `crisis_flag` is set
(the existing "Crisis Chat Flags" dashboard card), a system row is added
to `caseworker_actions`, and safety metadata (keywords + sentiment ONLY
— never raw text) is written to `chat_logs`.

### Privacy

Conversation text lives ONLY in the user-owned `chat_sessions`
document. Deleting a session deletes it for real. No API key ever
reaches the frontend; audit rows contain no message content.

### New API endpoints (all auth-bound; identity comes from the token)

| Endpoint | Purpose |
|---|---|
| `POST /api/chat/sessions` | Create/resume the beneficiary's conversation (localised welcome + quick actions) |
| `GET /api/chat/sessions/{id}/messages` | Full history (owner; assigned staff may read) |
| `POST /api/chat/sessions/{id}/messages` | One turn (safety-first pipeline) |
| `DELETE /api/chat/sessions/{id}` | Delete the conversation for real |
| `POST /api/chat/sessions/{id}/human-support` | Record a human-support request |
| `POST /api/chat/safety-check` | Stateless conservative classification |

---

## How the scoring pipeline works (brief)

Every check-in runs a 7-step pipeline (`services/scoring_service.py`,
commented for non-ML readers):

| Step | Input | Weight |
|------|-------|--------|
| 1 | Sentiment of free text (+ transcript if given) | 40% |
| 2 | Structured form answers (mood, sleep, safety, incident, support) | 35% |
| 3 | 30-day trend of past scores (numpy slope) | 25% |
| 4–5 | Weighted sum → score → risk band, then **crisis-keyword override** | — |
| 6–7 | Rule-based recommended action + agreement-based confidence | — |

The keyword safety net is bilingual (English + Hindi/romanized Hindi) and
authoritative: any match forces at least `needs_attention`, two or more
force `urgent`. The model is never the last word — a human caseworker
always reviews every `needs_attention`/`urgent` result (human-in-the-loop).
---

## STEP 5 — Check-in → risk → alert pipeline

Closes the loop between a NORMAL wellbeing check-in and the existing
risk/alert machinery (the audit's #1 critical gap). No new scoring
system, alert collection or engine was added — the check-in now feeds
the existing `distress_engine.assess_user` and `alert_service`.

### Flow

```
POST /api/checkin                      (auth enforced — default)
  -> validate the authenticated beneficiary/staff scope
  -> scoring_service.compute_ai_result (existing 7-step scoring)
  -> check-ins document stored         (append-only, source: "checkin")
  -> services/checkin_flow.run_assessment_flow:
       distress_engine.assess_user          (existing engine)
       risk_assessments.insert_one          (existing collection)
       alert_service.sync_alerts_for_assessment (existing service)
  -> response: checkin + assessment + alerts_created (no false claims)
```

The guided chat check-in (`routers/chat.py`) funnels through the SAME
`checkin_flow` helper, so both check-in paths can never drift apart.
The manual `POST /api/risk/assess/{user_id}` endpoint is unchanged.

### One risk language (services/risk_policy.py)

The score bands (75 urgent / 50 needs_attention / 25 monitoring / 0
stable), band rank, elevated threshold and the history-chart flag
threshold now live in ONE shared module read by the scoring pipeline,
the distress engine, prioritisation and the alert service. Before this
change the check-in label used different boundaries (76/56/31) than the
assessment/alert layer — the same submission could be labelled
differently depending on which screen you looked at. Now a check-in's
`ai_result.risk_level` always equals the risk assessment generated from
the same data (prototype thresholds, not clinical — disclaimers kept).

### Idempotency + failure handling

- Duplicate alerts: `alert_service` keeps at most ONE open alert per
  (user, type, transition) — retrying an identical check-in stores a
  new check-in + assessment (append-only, documented) but never stacks
  a duplicate open alert. A resolving human re-arms each rule.
- Each stage after the check-in insert is failure-contained and logged
  (user ids only, never free text): a risk/alert hiccup can never lose
  a check-in or return a false "alert created".
- True multi-document transactions need MongoDB replica-set sessions
  (documented); with the current single-node setup the operation is
  idempotent-as-practical and append-only.

### Demo verification (live, DEMO-042 — fictional SIH data)

With the backend running against MongoDB:

```bash
.venv/Scripts/python tests/demo_step5_live.py
```

Logs in as the fictional beneficiary (P. Kumar / DEMO-042), submits a
clearly fictional crisis check-in, retries it, and confirms via the
caseworker's `GET /api/alerts` that the alert was really stored and
deduplicated (exactly one open `crisis_signal` alert).

## STEP 1 — Beneficiary wellbeing space (backend)

Small, safe, personalised wellbeing activities + the support pathway,
all beneficiary-owned. Backend only (no frontend redesign in this
step). It READS the existing risk state — it never runs a second risk
engine and never exposes a risk score to the beneficiary.

### Personalisation rules (deterministic + explainable)

The plan branch comes from the person's latest EXISTING risk
assessment (falling back to their latest check-in):

```
no data yet            -> supportive     (6 gentle ideas, "getting started")
stable band            -> supportive
monitoring band        -> early_support  (grounding + reflection + connection)
needs_attention band   -> human_support  (human first; 2 calming ideas only)
urgent / crisis_flag   -> crisis / human_support (existing crisis pathway first)
```

Crisis keeps using the EXISTING crisis pathway (chat crisis flow, the
distress engine override, alerts, caseworker workflow). In a crisis
state the plan pushes human support ahead of self-directed activities
and suggests no activities. Internal risk scores/bands are never
included in any wellbeing response.

### Endpoints (all beneficiary-only; identity comes from the token)

```
GET  /api/wellbeing/plan                           personalised plan
GET  /api/wellbeing/activities                     full catalogue + state
POST /api/wellbeing/activities/{id}/complete       idempotent completion
GET  /api/wellbeing/progress                       gentle progress summary
POST /api/wellbeing/reflections                    private reflection
GET  /api/wellbeing/reflections                    own reflections only
POST /api/wellbeing/support-request                ask to talk to a person
GET  /api/wellbeing/support-status                 honest request state
```

There is no user_id in any URL or body: the authenticated account IS
the subject, so one beneficiary cannot address another person's data.

- **Completion** persists into `wellbeing_activity_records`; the unique
  (user_id, activity_id) index makes duplicates idempotent (a repeat
  increments `times_completed` on the SAME document — no duplicate).
- **Reflections** (`wellbeing_reflections`) are beneficiary-private:
  no caseworker/admin read path, and the text is deliberately never
  audit-logged.
- **Support request** reuses the EXISTING caseworker workflow: it
  writes the same `caseworker_actions` row the portal chat's
  human-support request writes (`sahara-support-request`), so the
  assigned caseworker sees it on the case timeline. It never claims a
  counsellor is calling (no telephony integration). While a request is
  unanswered, repeats return the same request instead of stacking
  duplicates; `support-status` reflects only the human workflow.
- Collections added: `wellbeing_activity_records`,
  `wellbeing_reflections` (indexes in `database.py`).

Tests: `tests/test_wellbeing.py` (65 checks) — auth gates (401/403),
all four personalisation branches, idempotent completion, catalogue
state, private reflection ownership + audit-log hygiene, support
request dedupe + status, and a check-in pipeline regression.

## STEP 3 — Adaptive "next small step" personalisation

STEP 3 makes the same deterministic plan genuinely adaptive, still
using ONLY the existing stored state (risk_assessments / check-ins /
wellbeing_activity_records) — no second engine, no new thresholds.

- The plan now carries a plain-language **adaptive summary** keyed
  `summary_*` (also `_easing` variants when the stored trend is
  improving) plus a stable `basis_key` saying where the plan came
  from (assessment / check-in / getting started). No score or risk
  band is ever included.
- Each non-crisis plan also carries **ONE recommended next small
  step** (`next_step`) with its `reason_key` — deterministic rule:
  among the activities appropriate for the current branch, suggest
  the one completed least recently (never-done first, catalogue order
  breaking ties). Completing it rotates the recommendation away from
  what was just done, so the plan adapts without randomness.
- Branching adds the stored **trend direction**: a `monitoring` person
  whose trend is improving gently returns to normal supportive
  wording (`supportive_easing`); steady/worsening stays in
  `early_support`. Elevated bands always keep human support first;
  crisis keeps the existing crisis pathway with no activity push.
- Completion returns gentle **non-gamified feedback**
  (`feedback_key`, from the honest completion count) and the plan
  re-arms so progress always reflects the database.

Tests: `tests/test_wellbeing_personalized.py` (43 checks) — all five
required scenarios (stable / mildly worsening / elevated / persistent
/ crisis), improvement-after-check-in easing, activity-completion
rotation, support request, authorization, and chat + pipeline
regression.

