"""Chat experience content, per supported language.

This module is the LANGUAGE AUTHORITY for the "Talk to Sahara" portal
chat: welcome copy, the not-a-replacement disclaimer, quick actions,
crisis-card text, and human-support status copy all come from here so
that switching language changes the whole experience — not just a few
headings.

Adding a language = adding one dict to ``CONTENT`` and one name to
``SUPPORTED_LANGUAGES`` (plus, where applicable, crisis keywords and a
fallback-reply pool in keyword_service / chat_llm).

NOTE: the Odia copy is prototype quality and should be reviewed by a
native speaker before any real deployment (flag it the same way every
other demonstration string is flagged in this project).
"""

from __future__ import annotations

from typing import Literal, Optional

# Language codes used consistently across the API, DB and UI.
SupportedLanguage = Literal["en", "hi", "or"]
SUPPORTED_LANGUAGES: tuple[str, ...] = ("en", "hi", "or")

LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "hi": "हिंदी",
    "or": "ଓଡ଼ିଆ",
}

# ---------------------------------------------------------------------------
# Per-language content. Every value should keep the same keys so adding a
# language is purely additive.
# ---------------------------------------------------------------------------

CONTENT: dict[str, dict] = {
    "en": {
        "welcome_title": "How are you doing today?",
        # Requirement: the opening must name the space's purpose AND state
        # plainly that Sahara is not a replacement for human care.
        "welcome": (
            "Namaste \U0001F64F I am Sahara, your support companion. "
            "You can use this space to share how you are doing, find "
            "support, or ask about available resources."
        ),
        "disclaimer": (
            "Sahara is not a replacement for a counsellor or an emergency "
            "service. If you feel you may be in immediate danger, please "
            "seek immediate human help — call 14566 any time."
        ),
        "privacy_note": (
            "Your conversation is separate from the administrative "
            "monitoring view. Only information needed for your support "
            "workflow (such as a safety signal) is shared with authorised "
            "personnel. You can delete this conversation at any time."
        ),
        # Quick actions shown with the welcome. `kind` tells the frontend
        # how to react; `prompt` is the exact message the assistant reads.
        "quick_actions": [
            {"key": "feel", "label": "Talk about how I feel",
             "prompt": "I would like to talk about how I have been feeling."},
            {"key": "checkin", "label": "Complete a wellbeing check-in",
             "prompt": "__quick_action_checkin__"},
            {"key": "support", "label": "Find support",
             "prompt": "What support is available to me right now?"},
            {"key": "rights", "label": "Learn about my rights",
             "prompt": "Can you tell me about my rights in simple words?"},
            {"key": "human", "label": "Talk to a person",
             "prompt": "__quick_action_human__"},
        ],
        "checkin_intro": (
            "Of course. I will ask you five short questions, the same ones "
            "a regular check-in uses. Take your time — there are no wrong "
            "answers. First: on a scale of 1 to 10, how would you rate "
            "your mood today? (1 = very low, 10 = very good)"
        ),
        "checkin_ask_sleep": (
            "Thank you. Next: on a scale of 1 to 10, how has your sleep "
            "been lately? (1 = very poor, 10 = very good)"
        ),
        "checkin_ask_safe": (
            "Thank you. Do you feel safe right now? Please answer yes, no, "
            "or sometimes."
        ),
        "checkin_ask_incident": (
            "Thank you. Has there been a new incident related to your "
            "complaint since your last check-in? Yes or no."
        ),
        "checkin_ask_support": (
            "Thank you. Have you received support from a counsellor or "
            "someone you trust this week? Yes or no."
        ),
        "checkin_bad_answer": (
            "That did not quite fit the question — please answer with the "
            "options I gave, and we will continue."
        ),
        "checkin_done": (
            "Thank you for completing this check-in. It has been recorded "
            "with your other check-ins, and only the support team looking "
            "after you can see the pattern it helps form. Is there "
            "anything you would like to talk about?"
        ),
        # Crisis card (deterministic; shown prominently, never buried).
        "crisis_ack": (
            "It sounds like you may be dealing with something very serious "
            "right now. You do not have to handle this alone."
        ),
        "crisis_numbers": [
            {"label": "NHAA national helpline (toll-free, 24×7)",
             "number": "14566"},
            {"label": "Emergency services", "number": "112"},
        ],
        "crisis_human_cta": "Talk to a person now",
        "human_support_asked": (
            "Your request has been submitted. A member of the support team "
            "will reach out to you. While you wait, you can call 14566 any "
            "time — it is free and confidential."
        ),
        "human_support_pending": "Human support requested — a team member will reach out.",
        "human_support_cta": "Request human support",
        "delete_confirm": "Delete this conversation?",
        "deleted": "Your conversation has been deleted.",
        "error": (
            "I am sorry, I could not respond right now. Please try again, "
            "or call 14566 for immediate support."
        ),
        "lang_label": "Chat language",
        "you": "You",
        "sahara": "Sahara",
        "human_in_loop": (
            "Sahara's AI helps identify patterns and guide support. Human "
            "professionals remain responsible for decisions and care."
        ),
    },
    "hi": {
        "welcome_title": "आज आप कैसा महसूस कर रहे हैं?",
        "welcome": (
            "नमस्ते \U0001F64F मैं सहारा हूँ, आपका सहयोगी साथी। आप इस जगह का "
            "उपयोग यह बताने के लिए कर सकते हैं कि आप कैसा महसूस कर रहे हैं, "
            "सहारा पाने के लिए, या उपलब्ध मदद के बारे में पूछने के लिए।"
        ),
        "disclaimer": (
            "सहारा किसी काउंसलर या आपातकालीन सेवा का विकल्प नहीं है। अगर आपको "
            "लगता है कि आप तुरंत ख़तरे में हैं, तो कृपया तुरंत मानवीय मदद लें — "
            "कभी भी 14566 पर कॉल करें।"
        ),
        "privacy_note": (
            "आपकी बातचीत प्रशासनिक निगरानी दृश्य से अलग रहती है। आपके समर्थन "
            "कार्य के लिए ज़रूरी जानकारी (जैसे कोई सुरक्षा संकेत) ही अधिकृत "
            "कर्मियों के साथ साझा होती है। आप किसी भी समय यह बातचीत हटा सकते हैं।"
        ),
        "quick_actions": [
            {"key": "feel", "label": "अपनी भावनाओं के बारे में बात करें",
             "prompt": "मैं अपनी भावनाओं के बारे में बात करना चाहता/चाहती हूँ।"},
            {"key": "checkin", "label": "वेलबीइंग चेक-इन पूरा करें",
             "prompt": "__quick_action_checkin__"},
            {"key": "support", "label": "सहारा खोजें",
             "prompt": "अभी मेरे लिए कौन-सी मदद उपलब्ध है?"},
            {"key": "rights", "label": "अपने अधिकारों के बारे में जानें",
             "prompt": "क्या आप मेरे अधिकारों के बारे में सरल शब्दों में बता सकते हैं?"},
            {"key": "human", "label": "किसी इंसान से बात करें",
             "prompt": "__quick_action_human__"},
        ],
        "checkin_intro": (
            "ज़रूर। मैं आपसे पाँच छोटे सवाल पूछूँगा — वही जो नियमित चेक-इन में "
            "पूछे जाते हैं। जल्दबाज़ी न करें — कोई गलत जवाब नहीं है। पहला: आज "
            "आपका मूड 1 से 10 के पैमाने पर कैसा है? (1 = बहुत खराब, 10 = बहुत अच्छा)"
        ),
        "checkin_ask_sleep": (
            "धन्यवाद। अगला: हाल ही में आपकी नींद 1 से 10 के पैमाने पर कैसी रही? "
            "(1 = बहुत खराब, 10 = बहुत अच्छी)"
        ),
        "checkin_ask_safe": (
            "धन्यवाद। क्या आप अभी सुरक्षित महसूस कर रहे हैं? कृपया हाँ, नहीं, या "
            "कभी-कभी में जवाब दें।"
        ),
        "checkin_ask_incident": (
            "धन्यवाद। क्या आपकी पिछली चेक-इन के बाद आपकी शिकायत से जुड़ी कोई नई "
            "घटना हुई है? हाँ या नहीं।"
        ),
        "checkin_ask_support": (
            "धन्यवाद। क्या इस हफ़्ते आपको किसी काउंसलर या किसी विश्वसनीय व्यक्ति "
            "से सहारा मिला है? हाँ या नहीं।"
        ),
        "checkin_bad_answer": (
            "यह जवाब सवाल के अनुरूप नहीं था — कृपया मेरे दिए गए विकल्पों में से "
            "जवाब दें, फिर हम आगे बढ़ेंगे।"
        ),
        "checkin_done": (
            "चेक-इन पूरा करने के लिए धन्यवाद। यह आपके अन्य चेक-इन के साथ दर्ज हो "
            "गया है, और केवल आपकी देखभाल करने वाली सहायता टीम ही इसका पैटर्न देख "
            "सकती है। क्या कुछ और है जिसके बारे में आप बात करना चाहेंगे?"
        ),
        "crisis_ack": (
            "लगता है कि अभी आप किसी बहुत गंभीर बात से गुज़र रहे हैं। आपको यह "
            "अकेले नहीं झेलना है।"
        ),
        "crisis_numbers": [
            {"label": "NHAA राष्ट्रीय हेल्पलाइन (निःशुल्क, 24×7)", "number": "14566"},
            {"label": "आपातकालीन सेवाएँ", "number": "112"},
        ],
        "crisis_human_cta": "अभी किसी इंसान से बात करें",
        "human_support_asked": (
            "आपका अनुरोध दर्ज कर लिया गया है। सहायता टीम का कोई सदस्य आपसे "
            "संपर्क करेगा। तब तक आप कभी भी 14566 पर कॉल कर सकते हैं — यह निःशुल्क "
            "और गोपनीय है।"
        ),
        "human_support_pending": "मानव सहारे का अनुरोध किया गया — टीम का सदस्य संपर्क करेगा।",
        "human_support_cta": "मानव सहारे का अनुरोध करें",
        "delete_confirm": "यह बातचीत हटाएँ?",
        "deleted": "आपकी बातचीत हटा दी गई है।",
        "error": (
            "माफ़ कीजिए, अभी मैं जवाब नहीं दे पाई। कृपया फिर कोशिश करें, या तुरंत "
            "मदद के लिए 14566 पर कॉल करें।"
        ),
        "lang_label": "चैट भाषा",
        "you": "आप",
        "sahara": "सहारा",
        "human_in_loop": (
            "सहारा की AI पैटर्न पहचानने और सहारे तक पहुँचाने में मदद करती है। "
            "निर्णय और देखभाल की ज़िम्मेदारी मानव पेशेवरों की ही रहती है।"
        ),
    },
    "or": {
        "welcome_title": "ଆଜି ଆପଣ କେମିତି ଅନୁଭବ କରୁଛନ୍ତି?",
        "welcome": (
            "ନମସ୍କାର \U0001F64F ମୁଁ ସହାରା, ଆପଣଙ୍କ ସହାୟକ ସାଥୀ। ଆପଣ ଏହି ସ୍ଥାନରେ "
            "କେମିତି ଅନୁଭବ କରୁଛନ୍ତି କହିପାରିବେ, ସମର୍ଥନ ପାଇପାରିବେ, କିମ୍ବା ଉପଲବ୍ଧ "
            "ସାହାଯ୍ୟ ସମ୍ବନ୍ଧରେ ପଚାରିପାରିବେ।"
        ),
        "disclaimer": (
            "ସହାରା କୌଣସି କାଉନସେଲର କିମ୍ବା ଜରୁରୀକାଳୀନ ସେବାର ବିକଳ୍ପ ନୁହେଁ। "
            "ଯଦି ଆପଣ ଅନୁଭବ କରୁଛନ୍ତି ଯେ ଆପଣ ତୁରନ୍ତ ବିପଦରେ ଅଛନ୍ତି, ଦୟାକରି "
            "ତୁରନ୍ତ ମାନବ ସାହାଯ୍ୟ ନିଅନ୍ତୁ — ଯେକୌଣସି ସମୟରେ 14566 ରେ କଲ୍ କରନ୍ତୁ।"
        ),
        "privacy_note": (
            "ଆପଣଙ୍କ ବାର୍ତ୍ତାଳାପ ପ୍ରଶାସନିକ ମନିଟରିଂ ଦୃଶ୍ୟଠାରୁ ଅଲଗା ରହେ। ଆପଣଙ୍କ "
            "ସମର୍ଥନ ପାଇଁ ଆବଶ୍ୟକ ସୂଚନା (ଯେପରି କୌଣସି ସୁରକ୍ଷା ସଙ୍କେତ) ହିଁ "
            "ଅଧିକୃତ କର୍ମଚାରୀଙ୍କ ସହ ସେୟାର ହୁଏ। ଆପଣ ଯେକୌଣସି ସମୟରେ ଏହି "
            "ବାର୍ତ୍ତାଳାପ ହଟାଇ ପାରିବେ।"
        ),
        "quick_actions": [
            {"key": "feel", "label": "ମୋ ଅନୁଭୂତି ବିଷୟରେ କହିବି",
             "prompt": "ମୁଁ ମୋ ଅନୁଭୂତି ବିଷୟରେ କହିବାକୁ ଚାହେଁ।"},
            {"key": "checkin", "label": "ଏକ ୱେଲବିଂ ଚେକ୍-ଇନ୍ ପୂରା କରିବି",
             "prompt": "__quick_action_checkin__"},
            {"key": "support", "label": "ସମର୍ଥନ ଖୋଜିବି",
             "prompt": "ଏବେ ମୋ ପାଇଁ କ’ଣ ସାହାଯ୍ୟ ଉପଲବ୍ଧ?"},
            {"key": "rights", "label": "ମୋ ଅଧିକାର ବିଷୟରେ ଜାଣିବି",
             "prompt": "ଆପଣ କ’ଣ ମୋ ଅଧିକାର ବିଷୟରେ ସରଳ ଭାଷାରେ କହିପାରିବେ?"},
            {"key": "human", "label": "ଜଣେ ମନୁଷ୍ୟଙ୍କ ସହ କଥା ହେବି",
             "prompt": "__quick_action_human__"},
        ],
        "checkin_intro": (
            "ଅବଶ୍ୟ। ମୁଁ ଆପଣଙ୍କୁ ପାଞ୍ଚଟି ଛୋଟ ପ୍ରଶ୍ନ ପଚାରିବି — ସେହି ପ୍ରଶ୍ନ ଯାହା "
            "ନିୟମିତ ଚେକ୍-ଇନ୍‌ରେ ପଚରାଯାଏ। ତରବର କରନ୍ତୁ ନାହିଁ — କୌଣସି ଭୁଲ "
            "ଉତ୍ତର ନାହିଁ। ପ୍ରଥମ: ଆଜି ଆପଣଙ୍କ ମନୋବଳ 1 ରୁ 10 ମଧ୍ୟରେ କେତେ? "
            "(1 = ବହୁତ ଖରାପ, 10 = ବହୁତ ଭଲ)"
        ),
        "checkin_ask_sleep": (
            "ଧନ୍ୟବାଦ। ପରବର୍ତ୍ତୀ: ସାମ୍ପ୍ରତିକ ସମୟରେ ଆପଣଙ୍କ ନିଦ୍ରା 1 ରୁ 10 ମଧ୍ୟରେ "
            "କେମିତି ରହିଛି? (1 = ବହୁତ ଖରାପ, 10 = ବହୁତ ଭଲ)"
        ),
        "checkin_ask_safe": (
            "ଧନ୍ୟବାଦ। ଆପଣ କ’ଣ ଏବେ ସୁରକ୍ଷିତ ଅନୁଭବ କରୁଛନ୍ତି? ଦୟାକରି ହଁ, ନାହିଁ, "
            "କିମ୍ବା ବେଳେବେଳେ ଉତ୍ତର ଦିଅନ୍ତୁ।"
        ),
        "checkin_ask_incident": (
            "ଧନ୍ୟବାଦ। ଆପଣଙ୍କ ପୂର୍ବ ଚେକ୍-ଇନ୍ ପରେ ଆପଣଙ୍କ ଅଭିଯୋଗ ସହିତ ଜଡ଼ିତ "
            "କୌଣସି ନୂଆ ଘଟଣା ଘଟିଛି କି? ହଁ କିମ୍ବା ନାହିଁ।"
        ),
        "checkin_ask_support": (
            "ଧନ୍ୟବାଦ। ଏହି ସପ୍ତାହରେ ଆପଣ କୌଣସି କାଉନସେଲର କିମ୍ବା ବିଶ୍ୱସ୍ତ "
            "ବ୍ୟକ୍ତିଙ୍କଠାରୁ ସମର୍ଥନ ପାଇଛନ୍ତି କି? ହଁ କିମ୍ବା ନାହିଁ।"
        ),
        "checkin_bad_answer": (
            "ଏହା ପ୍ରଶ୍ନ ସହିତ ମେଳ ଖାଇଲା ନାହିଁ — ଦୟାକରି ମୁଁ ଦେଇଥିବା "
            "ବିକଳ୍ପରୁ ଉତ୍ତର ଦିଅନ୍ତୁ, ତା’ପରେ ଆମେ ଆଗକୁ ଯିବା।"
        ),
        "checkin_done": (
            "ଏହି ଚେକ୍-ଇନ୍ ସମ୍ପୂର୍ଣ୍ଣ କରିଥିବାରୁ ଧନ୍ୟବାଦ। ଏହା ଆପଣଙ୍କ ଅନ୍ୟ "
            "ଚେକ୍-ଇନ୍‌ ସହିତ ସଂରକ୍ଷିତ ହୋଇଛି, ଏବଂ ଆପଣଙ୍କ ଯତ୍ନ ନେଉଥିବା ସହାୟତା "
            "ଟିମ୍ ହିଁ ଏହାର ପ୍ରଣାଳୀ ଦେଖିପାରିବେ। ଆଉ କିଛି ଅଛି କି ଯାହା ବିଷୟରେ "
            "ଆପଣ କହିବାକୁ ଚାହୁଁଛନ୍ତି?"
        ),
        "crisis_ack": (
            "ଲାଗୁଛି ଆପଣ ବର୍ତ୍ତମାନ ବହୁତ ଗମ୍ଭୀର କିଛି ସାମ୍ନା କରୁଛନ୍ତି। ଆପଣଙ୍କୁ "
            "ଏହା ଏକା ସାମ୍ନା କରିବାକୁ ପଡ଼ିବ ନାହିଁ।"
        ),
        "crisis_numbers": [
            {"label": "NHAA ଜାତୀୟ ହେଲ୍ପଲାଇନ୍ (ନିଃଶୁଳ୍କ, 24×7)", "number": "14566"},
            {"label": "ଜରୁରୀକାଳୀନ ସେବା", "number": "112"},
        ],
        "crisis_human_cta": "ଏବେ ଜଣେ ମନୁଷ୍ୟଙ୍କ ସହ କଥା ହୁଅନ୍ତୁ",
        "human_support_asked": (
            "ଆପଣଙ୍କ ଅନୁରୋଧ ଗ୍ରହଣ ହୋଇଛି। ସହାୟତା ଟିମ୍‌ର ଜଣେ ସଦସ୍ୟ ଆପଣଙ୍କ "
            "ସହିତ ଯୋଗାଯୋଗ କରିବେ। ସେ ସମୟ ପର୍ଯ୍ୟନ୍ତ ଆପଣ ଯେକୌଣସି ସମୟରେ "
            "14566 ରେ କଲ୍ କରିପାରିବେ — ଏହା ନିଃଶୁଳ୍କ ଏବଂ ଗୋପନୀୟ।"
        ),
        "human_support_pending": "ମାନବ ସମର୍ଥନ ଅନୁରୋଧ ହୋଇଛି — ଟିମ୍ ସଦସ୍ୟ ଯୋଗାଯୋଗ କରିବେ।",
        "human_support_cta": "ମାନବ ସମର୍ଥନ ଅନୁରୋଧ କରନ୍ତୁ",
        "delete_confirm": "ଏହି ବାର୍ତ୍ତାଳାପ ହଟାଇବେ?",
        "deleted": "ଆପଣଙ୍କ ବାର୍ତ୍ତାଳାପ ହଟାଇ ଦିଆଯାଇଛି।",
        "error": (
            "କ୍ଷମା କରନ୍ତୁ, ମୁଁ ଏବେ ଉତ୍ତର ଦେଇପାରିଲି ନାହିଁ। ଦୟାକରି ପୁଣି "
            "ଚେଷ୍ଟା କରନ୍ତୁ, କିମ୍ବା ତୁରନ୍ତ ସାହାଯ୍ୟ ପାଇଁ 14566 ରେ କଲ୍ କରନ୍ତୁ।"
        ),
        "lang_label": "ଚାଟ୍ ଭାଷା",
        "you": "ଆପଣ",
        "sahara": "ସହାରା",
        "human_in_loop": (
            "ସହାରାର AI ଢାଞ୍ଚା ଚିହ୍ନଟ କରିବା ଏବଂ ସମର୍ଥନକୁ ମାର୍ଗଦର୍ଶନ କରିବାରେ "
            "ସାହାଯ୍ୟ କରେ। ନିଷ୍ପତ୍ତି ଏବଂ ଯତ୍ନର ଦାୟିତ୍ୱ ମାନବ ପେସାଦାରଙ୍କ ନିକଟରେ "
            "ରହେ।"
        ),
    },
}


def normalize(language: Optional[str]) -> str:
    """Return a supported language code, defaulting to 'en'."""
    if language in SUPPORTED_LANGUAGES:
        return language
    return "en"


def content(language: Optional[str], key: str) -> str:
    """Look up one content string in the user's language (fallback: en)."""
    return CONTENT[normalize(language)].get(key, CONTENT["en"].get(key, key))


def quick_actions(language: Optional[str]) -> list[dict]:
    """The quick actions for the given language (list of {key,label,prompt})."""
    return list(CONTENT[normalize(language)].get("quick_actions", []))
