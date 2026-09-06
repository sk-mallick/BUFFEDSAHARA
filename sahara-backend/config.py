"""
Configuration for the Sahara backend.

Settings are loaded from environment variables and/or a `.env` file
(see `.env.example`). `pydantic-settings` does the heavy lifting, so
every value below can be overridden without touching code.
"""

from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Sahara API"
    version: str = "1.0.0"

    # MongoDB ---------------------------------------------------------------
    mongodb_url: str = "mongodb://localhost:27017"
    db_name: str = "sahara_db"

    # Sentiment model -------------------------------------------------------
    model_name: str = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
    model_auto_download: bool = True

    # Chat companion providers ----------------------------------------------
    # CHAT_PROVIDER: "auto" (best available: anthropic > gemini > fallback),
    # or force one of: "anthropic" | "gemini" | "fallback". The fallback
    # is a built-in rule-based responder that needs NO key or internet.
    chat_provider: str = "auto"
    anthropic_api_key: str = ""  # set ANTHROPIC_API_KEY in .env (console.anthropic.com)
    anthropic_model: str = "claude-sonnet-4-6"
    gemini_api_key: str = ""  # set GEMINI_API_KEY in .env (aistudio.google.com/apikey — free)
    # gemini-2.5-flash was retired for new users in 2026 — use the current
    # flash-tier model (update in .env if Google ships another generation).
    gemini_model: str = "gemini-3.6-flash"
    # MOCK_AI_MODE=true forces deterministic, clearly-labelled sample
    # replies (no cloud LLM, no network) for demos/tests. The response's
    # `provider` field reports "mock" so UIs can show a demo note.
    mock_ai_mode: bool = False

    # Authentication & RBAC ------------------------------------------------
    # AUTH_ENFORCED=false keeps the legacy open-API behaviour for the
    # pre-auth test suite. TRUE is the safe default: every protected
    # surface then requires a Bearer token and enforces role scopes.
    auth_enforced: bool = True
    # HS256 signing secret. MUST be set to a strong random value in .env
    # for anything beyond the local prototype (a dev-only fallback is used
    # with a warning when unset).
    auth_secret: str = ""
    # Access-token lifetime in minutes. Prototype: one short-lived access
    # token, no refresh tokens — clients re-login (documented limitation).
    access_token_ttl_minutes: int = 480

    # CORS — which browser origins may call this API ------------------------
    # Stored as a comma-separated string in .env; the validator below turns
    # it into the list FastAPI's CORSMiddleware expects.
    # NoDecode: pydantic-settings would otherwise try to JSON-parse the env
    # value ("a,b,c" is not JSON) and raise; this passes the raw string to
    # the validator below, which splits it into the list FastAPI expects.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: str) -> list[str]:
        """Accept a comma-separated string from .env and turn it into a list."""
        if isinstance(value, list):
            return value
        return [origin.strip() for origin in value.split(",") if origin.strip()]


settings = Settings()