"""Models for the Sahara Support chatbot.

The lower half of this file models the authenticated "Talk to Sahara"
sessions used inside the beneficiary portal (multilingual, deletable,
with a deterministic crisis flow). The legacy open /api/chat models sit
at the top and are untouched for backwards compatibility.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

ChatLanguage = Literal["en", "hi", "or"]


class ConversationTurn(BaseModel):
    """One previous turn, sent to the model for context."""

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    """Request of POST /api/chat."""

    user_id: str
    message: str = Field(..., min_length=1, max_length=2000)
    language: Literal["en", "hi"] = "en"
    conversation_history: list[ConversationTurn] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Response of POST /api/chat."""

    reply: str
    language_detected: Literal["en", "hi"]
    crisis_detected: bool
    crisis_keywords_found: list[str] = Field(default_factory=list)
    sentiment: Literal["positive", "neutral", "negative"]
    suggested_action: Optional[str] = None
    # Which backend served the reply: "anthropic" | "gemini" | "fallback".
    # Lets clients display an honest "demo mode" note if the built-in
    # responder is active. Absent for responses from older deployments.
    provider: Optional[str] = None


class ChatLogDocument(BaseModel):
    """A document in the `chat_logs` collection (mirrors Mongo storage).

    Every turn is stored so caseworkers can audit what was said, and so
    the dashboard's "Crisis Chat Flags" card can show the sentiment and
    keywords of the most recent crisis chat.

    PRIVACY: session-based turns (the beneficiary portal chat) write
    ONLY the safety metadata — never the raw message text — into this
    collection; the conversation itself lives in the user-owned chat
    session and can be deleted.
    """

    log_id: str
    user_id: str
    timestamp: datetime
    user_message: str
    bot_reply: str
    crisis_detected: bool
    language: Literal["en", "hi", "or"]
    sentiment: Literal["positive", "neutral", "negative"]
    keywords_found: list[str] = Field(default_factory=list)
    provider: Optional[str] = None
    source: Optional[str] = None  # "widget" (legacy) | "session" (portal)
    session_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Authenticated "Talk to Sahara" chat sessions (beneficiary portal)
# ---------------------------------------------------------------------------

ChatSender = Literal["user", "assistant"]
ChatSafetyLevel = Literal["ok", "concern", "crisis"]


class ChatMessageDocument(BaseModel):
    """One stored message inside a chat session.

    `safety` carries the conservative safety classification of a USER
    message (level + keywords + sentiment + signal categories).
    `meta` carries lightweight UI hints (e.g. a completed check-in
    reference) — never raw private text beyond the message itself.
    """

    message_id: str
    sender: ChatSender
    content: str
    timestamp: datetime
    safety: Optional[dict[str, Any]] = None
    meta: dict[str, Any] = Field(default_factory=dict)


class ChatSessionDocument(BaseModel):
    """A document in the `chat_sessions` collection.

    Messages are embedded in the session document (one conversation =
    one document), which makes session history and deletion trivial and
    atomic: deleting the session deletes the whole conversation for real.
    `messages` is trimmed to the most recent MAX_SESSION_MESSAGES turns.
    """

    session_id: str
    user_id: str
    language: ChatLanguage = "en"
    status: Literal["active", "support_requested"] = "active"
    created_at: datetime
    updated_at: datetime
    last_safety: Optional[ChatSafetyLevel] = None
    human_support: Optional[dict[str, Any]] = None  # {requested_at, note?}
    # In-progress conversational wellbeing check-in (reuses the existing
    # /api/checkin engine on completion — never a second scoring system).
    checkin: Optional[dict[str, Any]] = None
    messages: list[ChatMessageDocument] = Field(default_factory=list)


class ChatSessionCreateRequest(BaseModel):
    """POST /api/chat/sessions body."""

    language: ChatLanguage = "en"


class ChatWelcome(BaseModel):
    """Localised welcome + the plain-language disclaimer + privacy note."""

    title: str
    text: str
    disclaimer: str
    privacy_note: str
    quick_actions: list[dict[str, str]] = Field(default_factory=list)


class ChatSessionView(BaseModel):
    """Safe view of a session (owner or authorised staff)."""

    session_id: str
    user_id: str
    language: ChatLanguage
    status: str
    created_at: datetime
    updated_at: datetime
    last_safety: Optional[str] = None
    human_support_requested: bool = False
    human_support_at: Optional[datetime] = None
    messages: list[ChatMessageDocument] = Field(default_factory=list)


class ChatSessionCreated(BaseModel):
    """Response of POST /api/chat/sessions."""

    session: ChatSessionView
    welcome: ChatWelcome
    provider: str = ""


class ChatSendRequest(BaseModel):
    """POST /api/chat/sessions/{id}/messages body."""

    content: str = Field(..., min_length=1, max_length=2000)
    language: Optional[ChatLanguage] = None


class CrisisCard(BaseModel):
    """Deterministic crisis resources — shown prominently, never buried."""

    ack: str
    numbers: list[dict[str, str]] = Field(default_factory=list)
    human_cta: str


class ChatSendResponse(BaseModel):
    """Response of one session turn."""

    message_id: str
    reply: str
    provider: str  # which backend served the reply ("mock"/"fallback"/...)
    language: ChatLanguage
    safety_level: ChatSafetyLevel
    crisis_detected: bool
    keywords_found: list[str] = Field(default_factory=list)
    sentiment: str = "neutral"
    crisis_card: Optional[CrisisCard] = None
    checkin_completed: Optional[dict[str, Any]] = None


class HumanSupportRequest(BaseModel):
    """POST /api/chat/sessions/{id}/human-support body."""

    note: str = Field(default="", max_length=500)


class HumanSupportResponse(BaseModel):
    """Response after a human-support request is recorded."""

    requested: bool = True
    status: str = "support_requested"
    timestamp: datetime


class ChatSafetyCheckRequest(BaseModel):
    """POST /api/chat/safety-check body."""

    message: str = Field(..., min_length=1, max_length=2000)
    language: Optional[ChatLanguage] = None


class ChatSafetyCheckResponse(BaseModel):
    """Conservative classification only — never a risk score."""

    safety_level: ChatSafetyLevel
    crisis_detected: bool
    keywords_found: list[str] = Field(default_factory=list)
    sentiment: str = "neutral"
    signals: list[str] = Field(default_factory=list)
    language: str = "en"


class ChatDeleteResponse(BaseModel):
    """Response of DELETE /api/chat/sessions/{id}."""

    deleted: str  # session_id
    messages_removed: int
    anonymised: bool = True