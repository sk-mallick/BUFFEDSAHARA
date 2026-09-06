import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, Feather, Trash2, Wind } from "lucide-react";
import cn from "../../lib/cn";
import { calmT } from "../../data/calmI18n";

// CalmJournal — a private, device-local free-write space. Gentle prompts,
// never questions the beneficiary must answer. Entries stay in localStorage
// on this device only (nothing is uploaded); "Let it go" fades an entry away
// — a small ritual of release rather than a delete button.

const STORE_KEY = "sahara-calm-journal";

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    /* storage unavailable — session-only writing still works */
  }
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function CalmJournal({ lang = "en" }) {
  const t = calmT(lang);
  const prompts = t.prompts;
  const [entries, setEntries] = useState(loadEntries);
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState(prompts[0]);
  const [saved, setSaved] = useState(false);
  const [releasing, setReleasing] = useState(null);
  const areaRef = useRef(null);

  useEffect(() => saveEntries(entries), [entries]);

  const canSave = text.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    setEntries((prev) => [
      { id: `${Date.now()}`, text: text.trim(), prompt, ts: Date.now() },
      ...prev,
    ]);
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const release = (id) => {
    setReleasing(id);
    setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setReleasing(null);
    }, 900);
  };

  const wordCount = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text]
  );

  return (
    <div>
      <p className="text-small leading-relaxed text-ink-600">{t.journalIntro}</p>
      <div className="mt-4 rounded-xl border border-sand-200 bg-white p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.promptsLabel}>
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setPrompt(p); areaRef.current?.focus(); }}
              aria-pressed={prompt === p}
              className={cn(
                "rounded-full border px-3 py-1 text-caption transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600",
                prompt === p
                  ? "border-sage-500 bg-sage-50 text-sage-800"
                  : "border-sand-200 bg-white text-ink-600 hover:border-sage-300"
              )}
            >
              <Feather size={12} className="mr-1 inline" aria-hidden="true" />
              {p}
            </button>
          ))}
        </div>
        <label htmlFor="calm-journal-text" className="sr-only">{t.srPage}</label>
        <textarea
          id="calm-journal-text"
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={t.placeholder}
          className="mt-3 w-full resize-y rounded-lg border border-sand-200 bg-sand-50 p-3 text-small leading-relaxed text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-sage-600"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-caption text-ink-400">
            {wordCount === 0
              ? t.nothingYet
              : wordCount === 1
                ? t.oneWord
                : `${wordCount} ${t.wordsSuffix}`}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 rounded-full bg-sage-700 px-4 py-1.5 text-caption font-semibold text-white transition hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
          >
            {saved ? (
              <><Check size={13} aria-hidden="true" /> {t.kept}</>
            ) : (
              <><BookOpen size={13} aria-hidden="true" /> {t.keepPage}</>
            )}
          </button>
        </div>
      </div>
      {entries.length > 0 && (
        <div className="mt-5">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-500">
            {t.pastPages} ({entries.length})
          </p>
          <ul className="mt-3 space-y-3">
            <AnimatePresence>
              {entries.map((e) => (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={releasing === e.id ? { opacity: 0, y: -14, filter: "blur(4px)" } : { opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: releasing === e.id ? 0.85 : 0.25 }}
                  className="rounded-xl border border-sand-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-caption text-ink-400">{formatDate(e.ts)}</p>
                      {e.prompt && (
                        <p className="mt-0.5 text-caption italic text-ink-500">“{e.prompt}”</p>
                      )}
                      <p className="mt-1.5 whitespace-pre-wrap text-small leading-relaxed text-ink-800">
                        {e.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => release(e.id)}
                      disabled={releasing === e.id}
                      aria-label={t.letItGo}
                      title={t.letItGo}
                      className="shrink-0 rounded-full border border-sand-200 p-2 text-ink-500 transition hover:border-sage-400 hover:text-sage-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
                    >
                      {releasing === e.id ? (
                        <Wind size={14} aria-hidden="true" />
                      ) : (
                        <Trash2 size={14} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
}
