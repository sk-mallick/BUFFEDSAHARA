import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Video,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import cn from "../../lib/cn";

export default function VideoPreviewModal({
  isOpen,
  onClose,
  title = "Private Video Consultation Preview",
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [connecting, setConnecting] = useState(true);

  const stopTracks = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        /* ignore */
      }
      audioCtxRef.current = null;
    }
  };

  const initMedia = async () => {
    stopTracks();
    setPermissionError("");
    setConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Audio waveform analyser
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const actx = new AudioCtx();
        audioCtxRef.current = actx;
        const source = actx.createMediaStreamSource(stream);
        const analyser = actx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const drawAudio = () => {
          animFrameRef.current = requestAnimationFrame(drawAudio);
          analyser.getByteFrequencyData(dataArray);

          if (!canvasRef.current) return;
          const cvs = canvasRef.current;
          const ctx = cvs.getContext("2d");
          ctx.clearRect(0, 0, cvs.width, cvs.height);

          const barCount = 12;
          const barWidth = cvs.width / barCount - 2;
          let x = 1;

          for (let i = 0; i < barCount; i++) {
            const idx = Math.min(Math.floor((i / barCount) * bufferLength), bufferLength - 1);
            const val = dataArray[idx] || 0;
            const barHeight = Math.max(2, (val / 255) * cvs.height);

            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            const y = cvs.height - barHeight;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 1);
            ctx.fill();

            x += barWidth + 2;
          }
        };

        drawAudio();
      }

      setConnecting(false);
    } catch {
      setPermissionError(
        "Camera or microphone access is unavailable or denied. Please check your browser permissions."
      );
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      initMedia();
    } else {
      stopTracks();
    }
    return () => {
      stopTracks();
    };
  }, [isOpen]);

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = !cameraActive;
      });
      setCameraActive(!cameraActive);
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !micActive;
      });
      setMicActive(!micActive);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-modal-title"
      className="fixed inset-0 z-modal flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-sand-200 bg-sand-50/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-100 text-sage-800">
              <Video size={16} />
            </span>
            <div>
              <h2 id="video-modal-title" className="font-display text-base font-semibold text-ink-900">
                {title}
              </h2>
              <p className="text-[11px] text-ink-500">Encrypted peer session · Camera & mic check</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-md p-1.5 text-ink-400 hover:bg-sand-200/60 hover:text-ink-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Frame Area */}
        <div className="relative aspect-video w-full bg-ink-950 overflow-hidden flex items-center justify-center">
          {permissionError ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm">
              <AlertCircle size={32} className="text-amber-400" />
              <p className="text-small text-white/90">{permissionError}</p>
              <button
                type="button"
                onClick={initMedia}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition"
              >
                <RefreshCw size={13} /> Retry access
              </button>
            </div>
          ) : (
            <>
              {/* Video Element (mirrored for natural preview) */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "h-full w-full object-cover -scale-x-100 transition-opacity duration-300",
                  cameraActive ? "opacity-100" : "opacity-0"
                )}
              />

              {/* Camera off placeholder */}
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
                  <CameraOff size={36} />
                  <p className="text-small font-medium">Camera is turned off</p>
                </div>
              )}

              {/* Loading indicator */}
              {connecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60">
                  <div className="flex items-center gap-2 text-small text-white">
                    <RefreshCw size={16} className="animate-spin" /> Setting up devices…
                  </div>
                </div>
              )}

              {/* Live Status Indicators Over Video */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-sage-400 animate-pulse" />
                  Live preview
                </span>
              </div>

              {/* Audio Waveform Meter in corner */}
              {micActive && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
                  <Mic size={12} className="text-white/80" />
                  <canvas
                    ref={canvasRef}
                    width={48}
                    height={14}
                    className="h-3.5 w-12"
                    aria-label="Microphone volume meter"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand-200 bg-sand-50/50 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleCamera}
              disabled={Boolean(permissionError)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition",
                cameraActive
                  ? "bg-white border border-sand-300 text-ink-800 hover:bg-sand-100"
                  : "bg-critical-600 text-white hover:bg-critical-700"
              )}
            >
              {cameraActive ? <Camera size={14} /> : <CameraOff size={14} />}
              {cameraActive ? "Turn Off Camera" : "Turn On Camera"}
            </button>

            <button
              type="button"
              onClick={toggleMic}
              disabled={Boolean(permissionError)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition",
                micActive
                  ? "bg-white border border-sand-300 text-ink-800 hover:bg-sand-100"
                  : "bg-critical-600 text-white hover:bg-critical-700"
              )}
            >
              {micActive ? <Mic size={14} /> : <MicOff size={14} />}
              {micActive ? "Mute Mic" : "Unmute Mic"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-md bg-marigold-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-marigold-700 transition"
            >
              <CheckCircle2 size={14} /> Done Check
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
