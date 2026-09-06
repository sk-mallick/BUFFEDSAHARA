// ============================================================================
// Client chrome copy for the "Talk to Sahara" portal page.
//
// The CONVERSATION content (welcome, quick actions, crisis copy, check-in
// prompts) comes from the backend's services/chat_i18n.py — the server is
// the language authority for everything the assistant says. This module
// only carries page chrome that lives in React: titles, the composer,
// controls, statuses, and the message the page shows after a human-support
// request or a deletion. Keep these keys mirrored in backend content where
// the same sentence exists in both places.
// ============================================================================

export const CHAT_LANGS = ["en", "hi", "or"];

export const LANG_LABELS = { en: "English", hi: "हिंदी", or: "ଓଡ଼ିଆ" };

export const COPY = {
  en: {
    eyebrow: "Beneficiary portal · Talk to Sahara",
    title: "A safe place to talk.",
    lead:
      "Share how you are doing, find support, or ask about available resources — in English, हिंदी or ଓଡ଼ିଆ. Sahara is a bridge to human support, never a replacement for it.",
    langLabel: "Language",
    placeholder: "Type a message…",
    send: "Send message",
    humanCta: "Talk to a person",
    humanRequested: "Human support requested — the support team will reach out.",
    deleteLabel: "Delete this conversation",
    deleteConfirm: "Delete this conversation? This removes it for real — there is no undo.",
    deleted: "Your conversation has been deleted.",
    demoNote:
      "Demo mode — these sample replies are deterministic and clearly not live AI output.",
    aiNote:
      "Sahara's AI helps identify patterns and guide support. Human professionals remain responsible for decisions and care.",
    loading: "Opening your conversation…",
    connected: "Connected · conversation stays private to you",
    privacy:
      "Your conversation is separate from the administrative monitoring view. Only information needed for your support workflow is shared with authorised personnel — and you can delete it any time.",
    error:
      "I am sorry, I could not respond right now. Please try again, or call 14566 for immediate support.",
    you: "You",
  },
  hi: {
    eyebrow: "बेनिफिशियरी पोर्टल · सहारा से बात करें",
    title: "बात करने के लिए एक सुरक्षित जगह।",
    lead:
      "बताएँ कि आप कैसा महसूस कर रहे हैं, सहारा पाएँ, या उपलब्ध मदद के बारे में पूछें — English, हिंदी या ଓଡ଼ିଆ में। सहारा मानव सहायता का पुल है, उसका विकल्प नहीं।",
    langLabel: "भाषा",
    placeholder: "संदेश लिखें…",
    send: "संदेश भेजें",
    humanCta: "किसी इंसान से बात करें",
    humanRequested: "मानव सहारे का अनुरोध किया गया — सहायता टीम आपसे संपर्क करेगी।",
    deleteLabel: "यह बातचीत हटाएँ",
    deleteConfirm: "यह बातचीत हटाएँ? यह स्थायी रूप से हट जाएगी — इसे वापस नहीं लाया जा सकता।",
    deleted: "आपकी बातचीत हटा दी गई है।",
    demoNote:
      "डेमो मोड — ये नमूना उत्तर निर्धारित हैं और स्पष्ट रूप से वास्तविक AI आउटपुट नहीं हैं।",
    aiNote:
      "सहारा की AI पैटर्न पहचानने और सहारे तक पहुँचाने में मदद करती है। निर्णय और देखभाल की ज़िम्मेदारी मानव पेशेवरों की ही रहती है।",
    loading: "आपकी बातचीत खुल रही है…",
    connected: "जुड़ा हुआ · बातचीत आपके लिए निजी रहती है",
    privacy:
      "आपकी बातचीत प्रशासनिक निगरानी दृश्य से अलग रहती है। आपके समर्थन कार्य के लिए ज़रूरी जानकारी ही अधिकृत कर्मियों के साथ साझा होती है — और आप इसे किसी भी समय हटा सकते हैं।",
    error:
      "माफ़ कीजिए, अभी मैं जवाब नहीं दे पाई। कृपया फिर कोशिश करें, या तुरंत मदद के लिए 14566 पर कॉल करें।",
    you: "आप",
  },
  or: {
    eyebrow: "ଲାଭାର୍ଥୀ ପୋର୍ଟାଲ · ସହାରା ସହ କଥା ହୁଅନ୍ତୁ",
    title: "କଥା ହେବା ପାଇଁ ଏକ ସୁରକ୍ଷିତ ସ୍ଥାନ।",
    lead:
      "ଆପଣ କେମିତି ଅନୁଭବ କରୁଛନ୍ତି କୁହନ୍ତୁ, ସମର୍ଥନ ପାଆନ୍ତୁ, କିମ୍ବା ଉପଲବ୍ଧ ସାହାଯ୍ୟ ବିଷୟରେ ପଚାରନ୍ତୁ — English, हिंदी କିମ୍ବା ଓଡ଼ିଆରେ। ସହାରା ମାନବ ସମର୍ଥନର ଏକ ସେତୁ, ବିକଳ୍ପ ନୁହେଁ।",
    langLabel: "ଭାଷା",
    placeholder: "ଏକ ବାର୍ତ୍ତା ଲେଖନ୍ତୁ…",
    send: "ବାର୍ତ୍ତା ପଠାନ୍ତୁ",
    humanCta: "ଜଣେ ମନୁଷ୍ୟଙ୍କ ସହ କଥା ହୁଅନ୍ତୁ",
    humanRequested: "ମାନବ ସମର୍ଥନ ଅନୁରୋଧ ହୋଇଛି — ସହାୟତା ଟିମ୍ ଯୋଗାଯୋଗ କରିବ।",
    deleteLabel: "ଏହି ବାର୍ତ୍ତାଳାପ ହଟାନ୍ତୁ",
    deleteConfirm:
      "ଏହି ବାର୍ତ୍ତାଳାପ ହଟାଇବେ? ଏହା ସବୁଦିନ ପାଇଁ ହଟିଯିବ — ଫେରାଇ ହେବ ନାହିଁ।",
    deleted: "ଆପଣଙ୍କ ବାର୍ତ୍ତାଳାପ ହଟାଇ ଦିଆଯାଇଛି।",
    demoNote:
      "ଡେମୋ ମୋଡ୍ — ଏହି ନମୁନା ଉତ୍ତର ନିର୍ଦ୍ଧାରିତ ଏବଂ ସ୍ପଷ୍ଟ ଭାବେ ପ୍ରକୃତ AI ଆଉଟପୁଟ୍ ନୁହେଁ।",
    aiNote:
      "ସହାରାର AI ଢାଞ୍ଚା ଚିହ୍ନଟ କରିବା ଏବଂ ସମର୍ଥନକୁ ମାର୍ଗଦର୍ଶନ କରିବାରେ ସାହାଯ୍ୟ କରେ। ନିଷ୍ପତ୍ତି ଏବଂ ଯତ୍ନର ଦାୟିତ୍ୱ ମାନବ ପେସାଦାରଙ୍କ ନିକଟରେ ରହେ।",
    loading: "ଆପଣଙ୍କ ବାର୍ତ୍ତାଳାପ ଖୋଲୁଛି…",
    connected: "ସଂଯୋଗ ହେଲା · ବାର୍ତ୍ତାଳାପ ଆପଣଙ୍କ ପାଇଁ ଗୋପନୀୟ ରହେ",
    privacy:
      "ଆପଣଙ୍କ ବାର୍ତ୍ତାଳାପ ପ୍ରଶାସନିକ ମନିଟରିଂ ଦୃଶ୍ୟଠାରୁ ଅଲଗା ରହେ। ଆପଣଙ୍କ ସମର୍ଥନ ପାଇଁ ଆବଶ୍ୟକ ସୂଚନା ହିଁ ଅଧିକୃତ କର୍ମଚାରୀଙ୍କ ସହ ସେୟାର ହୁଏ — ଏବଂ ଆପଣ ଏହାକୁ ଯେକୌଣସି ସମୟରେ ହଟାଇ ପାରିବେ।",
    error:
      "କ୍ଷମା କରନ୍ତୁ, ମୁଁ ଏବେ ଉତ୍ତର ଦେଇପାରିଲି ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ, କିମ୍ବା ତୁରନ୍ତ ସାହାଯ୍ୟ ପାଇଁ 14566 ରେ କଲ୍ କରନ୍ତୁ।",
    you: "ଆପଣ",
  },
};

export const copy = (lang, key) => COPY[lang]?.[key] ?? COPY.en[key] ?? key;

// Quick-answer options for the guided check-in, localised.
// Keep these in sync with the backend parsers in routers/chat.py.
export const CHECKIN_OPTIONS = {
  mood: { kind: "scale", options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
  sleep: { kind: "scale", options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
  safe: {
    kind: "pick",
    options: {
      en: ["Yes", "No", "Sometimes"],
      hi: ["हाँ", "नहीं", "कभी-कभी"],
      or: ["ହଁ", "ନାହିଁ", "ବେଳେବେଳେ"],
    },
  },
  incident: {
    kind: "pick",
    options: {
      en: ["Yes", "No"],
      hi: ["हाँ", "नहीं"],
      or: ["ହଁ", "ନାହିଁ"],
    },
  },
  support: {
    kind: "pick",
    options: {
      en: ["Yes", "No"],
      hi: ["हाँ", "नहीं"],
      or: ["ହଁ", "ନାହିଁ"],
    },
  },
};

export const CHECKIN_STAGES = ["mood", "sleep", "safe", "incident", "support"];
