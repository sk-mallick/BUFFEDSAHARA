import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square, Check, AlertCircle } from "lucide-react";
import cn from "../../lib/cn";

/**
 * VoiceInputControl - Accessible voice dictation and frequency/waveform visualization.
 * Uses Web Speech API (with webkit fallback) and Web Audio API AnalyserNode for
 * real-time frequency waveforms.
 */
export default function VoiceInputControl({
  onTranscript,
  lang = "en",
  disabled = false,
  className = "",
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);

  const recognitionRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);

  // Map app lang to speech recognition language tag
  const langTag = lang === "hi" ? "hi-IN" : lang === "or" ? "or-IN" : "en-IN";

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        /* already closed */
      }
      audioCtxRef.current = null;
    }

    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    setError("");
    setTranscript("");
    setDuration(0);

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null;
    if (SpeechRec) {
      rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = langTag;

      rec.onresult = (e) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
        }
        setTranscript(text);
        if (onTranscript) onTranscript(text);
      };

      rec.onerror = (e) => {
        if (e.error !== "no-speech") {
          setError("Microphone input error. Please try again.");
        }
      };

      rec.onend = () => {
        // Recognition auto-finished
      };

      try {
        rec.start();
        recognitionRef.current = rec;
      } catch {
        // Fall back gracefully
      }
    }

    // AudioContext + Analyser for visual waveform
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const actx = new AudioCtx();
      audioCtxRef.current = actx;

      const source = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      // Draw real-time waveform
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const renderWaveform = () => {
        animFrameRef.current = requestAnimationFrame(renderWaveform);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        setAudioLevel(avg);

        if (!canvasRef.current) return;
        const cvs = canvasRef.current;
        const ctx = cvs.getContext("2d");
        ctx.clearRect(0, 0, cvs.width, cvs.height);

        const barCount = 18;
        const barWidth = cvs.width / barCount - 2;
        let x = 1;

        for (let i = 0; i < barCount; i++) {
          const idx = Math.min(Math.floor((i / barCount) * bufferLength), bufferLength - 1);
          const val = dataArray[idx] || 0;
          const height = Math.max(3, (val / 255) * (cvs.height - 2));

          const norm = val / 255;
          ctx.fillStyle = norm > 0.5 ? "rgba(158, 74, 38, 0.9)" : "rgba(45, 106, 79, 0.85)";

          const y = (cvs.height - height) / 2;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, height, 1.5);
          ctx.fill();

          x += barWidth + 2;
        }
      };

      renderWaveform();
    } catch {
      setError("Microphone access was denied or is not available.");
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatSecs = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {/* Microphone toggle button */}
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        aria-label={isRecording ? "Stop voice recording" : "Start speaking (Voice input)"}
        title={isRecording ? "Stop recording" : "Voice input"}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-all duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50",
          isRecording
            ? "bg-critical-600 text-white shadow-md animate-pulse focus-visible:outline-critical-600"
            : "border border-sand-300 bg-white text-ink-700 hover:border-marigold-400 hover:bg-sand-50 hover:text-marigold-700 focus-visible:outline-marigold-600"
        )}
      >
        {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={17} />}
      </button>

      {/* Floating live waveform pill while recording */}
      {isRecording && (
        <div
          role="status"
          aria-live="polite"
          className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-marigold-300 bg-white px-3.5 py-1.5 shadow-md z-popover whitespace-nowrap animate-in fade-in zoom-in-95 duration-200"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-critical-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-critical-600" />
          </span>
          <span className="font-mono text-xs font-semibold text-ink-800">
            {formatSecs(duration)}
          </span>
          <canvas
            ref={canvasRef}
            width={100}
            height={20}
            className="h-4 w-20"
            aria-label="Live voice waveform"
          />
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-100 text-sage-800 hover:bg-sage-200 transition"
            title="Done speaking"
            aria-label="Done speaking"
          >
            <Check size={12} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="absolute -top-12 left-0 flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 shadow-sm whitespace-nowrap z-popover">
          <AlertCircle size={13} className="shrink-0 text-amber-700" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-1 text-ink-400 hover:text-ink-700"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
