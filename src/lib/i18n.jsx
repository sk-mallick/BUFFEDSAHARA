import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Lightweight EN/HI dictionary + context.
 * `t("path.to.key")` resolves against the active locale; missing keys fall
 * back to the key itself so a half-translated page never renders blanks.
 * Setting the language also switches <html lang> which re-tunes Devanagari
 * typography via tokens.css.
 */

const en = {
  meta: { title: "Sahara · Support that finds you" },
  nav: {
    home: "Home",
    how: "How It Works",
    victims: "For Victims",
    officials: "For Officials",
    command: "Monitoring",
    resources: "Resources",
    contact: "Contact",
    helpline: "Helpline",
    exit: "Exit",
    signIn: "Sign In",
    signOut: "Sign Out",
    mySpace: "My Space",
    talkToSahara: "Talk",
    dashboard: "Dashboard",
  },
  hero: {
    eyebrow: "Ministry of Social Justice & Empowerment · Smart India Hackathon 2026",
    title: "No one should carry the aftermath alone.",
    sub: "After filing a complaint under the SC/ST (Prevention of Atrocities) Act, the weight doesn't end with the paperwork. Sahara gently tracks wellbeing and quietly alerts a counsellor when support is needed — before a crisis, not after.",
    cta1: "I need support",
    cta2: "Partner with us",
    watch: "Watch how it works",
    eyebrow2: "A safer, kinder tomorrow",
    initiative: "An initiative by",
    ministry: "Ministry of Social Justice & Empowerment",
    government: "Government of India",
    trust1: "Confidential",
    trust2: "Consent-based",
    trust3: "A human is always there",
    scroll: "Scroll to explore",
  },
  stats: {
    eyebrow: "The problem",
    title: "After the complaint, silence.",
    lead: "Filing a complaint is an act of enormous courage. What happens after — the silence, the isolation, the waiting — is where too many people are left alone.",
    footnote: "Representative figures for the demonstration build — to be replaced with MoSJE-sourced data.",
    items: [
      { n: 71, suffix: "%", label: "of complainants receive no mental-health follow-up after filing" },
      { n: 45, suffix: " days", label: "median time to first counselling contact — where one happens at all" },
      { n: 2, suffix: "×", label: "higher distress risk when caste-based harassment continues after filing" },
      { n: 92, suffix: "%", label: "of early distress signals appear between scheduled check-ins" },
    ],
  },
  how: {
    eyebrow: "How it works",
    title: "From complaint to care, in six quiet steps.",
    lead: "Each step is invisible until you need it — and a human stays at the centre of every decision.",
    footnote: "The AI never decides alone. It only ever flags — a human always responds.",
    steps: [
      { label: "Report via NHAA 14566", sub: "A complaint filed — on the helpline or the grievance portal — opens a wellbeing record, with consent." },
      { label: "Gentle check-ins begin", sub: "A short, private check-in arrives weekly. Skipping is always fine." },
      { label: "Patterns noticed privately", sub: "Rising distress is read from your check-ins — never from location or messages." },
      { label: "Early signal detected", sub: "The system flags a pattern — never a person. No labels, no judgment." },
      { label: "Caseworker alerted", sub: "A human caseworker sees one quiet notification, with your history attached." },
      { label: "Human support connects", sub: "A counsellor reaches out at your pace, in your language." },
    ],
  },
  victims: {
    eyebrow: "For victims & families",
    title: "Support that asks nothing of you but your consent.",
    lead: "Sahara exists to lighten what you carry — never to add to it. Here is what you can expect, plainly.",
    promises: [
      { title: "Your privacy is the design", line: "Encrypted, role-limited, and visible to you — who can see what is always one tap away." },
      { title: "You stay in control", line: "Pause or stop monitoring anytime. Consent can be withdrawn as easily as it was given." },
      { title: "A human is always there", line: "The AI flags patterns; every response comes from a trained counsellor, 24×7." },
      { title: "Works on any phone", line: "Low-data design, offline-friendly, and available in Hindi, English and regional languages." },
    ],
    doesTitle: "Sahara does",
    does: [
      "Send gentle, weekly check-ins — skippable, always",
      "Notice patterns of rising distress, privately",
      "Send one quiet alert to a human caseworker, nothing more",
    ],
    doesNotTitle: "Sahara never does",
    doesNot: [
      "Track your location or read your messages",
      "Share anything without your explicit consent",
      "Replace a human — an automated answer will never be your only option",
    ],
    quote: "I filed my complaint and went home to silence. Three weeks later, a counsellor called to ask how I was — really ask. Not about the case. About me.",
    quoteName: "Asha, 34",
    quoteTag: "Representative account — not a real person",
    cta: "See what support looks like",
    slides: [
      { quote: "I filed my complaint and went home to silence. Three weeks later, a counsellor called to ask how I was — really ask. Not about the case. About me.", name: "Asha, 34" },
      { quote: "The weekly check-in felt like someone had left the light on for me. The weeks I couldn't answer, no one shamed me — someone just checked again later.", name: "Meera, 41" },
      { quote: "My caseworker noticed I was struggling before I could say it out loud. That is the whole difference between surviving and beginning again.", name: "Sunita, 27" },
    ],
  },
  demo: {
    eyebrow: "Watch it work",
    title: "Sixty days in one glance.",
    lead: "An anonymized pattern: how a rising distress score becomes a human conversation — and then, a steadier road.",
    score: "Distress score",
    ai: "AI flagged early signs",
    human: "Counsellor reached out",
    threshold: "Early-signal threshold",
    disclaimer: "Illustrative pattern from mock data — anonymized, consent-based, no real person.",
    story: [
      { d: "Day 01", t: "Consent given · gentle check-ins begin" },
      { d: "Day 36", t: "AI flags a rising pattern (score 55)" },
      { d: "Day 41", t: "A counsellor reaches out — a human, by phone" },
      { d: "Day 60", t: "Stable again. Support continues at your pace." },
    ],
  },
  officials: {
    eyebrow: "For caseworkers & officials",
    title: "Amplify human counsellors. Never replace them.",
    lead: "A calmer caseload for the people who carry the hardest work — triage that respects their judgment, not a machine that overrides it.",
    feats: [
      { title: "Risk-scored queue", line: "Cases are ranked by distress signal, so attention goes where it's needed first." },
      { title: "Case timelines at a glance", line: "Every contact, check-in and action in one quiet timeline." },
      { title: "Alert triage with SLAs", line: "Escalation paths that keep the promise: no signal waits unanswered." },
    ],
    ethic: "The score is an aid to judgment — never a verdict.",
    cta: "Explore the caseworker tool",
  },
  trust: {
    eyebrow: "Trust & ethics",
    title: "Built to government standards. Honest about the AI.",
    lead: "The system is auditable end to end, and transparent about what the AI does and doesn't do.",
    items: [
      { title: "DPDP Act 2023 aligned", line: "Consent-first data practices in line with India's data-protection law." },
      { title: "Consent-based monitoring", line: "Monitoring begins only after informed, revocable consent." },
      { title: "Human-in-the-loop AI", line: "Every alert is reviewed by a trained human before any action." },
      { title: "Encrypted & audited", line: "Role-based access, encryption in transit and at rest, full audit trails." },
    ],
    disclaimer: "Sahara is a Smart India Hackathon 2026 demonstration build sponsored by the Ministry of Social Justice and Empowerment. No real victim data is collected or stored in this demo.",
  },
  resources: {
    eyebrow: "Resources & helplines",
    title: "Help that's one tap away — day or night.",
    lead: "National and state helplines, plus partner organisations. Every number is click-to-call on mobile.",
    viewAll: "View all helplines",
  },
  footer: {
    tagline: "Support that finds you, before the crisis does.",
    platform: "Platform",
    learn: "Learn",
    legal: "Legal",
    about: "About & Mission",
    privacy: "Privacy & Data Ethics",
    accessibility: "Accessibility statement",
    news: "Updates from Sahara",
    newsSub: "One short email a month. No noise.",
    subscribe: "Subscribe",
    subscribed: "Subscribed — thank you.",
    helpline: "24×7 National Helpline",
    mosje: "Developed for the Smart India Hackathon 2026 · Ministry of Social Justice & Empowerment",
    rights: "© 2026 Sahara · All rights reserved",
    made: "Made with care in India",
  },
};

const hi = {
  meta: { title: "सहारा · सहारा जो आपको ढूँढ़ लेता है" },
  nav: {
    home: "होम",
    how: "कार्यप्रणाली",
    victims: "पीड़ित सहायता",
    officials: "अधिकारी",
    command: "निगरानी",
    resources: "संसाधन",
    contact: "संपर्क",
    helpline: "हेल्पलाइन",
    signIn: "साइन इन",
    signOut: "साइन आउट",
    exit: "बाहर निकलें",
    mySpace: "मेरा स्पेस",
    talkToSahara: "बात करें",
    dashboard: "डैशबोर्ड",
  },
  hero: {
    eyebrow: "सामाजिक न्याय और अधिकारिता मंत्रालय · स्मार्ट इंडिया हैकाथॉन 2026",
    title: "इस बोझ को अकेले नहीं उठाना पड़ेगा।",
    sub: "अनुसूचित जाति/जनजाति (अत्याचार निवारण) अधिनियम के तहत शिकायत दर्ज कराने के बाद कागजी कार्रवाई से बोझ खत्म नहीं होता। सहारा आपकी मनोदशा पर धीरे से नज़र रखता है और ज़रूरत पड़ने पर चुपचाप एक काउंसलर को सचेत करता है — संकट से पहले, बाद में नहीं।",
    cta1: "मुझे सहारा चाहिए",
    cta2: "साझेदार बनें",
    watch: "देखें कैसे काम करता है",
    eyebrow2: "एक सुरक्षित, अधिक दयालु कल",
    initiative: "एक पहल —",
    ministry: "सामाजिक न्याय और अधिकारिता मंत्रालय",
    government: "भारत सरकार",
    trust1: "गोपनीय",
    trust2: "सहमति-आधारित",
    trust3: "हर समय एक इंसान मौजूद",
    scroll: "नीचे स्क्रॉल करें",
  },
  stats: {
    eyebrow: "समस्या",
    title: "शिकायत के बाद, सन्नाटा।",
    lead: "शिकायत दर्ज कराना बहुत बड़ा साहस है। लेकिन उसके बाद जो होता है — सन्नाटा, अकेलापन, इंतज़ार — वहीं बहुत से लोग अकेले छोड़ दिए जाते हैं।",
    footnote: "ये आँकड़े प्रदर्शन-निर्माण के लिए प्रतिनिधि हैं — इन्हें मंत्रालय के स्रोतों से बदला जाएगा।",
    items: [
      { n: 71, suffix: "%", label: "शिकायत के बाद किसी भी मानसिक-स्वास्थ्य सहायता के बिना रह जाते हैं" },
      { n: 45, suffix: " दिन", label: "पहले परामर्श तक पहुँचने में लगते हैं औसतन इतने दिन — जहाँ परामर्श होता भी है" },
      { n: 2, suffix: "×", label: "ज़्यादा संकट-जोखिम, जब शिकायत के बाद भी जाति-आधारित उत्पीड़न जारी रहता है" },
      { n: 92, suffix: "%", label: "शुरुआती संकट-संकेत दिखते हैं निर्धारित चेक-इन के बीच के समय में" },
    ],
  },
  how: {
    eyebrow: "यह कैसे काम करता है",
    title: "शिकायत से देखभाल तक, छह शांत कदम।",
    lead: "हर कदम तब तक अदृश्य रहने के लिए बना है जब तक आपको ज़रूरत न हो — और हर फ़ैसले के केंद्र में एक इंसान रहता है।",
    footnote: "AI कभी अकेले फ़ैसला नहीं लेता — वह सिर्फ़ इशारा करता है; जवाब हमेशा एक इंसान देता है।",
    steps: [
      { label: "NHAA 14566 पर रिपोर्ट करें", sub: "हेल्पलाइन या शिकायत पोर्टल पर दर्ज शिकायत, सहमति से एक सहायता-रिकॉर्ड खोलती है।" },
      { label: "हल्के चेक-इन शुरू होते हैं", sub: "हर हफ़्ते एक छोटा, निजी चेक-इन आता है। छोड़ना हमेशा आसान है।" },
      { label: "पैटर्न पर नज़र, पूरी गोपनीयता से", sub: "संकट के संकेत सिर्फ़ आपके चेक-इन से पढ़े जाते हैं — लोकेशन या संदेशों से कभी नहीं।" },
      { label: "शुरुआती संकेत मिला", sub: "सिस्टम पैटर्न को चिह्नित करता है — किसी व्यक्ति को नहीं। कोई लेबल नहीं, कोई फ़ैसला नहीं।" },
      { label: "केसवर्कर को सूचना", sub: "एक इंसानी केसवर्कर को आपके इतिहास के साथ एक शांत सूचना मिलती है।" },
      { label: "इंसानी सहायता जुड़ती है", sub: "आपकी गति से, आपकी भाषा में एक काउंसलर संपर्क करता है।" },
    ],
  },
  victims: {
    eyebrow: "पीड़ितों और परिवारों के लिए",
    title: "ऐसा सहारा जो आपसे सिर्फ़ आपकी सहमति माँगता है।",
    lead: "सहारा आपके बोझ में कभी इज़ाफ़ा नहीं करता — बस उसे हल्का करता है। साफ़ शब्दों में जानिए कि क्या उम्मीद करें।",
    promises: [
      { title: "गोपनीयता ही डिज़ाइन है", line: "एन्क्रिप्टेड, सीमित पहुँच, और आपके लिए हमेशा खुला — कौन क्या देख सकता है, यह एक क्लिक पर।" },
      { title: "नियंत्रण आपके पास", line: "कभी भी रोकें या बंद करें। सहमति जितनी आसानी से दी गई, उतनी आसानी से वापस भी ली जा सकती है।" },
      { title: "हर समय एक इंसान मौजूद", line: "AI सिर्फ़ संकेत देता है; हर जवाब 24×7 एक प्रशिक्षित काउंसलर से आता है।" },
      { title: "किसी भी फ़ोन पर", line: "कम-डेटा डिज़ाइन, ऑफ़लाइन-अनुकूल, हिंदी, अंग्रेज़ी और क्षेत्रीय भाषाओं में उपलब्ध।" },
    ],
    doesTitle: "सहारा यह करता है",
    does: [
      "हफ़्तेवार, हल्के चेक-इन — छोड़ने की पूरी छूट",
      "बढ़ते संकट के पैटर्न, पूरी गोपनीयता से",
      "एक इंसानी केसवर्कर को सिर्फ़ एक शांत सूचना — इससे ज़्यादा कुछ नहीं",
    ],
    doesNotTitle: "सहारा यह कभी नहीं करता",
    doesNot: [
      "आपकी लोकेशन या संदेशों पर नज़र रखना",
      "आपकी स्पष्ट सहमति के बिना कुछ साझा करना",
      "इंसान की जगह लेना — कोई जवाब कभी सिर्फ़ मशीन का नहीं होगा",
    ],
    quote: "मैंने शिकायत दर्ज की और चुप्पी में घर लौट आई। तीन हफ़्ते बाद एक काउंसलर ने फ़ोन करके पूछा — सच में पूछा — कैसी हूँ। केस के बारे में नहीं। मेरे बारे में।",
    quoteName: "आशा, 34",
    quoteTag: "प्रतिनिधि अनुभव — कोई वास्तविक व्यक्ति नहीं",
    cta: "जानें सहारा कैसा दिखता है",
    slides: [
      { quote: "मैंने शिकायत दर्ज की और चुप्पी में घर लौट आई। तीन हफ़्ते बाद एक काउंसलर ने फ़ोन करके पूछा — सच में पूछा — कैसी हूँ। केस के बारे में नहीं। मेरे बारे में।", name: "आशा, 34" },
      { quote: "हफ़्तेवार चेक-इन ऐसा लगता था जैसे किसी ने मेरे लिए बत्ती जलाकर रखी हो। जिन हफ़्तों मैं जवाब नहीं दे पाई, किसी ने शर्मिंदा नहीं किया — बस बाद में फिर पूछ लिया।", name: "मीरा, 41" },
      { quote: "मेरे केसवर्कर ने मेरी मुश्किल उससे पहले देख ली, जितनी जल्दी मैं कह पाती। बच निकलने और फिर से शुरू करने का यही फ़र्क़ है।", name: "सुनीता, 27" },
    ],
  },
  demo: {
    eyebrow: "इसे काम करते देखें",
    title: "एक नज़र में साठ दिन।",
    lead: "एक अनाम उदाहरण: बढ़ता हुआ संकट-स्कोर कैसे एक इंसानी बातचीत बन जाता है — और फिर एक स्थिर राह।",
    score: "संकट-स्कोर",
    ai: "AI ने शुरुआती संकेत देखा",
    human: "काउंसलर ने संपर्क किया",
    threshold: "शुरुआती-संकेत सीमा",
    disclaimer: "मॉक डेटा से उदाहरण पैटर्न — अनाम, सहमति-आधारित, कोई वास्तविक व्यक्ति नहीं।",
    story: [
      { d: "दिन 01", t: "सहमति मिली · हल्के चेक-इन शुरू" },
      { d: "दिन 36", t: "AI ने बढ़ते पैटर्न का संकेत दिया (स्कोर 55)" },
      { d: "दिन 41", t: "काउंसलर ने फ़ोन पर संपर्क किया — इंसान" },
      { d: "दिन 60", t: "फिर से स्थिर। सहारा आपकी गति से जारी।" },
    ],
  },
  officials: {
    eyebrow: "केसवर्कर और अधिकारियों के लिए",
    title: "इंसानी काउंसलरों को मज़बूत करें। बदलें नहीं।",
    lead: "सबसे कठिन काम करने वालों के लिए एक शांत कार्य-भार — एक ट्राइएज जो उनके फ़ैसले का सम्मान करता है, न कि कोई मशीन जो उन्हें टाल दे।",
    feats: [
      { title: "जोखिम-आधारित कतार", line: "संकट के संकेतों के हिसाब से कतार — ध्यान सबसे पहले जहाँ सबसे ज़्यादा ज़रूरी है।" },
      { title: "एक नज़र में केस-टाइमलाइन", line: "हर संपर्क, चेक-इन और कार्रवाई एक शांत समय-रेखा में।" },
      { title: "SLA के साथ अलर्ट-ट्राइएज", line: "एस्केलेशन के रास्ते जो वादा निभाते हैं: कोई संकेत अनुत्तरित नहीं रहता।" },
    ],
    ethic: "स्कोर फ़ैसले में मदद है — फ़ैसला ख़ुद नहीं।",
    cta: "केसवर्कर टूल देखें",
  },
  trust: {
    eyebrow: "भरोसा और नैतिकता",
    title: "सरकारी मानकों पर बना। AI के बारे में पूरी ईमानदारी।",
    lead: "सिस्टम शुरू से अंत तक जाँच-योग्य है, और AI क्या करता है और क्या नहीं — यह पूरी तरह पारदर्शी है।",
    items: [
      { title: "डीपीडीपी अधिनियम 2023 के अनुरूप", line: "भारत के डेटा-संरक्षण कानून के अनुसार सहमति-आधारित अभ्यास।" },
      { title: "सहमति-आधारित निगरानी", line: "जानकारी के बाद दी गई, वापस ली जा सकने वाली सहमति के बाद ही निगरानी शुरू होती है।" },
      { title: "इंसान-केंद्रित AI", line: "किसी भी कार्रवाई से पहले हर अलर्ट की समीक्षा एक प्रशिक्षित इंसान करता है।" },
      { title: "एन्क्रिप्टेड और ऑडिटेड", line: "भूमिका-आधारित पहुँच, हर स्तर पर एन्क्रिप्शन, पूर्ण ऑडिट-ट्रेल।" },
    ],
    disclaimer: "सहारा स्मार्ट इंडिया हैकाथॉन 2026 का एक प्रदर्शन-निर्माण है, सामाजिक न्याय और अधिकारिता मंत्रालय के संरक्षण में। इस डेमो में किसी वास्तविक पीड़ित का डेटा नहीं लिया या रखा जाता।",
  },
  resources: {
    eyebrow: "संसाधन और हेल्पलाइन",
    title: "मदद बस एक क्लिक दूर — दिन हो या रात।",
    lead: "राष्ट्रीय और राज्य हेल्पलाइन, साथ ही साझेदार संगठन। मोबाइल पर हर नंबर एक क्लिक में डायल होता है।",
    viewAll: "सभी हेल्पलाइन देखें",
  },
  footer: {
    tagline: "सहारा जो आपको ढूँढ़ लेता है, संकट से पहले।",
    platform: "प्लेटफ़ॉर्म",
    learn: "जानें",
    legal: "कानूनी",
    about: "हमारे बारे में और मिशन",
    privacy: "गोपनीयता और डेटा नैतिकता",
    accessibility: "सुगम्यता विवरण",
    news: "सहारा से अपडेट",
    newsSub: "महीने में एक छोटा ईमेल। कोई शोर नहीं।",
    subscribe: "सदस्यता लें",
    subscribed: "सदस्यता ले ली गई — धन्यवाद।",
    helpline: "24×7 राष्ट्रीय हेल्पलाइन",
    mosje: "स्मार्ट इंडिया हैकाथॉन 2026 के लिए विकसित · सामाजिक न्याय और अधिकारिता मंत्रालय",
    rights: "© 2026 सहारा · सर्वाधिकार सुरक्षित",
    made: "भारत में देखभाल के साथ बनाया गया",
  },
};

const dict = { en, hi };

const LangContext = createContext({ lang: "en", setLang: () => {}, t: (key) => key });

const STORAGE_KEY = "sahara-lang";

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "hi" || stored === "en" ? stored : "en";
  } catch {
    return "en";
  }
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(readStored);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dict[lang]?.meta?.title ?? dict.en.meta.title;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* private mode — preference lives for this session only */
    }
  }, [lang]);

  const t = useCallback(
    (key) => {
      const value = key.split(".").reduce((o, p) => (o == null ? undefined : o[p]), dict[lang]);
      return value ?? key;
    },
    [lang]
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}