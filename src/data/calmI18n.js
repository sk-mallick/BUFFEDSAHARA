// ============================================================================
// Chrome copy for the beneficiary "Calm Corner" section.
//
// Pattern mirrors src/data/wellbeingI18n.js: per-feature EN/HI/OR dictionaries
// with a `calmT(lang)` helper that falls back to English key-by-key. This
// module only carries React chrome — headings, tabs, scene names, breath
// cues, sound names and journal prompts.
//
// NOTE: The Odia/Hindi copy is prototype-quality for the SIH demonstration —
// a native-speaker review is required before any real deployment (same note
// as wellbeingI18n and the chat i18n in the backend).
// ============================================================================

export const CALM_LANGS = ["en", "hi", "or"];
export const CALM_LANG_LABELS = { en: "English", hi: "हिंदी", or: "ଓଡ଼ିଆ" };

const EN = {
  title: "Calm Corner",
  lead: "A quiet space, always here. No scores, no streaks — just gentle ways to settle when things feel heavy. Nothing you do here is shared with anyone.",
  tabScenes: "Calm scenes",
  tabSounds: "Quiet sounds",
  tabJournal: "Private pages",

  scenesIntro: "Step into a quiet scene for a couple of minutes. Each one breathes at a slow, calm pace — you can simply watch, or breathe along.",
  scenes: {
    waves: { label: "Gentle waves", desc: "Slow rolling water", cue: ["Breathe in with the rising wave", "Breathe out as it settles"] },
    sunrise: { label: "Slow sunrise", desc: "Light growing over hills", cue: ["Breathe in as the light grows", "Breathe out with the warm glow"] },
    diya: { label: "Quiet diya", desc: "One steady flame in the dark", cue: ["Breathe in with the flame", "Breathe out and soften"] },
  },
  stayNote: "Stay as long as you like. Press Esc or the close button whenever you are ready.",
  closeScene: "Close scene",

  soundsIntro: "Quiet sounds to settle with — generated right on your device. Nothing is recorded; stop at any time.",
  sounds: {
    rain: { label: "Soft rain", desc: "A steady, gentle shower" },
    waves: { label: "Rolling waves", desc: "Slow surf rising and settling" },
    drone: { label: "Warm hum", desc: "A quiet, low drone to settle into" },
  },
  volume: "Volume",
  stop: "Stop",
  soundError: "Sound is not available in this browser.",

  journalIntro: "Write here for yourself. Everything stays on this device — nothing is uploaded, and no one else can see it. You can let any page go whenever you are ready.",
  prompts: [
    "What do you need today?",
    "One thing that felt even slightly okay recently…",
    "A sentence to your future self",
    "What would you like to leave on this page?",
    "Something you carried today that you can set down here",
  ],
  srPage: "Your private page",
  promptsLabel: "Gentle prompts",
  placeholder: "Write as much or as little as you like…",
  nothingYet: "Nothing written yet",
  oneWord: "1 word · stays on this device",
  wordsSuffix: "words · stays on this device",
  keepPage: "Keep this page",
  kept: "Kept",
  pastPages: "Your past pages",
  letItGo: "Let this page go",
};

const HI = {
  title: "शांत कोना",
  lead: "एक शांत जगह, हमेशा आपके लिए। कोई अंक नहीं, कोई स्ट्रीक नहीं — जब मन भारी लगे, तब शांत होने के सौम्य तरीके। यहाँ आप जो करते हैं, वह किसी के साथ साझा नहीं होता।",
  tabScenes: "शांत दृश्य",
  tabSounds: "कोमल आवाज़ें",
  tabJournal: "निजी पन्ने",

  scenesIntro: "कुछ मिनटों के लिए एक शांत दृश्य में उतर जाइए। हर दृश्य धीमी, सुकून भरी गति से साँस लेता है — आप बस देख सकते हैं, या साथ साँस ले सकते हैं।",
  scenes: {
    waves: { label: "कोमल लहरें", desc: "धीमी उठती-उतरती जल", cue: ["उठती लहर के साथ साँस लीजिए", "लहर शांत होते हुए साँस छोड़िए"] },
    sunrise: { label: "धीमा सूर्योदय", desc: "पहाड़ियों पर उगती रोशनी", cue: ["रोशनी बढ़ने के साथ साँस लीजिए", "नर्म गर्माहट के साथ साँस छोड़िए"] },
    diya: { label: "शांत दीया", desc: "अंधेरे में एक स्थिर लौ", cue: ["लौ के साथ साँस लीजिए", "साँस छोड़िए और नरम पड़ जाइए"] },
  },
  stayNote: "जितनी देर चाहें रुकिए। तैयार होने पर Esc या बंद करने का बटन दबाइए।",
  closeScene: "दृश्य बंद करें",

  soundsIntro: "मन बसाने के लिए धीमी आवाज़ें — आपके ही डिवाइस पर बनी। कुछ भी रिकॉर्ड नहीं होता; कभी भी रोक सकते हैं।",
  sounds: {
    rain: { label: "कोमल बारिश", desc: "एक स्थिर, धीमी फुहार" },
    waves: { label: "लहरों की आवाज़", desc: "धीमा सागर उठता और उतरता" },
    drone: { label: "गर्म सुर", desc: "बसने के लिए एक धीमी, नीची ध्वनि" },
  },
  volume: "ध्वनि स्तर",
  stop: "रोकें",
  soundError: "इस ब्राउज़र में ध्वनि उपलब्ध नहीं है।",

  journalIntro: "यहाँ केवल अपने लिए लिखिए। सब कुछ इसी डिवाइस पर रहता है — कुछ भी अपलोड नहीं होता, और कोई और इसे नहीं देख सकता। तैयार होने पर कोई भी पन्ना छोड़ सकते हैं।",
  prompts: [
    "आज आपको क्या चाहिए?",
    "हाल में एक बात जो थोड़ी अच्छी लगी…",
    "अपने भविष्य के स्वयं के लिए एक वाक्य",
    "इस पन्ने पर क्या छोड़ना चाहेंगे?",
    "आज जो बोझ आपने उठाया, उसे यहीं रख दीजिए",
  ],
  srPage: "आपका निजी पन्ना",
  promptsLabel: "कोमल संकेत",
  placeholder: "जितना चाहें लिखिए…",
  nothingYet: "अभी कुछ नहीं लिखा",
  oneWord: "1 शब्द · इसी डिवाइस पर रहता है",
  wordsSuffix: "शब्द · इसी डिवाइस पर रहता है",
  keepPage: "यह पन्ना रख लें",
  kept: "रख लिया",
  pastPages: "आपके पुराने पन्ने",
  letItGo: "इस पन्ने को छोड़ दें",
};

const OR = {
  title: "ଶାନ୍ତ କୋଣ",
  lead: "ଆପଣଙ୍କ ପାଇଁ ସବୁବେଳେ ଏକ ଶାନ୍ତ ସ୍ଥାନ। କୌଣସି ଙ୍କ ନାହିଁ — ମନ ଭାରି ଲାଗିଲେ ଶାନ୍ତ ହେବା ପାଇଁ କୋମଳ ଉପାୟ। ଏଠାରେ ଆପଣ ଯାହା କରନ୍ତି, ତାହା କାହା ସହ ସହଭାଗ ହୁଏ ନାହିଁ।",
  tabScenes: "ଶାନ୍ତ ଦୃଶ୍ୟ",
  tabSounds: "କୋମଳ ଧ୍ୱନି",
  tabJournal: "ଘନିଷ୍ଠ ପୃଷ୍ଠା",

  scenesIntro: "କିଛି ମିନିଟ୍ ପାଇଁ ଏକ ଶାନ୍ତ ଦୃଶ୍ୟରେ ପ୍ରବେଶ କରନ୍ତୁ। ପ୍ରତ୍ୟେକ ଦୃଶ୍ୟ ଧୀର, ଶାନ୍ତ ଗତିରେ ଶ୍ୱାସ ନିଏ — ଆପଣ କେବଳ ଦେଖିପାରନ୍ତି, କିମ୍ବା ସହିତ ଶ୍ୱାସ ନିଅନ୍ତି।",
  scenes: {
    waves: { label: "କୋମଳ ଢେଉ", desc: "ଧୀରେ ଉଠୁଥିବା ପାଣି", cue: ["ଉଠୁଥିବା ଢେଉ ସହ ଶ୍ୱାସ ନିଅନ୍ତୁ", "ଢେଉ ଶାନ୍ତ ହେଲାବେଳେ ଶ୍ୱାସ ଛାଡ଼ନ୍ତୁ"] },
    sunrise: { label: "ଧୀର ସୂର୍ଯ୍ୟୋଦୟ", desc: "ପାହାଡ଼ ଉପରେ ଉଠୁଥିବା ଆଲୋକ", cue: ["ଆଲୋକ ବଢ଼ିବା ସହ ଶ୍ୱାସ ନିଅନ୍ତୁ", "କୋମଳ ଉଷ୍ମତା ସହ ଶ୍ୱାସ ଛାଡ଼ନ୍ତୁ"] },
    diya: { label: "ଶାନ୍ତ ଦୀପ", desc: "ଅନ୍ଧକାରରେ ଏକ ସ୍ଥିର ନିଆଁ", cue: ["ନିଆଁ ସହ ଶ୍ୱାସ ନିଅନ୍ତୁ", "ଶ୍ୱାସ ଛାଡ଼ନ୍ତୁ ଓ କୋମଳ ହୁଅନ୍ତୁ"] },
  },
  stayNote: "ଯେତେ ଚାହୁଁଥିବା ରୁହନ୍ତୁ। ପ୍ରସ୍ତୁତ ହେଲେ Esc ବା ବନ୍ଦ ବଟନ୍ ଦବାନ୍ତୁ।",
  closeScene: "ଦୃଶ୍ୟ ବନ୍ଦ କରନ୍ତୁ",

  soundsIntro: "ମନ ଶାନ୍ତ କରିବା ପାଇଁ ଧୀର ଧ୍ୱନି — ଆପଣଙ୍କ ଡିଭାଇସରେ ହିଁ ତିଆରି। କିଛି ରେକର୍ଡ ହୁଏ ନାହିଁ; ଯେକୌଣସି ସମୟରେ ବନ୍ଦ କରିପାରିବେ।",
  sounds: {
    rain: { label: "କୋମଳ ବର୍ଷା", desc: "ଏକ ସ୍ଥିର, ଧୀର ବର୍ଷା" },
    waves: { label: "ଢେଉର ଧ୍ୱନି", desc: "ଧୀର ସମୁଦ୍ର ଉଠେ ଓ ଶାନ୍ତ ହୁଏ" },
    drone: { label: "ଉଷ୍ମ ସ୍ୱର", desc: "ବସିବା ପାଇଁ ଏକ ଧୀର, ନିମ୍ନ ଧ୍ୱନି" },
  },
  volume: "ଧ୍ୱନି ସ୍ତର",
  stop: "ବନ୍ଦ କରନ୍ତୁ",
  soundError: "ଏହି ବ୍ରାଉଜରରେ ଧ୍ୱନି ଉପଲବ୍ଧ ନାହିଁ।",

  journalIntro: "ଏଠାରେ କେବଳ ନିଜ ପାଇଁ ଲେଖନ୍ତୁ। ସବୁ ଏହି ଡିଭାଇସରେ ରହେ — କିଛି ଅପଲୋଡ୍ ହୁଏ ନାହିଁ, ଅନ୍ୟ କେହି ଦେଖିପାରିବେ ନାହିଁ। ପ୍ରସ୍ତୁତ ହେଲେ ଯେକୌଣସି ପୃଷ୍ଠା ଛାଡ଼ିପାରିବେ।",
  prompts: [
    "ଆଜି ଆପଣ କଣ ଚାହୁଁଛନ୍ତି?",
    "ସେହି ଦିନ ଯାହା ଟିକେ ଭଲ ଲାଗିଥିଲା…",
    "ନିଜ ଭବିଷ୍ୟତ ପାଇଁ ଏକ ବାକ୍ୟ",
    "ଏହି ପୃଷ୍ଠାରେ କଣ ଛାଡ଼ିଯିବେ?",
    "ଆଜି ଯାହା ବୋହିଥିଲେ, ତାହା ଏଠାରେ ରଖିଦିଅନ୍ତୁ",
  ],
  srPage: "ଆପଣଙ୍କ ଘନିଷ୍ଠ ପୃଷ୍ଠା",
  promptsLabel: "କୋମଳ ସୂଚନା",
  placeholder: "ଯେତେ ଚାହୁଁଥିଲେ ଲେଖନ୍ତୁ…",
  nothingYet: "ଏବେଯାଏଁ କିଛି ଲେଖାଯାଇନାହିଁ",
  oneWord: "1 ଶବ୍ଦ · ଏହି ଡିଭାଇସରେ ରହିଥାଏ",
  wordsSuffix: "ଶବ୍ଦ · ଏହି ଡିଭାଇସରେ ରହିଥାଏ",
  keepPage: "ଏହି ପୃଷ୍ଠା ରଖନ୍ତୁ",
  kept: "ରଖାଗଲା",
  pastPages: "ଆପଣଙ୍କ ପୁରୁଣା ପୃଷ୍ଠା",
  letItGo: "ଏହି ପୃଷ୍ଠା ଛାଡ଼ିଦିଅନ୍ତୁ",
};

const DICTS = { en: EN, hi: HI, or: OR };

/**
 * Full copy dictionary for the given language, English-filled key-by-key so a
 * missing translation can never render an undefined string.
 */
export function calmT(lang) {
  const d = DICTS[lang] || EN;
  return {
    ...EN,
    ...d,
    scenes: { ...EN.scenes, ...d.scenes },
    sounds: { ...EN.sounds, ...d.sounds },
  };
}
