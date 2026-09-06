// ============================================================================
// Chrome copy for the beneficiary "Wellbeing & Support" section (STEP 2).
//
// Pattern mirrors src/data/talkI18n.js: per-feature EN/HI/OR dictionaries
// with a `copy(lang, key)` helper that falls back to English. Conversation
// content stays owned by the backend; this module only carries React chrome:
// headings, controls, activity titles/how-tos, status words and notices.
//
// NOTE: The Odia/Hindi copy is prototype-quality for the SIH demonstration —
// a native-speaker review is required before any real deployment (same note
// as the chat i18n in the backend).
// ============================================================================

export const WB_LANGS = ["en", "hi", "or"];
export const WB_LANG_LABELS = { en: "English", hi: "हिंदी", or: "ଓଡ଼ିଆ" };

const CATS = {
  grounding: { en: "Grounding", hi: "ग्राउंडिंग", or: "ଗ୍ରାଉଣ୍ଡିଂ" },
  breathing: { en: "Breathing", hi: "साँस लेना", or: "ଶ୍ୱାସ କ୍ରିୟା" },
  reflection: { en: "Reflection", hi: "आत्मचिंतन", or: "ଆତ୍ମଚିନ୍ତନ" },
  social_connection: { en: "Connection", hi: "जुड़ाव", or: "ଯୋଗାଯୋଗ" },
  routine_self_care: { en: "Daily care", hi: "दैनिक देखभाल", or: "ଦୈନିକ ଯତ୍ନ" },
};

export const categoryLabel = (lang, cat) =>
  CATS[cat]?.[lang] ?? CATS[cat]?.en ?? cat;

const COPY = {
  en: {
    eyebrow: "Beneficiary portal · Wellbeing & Support",
    title: "Your Wellbeing & Support",
    lead:
      "Small, safe ways to care for yourself day to day — chosen for you from how you have been doing. Everything here is yours: your plan, your progress and your private reflections.",
    langLabel: "Language",
    minUnit: "min",

    // 1. Today's wellbeing
    todayTitle: "How are you feeling today?",
    todayLead:
      "A short wellbeing check-in tells your support team how you are doing. It is private, takes about a minute, and you can always skip it.",
    checkinCta: "Complete a check-in",
    talkCta: "Talk it through instead",
    todayPrivacy: "Your check-ins stay yours — only authorised support people can see what they need.",
    todayLoading: "Loading your data…",

    // 2. Support plan
    planTitle: "Your support plan",
    planLead: "Gentle activities picked for you, based on what you have shared. You choose what feels right.",
    planSummaryPrefix: "Today's plan:",
    basis_assessment: "Based on your latest wellbeing review.",
    basis_checkin: "Based on your most recent check-in.",
    basis_none: "Getting started — these ideas are a gentle place to begin.",
    planCompletedCount: "activities completed so far",
    planEmpty: "Your plan is quiet right now — reach out to your support team whenever you like.",
    humanFirstTitle: "A person comes first",
    humanFirstNote:
      "Because things have been very hard lately, talking to a support person is the most helpful step. The ideas below are only to help you settle while you wait.",
    crisisFirstNote:
      "You do not have to handle this alone. Reaching a person now is the most important step — a human being will follow up with you.",
    startActivity: "Start",
    redoActivity: "Do again",
    doneBadge: "Completed",
    completedTodayBadge: "Done today",
    markDone: "I did this",
    planNote:
      "Supportive ideas, not medical advice and not a diagnosis. If things feel very hard, a person is always available.",
    noActivitiesCta: "Talk to a support person",
    nextStepEyebrow: "Suggested next step",
    nextWhy: "Why this step:",

    // Adaptive summary lines (server sends the stable summary_key).
    summary_supportive:
      "Small moments of care can support your wellbeing. Pick one that feels right for today.",
    summary_supportive_easing:
      "Your recent check-ins suggest things are easing. Gentle routines and staying connected can help this steadier feeling settle in.",
    summary_early_support:
      "You have shared that things have felt harder lately. Gentle grounding and staying connected with someone you trust can help — and you can ask for human support any time.",
    summary_human_support:
      "It sounds like a lot is weighing on you right now. Reaching a person is the most helpful step, so human support comes first — the ideas below are only to help you settle while you wait.",
    summary_human_support_easing:
      "Things seem to be easing a little, which is good — and support is still here. A person remains the most helpful step while you settle, at your own pace.",
    summary_crisis:
      "You do not have to handle this alone. Reaching a person now is the most important step, and Sahara's crisis resources are here if you need them.",

    // Plain "why this step" lines.
    reason_grounding:
      "Based on your recent check-ins, Sahara suggests starting with a short grounding exercise.",
    reason_breathing: "A short breathing exercise can help you settle before anything else today.",
    reason_reflection: "A short reflection is a gentle way to notice how you are doing right now.",
    reason_connection: "Connecting with someone you trust can be a small, meaningful next step today.",
    reason_routine: "A small daily-care routine can help steady the day for you.",

    // Gentle, non-gamified completion feedback.
    fb_first: "You took a small, real step for yourself today.",
    fb_steady: "Done at your own pace — that is what matters.",
    fb_here: "A support person is also here whenever you want one.",
    fb_gentle: "Small steps like this add up quietly. Be kind to yourself.",

    // 3. Activity experience
    activityHeading: (t) => t,
    aClose: "Close",
    aNext: "Next",
    aBack: "Back",
    aSkip: "Skip",
    aFinish: "Finish & save",
    aCompleted: "Activity completed — thank you for taking this moment for yourself.",
    aGenericHint: "Read the idea below and try it when you are ready. Nothing here needs to be perfect.",
    sensesTitle: "Noticing five things around you",
    sensesLead: "Take your time with each step. There is no right or wrong answer.",
    senses: [
      "5 things you can see",
      "4 things you can touch",
      "3 things you can hear",
      "2 things you can smell",
      "1 thing you can notice about yourself",
    ],
    breathTitle: "Follow the breath at your own pace",
    breathLead: "Let the circle guide you. If it feels uncomfortable at any point, stop — that is always okay.",
    breathIn: "Breathe in",
    breathHold: "Hold gently",
    breathOut: "Breathe out",
    breathCycle: "round",
    reflectionWrite: "Write one honest sentence about today — it is private, for your eyes only.",
    reflectionSaveAndDone: "Save reflection & mark done",
    reflectionSkipSave: "Skip writing — just mark done",
    activityLoading: "Saving…",

    // 4. Wellbeing progress (plain language — no raw scores)
    progressTitle: "How you've been",
    progressLead: "A calm look at your recent check-ins, in plain words — never numbers.",
    noHistory: "No check-ins yet. Your pattern will appear here after your first check-in.",
    wordStable: "Stable",
    wordImproving: "Improving",
    wordAttention: "Needs attention",
    wordConcern: "Significant concern",
    progressHl: "Lately, you are feeling:",
    checkinsWord: "check-ins",
    progressNote: "This gentle summary comes from your own check-ins. It is not a diagnosis and nothing is decided by it.",
    recentLabel: "Your recent check-ins",
    srProgress: "Recent check-ins summary",

    // 5. Reflection
    reflectionTitle: "A private reflection",
    reflectionPrivacy:
      "What you write here is private to you — it is not shared with your caseworker or shown in any monitoring view.",
    reflectionPlaceholder: "Write whatever is on your mind…",
    reflectionSave: "Save privately",
    reflectionSaved: "Saved privately.",
    reflectionError: "Could not save right now. Please try again.",
    reflectionEmpty: "Write a little something first — even one line is enough.",
    reflectionNone: "Nothing here yet. You can keep a note whenever you want.",
    reflectionRecent: "Your recent reflections",
    reflectionCount: (n) => `${n} reflection${n === 1 ? "" : "s"} kept privately`,

    // 6. Human support
    humanTitle: "Talk to a counsellor",
    humanLead:
      "A real person from the support team will follow up. Requesting support does not change any of your check-in data — it simply asks a human to reach out.",
    humanCta: "Request support now",
    humanRequested: "Request received — a support person will reach out to you.",
    humanPending: "Your request is waiting for a human response.",
    humanHelpline: "Immediate help: call 14566",
    stNone: "No open request",
    stAwaiting: "Requested — waiting for a human response",
    stAction: "A support person has responded",
    stScheduled: "Follow-up scheduled",
    stCompleted: "Follow-up completed",
    stEscalated: "Escalated to senior support",

    // 7. Talk to Sahara (contextual entries into the existing chatbot)
    talkTitle: "Talk to Sahara",
    talkLead: "A safe place to talk, any time — in English, हिंदी or ଓଡ଼ିଆ. A human is always behind it.",
    talkFeel: "Talk about how you're feeling",
    talkFeelQ: "I want to talk about how I am feeling",
    talkCalm: "Help me calm down",
    talkCalmQ: "I need help calming down right now",
    talkPlan: "Help me with today's plan",
    talkPlanQ: "Can you help me with today's wellbeing plan",
    talkOpen: "Open conversation",

    // states
    loading: "Loading…",
    error: "Could not load this right now. Please try again in a moment.",
    retry: "Try again",
    humanInLoop:
      "Sahara's AI helps identify patterns and guide support. Human professionals remain responsible for decisions and care.",
    supportSystemNote:
      "Requests are recorded for the support team. No automatic call is made by the system.",
  },
  hi: {
    eyebrow: "बेनिफिशियरी पोर्टल · वेलबीइंग और सहारा",
    title: "आपकी वेलबीइंग और सहारा",
    lead:
      "अपने दिन-प्रतिदिन की देखभाल के छोटे, सुरक्षित तरीके — आपकी स्थिति के आधार पर चुने गए। यह सब आपका अपना है: आपकी योजना, आपकी प्रगति और आपके निजी विचार।",
    langLabel: "भाषा",
    minUnit: "मिनट",

    todayTitle: "आज आप कैसा महसूस कर रहे हैं?",
    todayLead:
      "एक छोटा वेलबीइंग चेक-इन आपकी सहायता टीम को बताता है कि आप कैसे हैं। यह निजी है, लगभग एक मिनट लगता है, और आप इसे कभी भी छोड़ सकते हैं।",
    checkinCta: "चेक-इन पूरा करें",
    talkCta: "इसके बजाय बात करें",
    todayPrivacy: "आपके चेक-इन आपके अपने रहते हैं — केवल अधिकृत सहायक ही ज़रूरी जानकारी देख सकते हैं।",
    todayLoading: "आपका डेटा लोड हो रहा है…",

    planTitle: "आपकी सहायता योजना",
    planLead: "आपने जो साझा किया उसके आधार पर चुनी गईं सौम्य गतिविधियाँ। जो सही लगे, वही चुनें।",
    planSummaryPrefix: "आज की योजना:",
    basis_assessment: "आपकी नवीनतम वेलबीइंग समीक्षा के आधार पर।",
    basis_checkin: "आपके सबसे हालिया चेक-इन के आधार पर।",
    basis_none: "शुरुआत कर रहे हैं — ये विचार शुरू करने के लिए एक सौम्य जगह हैं।",
    planCompletedCount: "गतिविधियाँ अब तक पूरी हुईं",
    planEmpty: "अभी आपकी योजना शांत है — जब चाहें अपनी सहायता टीम से जुड़ सकते हैं।",
    humanFirstTitle: "पहले एक इंसान",
    humanFirstNote:
      "हाल के दिनों में चीज़ें कठिन रही हैं, इसलिए किसी सहायक से बात करना सबसे उपयोगी कदम है। नीचे के विचार सिर्फ़ इंतज़ार के दौरान शांत रहने में मदद के लिए हैं।",
    crisisFirstNote:
      "आपको यह अकेले नहीं झेलना है। अभी किसी इंसान तक पहुँचना सबसे ज़रूरी कदम है — एक इंसान आपसे संपर्क करेगा।",
    startActivity: "शुरू करें",
    redoActivity: "फिर करें",
    doneBadge: "पूरा हुआ",
    completedTodayBadge: "आज पूरा किया",
    markDone: "मैंने यह किया",
    planNote:
      "ये सहायक विचार हैं — चिकित्सीय सलाह या निदान नहीं। अगर चीज़ें बहुत कठिन लगें, तो एक इंसान हमेशा उपलब्ध है।",
    noActivitiesCta: "किसी सहायक से बात करें",
    nextStepEyebrow: "सुझाया गया अगला कदम",
    nextWhy: "यह कदम क्यों:",

    summary_supportive:
      "देखभाल के छोटे पल आपकी सेहत को सहारा दे सकते हैं। आज जो सही लगे, वही चुनें।",
    summary_supportive_easing:
      "आपके हाल के चेक-इन बताते हैं कि चीज़ें सुधर रही हैं। हल्की दिनचर्या और जुड़ाव इस स्थिरता को बनाए रखने में मदद कर सकते हैं।",
    summary_early_support:
      "हाल के दिनों में चीज़ें कठिन रही हैं। हल्का ग्राउंडिंग और किसी भरोसेमंद से जुड़ाव मदद कर सकता है — और आप कभी भी इंसानी सहारा माँग सकते हैं।",
    summary_human_support:
      "अभी आप पर बहुत कुछ भारी है। किसी इंसान तक पहुँचना सबसे उपयोगी कदम है, इसलिए इंसानी सहारा पहले आता है — नीचे के विचार सिर्फ़ इंतज़ार में शांत रहने के लिए हैं।",
    summary_human_support_easing:
      "चीज़ें थोड़ी सुधर रही हैं — यह अच्छी बात है, और सहारा अब भी यहीं है। अपनी गति से, इंसानी सहारा ही सबसे उपयोगी कदम है।",
    summary_crisis:
      "आपको यह अकेले नहीं झेलना है। अभी किसी इंसान तक पहुँचना सबसे ज़रूरी कदम है — सहारा के संकट-संसाधन यहीं उपलब्ध हैं।",

    reason_grounding:
      "आपके हाल के चेक-इन के आधार पर, सहारा एक छोटी ग्राउंडिंग क्रिया से शुरू करने का सुझाव देता है।",
    reason_breathing: "आज कुछ भी करने से पहले एक छोटी साँस-क्रिया आपको शांत करने में मदद कर सकती है।",
    reason_reflection: "थोड़ा आत्मचिंतन यह देखने का एक सौम्य तरीका है कि आप अभी कैसे हैं।",
    reason_connection: "किसी भरोसेमंद व्यक्ति से जुड़ाव आज एक छोटा, सार्थक अगला कदम हो सकता है।",
    reason_routine: "देखभाल की एक छोटी दैनिक आदत आपके दिन को स्थिर कर सकती है।",

    fb_first: "आज आपने अपने लिए एक छोटा, सच्चा कदम उठाया।",
    fb_steady: "अपनी गति से पूरा किया — यही मायने रखता है।",
    fb_here: "जब चाहें, एक सहायक व्यक्ति भी आपके लिए यहीं है।",
    fb_gentle: "छोटे कदम चुपचाप जुड़ते हैं। खुद के प्रति दयालु रहें।",

    activityHeading: (t) => t,
    aClose: "बंद करें",
    aNext: "आगे",
    aBack: "पीछे",
    aSkip: "छोड़ें",
    aFinish: "पूरा करें और सहेजें",
    aCompleted: "गतिविधि पूरी हुई — अपने लिए यह पल निकालने के लिए धन्यवाद।",
    aGenericHint: "नीचे दिया विचार पढ़ें और तैयार होने पर आज़माएँ। यहाँ कुछ भी परिपूर्ण होना ज़रूरी नहीं है।",
    sensesTitle: "अपने आस-पास पाँच चीज़ें नोटिस करना",
    sensesLead: "हर कदम पर अपना समय लें। कोई सही या ग़लत उत्तर नहीं है।",
    senses: [
      "5 चीज़ें जो आप देख सकते हैं",
      "4 चीज़ें जिन्हें आप छू सकते हैं",
      "3 आवाज़ें जो आप सुन सकते हैं",
      "2 चीज़ें जिनकी खुशबू आप ले सकते हैं",
      "1 चीज़ जो आप अपने बारे में नोटिस कर सकते हैं",
    ],
    breathTitle: "अपनी गति से साँस का साथ दें",
    breathLead: "गोले को मार्गदर्शक बनने दें। अगर कभी असहज लगे तो रोक दें — यह हमेशा सही है।",
    breathIn: "साँस लें",
    breathHold: "हल्के से रोकें",
    breathOut: "साँस छोड़ें",
    breathCycle: "चक्र",
    reflectionWrite: "आज के बारे में एक सच्चा वाक्य लिखें — यह निजी है, सिर्फ़ आपकी आँखों के लिए।",
    reflectionSaveAndDone: "विचार सहेजें और पूरा करें",
    reflectionSkipSave: "लिखना छोड़ें — बस पूरा करें",
    activityLoading: "सहेजा जा रहा है…",

    progressTitle: "हाल के दिन कैसे रहे",
    progressLead: "आपके हाल के चेक-इन पर एक शांत नज़र — सिर्फ़ साधारण शब्दों में, संख्याओं में नहीं।",
    noHistory: "अभी कोई चेक-इन नहीं। पहले चेक-इन के बाद आपका पैटर्न यहाँ दिखेगा।",
    wordStable: "स्थिर",
    wordImproving: "सुधर रहा",
    wordAttention: "ध्यान की ज़रूरत",
    wordConcern: "गंभीर चिंता",
    progressHl: "हाल में आप महसूस कर रहे हैं:",
    checkinsWord: "चेक-इन",
    progressNote: "यह सौम्य सारांश आपके अपने चेक-इन से बनता है। यह निदान नहीं है और इससे कुछ तय नहीं होता।",
    recentLabel: "आपके हाल के चेक-इन",
    srProgress: "हाल के चेक-इन का सारांश",

    reflectionTitle: "एक निजी विचार",
    reflectionPrivacy:
      "आप जो यहाँ लिखते हैं वह आपके लिए निजी है — यह आपके केसवर्कर से साझा नहीं होता और किसी निगरानी दृश्य में नहीं दिखता।",
    reflectionPlaceholder: "जो भी मन में हो, लिखें…",
    reflectionSave: "निजी रूप से सहेजें",
    reflectionSaved: "निजी रूप से सहेज लिया गया।",
    reflectionError: "अभी सहेज नहीं पाए। कृपया फिर कोशिश करें।",
    reflectionEmpty: "पहले कुछ लिखें — एक पंक्ति भी काफ़ी है।",
    reflectionNone: "अभी कुछ नहीं है। जब चाहें अपना एक नोट रख सकते हैं।",
    reflectionRecent: "आपके हाल के विचार",
    reflectionCount: (n) => `${n} विचार निजी रूप से रखे गए`,

    humanTitle: "काउंसलर से बात करें",
    humanLead:
      "सहायता टीम का एक इंसान आपसे संपर्क करेगा। अनुरोध करने से आपके चेक-इन डेटा में कोई बदलाव नहीं आता — यह सिर्फ़ एक इंसान को संपर्क के लिए कहता है।",
    humanCta: "अभी सहारा माँगें",
    humanRequested: "अनुरोध मिल गया — एक सहायक व्यक्ति आपसे संपर्क करेगा।",
    humanPending: "आपका अनुरोध किसी इंसानी जवाब का इंतज़ार कर रहा है।",
    humanHelpline: "तुरंत मदद: 14566 पर कॉल करें",
    stNone: "कोई खुला अनुरोध नहीं",
    stAwaiting: "अनुरोधित — इंसानी जवाब का इंतज़ार",
    stAction: "एक सहायक व्यक्ति ने जवाब दिया है",
    stScheduled: "अनुवर्ती निर्धारित है",
    stCompleted: "अनुवर्ती पूरा हुआ",
    stEscalated: "वरिष्ठ सहायता को भेजा गया",

    talkTitle: "सहारा से बात करें",
    talkLead: "किसी भी समय बात करने की सुरक्षित जगह — English, हिंदी या ଓଡ଼ିଆ में। इसके पीछे हमेशा एक इंसान है।",
    talkFeel: "बताएँ कि आप कैसा महसूस कर रहे हैं",
    talkFeelQ: "मैं बात करना चाहता/चाहती हूँ कि मैं कैसा महसूस कर रहा/रही हूँ",
    talkCalm: "मुझे शांत होने में मदद करें",
    talkCalmQ: "मुझे अभी शांत होने में मदद चाहिए",
    talkPlan: "आज की योजना में मदद करें",
    talkPlanQ: "क्या आप मेरी आज की वेलबीइंग योजना में मदद कर सकते हैं",
    talkOpen: "बातचीत खोलें",

    loading: "लोड हो रहा है…",
    error: "अभी यह लोड नहीं हो पाया। कुछ पल बाद फिर कोशिश करें।",
    retry: "फिर कोशिश करें",
    humanInLoop:
      "सहारा की AI पैटर्न पहचानने और सहारे तक पहुँचाने में मदद करती है। निर्णय और देखभाल की ज़िम्मेदारी मानव पेशेवरों की ही रहती है।",
    supportSystemNote: "अनुरोध सहायता टीम के लिए दर्ज किए जाते हैं। सिस्टम से कोई स्वचालित कॉल नहीं जाती।",
  },
  or: {
    eyebrow: "ଲାଭାର୍ଥୀ ପୋର୍ଟାଲ · କଲ୍ୟାଣ ଓ ସମର୍ଥନ",
    title: "ଆପଣଙ୍କ କଲ୍ୟାଣ ଓ ସମର୍ଥନ",
    lead:
      "ଦୈନନ୍ଦିନ ଯତ୍ନ ପାଇଁ ଛୋଟ, ସୁରକ୍ଷିତ ଉପାୟ — ଆପଣ କେମିତି ରହୁଛନ୍ତି ତାହା ଅନୁସାରେ ବାଛା ହୋଇଥାଏ। ଏଠାରେ ସବୁକିଛି ଆପଣଙ୍କର: ଯୋଜନା, ଅଗ୍ରଗତି ଏବଂ ଗୋପନୀୟ ଭାବନା।",
    langLabel: "ଭାଷା",
    minUnit: "ମିନିଟ୍",

    todayTitle: "ଆଜି ଆପଣ କେମିତି ଅନୁଭବ କରୁଛନ୍ତି?",
    todayLead:
      "ଏକ ଛୋଟ କଲ୍ୟାଣ ଚେକ୍-ଇନ୍ ଆପଣଙ୍କ ସହାୟତା ଟିମ୍କୁ ଜଣାଏ ଆପଣ କେମିତି ଅଛନ୍ତି। ଏହା ଗୋପନୀୟ, ପ୍ରାୟ ଏକ ମିନିଟ୍ ଲାଗେ, ଏବଂ ଆପଣ ଯେତେବେଳେ ଇଚ୍ଛା ଛାଡ଼ିପାରିବେ।",
    checkinCta: "ଚେକ୍-ଇନ୍ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ",
    talkCta: "ଏହା ବଦଳରେ କଥା ହୁଅନ୍ତୁ",
    todayPrivacy: "ଆପଣଙ୍କ ଚେକ୍-ଇନ୍ ଆପଣଙ୍କ ପାଖରେ ରହେ — କେବଳ ଅଧିକୃତ ସହାୟକମାନେ ଆବଶ୍ୟକୀୟ ସୂଚନା ଦେଖନ୍ତି।",
    todayLoading: "ଆପଣଙ୍କ ତଥ୍ୟ ଲୋଡ୍ ହେଉଛି…",

    planTitle: "ଆପଣଙ୍କ ସମର୍ଥନ ଯୋଜନା",
    planLead: "ଆପଣ ଯାହା ବାଣ୍ଟିଛନ୍ତି ତାହା ଅନୁସାରେ ବଛା ହୋଇଥିବା ସୌମ୍ୟ କାର୍ଯ୍ୟ। ଯାହା ଠିକ୍ ଲାଗେ ତାହା ବାଛନ୍ତୁ।",
    planSummaryPrefix: "ଆଜିର ଯୋଜନା:",
    basis_assessment: "ଆପଣଙ୍କ ସାମ୍ପ୍ରତିକ କଲ୍ୟାଣ ସମୀକ୍ଷା ଆଧାରରେ।",
    basis_checkin: "ଆପଣଙ୍କ ସବୁଠାରୁ ନୂଆ ଚେକ୍-ଇନ୍ ଆଧାରରେ।",
    basis_none: "ଆରମ୍ଭ କରୁଛୁ — ଏହି ଧାରଣା ଆରମ୍ଭ ପାଇଁ ଏକ ସୌମ୍ୟ ସ୍ଥାନ।",
    planCompletedCount: "କାର୍ଯ୍ୟ ଏପର୍ଯ୍ୟନ୍ତ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି",
    planEmpty: "ଏବେ ଆପଣଙ୍କ ଯୋଜନା ଶାନ୍ତ ଅଛି — ଇଚ୍ଛା ହେଲେ ଯେକୌଣସି ସମୟରେ ସହାୟତା ଟିମ୍ ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ।",
    humanFirstTitle: "ପ୍ରଥମେ ଜଣେ ମନୁଷ୍ୟ",
    humanFirstNote:
      "ଆଜିକାଲି ବହୁତ କଷ୍ଟ ଚାଲିଛି, ତେଣୁ ଜଣେ ସହାୟକଙ୍କ ସହ କଥା ହେବା ସବୁଠାରୁ ଲାଭଦାୟକ ପଦକ୍ଷେପ। ତଳର ଧାରଣାଗୁଡ଼ିକ କେବଳ ଅପେକ୍ଷା ସମୟରେ ଶାନ୍ତ ରହିବାରେ ସାହାଯ୍ୟ କରେ।",
    crisisFirstNote:
      "ଆପଣଙ୍କୁ ଏହା ଏକୁଟିଆ ସହିବାକୁ ପଡ଼ିବ ନାହିଁ। ଏବେ ଜଣେ ମନୁଷ୍ୟଙ୍କ ନିକଟରେ ପହଞ୍ଚିବା ସବୁଠାରୁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ — ଜଣେ ମନୁଷ୍ୟ ଆପଣଙ୍କ ସହ ଯୋଗାଯୋଗ କରିବେ।",
    startActivity: "ଆରମ୍ଭ କରନ୍ତୁ",
    redoActivity: "ପୁଣି କରନ୍ତୁ",
    doneBadge: "ସମ୍ପୂର୍ଣ୍ଣ",
    completedTodayBadge: "ଆଜି ସରିଛି",
    markDone: "ମୁଁ ଏହା କଲି",
    planNote:
      "ଏହା ସହାୟକ ଧାରଣା — ଡାକ୍ତରୀ ପରାମର୍ଶ କିମ୍ବା ରୋଗ ନିର୍ଣ୍ଣୟ ନୁହେଁ। ଯଦି ବହୁତ କଷ୍ଟ ଲାଗେ, ଜଣେ ମନୁଷ୍ୟ ସବୁବେଳେ ଉପଲବ୍ଧ।",
    noActivitiesCta: "ଜଣେ ସହାୟକଙ୍କ ସହ କଥା ହୁଅନ୍ତୁ",
    nextStepEyebrow: "ପରାମର୍ଶିତ ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ",
    nextWhy: "ଏହି ପଦକ୍ଷେପ କାହିଁକି:",

    summary_supportive:
      "ଯତ୍ନର ଛୋଟ ମୁହୂର୍ତ୍ତ ଆପଣଙ୍କ କଲ୍ୟାଣକୁ ସହାୟକ ହୋଇପାରେ। ଆଜି ଯାହା ଠିକ୍ ଲାଗେ ତାହା ବାଛନ୍ତୁ।",
    summary_supportive_easing:
      "ଆପଣଙ୍କ ସାମ୍ପ୍ରତିକ ଚେକ୍-ଇନ୍ ଦର୍ଶାଏ ଯେ ଉନ୍ନତି ହେଉଛି। ସୌମ୍ୟ ରୁଟିନ୍ ଏବଂ ଯୋଗାଯୋଗ ଏହି ସ୍ଥିରତାକୁ ରଖିବାରେ ସାହାଯ୍ୟ କରିପାରେ।",
    summary_early_support:
      "ଆଜିକାଲି ଜିନିଷ କଷ୍ଟକର ରହିଛି। ସୌମ୍ୟ ଗ୍ରାଉଣ୍ଡିଂ ଏବଂ ଜଣେ ବିଶ୍ୱସ୍ତଙ୍କ ସହ ଯୋଗାଯୋଗ ସାହାଯ୍ୟ କରିପାରେ — ଏବଂ ଆପଣ ଯେକୌଣସି ସମୟରେ ମାନବ ସମର୍ଥନ ମାଗିପାରିବେ।",
    summary_human_support:
      "ଏବେ ଆପଣଙ୍କ ଉପରେ ବହୁତ ବୋଝ ଅଛି। ଜଣେ ମନୁଷ୍ୟଙ୍କ ନିକଟରେ ପହଞ୍ଚିବା ସବୁଠାରୁ ଲାଭଦାୟକ — ତେଣୁ ମାନବ ସମର୍ଥନ ପ୍ରଥମେ ଆସେ; ତଳର ଧାରଣା କେବଳ ଅପେକ୍ଷାରେ ଶାନ୍ତ ରହିବାରେ ସାହାଯ୍ୟ କରେ।",
    summary_human_support_easing:
      "ଜିନିଷ ଟିକେ ଉନ୍ନତ ହେଉଛି — ଭଲ କଥା, ଏବଂ ସମର୍ଥନ ଏବେ ମଧ୍ୟ ଅଛି। ନିଜ ଗତିରେ, ମାନବ ସମର୍ଥନ ହିଁ ସବୁଠାରୁ ସହାୟକ ପଦକ୍ଷେପ।",
    summary_crisis:
      "ଆପଣଙ୍କୁ ଏହା ଏକୁଟିଆ ସହିବାକୁ ପଡ଼ିବ ନାହିଁ। ଏବେ ଜଣେ ମନୁଷ୍ୟଙ୍କ ନିକଟରେ ପହଞ୍ଚିବା ସବୁଠାରୁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ — ସହାରାର ସଙ୍କଟ ସମ୍ବଳ ଏଠାରେ ଅଛି।",

    reason_grounding:
      "ଆପଣଙ୍କ ସାମ୍ପ୍ରତିକ ଚେକ୍-ଇନ୍ ଆଧାରରେ, ସହାରା ଏକ ଛୋଟ ଗ୍ରାଉଣ୍ଡିଂ କ୍ରିୟାରୁ ଆରମ୍ଭ କରିବାକୁ ପରାମର୍ଶ ଦିଏ।",
    reason_breathing: "ଆଜି ଅନ୍ୟ କିଛି ପୂର୍ବରୁ ଏକ ଛୋଟ ଶ୍ୱାସ କ୍ରିୟା ଆପଣଙ୍କୁ ଶାନ୍ତ କରିପାରେ।",
    reason_reflection: "ଟିକେ ଆତ୍ମଚିନ୍ତନ ଆପଣ ଏବେ କେମିତି ଅଛନ୍ତି ଦେଖିବାର ଏକ ସୌମ୍ୟ ଉପାୟ।",
    reason_connection: "ଜଣେ ବିଶ୍ୱସ୍ତ ବ୍ୟକ୍ତିଙ୍କ ସହ ଯୋଗାଯୋଗ ଆଜି ଏକ ଛୋଟ, ସାର୍ଥକ ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ ହୋଇପାରେ।",
    reason_routine: "ଯତ୍ନର ଏକ ଛୋଟ ଦୈନିକ ଅଭ୍ୟାସ ଆପଣଙ୍କ ଦିନକୁ ସ୍ଥିର କରିପାରେ।",

    fb_first: "ଆପଣ ଆଜି ନିଜ ପାଇଁ ଏକ ଛୋଟ, ସତ୍ୟ ପଦକ୍ଷେପ ନେଲେ।",
    fb_steady: "ନିଜ ଗତିରେ ସମ୍ପୂର୍ଣ୍ଣ କଲେ — ତାହା ହିଁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ।",
    fb_here: "ଇଚ୍ଛା କଲେ ଜଣେ ସହାୟକ ବ୍ୟକ୍ତି ମଧ୍ୟ ଆପଣଙ୍କ ପାଇଁ ଏଠାରେ ଅଛନ୍ତି।",
    fb_gentle: "ଛୋଟ ପଦକ୍ଷେପ ଚୁପ୍ ଚୁପ୍ ଯୋଡ଼ି ହୁଏ। ନିଜ ପ୍ରତି ଦୟାଳୁ ହୁଅନ୍ତୁ।",

    activityHeading: (t) => t,
    aClose: "ବନ୍ଦ କରନ୍ତୁ",
    aNext: "ଆଗକୁ",
    aBack: "ପଛକୁ",
    aSkip: "ଛାଡ଼ନ୍ତୁ",
    aFinish: "ଶେଷ କରି ସଞ୍ଚୟ କରନ୍ତୁ",
    aCompleted: "କାର୍ଯ୍ୟ ସମ୍ପୂର୍ଣ୍ଣ — ନିଜ ପାଇଁ ସମୟ ଦେବା ପାଇଁ ଧନ୍ୟବାଦ।",
    aGenericHint: "ତଳର ଧାରଣା ପଢ଼ନ୍ତୁ ଏବଂ ପ୍ରସ୍ତୁତ ହେଲେ ଚେଷ୍ଟା କରନ୍ତୁ। ଏଠାରେ ସବୁକିଛି ସିଦ୍ଧ ହେବା ଆବଶ୍ୟକ ନାହିଁ।",
    sensesTitle: "ଆଖପାଖ ପାଞ୍ଚଟି ଜିନିଷ ଲକ୍ଷ୍ୟ କରିବା",
    sensesLead: "ପ୍ରତ୍ୟେକ ପାଦରେ ସମୟ ନିଅନ୍ତୁ। କୌଣସି ଠିକ୍ କିମ୍ବା ଭୁଲ ଉତ୍ତର ନାହିଁ।",
    senses: [
      "5 ଟି ଜିନିଷ ଯାହା ଆପଣ ଦେଖିପାରିବେ",
      "4 ଟି ଜିନିଷ ଯାହାକୁ ଆପଣ ଛୁଇଁପାରିବେ",
      "3 ଟି ଶବ୍ଦ ଯାହା ଆପଣ ଶୁଣିପାରିବେ",
      "2 ଟି ଜିନିଷର ଗନ୍ଧ ଆପଣ ନେଇପାରିବେ",
      "1 ଟି ଜିନିଷ ଯାହା ଆପଣ ନିଜ ବିଷୟରେ ଲକ୍ଷ୍ୟ କରିପାରିବେ",
    ],
    breathTitle: "ନିଜ ଗତିରେ ଶ୍ୱାସର ସାଥ ଦିଅନ୍ତୁ",
    breathLead: "ବୃତ୍ତକୁ ମାର୍ଗଦର୍ଶକ କରନ୍ତୁ। ଯଦି କୌଣସି ସମୟରେ ଅସହଜ ଲାଗେ, ବନ୍ଦ କରିଦିଅନ୍ତୁ — ଏହା ସର୍ବଦା ଠିକ୍।",
    breathIn: "ଶ୍ୱାସ ନିଅନ୍ତୁ",
    breathHold: "ଧୀରେ ଅଟକାନ୍ତୁ",
    breathOut: "ଶ୍ୱାସ ଛାଡ଼ନ୍ତୁ",
    breathCycle: "ଚକ୍ର",
    reflectionWrite: "ଆଜି ବିଷୟରେ ଗୋଟିଏ ସତ୍ୟ ବାକ୍ୟ ଲେଖନ୍ତୁ — ଏହା ଗୋପନୀୟ, କେବଳ ଆପଣଙ୍କ ପାଇଁ।",
    reflectionSaveAndDone: "ଭାବନା ସଞ୍ଚୟ କରି ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ",
    reflectionSkipSave: "ଲେଖିବା ଛାଡ଼ନ୍ତୁ — କେବଳ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ",
    activityLoading: "ସଞ୍ଚୟ ହେଉଛି…",

    progressTitle: "ଆପଣ କେମିତି ରହୁଛନ୍ତି",
    progressLead: "ଆପଣଙ୍କ ସାମ୍ପ୍ରତିକ ଚେକ୍-ଇନ୍ ଉପରେ ଏକ ଶାନ୍ତ ନଜର — କେବଳ ସରଳ ଶବ୍ଦରେ, ସଂଖ୍ୟାରେ ନୁହେଁ।",
    noHistory: "ଏବେ କୌଣସି ଚେକ୍-ଇନ୍ ନାହିଁ। ପ୍ରଥମ ଚେକ୍-ଇନ୍ ପରେ ଆପଣଙ୍କ ଢାଞ୍ଚା ଏଠାରେ ଦେଖାଯିବ।",
    wordStable: "ସ୍ଥିର",
    wordImproving: "ଉନ୍ନତି ହେଉଛି",
    wordAttention: "ଧ୍ୟାନ ଦରକାର",
    wordConcern: "ଗମ୍ଭୀର ଚିନ୍ତା",
    progressHl: "ସାମ୍ପ୍ରତିକ ଭାବେ ଆପଣ ଅନୁଭବ କରୁଛନ୍ତି:",
    checkinsWord: "ଚେକ୍-ଇନ୍",
    progressNote: "ଏହି ସୌମ୍ୟ ସାରାଂଶ ଆପଣଙ୍କ ନିଜ ଚେକ୍-ଇନ୍ ରୁ ତିଆରି। ଏହା ରୋଗ ନିର୍ଣ୍ଣୟ ନୁହେଁ ଏବଂ ଏହାଦ୍ୱାରା କିଛି ସ୍ଥିର ହୁଏ ନାହିଁ।",
    recentLabel: "ଆପଣଙ୍କ ସାମ୍ପ୍ରତିକ ଚେକ୍-ଇନ୍",
    srProgress: "ସାମ୍ପ୍ରତିକ ଚେକ୍-ଇନ୍ ସାରାଂଶ",

    reflectionTitle: "ଏକ ଗୋପନୀୟ ଭାବନା",
    reflectionPrivacy:
      "ଆପଣ ଏଠାରେ ଯାହା ଲେଖନ୍ତି ତାହା ଆପଣଙ୍କ ପାଇଁ ଗୋପନୀୟ — ଏହା ଆପଣଙ୍କ କେସୱାର୍କରଙ୍କ ସହ ବାଣ୍ଟାଯାଏ ନାହିଁ ଏବଂ କୌଣସି ମନିଟରିଂ ଦୃଶ୍ୟରେ ଦେଖାଯାଏ ନାହିଁ।",
    reflectionPlaceholder: "ମନରେ ଯାହା ଅଛି ଲେଖନ୍ତୁ…",
    reflectionSave: "ଗୋପନୀୟ ଭାବେ ସଞ୍ଚୟ କରନ୍ତୁ",
    reflectionSaved: "ଗୋପନୀୟ ଭାବେ ସଞ୍ଚୟ ହେଲା।",
    reflectionError: "ଏବେ ସଞ୍ଚୟ ହେଲା ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।",
    reflectionEmpty: "ପ୍ରଥମେ କିଛି ଲେଖନ୍ତୁ — ଗୋଟିଏ ଧାଡ଼ି ମଧ୍ୟ ଯଥେଷ୍ଟ।",
    reflectionNone: "ଏବେ କିଛି ନାହିଁ। ଇଚ୍ଛା ହେଲେ ଯେକୌଣସି ସମୟରେ ନିଜର ଏକ ନୋଟ୍ ରଖିପାରିବେ।",
    reflectionRecent: "ଆପଣଙ୍କ ସାମ୍ପ୍ରତିକ ଭାବନା",
    reflectionCount: (n) => `${n} ଭାବନା ଗୋପନୀୟ ଭାବେ ରଖାଯାଇଛି`,

    humanTitle: "କାଉନସେଲରଙ୍କ ସହ କଥା ହୁଅନ୍ତୁ",
    humanLead:
      "ସହାୟତା ଟିମର ଜଣେ ବ୍ୟକ୍ତି ଆପଣଙ୍କ ସହ ଯୋଗାଯୋଗ କରିବେ। ଅନୁରୋଧ କଲେ ଆପଣଙ୍କ ଚେକ୍-ଇନ୍ ତଥ୍ୟରେ କିଛି ବଦଳେ ନାହିଁ — ଏହା କେବଳ ଜଣେ ମନୁଷ୍ୟଙ୍କୁ ପହଞ୍ଚିବାକୁ କହେ।",
    humanCta: "ଏବେ ସମର୍ଥନ ମାଗନ୍ତୁ",
    humanRequested: "ଅନୁରୋଧ ମିଳିଲା — ଜଣେ ସହାୟକ ବ୍ୟକ୍ତି ଆପଣଙ୍କ ସହ ଯୋଗାଯୋଗ କରିବେ।",
    humanPending: "ଆପଣଙ୍କ ଅନୁରୋଧ ମାନବ ଉତ୍ତର ଅପେକ୍ଷାରେ ଅଛି।",
    humanHelpline: "ତୁରନ୍ତ ସାହାଯ୍ୟ: 14566 କୁ କଲ୍ କରନ୍ତୁ",
    stNone: "କୌଣସି ଖୋଲା ଅନୁରୋଧ ନାହିଁ",
    stAwaiting: "ଅନୁରୋଧ ହୋଇଛି — ମାନବ ଉତ୍ତର ଅପେକ୍ଷାରେ",
    stAction: "ଜଣେ ସହାୟକ ବ୍ୟକ୍ତି ଉତ୍ତର ଦେଇଛନ୍ତି",
    stScheduled: "ଅନୁସରଣ ନିର୍ଦ୍ଧାରିତ ହୋଇଛି",
    stCompleted: "ଅନୁସରଣ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି",
    stEscalated: "ବରିଷ୍ଠ ସହାୟତାକୁ ପଠାଯାଇଛି",

    talkTitle: "ସହାରା ସହ କଥା ହୁଅନ୍ତୁ",
    talkLead: "ଯେକୌଣସି ସମୟରେ କଥା ହେବା ପାଇଁ ସୁରକ୍ଷିତ ସ୍ଥାନ — English, हिंदी କିମ୍ବା ଓଡ଼ିଆରେ। ଏହା ପଛରେ ସର୍ବଦା ଜଣେ ମନୁଷ୍ୟ ଅଛନ୍ତି।",
    talkFeel: "କେମିତି ଅନୁଭବ କରୁଛନ୍ତି ସେ ବିଷୟରେ କୁହନ୍ତୁ",
    talkFeelQ: "ମୁଁ କେମିତି ଅନୁଭବ କରୁଛି ସେ ବିଷୟରେ କଥା ହେବାକୁ ଚାହୁଁଛି",
    talkCalm: "ମୋତେ ଶାନ୍ତ ହେବାରେ ସାହାଯ୍ୟ କରନ୍ତୁ",
    talkCalmQ: "ମୋତେ ଏବେ ଶାନ୍ତ ହେବାରେ ସାହାଯ୍ୟ ଦରକାର",
    talkPlan: "ଆଜିର ଯୋଜନାରେ ସାହାଯ୍ୟ କରନ୍ତୁ",
    talkPlanQ: "ଆପଣ କ'ଣ ମୋର ଆଜିର କଲ୍ୟାଣ ଯୋଜନାରେ ସାହାଯ୍ୟ କରିପାରିବେ",
    talkOpen: "ବାର୍ତ୍ତାଳାପ ଖୋଲନ୍ତୁ",

    loading: "ଲୋଡ୍ ହେଉଛି…",
    error: "ଏବେ ଏହା ଲୋଡ୍ ହେଲା ନାହିଁ। କିଛି କ୍ଷଣ ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।",
    retry: "ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ",
    humanInLoop:
      "ସହାରାର AI ଢାଞ୍ଚା ଚିହ୍ନଟ କରିବା ଏବଂ ସମର୍ଥନକୁ ମାର୍ଗଦର୍ଶନ କରିବାରେ ସାହାଯ୍ୟ କରେ। ନିଷ୍ପତ୍ତି ଏବଂ ଯତ୍ନର ଦାୟିତ୍ୱ ମାନବ ପେସାଦାରଙ୍କ ନିକଟରେ ରହେ।",
    supportSystemNote: "ଅନୁରୋଧ ସହାୟତା ଟିମ୍ ପାଇଁ ଦାଖଲ ହୁଏ। ସିଷ୍ଟମରୁ କୌଣସି ସ୍ୱୟଂଚାଳିତ କଲ୍ ଯାଏ ନାହିଁ।",
  },
};

export const copy = (lang, key) => {
  const val = COPY[lang]?.[key];
  if (typeof val === "function") return val;
  return val ?? COPY.en[key] ?? key;
};

// ---------------------------------------------------------------------------
// Activity localisation — title + one-line how-to for every catalogue id.
// English comes from the backend catalogue (services/wellbeing_service.py);
// this map provides the HI/OR titles/how-tos (and re-states EN titles for
// the interactive modals, which the backend does not localise yet).
// ---------------------------------------------------------------------------
export const ACTIVITY_COPY = {
  grounding_54321: {
    en: { t: "Notice five things around you", d: "5 things you can see · 4 you can touch · 3 you can hear · 2 you can smell · 1 about yourself." },
    hi: { t: "अपने आस-पास पाँच चीज़ें देखें", d: "5 देखें · 4 छुएँ · 3 सुनें · 2 सूँघें · 1 अपने बारे में।" },
    or: { t: "ଆଖପାଖ ପାଞ୍ଚଟି ଜିନିଷ ଦେଖନ୍ତୁ", d: "5 ଦେଖନ୍ତୁ · 4 ଛୁଅନ୍ତୁ · 3 ଶୁଣନ୍ତୁ · 2 ଗନ୍ଧ ନିଅନ୍ତୁ · 1 ନିଜ ବିଷୟରେ।" },
  },
  grounding_feet_floor: {
    en: { t: "Feel your feet on the ground", d: "Sit comfortably and press your feet into the floor. Notice the support beneath you." },
    hi: { t: "अपने पैर ज़मीन पर महसूस करें", d: "आराम से बैठें और पैरों को फ़र्श पर टिकाएँ। नीचे का सहारा महसूस करें।" },
    or: { t: "ଗୋଡ଼ ଭୂମିରେ ଅନୁଭବ କରନ୍ତୁ", d: "ଆରାମରେ ବସି ଗୋଡ଼ ତଳେ ରଖନ୍ତୁ। ତଳର ସାହାରା ଅନୁଭବ କରନ୍ତୁ।" },
  },
  grounding_notice_now: {
    en: { t: "Name one thing right now", d: "Pause and name one thing you see, one you hear, and one you feel in your body." },
    hi: { t: "अभी एक चीज़ का नाम लें", d: "रुकें — एक चीज़ जो दिखे, एक जो सुनाई दे, और एक जो शरीर में महसूस हो।" },
    or: { t: "ଏବେ ଗୋଟିଏ ଜିନିଷର ନାମ ନିଅନ୍ତୁ", d: "ରୁକି ଗୋଟିଏ ଦେଖା, ଗୋଟିଏ ଶୁଣା ଏବଂ ଗୋଟିଏ ଶରୀରରେ ଅନୁଭୂତ ଜିନିଷର ନାମ ନିଅନ୍ତୁ।" },
  },
  breathing_box: {
    en: { t: "Box breathing", d: "Breathe in for 4, hold for 4, out for 4, hold for 4. Repeat slowly." },
    hi: { t: "बॉक्स साँस", d: "4 तक साँस लें, 4 रोकें, 4 छोड़ें, 4 रोकें। धीरे-धीरे दोहराएँ।" },
    or: { t: "ବକ୍ସ ଶ୍ୱାସ", d: "4 ପର୍ଯ୍ୟନ୍ତ ଶ୍ୱାସ ନିଅନ୍ତୁ, 4 ଅଟକାନ୍ତୁ, 4 ଛାଡ଼ନ୍ତୁ, 4 ଅଟକାନ୍ତୁ। ଧୀରେ ଦୋହରାନ୍ତୁ।" },
  },
  breathing_478: {
    en: { t: "Long, slow exhale", d: "Breathe in for 4 counts and breathe out slowly for 7–8 counts." },
    hi: { t: "लंबी, धीमी साँस छोड़ना", d: "4 तक साँस लें और 7–8 तक धीरे-धीरे छोड़ें।" },
    or: { t: "ଲମ୍ବା, ଧୀର ଶ୍ୱାସ ତ୍ୟାଗ", d: "4 ପର୍ଯ୍ୟନ୍ତ ଶ୍ୱାସ ନିଅନ୍ତୁ ଏବଂ 7–8 ପର୍ଯ୍ୟନ୍ତ ଧୀରେ ଛାଡ଼ନ୍ତୁ।" },
  },
  breathing_belly: {
    en: { t: "Soft belly breathing", d: "Place a hand on your stomach and let it rise gently as you breathe in and fall as you breathe out." },
    hi: { t: "हल्की पेट-साँस", d: "हाथ पेट पर रखें — साँस लेने पर हाथ धीरे से ऊपर और छोड़ने पर नीचे।" },
    or: { t: "କୋମଳ ପେଟ ଶ୍ୱାସ", d: "ପେଟରେ ହାତ ରଖନ୍ତୁ — ଶ୍ୱାସ ନେଲେ ଉଠେ, ଛାଡ଼ିଲେ ତଳକୁ ଆସେ।" },
  },
  reflection_three_good: {
    en: { t: "Three small good moments", d: "Recall three small moments from today that were okay or good — a warm drink, a kind word, a rest." },
    hi: { t: "तीन छोटे अच्छे पल", d: "आज के तीन छोटे ठीक या अच्छे पल याद करें — गर्म चाय, एक दयालु शब्द, थोड़ा आराम।" },
    or: { t: "ତିନୋଟି ଛୋଟ ଭଲ ମୁହୂର୍ତ୍ତ", d: "ଆଜିର ତିନୋଟି ଛୋଟ ଭଲ କ୍ଷଣ ମନେ ପକାନ୍ତୁ — ଗରମ ପାନୀୟ, ଦୟାଳୁ କଥା, ବିଶ୍ରାମ।" },
  },
  reflection_one_sentence: {
    en: { t: "One sentence about today", d: "Write one honest sentence about how today was — you can save it as a private reflection." },
    hi: { t: "आज के बारे में एक वाक्य", d: "आज कैसा रहा, एक सच्चा वाक्य लिखें — इसे निजी विचार के रूप में सहेज सकते हैं।" },
    or: { t: "ଆଜି ବିଷୟରେ ଗୋଟିଏ ବାକ୍ୟ", d: "ଆଜି କେମିତି ଥିଲା — ଗୋଟିଏ ସତ୍ୟ ବାକ୍ୟ ଲେଖନ୍ତୁ; ଏହାକୁ ଗୋପନୀୟ ଭାବନା ଭାବେ ସଞ୍ଚୟ କରିପାରିବେ।" },
  },
  reflection_kind_to_self: {
    en: { t: "A kind word to yourself", d: "Say to yourself the kind thing you would say to a friend who had your day." },
    hi: { t: "खुद के लिए एक दयालु शब्द", d: "जो दयालु बात आप किसी मित्र से कहते, वही आज खुद से कहें।" },
    or: { t: "ନିଜ ପାଇଁ ଗୋଟିଏ ଦୟାଳୁ କଥା", d: "ଯାହା ଆପଣ ଜଣେ ବନ୍ଧୁଙ୍କୁ କହିଥାନ୍ତେ, ସେହି ଦୟାଳୁ କଥା ନିଜକୁ କୁହନ୍ତୁ।" },
  },
  connection_trusted_message: {
    en: { t: "Message one trusted person", d: "Send a short message to someone you trust — even a simple 'I was thinking of you'." },
    hi: { t: "किसी भरोसेमंद व्यक्ति को संदेश", d: "किसी भरोसेमंद को छोटा-सा संदेश भेजें — बस 'मैं आपको याद कर रहा/रही थी'।" },
    or: { t: "ଜଣେ ବିଶ୍ୱସ୍ତ ବ୍ୟକ୍ତିଙ୍କୁ ବାର୍ତ୍ତା", d: "ଜଣେ ବିଶ୍ୱସ୍ତଙ୍କୁ ଛୋଟ ବାର୍ତ୍ତା ପଠାନ୍ତୁ — ଯେପରି 'ତୁମକୁ ମନେ ପକାଉଥିଲି'।" },
  },
  connection_ask_company: {
    en: { t: "Ask for company", d: "Tell one trusted person you would value some company — a walk, a call, or sitting together." },
    hi: { t: "साथ माँगें", d: "किसी भरोसेमंद से कहें कि आपको साथ अच्छा लगेगा — सैर, कॉल या बैठना।" },
    or: { t: "ସାଥୀ ମାଗନ୍ତୁ", d: "ଜଣେ ବିଶ୍ୱସ୍ତଙ୍କୁ କୁହନ୍ତୁ ଆପଣ ସାଥ୍ ଚାହାନ୍ତି — ବୁଲା, କଲ୍ କିମ୍ବା ଏକାଠି ବସିବା।" },
  },
  connection_plan_call: {
    en: { t: "Plan a call with someone safe", d: "Choose a person you trust and a time to call them. Write the plan down." },
    hi: { t: "किसी सुरक्षित व्यक्ति से कॉल की योजना", d: "भरोसेमंद व्यक्ति और समय चुनें। योजना लिख लें।" },
    or: { t: "ଜଣେ ନିରାପଦ ବ୍ୟକ୍ତିଙ୍କ ସହ କଲ୍ ଯୋଜନା", d: "ବିଶ୍ୱସ୍ତ ବ୍ୟକ୍ତି ଏବଂ ସମୟ ବାଛନ୍ତୁ। ଯୋଜନା ଲେଖି ରଖନ୍ତୁ।" },
  },
  routine_fresh_air: {
    en: { t: "A few minutes outside", d: "Step outside for a short while if you can — fresh air from a place you feel safe." },
    hi: { t: "कुछ मिनट बाहर", d: "हो सके तो थोड़ी देर बाहर जाएँ — ऐसी जगह से जहाँ आप सुरक्षित महसूस करें।" },
    or: { t: "କିଛି ମିନିଟ୍ ବାହାରେ", d: "ସମ୍ଭବ ହେଲେ କିଛି ସମୟ ବାହାରେ ଯାଆନ୍ତୁ — ସୁରକ୍ଷିତ ସ୍ଥାନର ତାଜା ପବନ।" },
  },
  routine_meal_hydration: {
    en: { t: "A small meal and water", d: "Have a regular small meal and a glass of water now, even if you don't feel hungry." },
    hi: { t: "थोड़ा भोजन और पानी", d: "भूख न लगे तो भी अभी थोड़ा-सा खाना और एक गिलास पानी लें।" },
    or: { t: "ଟିକେ ଖାଦ୍ୟ ଓ ପାଣି", d: "ଭୋକ ନଲାଗିଲେ ମଧ୍ୟ ଏବେ ଟିକେ ଖାଆନ୍ତୁ ଏବଂ ଗୋଟିଏ ଗିଲାସ ପାଣି ପିଅନ୍ତୁ।" },
  },
  routine_winddown: {
    en: { t: "Slow down before sleep", d: "For 15 minutes before bed, lower the lights and do one calm thing — no phone if you can." },
    hi: { t: "सोने से पहले धीमा हो जाएँ", d: "सोने से 15 मिनट पहले रोशनी कम करें और एक शांत काम करें — हो सके तो फ़ोन नहीं।" },
    or: { t: "ଶୋଇବା ପୂର୍ବରୁ ଧୀର ହୁଅନ୍ତୁ", d: "ଶୋଇବାର 15 ମିନିଟ୍ ପୂର୍ବରୁ ଆଲୁଅ କମାନ୍ତୁ ଏବଂ ଗୋଟିଏ ଶାନ୍ତ କାମ କରନ୍ତୁ — ସମ୍ଭବ ହେଲେ ଫୋନ୍ ନୁହେଁ।" },
  },
  routine_tidy_corner: {
    en: { t: "Tidy one small space", d: "Tidy one small corner — a table, a shelf. Small order can feel grounding." },
    hi: { t: "एक छोटी-सी जगह साफ़ करें", d: "एक छोटा कोना साफ़ करें — मेज़ या शेल्फ़। छोटी व्यवस्था से मन शांत होता है।" },
    or: { t: "ଗୋଟିଏ ଛୋଟ ସ୍ଥାନ ସଜାଡ଼ନ୍ତୁ", d: "ଗୋଟିଏ ଛୋଟ କୋଣ ସଜାଡ଼ନ୍ତୁ — ଟେବୁଲ କିମ୍ବା ସେଲ୍ଫ। ଛୋଟ ସଜାଡ଼ ମନକୁ ସ୍ଥିର କରେ।" },
  },
  routine_comfort_music: {
    en: { t: "Listen to something comforting", d: "Play music or a voice that comforts you, and let yourself listen without doing anything else." },
    hi: { t: "कुछ सुकून देने वाला सुनें", d: "कोई ऐसा संगीत या आवाज़ चलाएँ जो सुकून दे, और बिना कुछ और किए सुनें।" },
    or: { t: "କିଛି ଆରାମଦାୟକ ଶୁଣନ୍ତୁ", d: "ଯେଉଁ ସଙ୍ଗୀତ କିମ୍ବା କଣ୍ଠ ଆରାମ ଦିଏ ଚଳାନ୍ତୁ, ଏବଂ ଆଉ କିଛି ନକରି ଶୁଣନ୍ତୁ।" },
  },
};

export const activityCopy = (lang, id, backendTitle) => {
  const entry = ACTIVITY_COPY[id];
  if (!entry) return { t: backendTitle || id, d: "" };
  const row = entry[lang] || entry.en;
  return { t: row.t, d: row.d };
};
