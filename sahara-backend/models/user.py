"""Models for the `users` collection.

Phone numbers are NEVER stored raw. Only a bcrypt hash is kept, so a
database leak does not expose anyone's phone number, and the hash cannot
be reversed. Matching a phone later works by hashing the candidate value
and comparing hashes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

import bcrypt
from pydantic import BaseModel, Field

# Administrative levels of the monitoring hierarchy (prototype role model).
AdminLevel = Literal["national", "state", "district", "caseworker"]


def hash_identifier(value: str) -> str:
    """bcrypt-hash a sensitive identifier (phone number, etc.).

    bcrypt's cost factor (12 rounds) is deliberately high so offline
    brute-force of hashed phone numbers is impractical. Note: bcrypt
    ignores input beyond 72 bytes — phone numbers are far shorter, so
    this is safe for our use case.
    """
    return bcrypt.hashpw(value.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_identifier(value: str, stored_hash: str) -> bool:
    """Check a candidate value against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(value.encode("utf-8"), stored_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


class UserDocument(BaseModel):
    """A document in the `users` collection (mirrors Mongo storage)."""

    user_id: str = Field(..., description="UUID used by the frontend for this person")
    display_name: str = Field(default="", description="First name only — never a full name")
    phone_hash: str = Field(default="", description="bcrypt hash of the phone number; empty until registration")
    language_preference: Literal["en", "hi"] = "en"
    created_at: datetime
    case_number: Optional[str] = Field(default=None, description="NHAA case reference string")

    # Administrative metadata for the monitoring hierarchy (filled when the
    # case is onboarded to a district; None for auto-created stub profiles).
    # Names are NOT stored here — see AssignedCaseworker below.
    state: Optional[str] = Field(default=None, description="State of the registering district, e.g. 'Odisha'")
    district: Optional[str] = Field(default=None, description="District, e.g. 'Khordha'")
    administrative_level: AdminLevel = "caseworker"  # reserved for the future RBAC layer
    assigned_caseworker: Optional["AssignedCaseworker"] = Field(
        default=None, description="The caseworker holding this case (workload aggregation)"
    )


class AssignedCaseworker(BaseModel):
    """Reference to the caseworker who holds a case (id + short display name).

    Deliberately minimal: no personal details, no phone, nothing private —
    this exists only so district dashboards can show workload aggregates.
    """

    id: str = Field(..., description="Staff identifier (e.g. 'CW-KHR-01')")
    name: str = Field(default="", description="Short label for the workload view (e.g. 'CW A')")


def new_user_document(user_id: str, **overrides: object) -> UserDocument:
    """Factory for auto-created stub profiles (first check-in before registration)."""
    return UserDocument(user_id=user_id, created_at=datetime.now(datetime.timezone.utc), **overrides)