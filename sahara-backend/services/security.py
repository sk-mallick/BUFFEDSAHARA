"""Authentication & authorisation core.

This module is the SECURITY BOUNDARY of the API. Every protected router
calls these helpers; the helpers decide who the caller is (from the
Bearer token, NEVER from body/path values) and whether that identity is
allowed to see or act on the requested resource.

Design notes
------------
* Accounts live in the `users` collection with `email` + `password_hash`
  (bcrypt). Role/scope facts (state, district, staff_id) are read fresh
  from the database on every request — never from the token — so they
  cannot go stale and cannot be spoofed by editing a token.
* Tokens are short-lived HS256 JWTs carrying ONLY `sub` (user id),
  `iat`, `exp`. No role, no scope, no PII in the token payload.
* `AUTH_ENFORCED=false` keeps the legacy prototype endpoints open for
  the pre-auth test suite and throwaway local demos. When enforced
  (the default), the checks below are the final word. The flag is read
  once per process from the environment — see config.py.
* The audit log records security-relevant events with NO private
  conversation or note content, and no password material.
"""

from __future__ import annotations

import logging
import warnings
from datetime import datetime, timedelta, timezone
from typing import Optional

from uuid import uuid4

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from config import settings
from database import get_db
from models.auth import Role, SafeUser, STAFF_ROLES

logger = logging.getLogger("sahara.security")

# Process-wide: the config is resolved once at import time (env-driven).
ENFORCED = settings.auth_enforced

if not settings.auth_secret:
    # A missing secret must never silently ship. For the prototype we
    # warn loudly and fall back to a clearly-marked dev secret; real
    # deployments MUST set AUTH_SECRET (see .env.example / README).
    warnings.warn(
        "AUTH_SECRET is not set — using the development-only fallback secret. "
        "Set a strong AUTH_SECRET in .env before any non-demo deployment.",
        stacklevel=2,
    )

_SECRET = settings.auth_secret or "sahara-dev-only-secret—DO-NOT-USE-IN-PRODUCTION"
_ALGO = "HS256"
_TTL = timedelta(minutes=settings.access_token_ttl_minutes)


# ---------------------------------------------------------------------------
# Passwords (bcrypt) — used by login and by the demo-account seeder.
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """bcrypt-hash a password (never store the plaintext)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, stored_hash: str) -> bool:
    """Constant-ish compare of a candidate against a stored hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------
def create_access_token(user_id: str) -> tuple[str, int]:
    """Issue a short-lived HS256 JWT; returns (token, ttl_seconds)."""
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "iat": now, "exp": now + _TTL}
    return jwt.encode(payload, _SECRET, algorithm=_ALGO), int(_TTL.total_seconds())


def decode_access_token(token: str) -> Optional[str]:
    """Return the `sub` (user id) of a valid token, else None.

    Expired and malformed tokens both return None — callers respond 401.
    """
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGO])
        sub = payload.get("sub")
        return str(sub) if sub else None
    except jwt.PyJWTError:
        return None


# ---------------------------------------------------------------------------
# Audit log — accountability without being a second store of secrets.
# Only event + actor + target id are recorded; never message content,
# passwords, notes, or beneficiary free text.
# ---------------------------------------------------------------------------
async def audit(
    db: AsyncIOMotorDatabase,
    *,
    actor_user_id: Optional[str],
    actor_role: Optional[str],
    event: str,
    target_id: Optional[str] = None,
    note: Optional[str] = None,
) -> None:
    try:
        await db.audit_logs.insert_one(
            {
                "log_id": str(uuid4()),
                "timestamp": datetime.now(timezone.utc),
                "actor_user_id": actor_user_id,
                "actor_role": actor_role,
                "event": event,
                "target_id": target_id,
                "note": (note or "")[:500],
            }
        )
    except Exception as exc:  # noqa: BLE001 — auditing must never break the request
        logger.warning("audit write failed (%s): %s", event, exc)


# ---------------------------------------------------------------------------
# Actor resolution — identity comes from the Authorization header ONLY.
# ---------------------------------------------------------------------------
def _bearer(request: Request) -> Optional[str]:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:].strip()
    return None


async def _load_actor(db: AsyncIOMotorDatabase, token: str) -> Optional[dict]:
    user_id = decode_access_token(token)
    if not user_id:
        return None
    doc = await db.users.find_one({"user_id": user_id})
    if doc is None or not doc.get("is_active", True):
        return None
    return doc


def _safe(actor: dict) -> SafeUser:
    """The only user view that ever leaves the API."""
    return SafeUser(
        user_id=actor["user_id"],
        name=actor.get("name") or actor.get("display_name") or "",
        role=actor.get("role", "beneficiary"),
        state=actor.get("state"),
        district=actor.get("district"),
        staff_id=actor.get("staff_id"),
        language_preference=actor.get("language_preference", "en"),
    )


async def get_actor(
    request: Request, db: AsyncIOMotorDatabase = Depends(get_db)
) -> Optional[dict]:
    """Dependency: the authenticated user doc, or None.

    When AUTH_ENFORCED=false this returns None and endpoints keep their
    legacy open behaviour (used by the pre-auth test suite).
    """
    if not ENFORCED:
        return None
    token = _bearer(request)
    if not token:
        return None
    return await _load_actor(db, token)


async def require_actor(
    request: Request, db: AsyncIOMotorDatabase = Depends(get_db)
) -> dict:
    """Dependency: an authenticated user doc, or 401."""
    actor = await get_actor(request, db)
    if actor is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Sign in and send 'Authorization: Bearer <token>'.",
        )
    return actor


def safe_user(actor: dict) -> SafeUser:
    return _safe(actor)


# ---------------------------------------------------------------------------
# Role + scope checks (raise 401 / 403; audit every denial).
# ---------------------------------------------------------------------------
async def _deny(db: AsyncIOMotorDatabase, actor: Optional[dict], detail: str) -> None:
    await audit(
        db,
        actor_user_id=(actor or {}).get("user_id"),
        actor_role=(actor or {}).get("role"),
        event="PERMISSION_DENIED",
        note=detail[:200],
    )


def _403(detail: str):
    return HTTPException(status_code=403, detail=detail)


def check_role(actor: Optional[dict], *roles: Role) -> None:
    """403 unless the actor holds one of the given roles. Actor None -> 401."""
    if actor is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if actor.get("role") not in roles:
        raise _403(
            f"Role '{actor.get('role')}' is not authorised for this action "
            f"(requires one of: {', '.join(roles)})."
        )


def _f(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def admin_scope_ok(actor: Optional[dict], state: Optional[str] = None,
                   district: Optional[str] = None) -> bool:
    """Can this actor view administrative aggregates for (state, district)?"""
    if actor is None:
        return False
    role = actor.get("role")
    if role == "national_admin":
        return True
    if role == "state_admin":
        return state is not None and _f(state) == _f(actor.get("state"))
    if role == "district_officer":
        return (
            state is not None
            and district is not None
            and _f(state) == _f(actor.get("state"))
            and _f(district) == _f(actor.get("district"))
        )
    return False


async def require_admin_scope(
    actor: Optional[dict],
    db: AsyncIOMotorDatabase,
    state: Optional[str] = None,
    district: Optional[str] = None,
) -> None:
    """Enforce the Step-2 administrative hierarchy scoping rules."""
    if not ENFORCED:
        return
    if actor is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if not admin_scope_ok(actor, state, district):
        await _deny(db, actor, f"admin scope denied for state={state!r} district={district!r}")
        raise _403(
            "Your role cannot view this administrative scope. "
            "The server derives your scope from your authenticated account."
        )


async def allowed_user_ids(db: AsyncIOMotorDatabase, actor: Optional[dict]) -> Optional[set[str]]:
    """user_ids this actor may see. None = whole programme (national_admin).

    Scoping happens against the stored profiles' state / district /
    assigned_caseworker fields — server truth, not query parameters.
    """
    if not ENFORCED or actor is None or actor.get("role") == "national_admin":
        return None
    role = actor.get("role")
    q: dict = {}
    if role == "state_admin":
        q["state"] = actor.get("state")
    elif role == "district_officer":
        q["state"] = actor.get("state")
        q["district"] = actor.get("district")
    elif role == "caseworker":
        if not actor.get("staff_id"):
            return set()
        q["assigned_caseworker.id"] = actor["staff_id"]
    elif role == "beneficiary":
        return {actor["user_id"]}
    else:
        return set()

    ids: set[str] = set()
    async for u in db.users.find(q, {"user_id": 1}):
        ids.add(u["user_id"])
    return ids


async def require_case_access(
    actor: Optional[dict],
    db: AsyncIOMotorDatabase,
    *,
    user_id: Optional[str] = None,
    case_number: Optional[str] = None,
) -> None:
    """Allow if: the actor is the beneficiary themself, an authorised
    staff member (via role scope or case assignment), or an admin above."""
    if not ENFORCED:
        return
    if actor is None:
        raise HTTPException(status_code=401, detail="Authentication required.")

    target = None
    if user_id:
        target = await db.users.find_one({"user_id": user_id})
    elif case_number:
        target = await db.users.find_one({"case_number": case_number})
    if target is None:
        # Do not leak whether a user/case exists to an unauthorised caller.
        raise HTTPException(status_code=404, detail="Not found.")

    target_id = target["user_id"]
    role = actor.get("role")

    ok = False
    if role == "national_admin":
        ok = True
    elif role == "beneficiary":
        ok = actor["user_id"] == target_id
    elif role == "caseworker":
        ok = bool(actor.get("staff_id")) and (
            target.get("assigned_caseworker") or {}
        ).get("id") == actor["staff_id"]
    elif role == "state_admin":
        ok = _f(target.get("state")) == _f(actor.get("state"))
    elif role == "district_officer":
        ok = (
            _f(target.get("state")) == _f(actor.get("state"))
            and _f(target.get("district")) == _f(actor.get("district"))
        )

    if not ok:
        await _deny(db, actor, f"case access denied for {target_id!r}")
        raise _403(
            "You are not authorised to access this case. "
            "Case access is derived from your role and assignment — "
            "changing a case id in the URL cannot bypass it."
        )


async def require_staff_role(actor: Optional[dict], db: AsyncIOMotorDatabase) -> None:
    """401/403 gate for caseworker-console surfaces (never beneficiaries)."""
    if not ENFORCED:
        return
    if actor is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if actor.get("role") not in STAFF_ROLES:
        await _deny(db, actor, "staff-only surface attempted by beneficiary")
        raise _403("This console is for authorised staff only.")


def staff_identity(actor: dict) -> dict:
    """The caseworker label recorded on human actions (from the AUTH
    account, never from a client-supplied value)."""
    return {
        "caseworker_id": actor.get("staff_id") or actor["user_id"],
        "caseworker_name": actor.get("name") or actor.get("display_name") or "",
        "caseworker_role": actor.get("role"),
    }
