"""
MongoDB connection via Motor (the async MongoDB driver).

The client is created lazily by `connect_db()` (called from the FastAPI
startup lifespan in main.py) and stored in module-level globals so every
router shares one connection pool.
"""

import logging

from motor.motor_asyncio import AsyncIOMotorClient

from config import settings

logger = logging.getLogger("sahara.database")

_client: AsyncIOMotorClient | None = None
_db = None  # Database handle, set once connected


async def connect_db() -> None:
    """Create the global Motor client and database handle."""
    global _client, _db
    # serverSelectionTimeoutMS keeps startup fast when MongoDB is down:
    # operations fail with a clear error instead of hanging for 30s.
    _client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=3000)
    _db = _client[settings.db_name]
    try:
        await ensure_indexes()
        logger.info("Connected to MongoDB database '%s'", settings.db_name)
    except Exception as exc:  # noqa: BLE001 — the API must still boot; health reports the truth
        logger.warning(
            "MongoDB not reachable at startup (%s). /api/health will report db_connected=false "
            "until it comes up.",
            exc,
        )


async def close_db() -> None:
    """Close the global client (called on app shutdown)."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ensure_indexes() -> None:
    """
    Create the indexes the API relies on:
      - unique keys prevent duplicate ids if the app is ever restarted
        mid-write or run by two replicas
      - the (user_id, timestamp) compound index powers the history query
        and the per-user 'latest check-in' lookups.
    """
    users = _db["users"]
    checkins = _db["checkins"]
    transcripts = _db["transcripts"]
    actions = _db["caseworker_actions"]
    alerts = _db["alerts"]
    assessments = _db["risk_assessments"]
    audit_logs = _db["audit_logs"]
    sessions = _db["chat_sessions"]
    logs = _db["chat_logs"]
    wellbeing = _db["wellbeing_activity_records"]
    reflections = _db["wellbeing_reflections"]

    await users.create_index("user_id", unique=True)
    # Auth accounts: unique (case-insensitive-friendly) email; sparse so
    # beneficiary-only docs without an email are ignored.
    await users.create_index("email", unique=True, sparse=True)
    # Administrative monitoring reads: region-scoped aggregation.
    await users.create_index("state")
    await users.create_index("district")
    await users.create_index("assigned_caseworker.id")
    # Audit log reads: newest-first by event.
    await audit_logs.create_index([("timestamp", -1)])
    await audit_logs.create_index("event")
    await checkins.create_index("checkin_id", unique=True)
    await checkins.create_index([("user_id", 1), ("timestamp", -1)])
    await transcripts.create_index("transcript_id", unique=True)
    await transcripts.create_index([("user_id", 1), ("timestamp", -1)])
    await actions.create_index([("user_id", 1), ("timestamp", -1)])
    # Alert center reads: open inbox by severity/type, and per-user history.
    await alerts.create_index("alert_id", unique=True)
    await alerts.create_index([("resolved", 1), ("acknowledged", 1), ("created_at", -1)])
    await alerts.create_index([("user_id", 1), ("created_at", -1)])
    await alerts.create_index(
        [("user_id", 1), ("assessment_id", 1), ("alert_type", 1)],
        partialFilterExpression={"assessment_id": {"$exists": True}},
    )
    # Open-alert dedupe lookups from the check-in pipeline (one open
    # alert per user/type/event transition).
    await alerts.create_index([("user_id", 1), ("alert_type", 1), ("resolved", 1)])
    # Timeline reads + latest-assessment scans + admin trend series.
    await assessments.create_index([("user_id", 1), ("timestamp", -1)])
    await assessments.create_index("timestamp")
    # Portal chat sessions (Talk to Sahara): resume-by-user, and deletion
    # by session id. Messages are embedded, so no message index is needed.
    await sessions.create_index([("user_id", 1), ("status", 1), ("updated_at", -1)])
    await sessions.create_index("session_id", unique=True)
    # Crisis chat-flag reads (dashboard): newest flags first.
    await logs.create_index([("user_id", 1), ("timestamp", -1)])
    # Wellbeing space: one completion record per (user, activity) — the
    # unique index makes duplicate completions idempotent.
    await wellbeing.create_index(
        [("user_id", 1), ("activity_id", 1)], unique=True
    )
    # Private reflections: owner-scoped, newest first.
    await reflections.create_index([("user_id", 1), ("created_at", -1)])


def get_db():
    """
    Return the global database handle.

    Raises RuntimeError if the app hasn't finished startup (should never
    happen in practice — routers only serve after lifespan startup).
    """
    if _db is None:
        raise RuntimeError("Database not connected — is MongoDB running?")
    return _db


async def ping_db() -> bool:
    """Return True if MongoDB answers a ping within the timeout."""
    if _db is None:
        return False
    try:
        await _db.command("ping")
        return True
    except Exception:  # noqa: BLE001 — any driver error means "not connected"
        return False