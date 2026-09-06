"""LLM provider layer for the Sahara Support companion.

One interface, three providers — so the demo keeps working no matter
what keys are available:

  - "anthropic"  Claude via the Anthropic SDK (needs ANTHROPIC_API_KEY)
  - "gemini"     Google Gemini free tier (needs GEMINI_API_KEY — free at
                 https://aistudio.google.com/apikey, no credit card)
  - "fallback"   built-in rule-based responder. Works with NO key and no
                 internet. Used automatically when CHAT_PROVIDER=auto and
                 no cloud key is configured, so the chatbot never dies —
                 it degrades gracefully instead.
  - "mock"       deterministic MOCK_AI_MODE responder (no network): the
                 same rule-based decision tree as fallback but always
                 picking the first canned reply so demos/tests are
                 reproducible. Responses report provider="mock" and are
                 never presented as real AI output.

CHAT_PROVIDER env var: "auto" (default) | "anthropic" | "gemini" | "fallback"
MOCK_AI_MODE=true forces the "mock" responder for demo/test environments.

The full trauma-informed system prompt is shared by every provider —
safety behaviour must not depend on which model is behind the reply.
"""

from __future__ import annotations

import asyncio
import logging
import random
import re

from config import settings

logger = logging.getLogger("sahara.chat")

# ---------------------------------------------------------------------------
# System prompt — identical for every provider.
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are Sahara, a compassionate AI support companion for the Ministry \
of Social Justice and Empowerment (MoSJE), Government of India. You \
support victims of atrocities who have filed complaints under the SC/ST \
Prevention of Atrocities Act.

YOUR ROLE:
- Provide emotional support, information, and a safe space to talk
- Help users understand their rights and the support available to them
- Gently check in on their wellbeing
- Connect them with human counsellors when needed

LANGUAGE:
- Detect whether the user is writing in English, Hindi, or Odia \
(including romanized forms like "mujhe madad chahiye" or "mori jaibi")
- Always respond in the SAME language the user writes in
- For Hindi respond in Devanagari script; for Odia respond in Odia \
script; when the user writes a language in Roman letters, respond in \
Roman letters too
- Keep language simple, warm, and accessible — no jargon

TONE RULES (strictly follow):
- Always calm, warm, patient, and non-judgmental
- Never clinical, never bureaucratic, never cold
- Never use phrases like "I understand your pain" — this can feel \
dismissive. Instead say "I hear you" or "Thank you for sharing this"
- Never minimize what the user has experienced
- Never ask multiple questions at once — one gentle question at a time
- Use the user's name if they share it
- Short responses preferred — 2–4 sentences unless more detail is needed

SAFETY RULES (CRITICAL):
- If the user expresses suicidal thoughts, self-harm, or immediate \
danger: IMMEDIATELY provide the NHAA helpline number 14566 and \
encourage them to call. Do not attempt to provide crisis counselling \
yourself. Say something like: "I am very concerned about you right now. \
Please call 14566 immediately — there are people ready to help you."
- If the user expresses fear of immediate physical danger: provide 112 \
(emergency) and 14566
- Never provide medical advice
- Never make legal promises or guarantees about their case
- If a user asks something you cannot answer safely, say: "This is \
something a human counsellor can help you with better. Would you like \
me to arrange a callback?"

WHAT YOU CAN HELP WITH:
- Emotional support and active listening
- Explaining the complaint process in simple terms
- Explaining what Sahara does and how it protects their privacy
- Information about their rights under the SC/ST Act
- Connecting them with the right helpline or resource
- Scheduling or requesting a counsellor callback

WHAT YOU CANNOT DO (strictly enforced):
- Diagnose, treat, or judge any mental-health condition
- Give medical advice or prescribe anything
- Give legal advice or predict case outcomes
- Access their specific case files
- Make promises about timelines, cases, or outcomes
- Invent government services or helpline numbers — only 14566 (NHAA \
helpline) and 112 (emergency) exist in your knowledge
- Pretend to be a human counsellor, or claim that any call, message, or \
contact has already happened
- Collect unnecessary personal information — never ask for address, \
identity numbers, or details beyond what the person volunteers

Remember always: you are a bridge to human support, not a replacement \
for it. When in doubt, gently offer human help.

OPENING MESSAGE (send this when chat first opens):
"Namaste 🙏 I am Sahara, your support companion. You can use this \
space to share how you are doing, find support, or ask about available \
resources. I am not a counsellor or an emergency service — if you feel \
you may be in immediate danger, please seek immediate human help. How \
are you feeling today?"
"""

# ---------------------------------------------------------------------------
# Provider resolution
# ---------------------------------------------------------------------------


class ProviderNotConfigured(Exception):
    """Raised when an explicit provider is requested without its key."""


def resolve_provider() -> str:
    """Return the provider that will serve the next turn.

    MOCK_AI_MODE=true short-circuits everything to the deterministic
    built-in "mock" responder (no cloud LLM, no network) for demos and
    tests. Otherwise "auto" (default) picks the best available:
    Anthropic if a key is set, else Gemini if a key is set, else the
    built-in fallback — so /api/chat ALWAYS answers, even with zero
    keys. An explicit provider without its key raises
    ProviderNotConfigured (the router turns that into a clear 503).
    """
    if settings.mock_ai_mode:
        return "mock"
    requested = (settings.chat_provider or "auto").strip().lower()

    if requested == "auto":
        if settings.anthropic_api_key:
            return "anthropic"
        if settings.gemini_api_key:
            return "gemini"
        return "fallback"

    if requested == "anthropic":
        if not settings.anthropic_api_key:
            raise ProviderNotConfigured(
                "ANTHROPIC_API_KEY is not set. Get a key at "
                "https://console.anthropic.com (free trial credits), or set "
                "CHAT_PROVIDER=fallback for the built-in responder."
            )
        return "anthropic"

    if requested == "gemini":
        if not settings.gemini_api_key:
            raise ProviderNotConfigured(
                "GEMINI_API_KEY is not set. Get a FREE key at "
                "https://aistudio.google.com/apikey (no credit card), or set "
                "CHAT_PROVIDER=fallback for the built-in responder."
            )
        return "gemini"

    if requested == "fallback":
        return "fallback"

    raise ProviderNotConfigured(
        f"Unknown CHAT_PROVIDER '{settings.chat_provider}'. "
        "Use auto, anthropic, gemini, fallback, or set MOCK_AI_MODE=true."
    )


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


_HINGLISH_MARKERS = re.compile(
    r"\b(hai|hoon|hain|raha|rahi|rahe|kya|mujhe|tumhe|aapko|nahi|nahin|tha|thi|"
    r"mehsoos|chahiye|karna|karein|madad|dar|akela|aaj|bahut|thoda|thodi|kiya|ki)",
    re.IGNORECASE,
)

# Script markers — the strongest signal of all. Odia and Devanagari
# share many shapes to the untrained eye but occupy different unicode
# blocks; checking the script first means an Odia message is never
# answered in Hindi, and vice versa.
_ODIA_SCRIPT_RE = re.compile(r"[\u0B00-\u0B7F]")
_DEVANAGARI_RE2 = re.compile(r"[\u0900-\u097F]")
_ROMAN_ODIA_MARKERS = re.compile(
    r"\b(banchibi|mori|maribi|kahibi|bhalalage|mu|tume|aau|nahin|tharu|jibi)",
    re.IGNORECASE,
)


def detect_language(text: str, fallback: str) -> str:
    """Best-effort language detection (en | hi | or); falls back to the request's language.

    Order of confidence: written script (Odia/Devanagari blocks) is the
    strongest signal, then explicit user preference + romanized markers
    (langdetect is shaky on short romanized Hinglish — it often labels
    "mujhe dar lag raha hai" as English, so when the user says their
    language is Hindi and the text carries romanized Hindi markers, we
    trust the request over langdetect), then langdetect itself. Every
    LLM provider is also instructed to mirror the user's language
    regardless.
    """
    text = text or ""
    if _ODIA_SCRIPT_RE.search(text):
        return "or"
    if _DEVANAGARI_RE2.search(text):
        return "hi"
    if fallback == "hi" and _HINGLISH_MARKERS.search(text):
        return "hi"
    if fallback == "or" and _ROMAN_ODIA_MARKERS.search(text):
        return "or"
    try:
        from langdetect import detect
        detected = detect(text)
        if detected in ("hi", "or", "ori"):
            return "or" if detected == "ori" else detected
    except Exception:  # noqa: BLE001 — detection is best-effort only
        pass
    return fallback if fallback in ("en", "hi", "or") else "en"


def merge_turns(history, message: str) -> list[dict]:
    """Coalesce consecutive same-role turns.

    The Anthropic Messages API requires strictly alternating
    user/assistant roles; a chatty frontend can easily produce
    user,user (e.g. history already ends in user + the new message), so
    consecutive turns are joined instead of erroring. Gemini tolerates
    the same shape after a trivial role rename.
    """
    turns = [{"role": turn.role, "content": turn.content} for turn in history][-20:]
    turns.append({"role": "user", "content": message})
    merged: list[dict] = []
    for turn in turns:
        if merged and merged[-1]["role"] == turn["role"]:
            merged[-1]["content"] += "\n\n" + turn["content"]
        else:
            merged.append(dict(turn))
    return merged


# ---------------------------------------------------------------------------
# Provider 1: Anthropic (Claude)
# ---------------------------------------------------------------------------

_anthropic_client = None


def _get_anthropic_client():
    """Build the Anthropic client once; raises ProviderNotConfigured otherwise."""
    global _anthropic_client
    if _anthropic_client is not None:
        return _anthropic_client
    if not settings.anthropic_api_key:
        raise ProviderNotConfigured(
            "ANTHROPIC_API_KEY is not set. See sahara-backend/.env.example."
        )
    try:
        import anthropic  # lazy import: the app boots without the SDK installed
    except ImportError as exc:
        raise ProviderNotConfigured(
            "The 'anthropic' package is not installed. Run: pip install anthropic"
        ) from exc
    _anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


async def _anthropic_reply(messages: list[dict]) -> str:
    """Call Claude (SDK is synchronous — run it off the event loop)."""
    client = _get_anthropic_client()
    response = await asyncio.to_thread(
        client.messages.create,
        model=settings.anthropic_model,
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    return response.content[0].text


# ---------------------------------------------------------------------------
# Provider 2: Google Gemini (free tier)
# ---------------------------------------------------------------------------

_gemini_client = None

# Failover chain: free-tier flash models share infrastructure but often
# have different load — when the primary is 503/504 "high demand", the
# next model frequently answers. `gemini_model` from .env is the primary;
# these are the backups. Update if Google ships a new flash generation.
_GEMINI_FAILOVER_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash"]


def _get_gemini_client():
    """Build the Gemini client once; raises ProviderNotConfigured otherwise."""
    global _gemini_client
    if _gemini_client is not None:
        return _gemini_client
    if not settings.gemini_api_key:
        raise ProviderNotConfigured(
            "GEMINI_API_KEY is not set. See sahara-backend/.env.example."
        )
    try:
        from google import genai  # lazy import: app boots without the SDK
        from google.genai import types
    except ImportError as exc:
        raise ProviderNotConfigured(
            "The 'google-genai' package is not installed. "
            "Run: pip install google-genai"
        ) from exc
    # http_options.timeout bounds each HTTP call (milliseconds): during
    # "high demand" spikes Gemini can hang instead of failing fast — a
    # hung request must not freeze the chat for minutes.
    _gemini_client = genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(timeout=20_000),
    )
    return _gemini_client


async def _gemini_reply(messages: list[dict]) -> str:
    """Call Gemini's flash models, failing over across the chain."""
    from google.genai import types

    client = _get_gemini_client()
    # Gemini uses "model" where Anthropic uses "assistant", and the SDK
    # wants typed Content objects (plain dicts are rejected by its
    # Pydantic request models).
    contents = [
        types.Content(
            role="model" if turn["role"] == "assistant" else "user",
            parts=[types.Part(text=turn["content"])],
        )
        for turn in messages
    ]
    models = [settings.gemini_model, *_GEMINI_FAILOVER_MODELS]
    last_error: Exception | None = None
    for model in models:
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=512,
                ),
            )
            if response.text and response.text.strip():
                return response.text
            last_error = RuntimeError(f"{model} returned an empty reply")
        except Exception as exc:  # noqa: BLE001 — try the next model in the chain
            last_error = exc
            logger.warning("Gemini model '%s' failed (%s); trying next in chain.",
                           model, str(exc)[:120])
    raise last_error if last_error else RuntimeError("no Gemini model answered")


# ---------------------------------------------------------------------------
# Provider 3: built-in fallback responder (zero keys, zero internet)
# ---------------------------------------------------------------------------
# A small rule-based companion that honours the same safety contract:
# crisis keywords ALWAYS trigger the helpline message, and replies mirror
# the user's language (Devanagari vs romanized Hinglish). It is NOT a
# language model — it exists so the demo never shows a dead chat.

_FALLBACK_POOLS = {
    "en": {
        "crisis": [
            "I hear you, and I am very concerned about you right now. "
            "Please call 14566 immediately — there are people ready to help you. "
            "You do not have to face this alone. Would you like to call them now, "
            "and I will stay right here with you?",
            "Thank you for telling me. What you are feeling right now matters, "
            "and you deserve immediate human support. Please call 14566 now — "
            "counsellors are available any time, day or night.",
        ],
        "negative": [
            "Thank you for sharing this with me. It sounds like things have felt "
            "heavy lately, and that matters. Would you like to tell me a little "
            "more about what has been hardest today?",
            "I am here with you. It is okay to not be okay. What has been on "
            "your mind most today?",
        ],
        "help": [
            "I can help guide you, but for the kind of support you may need "
            "right now, a human counsellor is best placed. Would you like me to "
            "arrange a callback from one? You can also call 14566 any time — "
            "it is free and confidential.",
        ],
        "neutral": [
            "I am here with you. How are you feeling right now, in this moment?",
            "Thank you for checking in. What has your day been like so far?",
        ],
        "greeting": [
            "Namaste 🙏 I am Sahara, your support companion. This is a safe and "
            "private space. You can talk to me in Hindi or English. How are you "
            "feeling today?",
        ],
    },
    "hi": {
        "crisis": [
            "मैं आपकी बात सुन रही हूँ, और अभी मुझे आपकी बहुत चिंता हो रही है। "
            "कृपया तुरंत 14566 पर कॉल करें — वहाँ लोग आपकी मदद के लिए हर समय तैयार हैं। "
            "आपको यह सब अकेले नहीं झेलना है।",
            "यह बताने के लिए धन्यवाद। अभी आपको तुरंत किसी इंसान के साथ बात करनी चाहिए — "
            "कृपया 14566 पर कॉल करें। वहाँ काउंसलर दिन-रात उपलब्ध हैं।",
        ],
        "negative": [
            "इसे मेरे साथ साझा करने के लिए धन्यवाद। लगता है कि इन दिनों चीज़ें थोड़ी "
            "भारी रही हैं, और यह मायने रखता है। क्या आप बताना चाहेंगे कि आज सबसे "
            "कठिन क्या रहा?",
            "मैं आपके साथ हूँ। ठीक न होना भी ठीक है। आज आपके मन में सबसे ज़्यादा क्या चल रहा है?",
        ],
        "help": [
            "मैं आपकी मदद कर सकती हूँ, लेकिन जिस तरह के सहारे की आपको अभी ज़रूरत हो "
            "सकती है, उसके लिए मानव काउंसलर सबसे अच्छे हैं। क्या आप चाहेंगे कि मैं "
            "आपके लिए कॉलबैक का इंतज़ाम करूँ? आप कभी भी 14566 पर कॉल कर सकते हैं — "
            "यह मुफ़्त और निजी है।",
        ],
        "neutral": [
            "मैं आपके साथ हूँ। इस समय आप कैसा महसूस कर रहे हैं?",
            "जुड़ने के लिए धन्यवाद। आज आपका दिन कैसा रहा?",
        ],
        "greeting": [
            "नमस्ते 🙏 मैं सहारा हूँ, आपका सहयोगी साथी। यह एक सुरक्षित और निजी जगह है। "
            "आप मुझसे हिंदी या अंग्रेज़ी में बात कर सकते हैं। आज आप कैसा महसूस कर रहे हैं?",
        ],
    },
    # Roman-script Hinglish — same warmth, Latin script.
    "hinglish": {
        "crisis": [
            "Main aapki baat sun rahi hoon, aur abhi mujhe aapki bahut chinta ho rahi "
            "hai. Kripya turant 14566 par call karein — wahan log aapki madad ke liye "
            "har samay taiyar hain. Aapko ye sab akela nahi jhelna hai.",
            "Ye batane ke liye dhanyavaad. Abhi aapko turant kisi insaan se baat karni "
            "chahiye — kripya 14566 par call karein. Wahan counsellor din-raat uplabdh hain.",
        ],
        "negative": [
            "Ise mere saath share karne ke liye dhanyavaad. Lagta hai ki in dino cheezein "
            "thodi bhaari rahi hain, aur ye maayne rakhta hai. Kya aap batana chahenge ki "
            "aaj sabse kathin kya raha?",
            "Main aapke saath hoon. Theek na hona bhi theek hai. Aaj aapke man mein "
            "sabse zyada kya chal raha hai?",
        ],
        "help": [
            "Main aapki madad kar sakti hoon, lekin jis tarah ke sahare ki aapko abhi "
            "zaroorat ho sakti hai, uske liye human counsellor sabse achhe hain. Kya aap "
            "chahenge ki main aapke liye callback ka intezaam karoon? Aap kabhi bhi 14566 "
            "par call kar sakte hain — ye muft aur niji hai.",
        ],
        "neutral": [
            "Main aapke saath hoon. Is samay aap kaisa mehsoos kar rahe hain?",
            "Judne ke liye dhanyavaad. Aaj aapka din kaisa raha?",
        ],
        "greeting": [
            "Namaste 🙏 Main Sahara hoon, aapka sahayogi saathi. Yeh ek surakshit aur "
            "niji jagah hai. Aap mujhse Hindi ya English mein baat kar sakte hain. "
            "Aaj aap kaise mehsoos kar rahe hain?",
        ],
    },
    # Odia — prototype copy in Odia script (see chat_i18n for the full
    # portal experience). A native-speaker review is required before any
    # real deployment; the copy here follows the same safety contract as
    # every other language: crisis FIRST, always with human numbers.
    "or": {
        "crisis": [
            "ମୁଁ ଆପଣଙ୍କ କଥା ଶୁଣୁଛି, ଏବଂ ଏବେ ମୋତେ ଆପଣଙ୍କ ପାଇଁ ବହୁତ ଚିନ୍ତା ହେଉଛି। "
            "ଦୟାକରି ତୁରନ୍ତ 14566 ରେ କଲ୍ କରନ୍ତୁ — ସେଠାରେ ଲୋକମାନେ ଯେକୌଣସି ସମୟରେ "
            "ଆପଣଙ୍କ ସାହାଯ୍ୟ ପାଇଁ ପ୍ରସ୍ତୁତ ଅଛନ୍ତି। ଆପଣଙ୍କୁ ଏହା ଏକା ସାମ୍ନା କରିବାକୁ ପଡ଼ିବ ନାହିଁ।",
            "କହିବା ପାଇଁ ଧନ୍ୟବାଦ। ଏବେ ଆପଣଙ୍କୁ ତୁରନ୍ତ ଜଣେ ମନୁଷ୍ୟଙ୍କ ସହାୟତା ଦରକାର — "
            "ଦୟାକରି 14566 ରେ କଲ୍ କରନ୍ତୁ। ସେଠାରେ କାଉନସେଲର ଦିନରାତି ଉପଲବ୍ଧ ଅଛନ୍ତି।",
        ],
        "negative": [
            "ଏହା ମୋ ସହିତ ବାଣ୍ଟିବା ପାଇଁ ଧନ୍ୟବାଦ। ଆପଣ ଶୁଣିବା ପାଇଁ ଯୋଗ୍ୟ। କହନ୍ତୁ, "
            "ଆଜି ସବୁଠାରୁ କଷ୍ଟକର କ’ଣ ଲାଗୁଛି?",
            "ମୁଁ ଆପଣଙ୍କ ସାଥିରେ ଅଛି। ଠିକ୍ ଅନୁଭବ ନ କରିବା ମଧ୍ୟ ଠିକ୍। ଆଜି "
            "ଆପଣଙ୍କ ମନରେ ସବୁଠାରୁ ଅଧିକ କ’ଣ ଚାଲିଛି?",
        ],
        "help": [
            "ମୁଁ ଆପଣଙ୍କୁ ଦିଗ ଦେଖାଇ ପାରିବି, କିନ୍ତୁ ଏହିଭଳି ସମର୍ଥନ ପାଇଁ ଜଣେ ମାନବ "
            "କାଉନସେଲର ସବୁଠାରୁ ଭଲ। ଆପଣ ଚାହୁଁଛନ୍ତି କି ମୁଁ ଆପଣଙ୍କ ପାଇଁ କଲବ୍ୟାକ୍ "
            "ବ୍ୟବସ୍ଥା କରିଦେବି? ଆପଣ ଯେକୌଣସି ସମୟରେ 14566 କୁ କଲ୍ କରିପାରିବେ।",
        ],
        "neutral": [
            "ମୁଁ ଆପଣଙ୍କ ସାଥିରେ ଅଛି। ଏହି ସମୟରେ ଆପଣ କେମିତି ଅନୁଭବ କରୁଛନ୍ତି?",
            "କହିବା ପାଇଁ ଧନ୍ୟବାଦ। ଆଜି ଆପଣଙ୍କ ଦିନ କେମିତି ଗଲା?",
        ],
        "greeting": [
            "ନମସ୍କାର 🙏 ମୁଁ ସହାରା, ଆପଣଙ୍କ ସହାୟକ ସାଥୀ। ଆପଣ ଏଠାରେ ନିଜର "
            "ଅନୁଭବ, ସମର୍ଥନ, କିମ୍ବା ସାହାଯ୍ୟ ସମ୍ବନ୍ଧରେ କହିପାରିବେ। ଆଜି ଆପଣ "
            "କେମିତି ଅନୁଭବ କରୁଛନ୍ତି?",
        ],
    },
}

_GREETING_RE = re.compile(
    r"\b(hi|hello|hey|namaste|namaskar|good morning|good evening|good afternoon"
    r"|salaam)\b",
    re.IGNORECASE,
)
_HELP_RE = re.compile(
    r"\b(help|madad|sahayata|assistance|baat karni|bat karni|support me)\b",
    re.IGNORECASE,
)
_DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")


def _script_pool(message: str, language: str) -> str:
    """Pick the reply pool: Odia script for Odia, Devanagari or romanized
    Hinglish for Hindi, English otherwise."""
    if language == "or":
        return "or"
    if language == "hi":
        return "hi" if _DEVANAGARI_RE.search(message) else "hinglish"
    return "en"


def _fallback_reply(message: str, language: str) -> str:
    """Rule-based reply: safety first, then warmth, in the user's language."""
    pool = _FALLBACK_POOLS[_script_pool(message, language)]

    from services.keyword_service import detect_crisis_keywords

    # 1. SAFETY FIRST — never a model's judgement call.
    if detect_crisis_keywords(message)["crisis_detected"]:
        return random.choice(pool["crisis"])

    # 2. Warm opening for greetings.
    if _GREETING_RE.search(message) and len(message.split()) <= 8:
        return random.choice(pool["greeting"])

    # 3. Explicit help request -> point to humans (never promise more).
    if _HELP_RE.search(message):
        return random.choice(pool["help"])

    # 4. Negative sentiment -> supportive listening + one gentle question.
    try:
        label = nlp_analyze_sentiment_label(message)
    except Exception:  # noqa: BLE001 — never let the fallback itself fail
        label = "neutral"
    if label == "negative":
        return random.choice(pool["negative"])

    return random.choice(pool["neutral"])


def _mock_reply(message: str, language: str) -> str:
    """Deterministic MOCK_AI_MODE reply: same decision tree as the fallback
    responder but always picks the FIRST canned option, so demo scenarios
    and tests are reproducible. The response `provider` field reports
    "mock" so clients can show a "demo mode" note — mock replies are
    never presented as real AI output."""
    pool = _FALLBACK_POOLS[_script_pool(message, language)]

    from services.keyword_service import detect_crisis_keywords

    if detect_crisis_keywords(message)["crisis_detected"]:
        return pool["crisis"][0]
    if _GREETING_RE.search(message) and len(message.split()) <= 8:
        return pool["greeting"][0]
    if _HELP_RE.search(message):
        return pool["help"][0]
    try:
        label = nlp_analyze_sentiment_label(message)
    except Exception:  # noqa: BLE001 — never let the fallback itself fail
        label = "neutral"
    if label == "negative":
        return pool["negative"][0]
    return pool["neutral"][0]


def nlp_analyze_sentiment_label(message: str) -> str:
    """Thin wrapper so the fallback doesn't import nlp_service at module load
    (the model module is heavy and may be absent)."""
    from services.nlp_service import analyze_sentiment

    return analyze_sentiment(message)["label"]


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

_RETRYABLE_HINTS = ("503", "429", "unavailable", "resource_exhausted", "quota")


async def _call_with_retry(provider: str, messages: list[dict]) -> str:
    """Call a cloud provider, retrying transient failures with backoff.

    Free-tier LLM APIs (Gemini included) regularly return 503 "high
    demand" or 429 rate limits for a few seconds — a demo chat must not
    die on that. Empty replies (spike artifacts) are retried too.
    Non-transient errors (bad key, schema, auth) fail fast.
    """
    delay = 1.0
    last_exc: Exception | None = None
    for attempt in range(2):
        try:
            reply = (
                await _anthropic_reply(messages)
                if provider == "anthropic"
                else await _gemini_reply(messages)
            )
            if reply and reply.strip():
                return reply
            last_exc = RuntimeError("provider returned an empty reply")
        except Exception as exc:  # noqa: BLE001 — we decide retry-ability below
            last_exc = exc
            if any(hint in str(exc).lower() for hint in _RETRYABLE_HINTS):
                await asyncio.sleep(delay)
                delay *= 2
                continue
            raise
        await asyncio.sleep(delay)
        delay *= 2
    raise last_exc if last_exc else RuntimeError("provider returned no text")


def _last_user_text(messages: list[dict]) -> str:
    return next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")


def safety_reply(message: str, language: str) -> str:
    """Deterministic crisis-flow reply (acknowledgement + human numbers).

    Used by the portal chat's crisis branch: when the conservative
    classifier flags a crisis signal, the reply is NEVER left to a model
    — this canned, language-matched response guarantees the helpline
    numbers appear every single time. The caller labels the provider.
    """
    return _FALLBACK_POOLS[_script_pool(message, language)]["crisis"][0]


async def generate_reply(provider: str, messages: list[dict], language: str) -> tuple[str, str]:
    """Return (reply, provider_used) for one conversation turn.

    `provider` must come from resolve_provider(). The last message in
    `messages` is the user's new message.

    Resilience contract: a cloud provider that errors or returns an
    empty reply after retries degrades to the built-in rule-based
    responder instead of failing the turn — the companion is never dead.
    The returned `provider_used` reports the truth ("fallback") so
    clients can show a demo-mode note if they want.
    """
    if provider == "mock":
        # MOCK_AI_MODE: deterministic sample replies, clearly labelled.
        return _mock_reply(_last_user_text(messages), language), "mock"

    if provider == "fallback":
        return _fallback_reply(_last_user_text(messages), language), "fallback"

    if provider in ("anthropic", "gemini"):
        try:
            reply = await _call_with_retry(provider, messages)
            return reply, provider
        except Exception as exc:  # noqa: BLE001 — degrade, never fail the turn
            logger.error("Chat provider '%s' failed after retries: %s", provider, exc)
            logger.warning("Degrading to the built-in fallback responder.")
            return _fallback_reply(_last_user_text(messages), language), "fallback"

    raise ProviderNotConfigured(f"Unknown provider: {provider}")