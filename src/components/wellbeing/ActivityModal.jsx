import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import cn from "../../lib/cn";

/**
 * Interactive wellbeing activity. Three guided flows plus a gentle generic
 * one, all persisting through the real STEP-1 backend:
 *
 *   grounding_54321      — 5-4-3-2-1 senses walk-through
 *   breathing_*          — guided countdown (in / hold / out), always skippable
 *   reflection_one_sentence — optional private write + save
 *   everything else      — calm instructions + "I did this"
 *
 * Accessibility: dialog semantics, focus moves in on open and back on close,
 * Esc/backdrop close, aria-live announcements, reduced-motion aware.
 */

const PHASES = {
  breathing_box: [["in", 4], ["hold", 4], ["out", 4], ["hold", 4]],
  breathing_478: [["in", 4], ["hold", 7], ["out", 8]],
  breathing_belly: [["in", 4], ["out", 6]],
};
const ROUNDS = 3;

export default function ActivityModal({
  activity,
  lang,
  say,
  act,
  onClose,
  onComplete, // async (activityId) => Promise
  onSaveReflection, // optional async (text) => Promise
}) {
  const reduce = useReducedMotion();
  const id = activity.activity_id;
  const title = act(lang, id, activity.title).t;
  const desc = act(lang, id, activity.title).d || activity.description;

  const isSenses = id === "grounding_54321";
  const isBreath = id in PHASES;
  const isWriteReflection = id === "reflection_one_sentence";

  const [stage, setStage] = useState("intro"); // intro | flow | done
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false); // true once persisted
  // Non-gamified completion feedback returned by the completion API.
  const [feedbackKey, setFeedbackKey] = useState("");
  const [feedbackText, setFeedbackText] = useState("");

  // Senses walk-through
  const [senseIdx, setSenseIdx] = useState(0);
  const senses = useMemo(() => say("senses"), [say]);

  // Breathing countdown
  const flow = useMemo(() => {
    if (!isBreath) return [];
    const list = [];
    for (let r = 0; r < ROUNDS; r += 1) {
      PHASES[id].forEach(([p, s]) => list.push({ phase: p, seconds: s, round: r + 1 }));
    }
    return list;
  }, [isBreath, id]);
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState(0);

  const dialogRef = useRef(null);
  const focusRef = useRef(null);

  // Focus management: move into the dialog on open, restore nothing special —
  // the parent keeps the trigger button focused on close.
  useEffect(() => {
    focusRef.current?.focus();
  }, [stage]);

  // Esc closes (unless a save is in flight).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  // Breathing timer.
  useEffect(() => {
    if (stage !== "flow" || !isBreath || step >= flow.length) return undefined;
    setLeft(flow[step].seconds);
    if (reduce) return undefined;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          setStep((s) => s + 1);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, isBreath, step, flow.length]);

  const breatheDone = stage === "flow" && isBreath && step >= flow.length;

  const persist = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Optional: save a written reflection first (its own private record).
      if (isWriteReflection && note.trim() && onSaveReflection) {
        await onSaveReflection(note.trim());
      }
      const res = await onComplete(id);
      if (res && res.feedback_key) {
        setFeedbackKey(res.feedback_key);
        setFeedbackText(res.feedback || "");
      } else {
        setFeedbackKey("fb_first");
        setFeedbackText("");
      }
      setDone(true);
      setStage("done");
    } catch {
      setNote((n) => n || "");
      setStage("error");
    } finally {
      setSaving(false);
    }
  };

  const closeLabel = say("aClose");
  const isGeneric = !isSenses && !isBreath && !isWriteReflection;

  return (
    <div
      className="fixed inset-0 z-drawer flex items-end justify-center bg-ink-900/40 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduce ? 0 : 16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-3"
        ref={dialogRef}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-sand-200 bg-sand-50 px-5 py-4">
          <div className="min-w-0">
            <p className="text-caption font-medium uppercase tracking-wider text-ink-500">
              {activity.duration_minutes} {say("minUnit")} ·{" "}
              {lang === "hi" ? "सौम्य क्रिया" : lang === "or" ? "ସୌମ୍ୟ କାର୍ଯ୍ୟ" : "Gentle activity"}
            </p>
            <h2
              id="activity-title"
              ref={focusRef}
              tabIndex={-1}
              className="mt-1 font-display text-h3 font-semibold leading-tight text-ink-900 outline-none"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={closeLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-500 transition-colors duration-fast hover:bg-sand-200 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600 disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6" aria-live="polite">
          {/* INTRO */}
          {stage === "intro" && (
            <div className="space-y-5">
              <p className="text-body leading-relaxed text-ink-800">{desc}</p>
              {isGeneric && <p className="text-small text-ink-600">{say("aGenericHint")}</p>}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-sand-100 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] rounded-md border border-sand-300 bg-white px-5 py-2.5 text-small font-medium text-ink-800 transition-colors duration-fast hover:bg-sand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
                >
                  {say("aClose")}
                </button>
                <button
                  type="button"
                  onClick={() => (isGeneric ? persist() : setStage("flow"))}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-sage-600 px-6 py-2.5 text-small font-semibold text-white transition-colors duration-fast ease-soft hover:bg-sage-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600"
                >
                  {isGeneric ? say("markDone") : say("startActivity")}
                  {!isGeneric && <ChevronRight size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}

          {/* SENSES WALK-THROUGH */}
          {stage === "flow" && isSenses && (
            <div className="space-y-5">
              <p className="font-display text-h4 font-medium text-ink-900">
                {senses[senseIdx]}
              </p>
              <p className="text-caption text-ink-500">
                {say("sensesLead")} ({senseIdx + 1} / {senses.length})
              </p>
              <div className="flex items-center justify-between gap-3 border-t border-sand-100 pt-4">
                <button
                  type="button"
                  disabled={senseIdx === 0}
                  onClick={() => setSenseIdx((i) => Math.max(0, i - 1))}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-4 py-2 text-small font-medium text-ink-700 transition-colors duration-fast hover:bg-sand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600 disabled:opacity-40"
                >
                  <ChevronLeft size={15} aria-hidden="true" /> {say("aBack")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    senseIdx >= senses.length - 1 ? persist() : setSenseIdx((i) => i + 1)
                  }
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-sage-600 px-6 py-2.5 text-small font-semibold text-white transition-colors duration-fast ease-soft hover:bg-sage-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600"
                >
                  {senseIdx >= senses.length - 1 ? say("aFinish") : say("aNext")}
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* BREATHING GUIDE */}
          {stage === "flow" && isBreath && (
            <div className="space-y-6">
              {breatheDone ? (
                <div className="space-y-5">
                  <p className="text-center font-display text-h4 font-medium text-ink-900">
                    <span role="img" aria-hidden="true" className="mr-1">🌿</span>
                    {say("breathCycle")} {ROUNDS} — {lang === "hi" ? "बहुत अच्छा" : lang === "or" ? "ବହୁତ ଭଲ" : "well done"}
                  </p>
                  <p className="text-center text-small text-ink-600">
                    {lang === "hi"
                      ? "आपने तय किया कि कब रुकना है — यही सही है।"
                      : lang === "or"
                        ? "କେବେ ରୋକିବେ ସେଠାରେ ଆପଣ ସ୍ଥିର କରିଛନ୍ତି — ତାହା ଠିକ୍।"
                        : "You decided when to stop — that is exactly right."}
                  </p>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={persist}
                      disabled={saving}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-sage-600 px-6 py-2.5 text-small font-semibold text-white transition-colors duration-fast ease-soft hover:bg-sage-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 size={16} aria-hidden="true" />
                      )}
                      {say("aFinish")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <span className="sr-only" role="status">
                      {say(flow[step].phase === "in" ? "breathIn" : flow[step].phase === "hold" ? "breathHold" : "breathOut")}{" "}
                      {left}
                    </span>
                    <div className="relative flex h-40 w-40 items-center justify-center">
                      <motion.span
                        key={step}
                        aria-hidden="true"
                        initial={reduce ? false : { scale: 1 }}
                        animate={
                          reduce
                            ? undefined
                            : { scale: flow[step].phase === "in" ? 1.35 : flow[step].phase === "hold" ? 1.35 : 1 }
                        }
                        transition={{ duration: Math.max(flow[step].seconds, 1), ease: "easeInOut" }}
                        className={cn(
                          "absolute inset-0 rounded-full",
                          flow[step].phase === "in"
                            ? "bg-sage-100 ring-2 ring-sage-300"
                            : flow[step].phase === "hold"
                              ? "bg-sage-50 ring-2 ring-sage-200"
                              : "bg-sand-100 ring-2 ring-sand-300"
                        )}
                      />
                      <span className="relative font-display text-4xl font-semibold text-ink-900">
                        {left}
                      </span>
                    </div>
                    <p className="text-center font-display text-h4 font-medium text-ink-900">
                      {say(flow[step].phase === "in" ? "breathIn" : flow[step].phase === "hold" ? "breathHold" : "breathOut")}
                    </p>
                    <p className="text-caption text-ink-500">
                      {lang === "hi" ? "चक्र" : lang === "or" ? "ଚକ୍ର" : "Round"} {flow[step].round} / {ROUNDS}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand-100 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={saving}
                      className="min-h-[44px] rounded-md px-4 py-2 text-small font-medium text-ink-700 transition-colors duration-fast hover:bg-sand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
                    >
                      {say("aClose")}
                    </button>
                    <div className="flex items-center gap-2">
                      {reduce && (
                        <button
                          type="button"
                          onClick={() => setStep((s) => s + 1)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-sand-300 bg-white px-4 py-2 text-small font-medium text-ink-800 transition-colors duration-fast hover:bg-sand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
                        >
                          {say("aNext")}
                          <ChevronRight size={14} aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setStep(flow.length)}
                        className="min-h-[44px] rounded-md border border-sand-300 bg-white px-5 py-2 text-small font-medium text-ink-800 transition-colors duration-fast hover:bg-sand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
                      >
                        {say("aSkip")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ONE-SENTENCE REFLECTION (inside the activity) */}
          {stage === "flow" && isWriteReflection && (
            <div className="space-y-4">
              <label htmlFor="wb-activity-note" className="block text-small leading-relaxed text-ink-700">
                {say("reflectionWrite")}
              </label>
              <textarea
                id="wb-activity-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full rounded-md border border-sand-300 bg-white px-3.5 py-2.5 text-[0.9375rem] text-ink-900 placeholder:text-ink-400 focus:border-marigold-500 focus:outline-none focus:ring-2 focus:ring-marigold-500/30"
              />
              <p className="flex items-center gap-1.5 text-caption text-ink-500">
                <span aria-hidden="true">🔒</span>
                {lang === "hi"
                  ? "यह निजी है — किसी मॉनिटरिंग दृश्य में नहीं दिखता।"
                  : lang === "or"
                    ? "ଏହା ଗୋପନୀୟ — କୌଣସି ମନିଟରିଂ ଦୃଶ୍ୟରେ ଦେଖାଯାଏ ନାହିଁ।"
                    : "Private to you — never shown in any monitoring view."}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-sand-100 pt-4">
                <button
                  type="button"
                  onClick={persist}
                  className="min-h-[44px] rounded-md border border-sand-300 bg-white px-5 py-2.5 text-small font-medium text-ink-800 transition-colors duration-fast hover:bg-sand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
                >
                  {say("reflectionSkipSave")}
                </button>
                <button
                  type="button"
                  onClick={persist}
                  disabled={saving}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-sage-600 px-6 py-2.5 text-small font-semibold text-white transition-colors duration-fast ease-soft hover:bg-sage-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 disabled:opacity-60"
                >
                  {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                  {say("reflectionSaveAndDone")}
                </button>
              </div>
            </div>
          )}

          {/* ERROR (transient) */}
          {stage === "error" && (
            <div className="space-y-4">
              <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-small text-amber-800">
                {lang === "hi"
                  ? "अभी सहेज नहीं पाए। कृपया फिर कोशिश करें।"
                  : lang === "or"
                    ? "ଏବେ ସଞ୍ଚୟ ହେଲା ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।"
                    : "Could not save right now. Please try again."}
              </p>
              <button
                type="button"
                onClick={() => setStage("intro")}
                className="min-h-[44px] rounded-md border border-sand-300 bg-white px-5 py-2.5 text-small font-medium text-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
              >
                {say("aBack")}
              </button>
            </div>
          )}

          {/* DONE */}
          {stage === "done" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 size={40} className="text-sage-600" aria-hidden="true" />
              <p className="font-display text-h4 font-semibold text-ink-900">{say("aCompleted")}</p>
              {(feedbackKey || feedbackText) && (
                <p role="status" className="max-w-md text-small leading-relaxed text-ink-700">
                  {(() => {
                    const local = say(feedbackKey);
                    return local && local !== feedbackKey ? local : feedbackText;
                  })()}
                </p>
              )}
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-marigold-600 px-8 py-2.5 text-small font-semibold text-white transition-colors duration-fast ease-soft hover:bg-marigold-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
              >
                {closeLabel}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
