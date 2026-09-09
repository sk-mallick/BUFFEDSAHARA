"""Sahara API — FastAPI application entrypoint.

Run with:  uvicorn main:app --reload

Single-service deployment: when a built frontend exists at
../dist (or $STATIC_DIR), this app also serves the Sahara SPA and its
assets, so ONE Render/web service can host API + UI together.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from database import close_db, connect_db, ping_db
from routers import admin as admin_router
from routers import alerts as alerts_router
from routers import auth as auth_router
from routers import caseworker as caseworker_router
from routers import cases as cases_router
from routers import chat as chat_router
from routers import checkin as checkin_router
from routers import dashboard as dashboard_router
from routers import risk as risk_router
from routers import transcript as transcript_router
from routers import user as user_router
from routers import wellbeing as wellbeing_router
from services import nlp_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect MongoDB + load the sentiment model once.

    The model (~500 MB) downloads on the FIRST run and is then cached
    by Hugging Face on disk; on every later start it loads from cache.
    """
    await connect_db()
    nlp_service.load_model()
    yield
    await close_db()


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Sahara — AI-powered wellbeing monitoring and distress prediction "
        "for victims of caste-based atrocities (SIH26094 · MoSJE). "
        "Multilingual sentiment (EN/HI) + bilingual crisis-keyword safety net, "
        "human-in-the-loop alerts."
    ),
    lifespan=lifespan,
)

# CORS: allow the React dev server(s) to call this API from the browser.
# Origins come from .env (CORS_ORIGINS), defaulting to localhost:5173/5174.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(checkin_router.router)
app.include_router(user_router.router)
app.include_router(wellbeing_router.router)
app.include_router(dashboard_router.router)
app.include_router(transcript_router.router)
app.include_router(caseworker_router.router)
app.include_router(chat_router.router)
app.include_router(risk_router.router)
app.include_router(alerts_router.router)
app.include_router(cases_router.router)


@app.get("/api/health", tags=["health"])
async def health() -> dict:
    """Liveness endpoint — also reports model, database and chat status."""
    from services import chat_llm

    try:
        active_chat_provider = chat_llm.resolve_provider()
    except Exception:  # noqa: BLE001 — health must never fail
        active_chat_provider = "fallback"
    return {
        "status": "ok",
        "model_loaded": nlp_service.is_loaded(),
        "db_connected": await ping_db(),
        # True when a real LLM provider has a key; the built-in fallback
        # keeps /api/chat alive either way.
        "chat_configured": bool(settings.anthropic_api_key or settings.gemini_api_key),
        "chat_provider": active_chat_provider,
        # Present when a built frontend is being served alongside the API.
        "spa_served": STATIC_DIR.is_dir(),
    }


# ===========================================================================
# Static SPA serving (single-service deployment).
#
# Mount AFTER every /api router so API routes always win. Non-API paths get
# the built React app; unknown paths fall back to index.html so React
# Router deep links (/caseworker, /command, ...) work on refresh.
# ===========================================================================

def _locate_static_dir() -> Path | None:
    """Find the built frontend. $STATIC_DIR wins; default is ../dist."""
    env_dir = os.environ.get("STATIC_DIR")
    candidates = [Path(env_dir)] if env_dir else [Path(__file__).resolve().parent.parent / "dist"]
    for candidate in candidates:
        if (candidate / "index.html").is_file():
            return candidate
    return None


STATIC_DIR = _locate_static_dir()

if STATIC_DIR is not None:
    # Vite emits content-hashed assets under /assets — safe to cache hard.
    app.mount(
        "/assets",
        StaticFiles(directory=STATIC_DIR / "assets"),
        name="spa-assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        """Serve a real static file, or index.html for SPA routes."""
        # Never answer API paths with the SPA — unknown API routes 404.
        if full_path == "api" or full_path.startswith("api/"):
            from fastapi.responses import JSONResponse

            return JSONResponse({"detail": "Not found"}, status_code=404)
        file_path = (STATIC_DIR / full_path).resolve()
        # Path-traversal guard: only serve files that resolve inside dist.
        if (
            full_path
            and STATIC_DIR.resolve() in file_path.parents
            and file_path.is_file()
        ):
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
else:
    logger_note = "(no built frontend found — API-only mode)"
    print(f"Sahara starting {logger_note}")  # noqa: T201 — visible boot note