"""Authentication endpoints.

POST /api/auth/login  — verify email + password, return a short-lived JWT
GET  /api/auth/me     — current account from the token (never from a body
                        or query user_id)
POST /api/auth/logout — records the logout; the client discards the token

Token lifecycle (documented limitation): a single HS256 access token,
valid for `access_token_ttl_minutes` (default 8 h). There is no refresh
token in this prototype — the client re-authenticates after expiry.
Logout is client-side token discard; an issued token stays valid until
it expires. Production deployments require government-approved identity
infrastructure, HTTPS, secrets management, key rotation and monitoring.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.auth import LoginRequest, LogoutResponse, MeResponse, TokenResponse
from services import security

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def _account_or_404(db: AsyncIOMotorDatabase, email: str) -> dict:
    """Find an auth account by its (lowercased) email.

    Login failures are deliberately uniform — \"invalid email or password\" —
    so a caller can never learn whether an email exists.
    """
    doc = await db.users.find_one({"email": email.strip().lower()})
    if doc is None or not doc.get("is_active", True):
        raise HTTPException(
            status_code=401, detail="Invalid email or password."
        )
    return doc


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> dict:
    """Verify credentials and issue an access token."""
    email = payload.email.strip().lower()
    doc = await db.users.find_one({"email": email})
    invalid = HTTPException(status_code=401, detail="Invalid email or password.")

    if doc is None or not doc.get("is_active", True):
        await security.audit(
            db, actor_user_id=None, actor_role=None,
            event="LOGIN_FAILURE", note="unknown account",
        )
        raise invalid

    stored_hash = doc.get("password_hash") or ""
    if not security.verify_password(payload.password, stored_hash):
        await security.audit(
            db, actor_user_id=doc["user_id"], actor_role=doc.get("role"),
            event="LOGIN_FAILURE",
        )
        raise invalid

    # Record last_login (safe) and audit the success.
    await db.users.update_one(
        {"user_id": doc["user_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}},
    )
    await security.audit(
        db, actor_user_id=doc["user_id"], actor_role=doc.get("role"),
        event="LOGIN_SUCCESS",
    )

    token, ttl = security.create_access_token(doc["user_id"])
    return {
        "access_token": token,
        "expires_in": ttl,
        "user": security.safe_user(doc).model_dump(),
    }


@router.get("/me", response_model=MeResponse)
async def me(actor: dict = Depends(security.require_actor)) -> dict:
    """The current account, derived solely from the Bearer token."""
    return {"user": security.safe_user(actor).model_dump()}


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict = Depends(security.require_actor),
) -> dict:
    """Record the logout and ask the client to discard the token."""
    await security.audit(
        db, actor_user_id=actor["user_id"], actor_role=actor.get("role"),
        event="LOGOUT",
    )
    return LogoutResponse().model_dump()
