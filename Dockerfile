# ============================================================================
# Sahara — ONE Render service serving BOTH the API and the frontend.
#
# Stage 1 builds the React/Vite SPA into dist/.
# Stage 2 installs the Python API (WITHOUT torch/transformers — the sentiment
# model gracefully degrades to the documented keyword fallback; see
# /api/health -> model_loaded) and copies the SPA next to it.
#
# main.py serves the SPA from ../dist automatically; STATIC_DIR can override.
#
# Required env at runtime (set in the Render dashboard or render.yaml):
#   MONGODB_URL   — MongoDB Atlas SRV URI (or any MongoDB)
#   DB_NAME       — database name (default sahara_db)
#   AUTH_SECRET   — long random string (JWT signing)
#   CORS_ORIGINS  — your Render URL, e.g. https://sahara.onrender.com
# Optional:
#   GEMINI_API_KEY / ANTHROPIC_API_KEY — real chatbot AI (fallback otherwise)
#   MOCK_AI_MODE=true  — deterministic demo replies
# ============================================================================

# ---- Stage 1: build the SPA -------------------------------------------------
FROM node:20-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js index.html tailwind.config.js postcss.config.js ./
COPY public ./public
COPY src ./src
# Same-origin: leave VITE_API_URL unset so the app calls its own origin.
RUN npm run build

# ---- Stage 2: Python runtime -------------------------------------------------
FROM python:3.12-slim AS runtime
WORKDIR /app/sahara-backend

# No build tools needed: all runtime deps ship manylinux wheels.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY sahara-backend/requirements-render.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Application code (routers/services/models/tests/config/…)
COPY sahara-backend/ ./

# Built SPA → /app/dist (the default location main.py looks at)
COPY --from=web /app/dist /app/dist

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000
# Render sets $PORT for web services; default to 8000 locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
