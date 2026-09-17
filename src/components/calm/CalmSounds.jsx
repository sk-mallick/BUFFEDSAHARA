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
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const teardown = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    nodesRef.current.forEach((n) => {
      try { n.stop?.(); } catch { /* already stopped */ }
      try { n.disconnect?.(); } catch { /* already disconnected */ }
    });
    nodesRef.current = [];
    try { ctxRef.current?.close(); } catch { /* already closed */ }
    ctxRef.current = null;
    analyserRef.current = null;
  };

  useEffect(() => teardown, []);

  // Waveform render loop
  useEffect(() => {
    if (!playing || !analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx2d = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 32;
      const barWidth = (canvas.width / barCount) - 2;
      let x = 1;

      for (let i = 0; i < barCount; i++) {
        // Sample frequency band with gentle dampening for smooth aesthetic
        const index = Math.min(Math.floor((i / barCount) * bufferLength), bufferLength - 1);
        const val = dataArray[index] || 0;
        const barHeight = Math.max(3, (val / 255) * (canvas.height - 4));

        // Warm Sage gradient
        const alpha = Math.min(1, Math.max(0.35, val / 255));
        ctx2d.fillStyle = i % 2 === 0 ? `rgba(45, 106, 79, ${alpha})` : `rgba(158, 74, 38, ${alpha * 0.8})`;

        const y = canvas.height - barHeight;
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, barWidth, barHeight, 2);
        ctx2d.fill();

        x += barWidth + 2;
      }
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playing]);

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

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      gain.connect(analyser);
      analyserRef.current = analyser;

      nodesRef.current.push(gain, analyser);

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
        <div className="mt-4 space-y-3 rounded-2xl border border-sage-200 bg-sage-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sage-600" />
              </span>
              <span className="text-small font-medium text-ink-900 capitalize">
                Playing {SOUNDS.find((s) => s.id === playing)?.id || "soundscape"}
              </span>
            </div>
            <button
              type="button"
              onClick={stop}
              className="rounded-full border border-sand-300 bg-white px-3.5 py-1 text-caption font-medium text-ink-700 transition hover:bg-sand-100 hover:text-ink-900"
            >
              {t.stop}
            </button>
          </div>

          {/* Real-time frequency waveform */}
          <div className="overflow-hidden rounded-lg bg-white/70 p-2 shadow-inner">
            <canvas
              ref={canvasRef}
              width={280}
              height={36}
              className="h-9 w-full rounded"
              aria-label="Audio frequency visualization"
            />
          </div>

          <div className="flex items-center gap-3">
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
            <span className="text-caption font-mono text-ink-500 w-9 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
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

