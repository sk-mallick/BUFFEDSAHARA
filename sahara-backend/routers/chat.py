"""Sahara Support companion — legacy widget + authenticated portal sessions.

Two surfaces live behind one router:

1. POST /api/chat (legacy, open) — the marketing-site floating widget.
   Unchanged behaviour: multilingual (en/hi), bilingual crisis safety
   net, provider failover chain (see services/chat_llm.py).

2. POST /api/chat/sessions (+ sub-resources) — the BENEFICIARY PORTAL's
   "Talk to Sahara". Sessions are owned by the authenticated user; the
   backend derives identity from the bearer token and NEVER trusts a
   client-supplied user_id/role. Features:
   - extensible languages (en / hi / or — see services/chat_i18n.py);
   - conversation history stored in the session (deletable for real);
   - a conservative multilingual safety classifier
     (services/chat_safety.py) that runs BEFORE any reply;
   - a deterministic crisis flow (acknowledge + real helpline numbers +
     human-support offer) — the LLM is never the last word on safety;
   - a guided wellbeing check-in that submits through the EXISTING
     /api/checkin scoring engine and then the existing risk-assessment
     + alert pipeline — the chat never computes its own risk score;
   - a human-support request recorded into caseworker_actions (the same
     collection the caseworker timeline reads).

PRIVACY: conversation text lives ONLY in the user-owned session
document. The `chat_logs` audit collection receives crisis SAFETY
METADATA (keywords, sentiment, language) — never raw message text.
Deleting a session deletes the whole conversation, for real.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.chat import (
    ChatDeleteResponse,
    ChatRequest,
    ChatResponse,
    ChatSafetyCheckRequest,
    ChatSafetyCheckResponse,
    ChatSendRequest,
    ChatSendResponse,
    ChatSessionCreateRequest,
    ChatSessionCreated,
    ChatSessionDocument,
    ChatSessionView,
    ChatWelcome,
    CrisisCard,
    HumanSupportRequest,
    HumanSupportResponse,
)
from services import chat_i18n, chat_llm, chat_safety, keyword_service, nlp_service, security

logger = logging.getLogger("sahara.chat")

router = APIRouter(prefix="/api", tags=["chat"])

# How many embedded messages a session keeps (privacy + size hygiene).
MAX_SESSION_MESSAGES = 80


# ---------------------------------------------------------------------------
# Legacy open widget endpoint (unchanged contract)
# ---------------------------------------------------------------------------


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> ChatResponse:
    """One turn of the marketing widget's support conversation."""

    # 1. Detect the user's language (clamped to en/hi for the widget).
    detected = chat_llm.detect_language(request.message, request.language)
    language_detected = "hi" if detected == "hi" else "en"

    # 2. Crisis keyword check on the incoming message (safety net #1).
    user_crisis = keyword_service.detect_crisis_keywords(request.message)

    # 3. Build the message list (history + new turn, roles coalesced).
    messages = chat_llm.merge_turns(request.conversation_history, request.message)

    # 4. Pick a provider and generate the reply.
    try:
        provider = chat_llm.resolve_provider()
        reply, provider_used = await chat_llm.generate_reply(
            provider, messages, language_detected
        )
    except chat_llm.ProviderNotConfigured as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Chat is not configured: {exc}",
        )
    except Exception as exc:  # noqa: BLE001 — surface provider failures calmly
        logger.error("Chat provider call failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="The support companion could not respond right now. "
                   "Please try again, or call 14566 for immediate support.",
        )

    # 5. Crisis check on the assistant's reply too (safety net #2).
    reply_crisis = keyword_service.detect_crisis_keywords(reply)
    crisis_detected = user_crisis["crisis_detected"] or reply_crisis["crisis_detected"]
    all_keywords = list(
        dict.fromkeys(user_crisis["keywords_found"] + reply_crisis["keywords_found"])
    )

    # 6. Sentiment of the user's message (same model family as check-ins).
    sentiment = nlp_service.analyze_sentiment(request.message)["label"]

    # 7. Store the turn for audit + the dashboard's chat-flags card.
    timestamp = datetime.now(timezone.utc)
    await db.chat_logs.insert_one(
        {
            "log_id": str(uuid4()),
            "user_id": request.user_id,
            "timestamp": timestamp,
            "user_message": request.message,
            "bot_reply": reply,
            "crisis_detected": crisis_detected,
            "language": language_detected,
            "sentiment": sentiment,
            "keywords_found": all_keywords,
            "provider": provider_used,
            "source": "widget",
        }
    )

    # 8. Flag the user record so caseworkers see this in the dashboard.
    if crisis_detected:
        await db.users.update_one(
            {"user_id": request.user_id},
            {"$set": {"crisis_flag": True, "crisis_flagged_at": timestamp}},
        )

    suggested_action = (
        "Crisis signal detected in chat. Caseworker should follow up immediately."
        if crisis_detected
        else None
    )

    return ChatResponse(
        reply=reply,
        language_detected=language_detected,
        crisis_detected=crisis_detected,
        crisis_keywords_found=all_keywords,
        sentiment=sentiment,
        suggested_action=suggested_action,
        provider=provider_used,
    )


# ---------------------------------------------------------------------------
# Authenticated portal sessions — shared helpers
# ---------------------------------------------------------------------------


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _view(session: dict) -> ChatSessionView:
    """Project a stored session into its safe API view."""
    hs = session.get("human_support") or {}
    return ChatSessionView(
        session_id=session["session_id"],
        user_id=session["user_id"],
        language=session.get("language", "en"),
        status=session.get("status", "active"),
        created_at=session["created_at"],
        updated_at=session["updated_at"],
        last_safety=session.get("last_safety"),
        human_support_requested=bool(hs.get("requested_at")),
        human_support_at=hs.get("requested_at"),
        messages=session.get("messages", []),
    )


def _welcome(language: str) -> ChatWelcome:
    """Localised welcome block + quick actions (server is the language authority)."""
    return ChatWelcome(
        title=chat_i18n.content(language, "welcome_title"),
        text=chat_i18n.content(language, "welcome"),
        disclaimer=chat_i18n.content(language, "disclaimer"),
        privacy_note=chat_i18n.content(language, "privacy_note"),
        quick_actions=chat_i18n.quick_actions(language),
    )


async def _load_session(db: AsyncIOMotorDatabase, session_id: str) -> dict:
    session = await db.chat_sessions.find_one({"session_id": session_id})
    if session is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return session


async def _require_owner(
    actor: dict | None,
    db: AsyncIOMotorDatabase,
    session: dict,
    allow_staff_read: bool = False,
) -> None:
    """Beneficiary owners act; staff may only READ assigned cases.

    In the legacy open mode (AUTH_ENFORCED=false) these checks no-op,
    mirroring the rest of the prototype API.
    """
    if not security.ENFORCED:
        return
    if actor is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    role = actor.get("role")
    if role == "beneficiary":
        if actor["user_id"] != session["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own support conversations.",
            )
        return
    if allow_staff_read:
        # Staff read access is bounded by the same case-authorisation the
        # rest of the API enforces (assigned cases for caseworkers).
        await security.require_case_access(actor, db, user_id=session["user_id"])
        return
    raise HTTPException(
        status_code=403,
        detail="Only the beneficiary who owns this conversation may do that.",
    )


def _append_message(session: dict, sender: str, content: str, **extra) -> dict:
    """Append a message to the embedded list and trim to the cap."""
    message = {
        "message_id": str(uuid4()),
        "sender": sender,
        "content": content,
        "timestamp": _now(),
    }
    message.update(extra)
    session.setdefault("messages", [])
    session["messages"].append(message)
    session["messages"] = session["messages"][-MAX_SESSION_MESSAGES:]
    session["updated_at"] = _now()
    return message


def _active_language(session: dict, requested: str | None, actor: dict | None) -> str:
    """Resolve the chat language: request > session > account preference > en."""
    if requested in ("en", "hi", "or"):
        return requested
    if session.get("language") in ("en", "hi", "or"):
        return session["language"]
    pref = (actor or {}).get("language_preference") or "en"
    return pref if pref in ("en", "hi", "or") else "en"


async def _record_safety_signal(db, user_id: str, session_id: str, language: str,
                                classification: dict, timestamp: datetime) -> None:
    """Crisis in a portal conversation -> existing alert pathway.

    Writes ONLY safety metadata to chat_logs (never raw text), flags the
    user record (the caseworker dashboard's "Crisis Chat Flags" card
    reads exactly this), and adds a caseworker_actions row so the
    assigned caseworker's timeline shows a system safety event.
    """
    await db.chat_logs.insert_one(
        {
            "log_id": str(uuid4()),
            "user_id": user_id,
            "timestamp": timestamp,
            "user_message": "",          # PRIVACY: raw text stays in the
            "bot_reply": "",             # user-owned, deletable session only.
            "crisis_detected": True,
            "language": language,
            "sentiment": classification.get("sentiment", "neutral"),
            "keywords_found": classification.get("keywords_found", []),
            "provider": "crisis_flow",
            "source": "session",
            "session_id": session_id,
        }
    )
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"crisis_flag": True, "crisis_flagged_at": timestamp}},
    )
    await db.caseworker_actions.insert_one(
        {
            "record_kind": "action",
            "record_id": str(uuid4()),
            "user_id": user_id,
            "caseworker_id": "sahara-safety-system",
            "timestamp": timestamp,
            "action_type": "note",
            # No private conversation content — just the signal a human
            # needs to decide to look closer.
            "note": "Crisis safety signal detected in the beneficiary's support "
                    "conversation. Requires human review.",
            "status": "awaiting_review",
        }
    )


# ---------------------------------------------------------------------------
# 1. Session lifecycle
# ---------------------------------------------------------------------------


@router.post("/chat/sessions", response_model=ChatSessionCreated)
async def create_session(
    payload: ChatSessionCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> ChatSessionCreated:
    """Create (or resume) the beneficiary's support conversation."""
    if security.ENFORCED and (actor is None or actor.get("role") != "beneficiary"):
        raise HTTPException(
            status_code=403 if actor else 401,
            detail="Only beneficiaries can open a support conversation." if actor
            else "Authentication required.",
        )
    user_id = (actor or {}).get("user_id", "open-mode-user")

    latest = await db.chat_sessions.find({"user_id": user_id, "status": "active"})\
        .sort("updated_at", -1).to_list(length=1)
    if latest:
        session = latest[0]
    else:
        session = ChatSessionDocument(
            session_id=str(uuid4()),
            user_id=user_id,
            language=payload.language,
            created_at=_now(),
            updated_at=_now(),
        )
        await db.chat_sessions.insert_one(session.model_dump())

    doc = session if isinstance(session, dict) else session.model_dump()
    return ChatSessionCreated(
        session=_view(doc),
        welcome=_welcome(doc["language"]),
        provider=chat_llm.resolve_provider(),
    )


@router.get("/chat/sessions/{session_id}/messages", response_model=ChatSessionView)
async def get_session_messages(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> ChatSessionView:
    """Full conversation history (owner; staff with case access may read)."""
    session = await _load_session(db, session_id)
    await _require_owner(actor, db, session, allow_staff_read=True)
    return _view(session)


@router.delete("/chat/sessions/{session_id}", response_model=ChatDeleteResponse)
async def delete_session(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> ChatDeleteResponse:
    """Really delete a conversation (owner only). Also removes the session's
    safety-metadata rows from the audit collection."""
    session = await _load_session(db, session_id)
    await _require_owner(actor, db, session)
    removed = len(session.get("messages", []))
    await db.chat_sessions.delete_one({"session_id": session_id})
    # Clean the safety-metadata rows this session wrote (raw text never
    # left the session document, so this fully anonymises the chat).
    await db.chat_logs.delete_many({"source": "session", "session_id": session_id})
    return ChatDeleteResponse(deleted=session_id, messages_removed=removed)


# ---------------------------------------------------------------------------
# 2. Human support request
# ---------------------------------------------------------------------------


@router.post("/chat/sessions/{session_id}/human-support", response_model=HumanSupportResponse)
async def request_human_support(
    session_id: str,
    payload: HumanSupportRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> HumanSupportResponse:
    """Record that the beneficiary asked to talk to a person.

    Prototype honesty: this records a REQUEST for the assigned support
    team — it does not claim a counsellor is calling right now (no real
    telephony integration exists).
    """
    session = await _load_session(db, session_id)
    await _require_owner(actor, db, session)

    timestamp = _now()
    session["status"] = "support_requested"
    session["human_support"] = {
        "requested_at": timestamp,
        "note": payload.note[:500],
    }
    session["updated_at"] = timestamp
    await db.chat_sessions.update_one(
        {"session_id": session_id},
        {"$set": {"status": session["status"], "human_support": session["human_support"],
                  "updated_at": timestamp}},
    )
    # The assigned caseworker sees this in the case timeline.
    await db.caseworker_actions.insert_one(
        {
            "record_kind": "action",
            "record_id": str(uuid4()),
            "user_id": session["user_id"],
            "caseworker_id": "sahara-support-request",
            "timestamp": timestamp,
            "action_type": "note",
            "note": "Beneficiary requested human support through Talk to Sahara. "
                    "Requires follow-up.",
            "status": "awaiting_review",
        }
    )
    await security.audit(
        db, actor_user_id=session["user_id"], actor_role="beneficiary",
        event="HUMAN_SUPPORT_REQUESTED", note=f"session {session_id}",
    )
    return HumanSupportResponse(requested=True, status=session["status"], timestamp=timestamp)


# ---------------------------------------------------------------------------
# 3. Safety check (stateless classification — no storage, no risk score)
# ---------------------------------------------------------------------------


@router.post("/chat/safety-check", response_model=ChatSafetyCheckResponse)
async def safety_check(
    payload: ChatSafetyCheckRequest,
    actor: dict | None = Depends(security.get_actor),
) -> ChatSafetyCheckResponse:
    """Conservative safety classification of one message.

    Pure classification: nothing is stored, and no distress/risk score
    is computed — risk is owned by the existing engine.
    """
    if security.ENFORCED and actor is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    detected = chat_llm.detect_language(payload.message, payload.language or "en")
    result = chat_safety.classify_safety(payload.message, detected)
    return ChatSafetyCheckResponse(**result)


# ---------------------------------------------------------------------------
# 4. Sending a message (core turn)
# ---------------------------------------------------------------------------


@router.post("/chat/sessions/{session_id}/messages", response_model=ChatSendResponse)
async def send_message(
    session_id: str,
    payload: ChatSendRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    actor: dict | None = Depends(security.get_actor),
) -> ChatSendResponse:
    """One turn of the portal conversation.

    Order of operations (safety first):
      1. crisis classification of the user message -> deterministic flow;
      2. quick-action markers (check-in / human support);
      3. in-progress guided check-in answers;
      4. regular generative reply with session context.
    """
    session = await _load_session(db, session_id)
    await _require_owner(actor, db, session)
    user_id = session["user_id"]
    language = _active_language(session, payload.language, actor)
    content = payload.content.strip()

    # ---- 1. Conservative multilingual safety classification -------------
    classification = chat_safety.classify_safety(content, language)
    timestamp = _now()

    if classification["safety_level"] == "crisis":
        user_msg = _append_message(
            session, "user", content, safety=classification,
            meta={"language": language},
        )
        reply = chat_llm.safety_reply(content, language)
        provider = "crisis_flow"  # deterministic — never a model's judgement
        bot_msg = _append_message(session, "assistant", reply, meta={"provider": provider})
        session["last_safety"] = "crisis"
        session["language"] = language
        await db.chat_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"messages": session["messages"], "last_safety": "crisis",
                      "language": language, "updated_at": _now()}},
        )
        await _record_safety_signal(db, user_id, session_id, language, classification, timestamp)
        return ChatSendResponse(
            message_id=user_msg["message_id"],
            reply=reply,
            provider=provider,
            language=language,
            safety_level="crisis",
            crisis_detected=True,
            keywords_found=classification["keywords_found"],
            sentiment=classification["sentiment"],
            crisis_card=CrisisCard(
                ack=chat_i18n.content(language, "crisis_ack"),
                numbers=chat_i18n.content(language, "crisis_numbers"),
                human_cta=chat_i18n.content(language, "crisis_human_cta"),
            ),
        )

    # ---- 2. Quick-action markers (sent by the quick-action buttons) -----
    if content.startswith("__quick_action_"):
        action = content.replace("__quick_action_", "").replace("__", "")
        if action == "human":
            # Same honest request path as the dedicated endpoint.
            hs = await request_human_support(
                session_id,
                HumanSupportRequest(note="Requested from the support chat quick action."),
                db,
                actor,
            )
            reply = chat_i18n.content(language, "human_support_asked")
            bot_msg = _append_message(session, "assistant", reply, meta={"kind": "human_support"})
            await db.chat_sessions.update_one(
                {"session_id": session_id},
                {"$set": {"messages": session["messages"], "updated_at": _now()}},
            )
            return ChatSendResponse(
                message_id=bot_msg["message_id"], reply=reply, provider="human_support",
                language=language, safety_level="ok", crisis_detected=False,
                sentiment=classification["sentiment"],
            )
        if action == "checkin":
            session["checkin"] = {"stage": "mood", "mood": None, "sleep": None,
                                  "feeling_safe": None, "recent_incident": None,
                                  "support_received": None}
            reply = chat_i18n.content(language, "checkin_intro")
            bot_msg = _append_message(session, "assistant", reply, meta={"kind": "checkin"})
            session["language"] = language
            await db.chat_sessions.update_one(
                {"session_id": session_id},
                {"$set": {"messages": session["messages"], "checkin": session["checkin"],
                          "language": language, "updated_at": _now()}},
            )
            return ChatSendResponse(
                message_id=bot_msg["message_id"], reply=reply, provider="checkin_flow",
                language=language, safety_level="ok", crisis_detected=False,
                sentiment=classification["sentiment"],
            )
        # Unknown marker -> fall through to a normal supportive reply.

    # ---- 3. In-progress guided check-in ----------------------------------
    checkin = session.get("checkin")
    if checkin and checkin.get("stage") and checkin["stage"] != "done":
        user_msg = _append_message(session, "user", content, safety=classification,
                                   meta={"language": language})
        outcome = await _handle_checkin_answer(db, session, user_id, language,
                                               checkin, content)
        reply = outcome["reply"]
        bot_msg = _append_message(session, "assistant", reply, meta={"kind": "checkin"})
        session["language"] = language
        await db.chat_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"messages": session["messages"], "checkin": session.get("checkin"),
                      "language": language, "updated_at": _now()}},
        )
        return ChatSendResponse(
            message_id=user_msg["message_id"],
            reply=reply,
            provider="checkin_flow",
            language=language,
            safety_level="ok",
            crisis_detected=False,
            sentiment=classification["sentiment"],
            checkin_completed=outcome.get("completed"),
        )

    # ---- 4. Regular turn (session context, no second scoring system) -----
    user_msg = _append_message(session, "user", content, safety=classification,
                               meta={"language": language})
    history = [{"role": m["sender"], "content": m["content"]}
               for m in session["messages"] if m["sender"] in ("user", "assistant")][-20:]
    provider = chat_llm.resolve_provider()
    try:
        reply, provider_used = await chat_llm.generate_reply(provider, history, language)
    except Exception as exc:  # noqa: BLE001 — calm, non-technical failure copy
        logger.error("Portal chat turn failed for %s: %s", user_id, exc)
        reply = chat_i18n.content(language, "error")
        provider_used = "error"
    bot_msg = _append_message(session, "assistant", reply, meta={"provider": provider_used})

    level = classification["safety_level"]  # "ok" | "concern"
    session["last_safety"] = level
    session["language"] = language
    await db.chat_sessions.update_one(
        {"session_id": session_id},
        {"$set": {"messages": session["messages"], "last_safety": level,
                  "language": language, "updated_at": _now()}},
    )

    return ChatSendResponse(
        message_id=user_msg["message_id"],
        reply=reply,
        provider=provider_used,
        language=language,
        safety_level=level,
        crisis_detected=False,
        keywords_found=[],
        sentiment=classification["sentiment"],
    )


# ---------------------------------------------------------------------------
# 5. Guided wellbeing check-in (reuses the existing engine, never scores itself)
# ---------------------------------------------------------------------------


def _parse_int_answer(text: str) -> int | None:
    """'7' or a spelled digit -> int, else None."""
    t = text.strip().lower()
    if t.isdigit():
        value = int(t)
        return value if 1 <= value <= 10 else None
    words = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
             "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
    return words.get(t)


def _parse_yes_no(text: str) -> bool | None:
    t = text.strip().lower()
    if t in ("yes", "y", "haan", "ha", "hah", "ହଁ", "हाँ"):
        return True
    if t in ("no", "n", "nahi", "nain", "ନାହିଁ", "नहीं"):
        return False
    return None


def _parse_safe(text: str) -> str | None:
    t = text.strip().lower()
    if t in ("yes", "y", "haan", "ha", "hah", "ହଁ", "हाँ"):
        return "yes"
    if t in ("no", "n", "nahi", "nain", "ନାହିଁ", "नहीं"):
        return "no"
    if t in ("sometimes", "kabhi kabhi", "kabhi-kabhi", "kabhi", "ବେଳେବେଳେ", "कभी-कभी"):
        return "sometimes"
    return None


async def _handle_checkin_answer(db, session: dict, user_id: str, language: str,
                                 checkin: dict, content: str) -> dict:
    """Advance the guided check-in one question; complete it on the last answer.

    On completion the check-in is submitted through scoring_service
    (the SAME 7-step pipeline as POST /api/checkin) and, when enough
    history exists, the existing risk-assessment + alert generation runs
    — the chat simply guides; the engine owns the numbers.
    """
    stage = checkin.get("stage")
    bad = {"reply": chat_i18n.content(language, "checkin_bad_answer")}

    if stage == "mood":
        value = _parse_int_answer(content)
        if value is None:
            return bad
        checkin["mood"] = value
        checkin["stage"] = "sleep"
        return {"reply": chat_i18n.content(language, "checkin_ask_sleep")}

    if stage == "sleep":
        value = _parse_int_answer(content)
        if value is None:
            return bad
        checkin["sleep"] = value
        checkin["stage"] = "safe"
        return {"reply": chat_i18n.content(language, "checkin_ask_safe")}

    if stage == "safe":
        value = _parse_safe(content)
        if value is None:
            return bad
        checkin["feeling_safe"] = value
        checkin["stage"] = "incident"
        return {"reply": chat_i18n.content(language, "checkin_ask_incident")}

    if stage == "incident":
        value = _parse_yes_no(content)
        if value is None:
            return bad
        checkin["recent_incident"] = value
        checkin["stage"] = "support"
        return {"reply": chat_i18n.content(language, "checkin_ask_support")}

    if stage == "support":
        value = _parse_yes_no(content)
        if value is None:
            return bad
        checkin["support_received"] = value
        checkin["stage"] = "done"
        completed = await _complete_checkin(db, user_id, language, checkin)
        session["checkin"] = None  # cleared once recorded
        return {"reply": chat_i18n.content(language, "checkin_done"),
                "completed": completed}

    return {"reply": chat_i18n.content(language, "checkin_done")}


async def _complete_checkin(db, user_id: str, language: str, checkin: dict) -> dict:
    """Store the check-in through the existing pipeline and refresh risk."""
    from models.checkin import CheckinRequest
    from services import checkin_flow, scoring_service

    text = {
        "en": "Completed a wellbeing check-in through the support conversation.",
        "hi": "सहायता बातचीत के माध्यम से वेलबीइंग चेक-इन पूरा किया।",
        "or": "ସହାୟତା ବାର୍ତ୍ତାଳାପ ମାଧ୍ୟମରେ ଏକ ୱେଲବିଂ ଚେକ୍-ଇନ୍ ସମ୍ପୂର୍ଣ୍ଣ କରାଗଲା।",
    }.get(language, "Completed a wellbeing check-in through the support conversation.")

    payload = CheckinRequest(
        user_id=user_id,
        mood=checkin["mood"],
        sleep=checkin["sleep"],
        feeling_safe=checkin["feeling_safe"],
        text_response=text,
        recent_incident=bool(checkin["recent_incident"]),
        support_received=bool(checkin["support_received"]),
    )
    ai_result = await scoring_service.compute_ai_result(payload, db)
    timestamp = _now()
    checkin_id = str(uuid4())
    await db.checkins.insert_one(
        {
            "checkin_id": checkin_id,
            "user_id": user_id,
            "timestamp": timestamp,
            "form_data": payload.model_dump(exclude={"user_id", "transcript"}),
            "ai_result": ai_result.model_dump(),
            "source": "chat",
        }
    )

    # Refresh the longitudinal assessment + alert pipeline through the SAME
    # shared flow POST /api/checkin uses (services/checkin_flow.py) so the
    # two check-in paths can never drift apart. Failures are contained
    # inside the flow — a failed refresh must not lose the check-in.
    flow = await checkin_flow.run_assessment_flow(db, user_id)
    summary: dict = {"checkin_id": checkin_id, "completed": True}
    assessment = flow.get("assessment")
    if assessment is not None:
        summary.update(
            {
                "distress_score": assessment.get("distress_score"),
                "risk_level": assessment.get("risk_level"),
                "trend": assessment.get("trend"),
            }
        )
    if flow.get("alerts_created"):
        summary["alerts_created"] = flow["alerts_created"]
    return summary

