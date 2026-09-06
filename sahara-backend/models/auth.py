"""Models for the authentication layer.

Auth accounts live in the SAME `users` collection as beneficiary
profiles (one user system, never duplicated). A document is an
authentication account when it carries `email` + `password_hash`; the
`role` field decides what the account may do:

    national_admin  -> any aggregate or case
    state_admin     -> one assigned state
    district_officer-> one assigned district
    caseworker      -> cases whose profile lists this staff member
    beneficiary     -> only their own wellbeing data

Passwords are NEVER stored in plaintext — only a bcrypt hash. Password
hashes are never returned by any API; login returns the SafeUser view
defined below and nothing else.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

# The five roles of the SIH hierarchy (national -> state -> district ->
# caseworker -> beneficiary).
Role = Literal[
    "national_admin", "state_admin", "district_officer", "caseworker", "beneficiary",
]

STAFF_ROLES: tuple[str, ...] = (
    "national_admin", "state_admin", "district_officer", "caseworker",
)


class LoginRequest(BaseModel):
    """POST /api/auth/login body."""

    email: str = Field(..., description="Account email (lowercased before lookup)")
    password: str = Field(..., min_length=1, description="Account password (never stored, never logged)")


class SafeUser(BaseModel):
    """The ONLY view of a user an API may return.

    Deliberately excludes email's sibling fields such as password_hash,
    and any internal security metadata. Roles/scopes are server-side
    facts; the frontend may use them for navigation UX only.
    """

    user_id: str
    name: str = ""
    role: Role
    state: Optional[str] = None
    district: Optional[str] = None
    staff_id: Optional[str] = Field(
        default=None, description="Staff identifier for caseworkers (matches profiles' assigned_caseworker.id)"
    )
    language_preference: Literal["en", "hi"] = "en"


class TokenResponse(BaseModel):
    """Successful login response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until expiry (prototype: short-lived access token only)
    user: SafeUser


class MeResponse(BaseModel):
    """GET /api/auth/me — the account behind the current token."""

    user: SafeUser


class LogoutResponse(BaseModel):
    detail: str = "Signed out. Discard the access token — it remains valid until it expires."


class AccountDocument(BaseModel):
    """An auth-capable document in the `users` collection (mirrors storage)."""

    user_id: str
    name: str = ""
    email: str
    password_hash: str
    role: Role
    state: Optional[str] = None
    district: Optional[str] = None
    staff_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    last_login: Optional[datetime] = None
    # Beneficiary auth accounts reuse the SAME user_id as their wellbeing
    # profile, so their check-ins/history are already keyed to it.
    language_preference: Literal["en", "hi"] = "en"
