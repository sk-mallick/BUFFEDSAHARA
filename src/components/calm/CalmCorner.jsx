import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flower2, Sunset, NotebookPen, Volume2 } from "lucide-react";
import cn from "../../lib/cn";
import { useLang } from "../../lib/i18n";
import { CALM_LANGS, CALM_LANG_LABELS, calmT } from "../../data/calmI18n";
import CalmScene, { SCENES } from "./CalmScene";
import CalmSounds from "./CalmSounds";
import CalmJournal from "./CalmJournal";

// ============================================================================
// CalmCorner — "A quiet corner, just for you."
//
// Three always-available, zero-pressure ways to settle when distress rises:
//   · Scenes   — full-screen animated mind-walks with paced breath cues
//   · Sounds   — device-generated soundscapes (Web Audio, no files)
//   · Journal  — private device-local free-writing with a release ritual
//
// Deliberately not gamified: no points, streaks, or scores — matching
// Sahara's "never gamified" principle. Nothing here is uploaded; nothing
// here feeds the risk engine.
// ============================================================================

const TABS = [
  { id: "scenes", icon: Sunset, key: "tabScenes" },
  { id: "sounds", icon: Volume2, key: "tabSounds" },
  { id: "journal", icon: NotebookPen, key: "tabJournal" },
];

/* Card gradients for the scene tiles (visuals mirror the full-screen scenes). */
const GRADS = {
  waves: "linear-gradient(160deg,#7fb3c8,#d8e9ea)",
  sunrise: "linear-gradient(160deg,#2e4a68,#e8b27a,#f6e2c0)",
  diya: "linear-gradient(160deg,#1a1512,#3d2c1c)",
};

export default function CalmCorner() {
  const { lang: siteLang } = useLang();
  const CALM_LANG_KEY = "sahara-calm-lang";
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem(CALM_LANG_KEY);
      if (CALM_LANGS.includes(stored)) return stored;
    } catch {
      /* storage unavailable */
    }
    return CALM_LANGS.includes(siteLang) ? siteLang : "en";
  });
  useEffect(() => {
    try {
      localStorage.setItem(CALM_LANG_KEY, lang);
    } catch {
      /* storage unavailable */
    }
  }, [lang]);
  const t = calmT(lang);
  const [tab, setTab] = useState("scenes");
  const [scene, setScene] = useState(null); // scene key while a scene is open
  const reduce = useReducedMotion();

  return (
    <section
      aria-label={t.title}
      className="rounded-2xl border border-sand-200 bg-white p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marigold-100 text-marigold-700">
            <Flower2 size={20} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-h4 font-semibold text-ink-900">{t.title}</h2>
            <p className="mt-1 text-small leading-relaxed text-ink-600">{t.lead}</p>
          </div>
        </div>
        {/* Language picker — independent of the site language (mirrors WellbeingSection) */}
        <div role="group" aria-label="Calm Corner language" className="flex shrink-0 items-center gap-1 rounded-full border border-sand-200 bg-sand-50 p-1">
          {CALM_LANGS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={cn(
                "rounded-full px-2.5 py-1 text-caption font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600",
                lang === code ? "bg-sage-700 text-white" : "text-ink-600 hover:bg-sand-100"
              )}
            >
              {CALM_LANG_LABELS[code]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={t.title} className="mt-5 flex flex-wrap gap-2">
        {TABS.map(({ id, icon: Icon, key }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`calm-panel-${id}`}
            id={`calm-tab-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-small font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600",
              tab === id
                ? "border-sage-700 bg-sage-700 text-white"
                : "border-sand-200 bg-white text-ink-700 hover:border-sage-400"
            )}
          >
            <Icon size={14} aria-hidden="true" />
            {t[key]}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="mt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${lang}`}
            id={`calm-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`calm-tab-${tab}`}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            {tab === "scenes" && (
              <div>
                <p className="text-small leading-relaxed text-ink-600">{t.scenesIntro}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {Object.keys(SCENES).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setScene(key)}
                      className="group overflow-hidden rounded-xl border border-sand-200 text-left transition hover:border-sage-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
                    >
                      <span className="block h-20 w-full transition group-hover:opacity-90" style={{ background: GRADS[key] }} aria-hidden="true" />
                      <span className="block bg-white px-3 py-2">
                        <span className="block text-small font-semibold text-ink-900">{t.scenes[key].label}</span>
                        <span className="mt-0.5 block text-caption text-ink-500">{t.scenes[key].desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab === "sounds" && <CalmSounds lang={lang} />}
            {tab === "journal" && <CalmJournal lang={lang} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Full-screen scene overlay */}
      <AnimatePresence>
        {scene && <CalmScene sceneKey={scene} lang={lang} onClose={() => setScene(null)} />}
      </AnimatePresence>
    </section>
  );
}
