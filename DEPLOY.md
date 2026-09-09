# Deploying Sahara — ONE Render service (frontend + backend together)

The whole project deploys as **a single Render web service**. The FastAPI app
builds the React SPA into `dist/` (Docker multi-stage) and serves it from the
same origin as the API. One URL, one deploy, no Vercel needed.

```
Browser ──▶ https://your-app.onrender.com
              ├── /api/*        → FastAPI (uvicorn)
              └── everything else → built React SPA (index.html fallback)
```

---

## 1. One-time setup

### a) MongoDB Atlas (database)
1. Create a free **M0 cluster** at https://www.mongodb.com/cloud/atlas
2. **Database Access** → add a user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (Render's egress IPs are dynamic).
4. Copy the SRV URI: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net`

### b) Push this repo to GitHub (if not already)

### c) Render — create the service
1. https://dashboard.render.com → **New +** → **Blueprint**.
2. Select this repository — Render reads `render.yaml` automatically.
   (Or: **New +** → **Web Service** → pick repo → Runtime **Docker**.)
3. Fill in the `sync: false` secrets when prompted:
   - `MONGODB_URL` — the Atlas SRV URI from step (a)
   - `AUTH_SECRET` — a long random string, e.g.
     `python -c "import secrets; print(secrets.token_urlsafe(48))"`
   - `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` — optional; without them the
     chatbot uses its built-in rule-based responder.
4. **Apply** — the first build takes ~5–10 min (Docker build: npm install +
   `vite build` + pip install). Subsequent builds are faster (layer cache).

Render gives you a URL like `https://sahara-app.onrender.com` — that single
URL is the whole app.

### d) Point CORS at your URL
Set `CORS_ORIGINS` to your Render URL (e.g. `https://sahara-app.onrender.com`).
It only matters for cross-origin calls; the deployed app is same-origin, so
this is belt-and-braces for any external tools you may point at the API.

---

## 2. How it works

| Piece | File | What it does |
|---|---|---|
| Multi-stage Dockerfile | `Dockerfile` | Stage 1: node:20 `npm ci` + `vite build` → `dist/`. Stage 2: python:3.12-slim + `requirements-render.txt`, SPA copied to `/app/dist`. |
| SPA serving | `sahara-backend/main.py` | Mounts `/assets` from `dist/`, catch-all route serves static files or `index.html` (deep links). Unknown `/api/*` → 404. |
| Same-origin API client | `src/lib/api.js`, `src/hooks/useChat.js` | `VITE_API_URL` unset in prod → requests go to the page's own origin. `.env.development` keeps `npm run dev` pointed at `localhost:8000`. |
| Render blueprint | `render.yaml` | Declares the web service, health check `/api/health`, env vars. |
| Lean Python deps | `sahara-backend/requirements-render.txt` | Full API **without** torch/transformers (~2 GB) — the sentiment model degrades to the transparent keyword fallback (`/api/health` reports `model_loaded: false`). |

**Deploy flow after setup:** `git push` → Render auto-builds → new container
goes live. Nothing to redeploy on Vercel/Netlify — there is only one service.

---

## 3. Environment variables (Render dashboard)

| Variable | Required | Value |
|---|---|---|
| `MONGODB_URL` | ✅ | `mongodb+srv://…` Atlas URI |
| `DB_NAME` | — | `sahara_db` (default) |
| `AUTH_SECRET` | ✅ | long random string (JWT signing) |
| `AUTH_ENFORCED` | — | `true` |
| `CORS_ORIGINS` | — | your Render URL |
| `GEMINI_API_KEY` | optional | real chatbot AI (free tier) |
| `ANTHROPIC_API_KEY` | optional | Claude provider |
| `MOCK_AI_MODE` | — | `false` (or `true` for deterministic demo replies) |

Never put secrets in `render.yaml` — `sync: false` keeps them dashboard-only.

---

## 4. Verify after deploy

```bash
curl https://your-app.onrender.com/api/health
# {"status":"ok","model_loaded":false,"db_connected":true,...,"spa_served":true}

curl -o /dev/null -w "%{http_code}\n" https://your-app.onrender.com/login   # 200 (SPA)
curl -o /dev/null -w "%{http_code}\n" https://your-app.onrender.com/api/nope # 404
```

Then open the URL in a browser: homepage → **Portal sign in** → demo accounts
work against the same MongoDB you already seeded.

## 5. Notes & limitations

- **Free plan**: the service sleeps after ~15 min idle; first request after a
  sleep takes ~30–60 s (cold start). `starter` plan avoids this.
- **Sentiment model**: omitted from the image on purpose (size). The risk
  engine's keyword/safety-net layer keeps the full workflow functional, and
  `/api/health` honestly reports `model_loaded: false`. To ship the real
  XLM-R model, add `torch` + `transformers` to
  `sahara-backend/requirements-render.txt` and expect a multi-GB image,
  slower cold starts, and a starter/standard plan.
- **Demo data**: the MongoDB you point to defines the data (your existing
  Atlas SAHARA database works as-is — seeds are already in it).
- **Local dev unchanged**: `npm run dev` (Vite :5173) +
  `uvicorn main:app --reload` (:8000) still work as before.
