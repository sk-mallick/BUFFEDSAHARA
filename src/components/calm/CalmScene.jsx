import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X, Waves, Sunrise, Flame } from "lucide-react";
import { calmT } from "../../data/calmI18n";

// ============================================================================
// CalmScene — a full-screen, low-stimulation animated scene (2–3 minutes).
// Pure CSS/SVG/motion animation; no media assets, no network. Each scene pairs
// a gentle visual with a paced breath cue. Reduced motion renders a static,
// still-composed frame instead of the animation. Copy comes from calmI18n.
// ============================================================================

/* Visual + timing metadata only — labels/cues live in calmI18n. */
const SCENES = {
  waves: {
    icon: Waves,
    bg: "linear-gradient(180deg,#7fb3c8 0%,#a8cfda 45%,#d8e9ea 70%,#f2ede2 100%)",
    cycle: 8, // seconds per in/out cycle
  },
  sunrise: {
    icon: Sunrise,
    bg: "linear-gradient(180deg,#2e4a68 0%,#6d7fa3 35%,#e8b27a 72%,#f6e2c0 100%)",
    cycle: 10,
  },
  diya: {
    icon: Flame,
    bg: "linear-gradient(180deg,#1a1512 0%,#2b2018 55%,#3d2c1c 100%)",
    cycle: 7,
  },
};

/* Slow breathing cue text that alternates with the scene's cycle. */
function BreathCue({ cues, cycle, reduce }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setPhase((p) => (p + 1) % 2), (cycle / 2) * 1000);
    return () => clearInterval(t);
  }, [cycle, reduce]);
  return (
    <p
      aria-live="polite"
      className="rounded-full bg-white/25 px-5 py-2 text-small font-medium text-white backdrop-blur-sm"
    >
      {cues[reduce ? 0 : phase]}
    </p>
  );
}

export default function CalmScene({ sceneKey, onClose, lang = "en" }) {
  const scene = SCENES[sceneKey];
  const t = calmT(lang).scenes[sceneKey] || {};
  const chrome = calmT(lang);
  const reduce = useReducedMotion();
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!scene) return null;
  const Icon = scene.icon;
  const label = t.label || sceneKey;

  return (
    <motion.div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] outline-none"
      style={{ background: scene.bg }}
    >
      {sceneKey === "waves" && <WavesScene reduce={reduce} />}
      {sceneKey === "sunrise" && <SunriseScene reduce={reduce} />}
      {sceneKey === "diya" && <DiyaScene reduce={reduce} />}

      <div className="absolute inset-x-0 top-5 flex items-start justify-between px-5 sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-4 py-1.5 text-caption font-medium text-white">
          <Icon size={14} aria-hidden="true" /> {label}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={chrome.closeScene}
          className="rounded-full bg-black/25 p-2 text-white transition hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-4 px-6 text-center">
        <BreathCue cues={t.cue || ["", ""]} cycle={scene.cycle} reduce={reduce} />
        <p className="max-w-md text-caption leading-relaxed text-white/80">
          {chrome.stayNote}
        </p>
      </div>
    </motion.div>
  );
}

export { SCENES };


function WavesScene({ reduce }) {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-[46%] w-full"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {[
        { y: 0, fill: "rgba(255,255,255,0.35)", dur: 14, dy: 18 },
        { y: 40, fill: "rgba(255,255,255,0.55)", dur: 10, dy: 26 },
        { y: 90, fill: "rgba(38,84,98,0.75)", dur: 16, dy: 20 },
      ].map((w, i) => (
        <motion.path
          key={i}
          fill={w.fill}
          d={`M0 ${140 + w.y} Q 180 ${100 + w.y} 360 ${140 + w.y} T 720 ${140 + w.y} T 1080 ${140 + w.y} T 1440 ${140 + w.y} V 320 H 0 Z`}
          animate={reduce ? undefined : { y: [0, -w.dy, 0] }}
          transition={{ duration: w.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

function SunriseScene({ reduce }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <motion.div
        className="absolute left-1/2 top-[38%] h-40 w-40 -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle,#ffd98a 0%,#f2a65a 60%,transparent 72%)" }}
        animate={reduce ? undefined : { y: [30, -12, 30], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg className="absolute inset-x-0 bottom-0 h-[34%] w-full" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <path
          d="M0 120 L220 60 L420 118 L640 46 L860 116 L1080 72 L1280 122 L1440 92 V200 H0 Z"
          fill="rgba(38,32,44,0.82)"
        />
      </svg>
    </div>
  );
}

function DiyaScene({ reduce }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <motion.div
        className="absolute h-64 w-64 rounded-full"
        style={{ background: "radial-gradient(circle,rgba(255,170,60,0.32) 0%,transparent 70%)" }}
        animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative h-16 w-8"
        style={{ background: "linear-gradient(180deg,#ffe9a8 0%,#ffb84d 55%,#e2701d 100%)", borderRadius: "50% 50% 45% 45%" }}
        animate={reduce ? undefined : { scaleY: [1, 1.18, 0.94, 1], scaleX: [1, 0.92, 1.06, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute bottom-[18%] h-8 w-24 rounded-b-full rounded-t-sm"
        style={{ background: "linear-gradient(180deg,#8a4a1f 0%,#5d2f10 100%)" }}
      />
    </div>
  );
}
