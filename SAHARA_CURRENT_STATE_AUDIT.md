# SAHARA — CURRENT STATE AUDIT

Read-only technical audit of the Sahara SIH26094 prototype (working tree at `BUFFEDSAHARA`). No files were modified to produce these findings. Note: this checkout has **no `.git` directory**, so version history is unavailable.

---

## 1. Executive summary

Sahara is a substantial, well-engineered **prototype**: ~6,600 lines of Python backend (FastAPI + Motor/MongoDB), ~4,470 lines of React frontend, and three backend test suites (179 + 77 + 83 = **339 checks**). The architecture is honest in the right places: server-authoritative auth/RBAC, an explainable rule-based risk engine, a deterministic crisis safety net, alert → human-action workflow records, server-side admin aggregation, and an authenticated multilingual (en/hi/or) chat with a safety classifier and crisis flow.

However, several things that **look real are mock, partially wired, or rule-based**:

- The **Command dashboard (`/command`) renders frontend mock data** (`src/data/adminMock.js`), not the real `/api/admin/*` endpoints that exist and are tested.
- The **XLM-RoBERTa sentiment model is not running** in the current environment (torch/transformers not installed; `/api/health` reports `model_loaded: false`). Sentiment today runs on a small lexicon fallback.
- **Two write endpoints are unauthenticated**: `POST /api/transcript/analyze` (stores raw transcript text for any `user_id`) and legacy `POST /api/chat` (guest widget, arbitrary `user_id` from the body).
- **`POST /api/checkin` never triggers risk assessment or alert generation** — ordinary check-ins do not update the risk queue; only manual `POST /api/risk/assess/{id}` or chat-guided check-ins do.
- The **real alert/human-action endpoints (`/api/alerts*`, `/api/cases/*/interventions|follow-up`) are consumed by no frontend page** — the clickable alert centre lives in a marketing component (`DashboardMock.jsx`) backed by local component state.
- Disclaimers are honest in code everywhere, but the `/command` view and marketing caseworker demo present synthetic narratives a judge could mistake for live system behaviour.

## 2. Architecture diagram (as implemented)

```
PUBLIC SITE (static marketing; only guest chat calls the backend)
  Home/About/HowItWorks/ForVictims/ForOfficials/Resources/Privacy/Contact
  ├─ src/data/helplines.js, src/data/mock.js (marketing stats/testimonials)
  └─ ChatHost widget → POST /api/chat (OPEN) → chat_logs

AUTH (all portals) — JWT HS256 (8h, no refresh), bcrypt, DB re-read per request
  login / me / logout → users (email, password_hash, role, state, district, staff_id)
  roles: national_admin → state_admin → district_officer → caseworker → beneficiary

BENEFICIARY  /beneficiary  → GET /api/user/{uid}/history (real)
             /talk         → /api/chat/sessions* (real) → chat_sessions
                            safety classify → LLM/failover → crisis flow
                            conversational check-in → checkins →
                            distress_engine.assess_user → risk_assessments → alerts

CASEWORKER   /caseworker   → /api/dashboard/risk-queue (real)
                            → /api/cases/DEMO-042/timeline (real, hardcoded case)
             Alert centre UI shown on marketing site = DashboardMock (local state)
             Real alert APIs (/api/alerts*, /api/cases/*/interventions|follow-up)
             exist and are tested but are NOT wired to any page.

ADMIN        /command → src/data/adminMock.js (frontend mock)
             Real /api/admin/* (7 endpoints) exist and are tested but unused by UI.

DATA LAYER (MongoDB): users, checkins, risk_assessments, alerts,
  caseworker_actions, chat_sessions, chat_logs, transcripts, audit_logs

RISK CHAIN: checkin/chat → scoring (rules) → risk_assessments → alerts →
            caseworker_actions (interventions/follow-ups) → admin aggregation
```

## 3. Complete feature matrix (verified in code)

| Feature | Where | Backend | Frontend | DB | Real or mock | API | Roles | Notes | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Auth + RBAC | routers/auth.py, services/security.py | YES | YES | YES | Real | /api/auth/* | all | JWT, scopes, audit | HIGH |
| Wellbeing check-in | routers/checkin.py | YES | via /talk only | YES | Real | POST /api/checkin | beneficiary | No standalone form UI | HIGH |
| Distress engine | services/distress_engine.py | YES | — | YES | Rules | /api/risk/assess/{id} | caseworker+ | Threshold bands differ from scoring_service | HIGH |
| Risk history/trend | routers/risk.py, user.py | YES | YES (Recharts) | YES | Real | /api/risk/{id}/history, /api/user/{id}/history | owner+staff | | HIGH |
| Crisis detection | keyword_service, chat_safety | YES | YES | YES | Rules+LLM | embedded | all | en/hi/or | HIGH |
| Chatbot (sessions) | routers/chat.py | YES | YES (/talk) | YES | Real | /api/chat/sessions* | beneficiary | Context, delete, human-support | HIGH |
| Legacy guest chat | routers/chat.py | YES | YES (widget) | YES | Real | POST /api/chat | open | UNAUTHENTICATED | HIGH |
| Transcript analysis | routers/transcript.py | YES | — | YES | Rules | POST /api/transcript/analyze | open | UNAUTHENTICATED, stores raw text | HIGH |
| Alerts | routers/alerts.py | YES | NO (mock UI only) | YES | Real API, mock UI | /api/alerts* (6) | staff | Not wired to frontend | HIGH |
| Interventions/follow-up | routers/cases.py | YES | NO (mock UI only) | YES | Real API, mock UI | /api/cases/*/interventions, /follow-up | caseworker | Not wired to frontend | HIGH |
| Timeline | routers/cases.py | YES | PARTIAL (DEMO-042) | YES | Real | /api/cases/{id}/timeline | staff | Hardcoded case id in UI | HIGH |
| Risk queue | routers/dashboard.py | YES | YES (/caseworker) | YES | Real | /api/dashboard/risk-queue | staff | Beneficiary page also calls it (verify) | HIGH |
| Admin aggregation | routers/admin.py, services/admin_service.py | YES | NO (mock) | YES | Real API, mock UI | /api/admin/* (7) | admins | /command uses adminMock | HIGH |
| Sentiment | services/nlp_service.py | PARTIAL | — | YES | Lexicon (HF off) | embedded | — | model_loaded:false | HIGH |
| i18n sitewide | lib/i18n.jsx | — | YES | — | Real | — | public | en/hi | HIGH |
| Talk i18n | data/talkI18n.js + chat_i18n.py | YES | YES | — | Real | — | beneficiary | en/hi/or | HIGH |

## 4. AI / ML audit — do not oversell

| Component | Genuine ML? | Runtime? | Where called | Input → Output | Affects risk? | Real/deterministic | Mock/fallback | Env | If unavailable |
|---|---|---|---|---|---|---|---|---|---|
| HF XLM-RoBERTa sentiment | YES (model) | **NO — not installed** | services/nlp_service.py (attempted) | text → pos/neu/neg | Yes (via nlp_score) | Real when loaded | lexicon fallback | HF model auto-download | lexicon used; health reports model_loaded:false |
| Anthropic/Gemini chat LLM | YES | YES (if keys) | services/chat_llm.py | history → reply | No | Real | deterministic pools + MOCK_AI_MODE | ANTHROPIC_API_KEY / GEMINI_API_KEY | built-in responder chain |
| Distress engine | NO — rule-based | YES | services/distress_engine.py | checkins/chat signals → score+f actors | Yes (core) | Deterministic | n/a | — | n/a |
| Crisis classifier | NO — rule-based | YES | chat_safety.py, keyword_service.py | message → ok/concern/crisis | Override only | Deterministic | n/a | — | n/a |
| Longitudinal trend | NO — rule-based (numpy slope) | YES | scoring/distress services | history → improving/stable/worsening | Yes | Deterministic | n/a | — | n/a |
| Escalation prediction | NO — heuristic | YES | distress engine | features → probability | Priority | Deterministic | n/a | — | n/a |
| Sentiment labels in chat | Hybrid (lexicon + optional LLM) | Partial | nlp_service + chat | message → label | No | Mixed | yes | — | lexicon |
| MOCK_AI_MODE | — | YES when set | chat_llm | — | No | Deterministic sample | primary mode for demo | MOCK_AI_MODE=true | n/a |

**Answers:** (A) genuinely executed ML today = only the external chat LLM when keys are configured. (B) Rule-based = distress scoring, trends, prediction heuristic, crisis classifier/keywords, risk mapping, priorities. (C) Mock/demo = HF sentiment (off in this env), MOCK_AI_MODE replies, all seeded datasets, /command adminMock. (D) Hybrid = sentiment pipeline (model when available, lexicon otherwise), chat (LLM + deterministic safety reply). (E) Not implemented despite UI appearance = nothing is outright fake in code labels, but "AI-powered sentiment", "predictive model" wording risks overstating rule-based components.

## 5. End-to-end workflows

**A — Normal beneficiary (real):** /beneficiary UI → GET /api/user/{id}/history (routers/user.py) → db.checkins → Recharts trend. Or /talk → POST /api/chat/sessions → chat_sessions → safety classify (chat_safety.py) → chat_llm reply → message stored → UI renders.

**B — Distress (via conversational check-in only):** /talk quick action → POST /api/chat/sessions/{id}/messages (routers/chat.py) → 5 questions → internal check-in submit → routers/checkin.py → scoring_service → distress_engine.assess_user → risk_assessments → alerts sync → caseworker queue. **Gap:** a raw POST /api/checkin does not run this chain.

**C — Crisis:** message → chat_safety/keyword_service classify "crisis" → deterministic 14566/112 reply (never model-generated) → crisis card + human-support CTA → caseworker_actions safety row + users.crisis_flag → caseworker "Crisis Chat Flags" card → human support request recorded (honest state, no false claims).

**D — Caseworker:** risk queue (real) → open case (DEMO-042 only, hardcoded) → timeline (real) → ack alert / record intervention / follow-up (real endpoints, **no UI wired — only marketing mock**).

**E — Government:** db (risk_assessments, alerts, caseworker_actions, users) → services/admin_service.py (server-side aggregation) → /api/admin/* → (real endpoints exist; UI at /command uses adminMock instead).

## 6. Database audit

Collections (confirmed by code usage): **users** (PII: display_name, case_number, phone_hash, staff/auth fields) · **checkins** (form + ai_result, no raw chat) · **risk_assessments** (scores, factors, model_version) · **alerts** (severity, status, ack metadata) · **caseworker_actions** (human actions, notes) · **chat_sessions** (embedded messages — raw chat plaintext) · **chat_logs** (legacy raw turns) · **transcripts** (raw transcript text) · **audit_logs** (events only, no content).

Indexes exist on users/chat/risk/alerts fields incl. compound state/district/risk/created_at for admin queries (database.py). **Issues:** no TTL/retention on chat/transcripts; deletion implemented only for chat_sessions (real delete); no export; mongomock-based tests never exercise real Mongo index behaviour; legacy chat_logs + transcripts grow without policy; duplicate risk collections avoided (single risk_assessments), no orphaned models found.

## 7. API audit (full list, verified)

| METHOD | PATH | Purpose | Role | Auth | DB | Status |
|---|---|---|---|---|---|---|
| POST | /api/auth/login · /api/auth/me · /api/auth/logout | Auth | all | public login | users/audit_logs | WORKING |
| POST | /api/checkin | Wellbeing check-in | beneficiary (by token) | YES | checkins | WORKING (no auto-assess) |
| POST | /api/risk/assess/{user_id} | Run assessment | caseworker+ | YES | risk_assessments/alerts | WORKING |
| GET | /api/risk/{user_id}/history · /latest | Risk history | owner/staff | YES | risk_assessments | WORKING |
| GET | /api/user/{user_id}/history · /latest | Check-in history | owner/staff | YES | checkins | WORKING |
| GET | /api/dashboard/risk-queue · /risk-summary · /chat-flags | Staff dashboards | staff | YES | aggregates | WORKING (UI: queue yes, others no) |
| GET | /api/alerts · /api/alerts/unread · /api/alerts/{id} | Alerts | staff | YES | alerts | WORKING (no UI) |
| POST | /api/alerts/{id}/acknowledge · /status | Alert workflow | staff | YES | alerts | WORKING (no UI) |
| GET | /api/dashboard/alerts-summary | Summary | staff | YES | alerts | WORKING |
| POST | /api/cases/{case_id}/interventions · /follow-up | Human actions | caseworker (id from token) | YES | caseworker_actions | WORKING (no UI) |
| GET | /api/cases/{case_id}/timeline | Timeline | staff | YES | caseworker_actions | WORKING |
| POST | /api/caseworker/action | Legacy action log | caseworker | YES | caseworker_actions | WORKING |
| POST | /api/chat/sessions · GET/DELETE session · POST messages · POST human-support · POST safety-check | Chat | beneficiary (owner) | YES | chat_sessions | WORKING |
| POST | /api/chat | Legacy guest chat | OPEN | **NO** | chat_logs | WORKING (unauthenticated) |
| POST | /api/transcript/analyze | Transcript analysis | OPEN | **NO** | transcripts | WORKING (unauthenticated) |
| GET | /api/admin/national/summary · /states · /states/{s}/summary · /states/{s}/districts · /districts/{d}/summary · /districts/{d}/caseworkers · /trends | Admin | admins scoped | YES | aggregates | WORKING (no UI) |
| GET | /api/health | Health | public | NO | — | WORKING |

Used by frontend: auth, checkin (via chat), risk/user history, risk-queue, DEMO-042 timeline, chat sessions. **Not used by any UI:** all /api/alerts*, /api/cases interventions/follow-up, /api/admin/*, risk-summary, chat-flags, transcript.

## 8. Authentication / authorization audit

- JWT (HS256, `sub` only, 8h) + bcrypt; identity re-read from DB per request — role/state/district never from token or client. No refresh tokens; logout is client-side discard (no revocation). Token in sessionStorage.
- Dependencies: require_actor, require_staff_role, require_admin_scope, require_case_access, allowed_user_ids.
- Verified: Beneficiary A→B data 403; caseworker cross-case 403 (assignment-based); intervention caseworker_id derived from token; state/district scope enforced; alerts scoped; audit_logs populated (no content).
- Gaps: transcript + legacy chat unauthenticated; no rate limiting; no refresh/revocation; JWT secret default exists (demo).

## 9. Privacy / security audit

- CRITICAL: raw chat stored plaintext (chat_sessions, chat_logs) without retention/TTL/encryption-at-rest; open transcript write endpoint.
- HIGH: open legacy chat with arbitrary user_id; no rate limiting; no backup-exclusion policy for chat.
- MEDIUM: beneficiary page calls staff-scoped risk-queue (verify 403 handling); no HTTPS/header hardening in demo; CORS open for demo.
- LOW: sessionStorage JWT; well-known demo passwords (documented).
- Already good: bcrypt only, no hash in responses, audit log content-free, real chat deletion, server-side PII-minimal aggregation, disclaimers everywhere.

## 10. Frontend audit

PUBLIC (static): /, /how-it-works, /for-victims, /for-officials, /resources, /contact, /about, /privacy (+ /login, /unauthorized). Marketing caseworker demo = DashboardMock.jsx (local state). BENEFICIARY: /beneficiary (real API), /talk (real API, 3 languages). CASEWORKER: /caseworker (real queue + hardcoded DEMO-042 detail). ADMIN: /command (adminMock only). Loading states on real pages; error states minimal; a11y strong (focus, aria, reduced motion); no frontend tests; no frontend language toggle on /talk beyond its own picker (page chrome follows en/hi/or).

## 11. Poster feature matrix (30)

🟢 FULLY: distress score, longitudinal tracking, crisis detection, multilingual conversational AI, chatbot, case escalation, explainable AI, state/district/national aggregation (backend), intervention + follow-up records.
🟡 PARTIAL: AI monitoring (no auto-assess on check-in), sentiment (lexicon live, HF off), early-warning alerts (no UI), government dashboard (frontend mock), privacy controls (no TTL/export), consent (implicit), 14566/112 (static + click-to-call), NGO/counsellor integration (assignment only), analytics (no export).
🔴 NOT IMPLEMENTED / ⚪ ROADMAP: voice stress analytics, IVRS, SMS, native mobile, offline, resource workflows beyond static pages.

## 12. Real vs mock data matrix

Real seeds: seed_demo.py, seed_admin_data.py, seed_auth_accounts.py (fictional, clearly labelled). Frontend mock: adminMock.js → /command (replaceable by /api/admin/*), DashboardMock.jsx → marketing alert demo (replaceable by /api/alerts*), mock.js (marketing only), helplines.js (static, real numbers), talkI18n.js (copy). Hardcoded: DEMO-042 timeline + ben-cuttack id in /caseworker.

## 13. Frontend ↔ backend connectivity

Real: marketing→(none), guest widget→/api/chat, /login→/api/auth/*, /beneficiary→user history, /talk→chat sessions + checkin chain, /caseworker→risk-queue + DEMO-042 timeline. **Looks real but mock:** alert centre (DashboardMock), /command (adminMock). Backend-only (no UI): alerts, interventions/follow-up, admin endpoints, risk-summary, chat-flags, transcript.

## 14. Test audit

test_api.py 179 checks (checkins, crisis EN+HI, trends, annotations, queue, transcripts, users, admin aggregation, alerts). test_auth.py 77 (login, tokens, scope enforcement, 403s, identity-from-token, audit). test_chat.py 83 (sessions, auth, context, en/hi/or, crisis, human-support, deletion, privacy, mock mode, check-in→alert integration). Total 339. No frontend tests. Untested: open transcript/legacy-chat routes, rate limiting (none), retention, real Mongo behaviours, alert-centre & command UIs (mock), check-in→auto-assess (does not exist).

## 15. Production readiness scores

Architecture 82 · AI/ML 35 · Backend 78 · Frontend 70 · Database 60 · Security 45 · Authentication 75 · Privacy 55 · Accessibility 80 · Performance 65 · Testing 62 · Government-readiness 30 · SIH-demo readiness 78.

## 16. Critical bugs / risks (reported, not fixed)

1. Check-ins don't drive risk/alert pipeline (manual assess or chat only).
2. Open /api/transcript/analyze — arbitrary user_id raw-text writes.
3. Open legacy /api/chat — arbitrary user_id.
4. Two risk models with different thresholds (0–30/31–55/56–75/76–100 vs 0–24/25–49/50–74/75–100) → inconsistent risk levels.
5. /command presents synthetic data as live monitoring.
6. Real alert/human-action endpoints unused by any UI; demo flow is component state.
7. Beneficiary page calls staff risk-queue (unverified scoping).
8. Duplicate-alert risk if auto-assess added without dedupe guard.
9. No token revocation + sessionStorage JWT.
10. Odia is the thinnest language coverage.

## 17. Recommended roadmap

- PHASE 0 (LOW–MEDIUM, SIH-critical): unify thresholds; auto-assess + deduped alerts after every check-in; authenticate transcript/legacy-chat; fix beneficiary queue call.
- PHASE 1 (MEDIUM): rate limiting, refresh/revocation, secret enforcement.
- PHASE 2 (MEDIUM): HF model decision or documented lexicon mode; calibration note.
- PHASE 3 (LOW–MEDIUM): standalone wellbeing form, consent record, resource depth.
- PHASE 4 (MEDIUM, SIH-critical): real Alert Centre on /caseworker wired to existing APIs.
- PHASE 5 (MEDIUM, SIH-critical): /command on live /api/admin/* with fallback.
- PHASE 6–7 (HIGH, future): telephony/SMS/IVRS, encryption at rest, TTL, HTTPS, key vault, review.
- PHASE 8 (LOW): scripted SIH demo dataset + one-click reset + honest narrative.

## 18. Exactly what should be built next

1. Close check-in → risk → alert gap (shared thresholds + auto-assess with dedupe).
2. Wire the real Alert Centre into /caseworker via existing tested endpoints.
3. Point /command at live admin endpoints with graceful fallback, then re-verify the judge flow end-to-end on real data.

---

## Summary

**REAL AND WORKING:** Auth/RBAC (JWT+bcrypt, server-scoped, 401/403, audit log); check-ins → history API/chart; rule-based distress engine + contributing factors; crisis keyword/classifier → deterministic safe reply → alert/flag → caseworker chat-flags card; multilingual (en/hi/or) authenticated chat with context, delete, human-support; conversational guided check-in → existing risk engine → alerts; caseworker risk queue (real data); DEMO-042 timeline API; admin aggregation APIs (7); alerts APIs (6); 339 backend tests.

**PARTIALLY WORKING:** Sentiment (lexicon fallback live; XLM-R/HF not loaded in this env); /api/checkin → risk/alert (manual or chat only); /caseworker case detail (hardcoded DEMO-042); government dashboards (backend real, frontend mock); beneficiary page risk-queue call; live LLM replies (key/failover dependent; mock mode available); helpline access (static + click-to-call only).

**DEMO/MOCK:** /command (adminMock.js); marketing Alert Centre (DashboardMock.jsx local state); marketing statistics/testimonials (mock.js); seeded fictional datasets (DEMO-042, multi-state, 5 demo accounts); legacy guest chat user id from localStorage.

**NOT IMPLEMENTED:** Voice stress analytics; IVRS; SMS notifications; native mobile app; offline capability; consent record; chat retention/TTL/export; rate limiting; refresh tokens/revocation; alert-centre and command-dashboard frontends wired to real APIs; automatic check-in-triggered assessment.

**CRITICAL BEFORE SIH:** (1) auto-assess + alert on every check-in with unified thresholds and duplicate-alert guard; (2) secure the two open write paths (/api/transcript/analyze, legacy /api/chat); (3) replace the two mock-looking-real surfaces (/command, alert centre) with live API wiring or clear demo labelling.

**NEXT 3 DEVELOPMENT STEPS:**
1. Unify risk thresholds and trigger assess_user/alert sync after every /api/checkin (shared constants, backend tests).
2. Build the real caseworker Alert Centre (list/ack/intervention/follow-up) wired to existing APIs and connect queue rows to case detail.
3. Point /command at the live admin endpoints with loading/error states, keeping adminMock only as an offline fallback.
