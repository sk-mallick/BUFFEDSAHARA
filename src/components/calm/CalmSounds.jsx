import { useEffect, useRef, useState } from "react";
import { CloudRain, Waves, Music4, Pause, Play, Volume2 } from "lucide-react";
import cn from "../../lib/cn";
import { calmT } from "../../data/calmI18n";

// ============================================================================
// CalmSounds — generated soundscapes via the Web Audio API. No audio files,
// no network, no licensing concerns: everything is synthesised locally.
//
//   rain   — filtered white noise with a soft low-pass (steady shower)
//   waves  — brown noise whose brightness slowly swells (rolling surf)
//   drone  — two detuned low sine oscillators (a warm, quiet hum)
//
// The AudioContext is created lazily on the first user gesture (browser
// autoplay policy) and fully torn down on stop/unmount.
// ============================================================================

const SOUNDS = [
  { id: "rain", icon: CloudRain },
  { id: "waves", icon: Waves },
  { id: "drone", icon: Music4 },
];

function makeNoiseBuffer(ctx, brown) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buf;
}

export default function CalmSounds({ lang = "en" }) {
  const t = calmT(lang);
  const [playing, setPlaying] = useState(null);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState("");
  const ctxRef = useRef(null);
  const nodesRef = useRef([]);

  const teardown = () => {
    nodesRef.current.forEach((n) => {
      try { n.stop?.(); } catch { /* already stopped */ }
      try { n.disconnect?.(); } catch { /* already disconnected */ }
    });
    nodesRef.current = [];
    try { ctxRef.current?.close(); } catch { /* already closed */ }
    ctxRef.current = null;
  };

  useEffect(() => teardown, []);

  const stop = () => { teardown(); setPlaying(null); };

  const start = (id) => {
    teardown();
    setError("");
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      nodesRef.current.push(gain);

      if (id === "rain") {
        const src = ctx.createBufferSource();
        src.buffer = makeNoiseBuffer(ctx, false);
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 900;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 250;
        src.connect(hp).connect(lp).connect(gain);
        src.start();
        nodesRef.current.push(src, lp, hp);
      } else if (id === "waves") {
        const src = ctx.createBufferSource();
        src.buffer = makeNoiseBuffer(ctx, true);
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 500;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.08; // ~12s swell
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 320;
        lfo.connect(lfoGain).connect(lp.frequency);
        src.connect(lp).connect(gain);
        src.start();
        lfo.start();
        nodesRef.current.push(src, lp, lfo, lfoGain);
      } else if (id === "drone") {
        [110, 164.8].forEach((f, i) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = f + (i ? 1.5 : 0);
          const g = ctx.createGain();
          g.gain.value = i ? 0.12 : 0.2;
          osc.connect(g).connect(gain);
          osc.start();
          nodesRef.current.push(osc, g);
        });
      }
      setPlaying(id);
    } catch {
      setError(t.soundError);
      setPlaying(null);
    }
  };

  const changeVolume = (v) => {
    setVolume(v);
    const g = nodesRef.current[0];
    if (g && ctxRef.current) g.gain.setTargetAtTime(v, ctxRef.current.currentTime, 0.1);
  };

  return (
    <div>
      <p className="text-small leading-relaxed text-ink-600">{t.soundsIntro}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {SOUNDS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => (playing === id ? stop() : start(id))}
            aria-pressed={playing === id}
            className={cn(
              "rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600",
              playing === id
                ? "border-sage-500 bg-sage-50"
                : "border-sand-200 bg-white hover:border-sage-300"
            )}
          >
            <span className="flex items-center justify-between">
              <Icon size={18} strokeWidth={1.6} className="text-sage-700" aria-hidden="true" />
              {playing === id ? (
                <Pause size={15} className="text-sage-700" aria-hidden="true" />
              ) : (
                <Play size={15} className="text-ink-400" aria-hidden="true" />
              )}
            </span>
            <span className="mt-2 block text-small font-semibold text-ink-900">{t.sounds[id].label}</span>
            <span className="mt-0.5 block text-caption text-ink-500">{t.sounds[id].desc}</span>
          </button>
        ))}
      </div>

      {playing && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-sand-100 px-4 py-3">
          <Volume2 size={16} className="shrink-0 text-ink-600" aria-hidden="true" />
          <label className="sr-only" htmlFor="calm-vol">{t.volume}</label>
          <input
            id="calm-vol"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="h-1.5 w-full accent-sage-700"
          />
          <button
            type="button"
            onClick={stop}
            className="shrink-0 rounded-full border border-sand-300 bg-white px-3 py-1 text-caption font-medium text-ink-700 hover:border-ink-400"
          >
            {t.stop}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-small text-amber-800">
          {error}
        </p>
      )}
    </div>
  );
}

