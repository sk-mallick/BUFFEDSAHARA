"""Sahara API — FastAPI application entrypoint.

Run with:  uvicorn main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    }