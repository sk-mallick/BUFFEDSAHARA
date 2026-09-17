import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Img from "../ui/Img";
import cn from "../lib/cn";
import { testimonialImages } from "../data/mock";

const SLIDE_MS = 6500;

export default function ImpactCarousel({ slides, tag, className }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const [hoverPaused, setHoverPaused] = useState(false);

  const paused = !playing || hoverPaused || reduce;
  const count = slides.length;

  const go = useCallback(
    (next) => setIndex(((next % count) + count) % count),
    [count]
  );

  // Auto-rotate — unhurried, paused by hover/focus/reduced motion.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearInterval(id);
  }, [paused, count]);

  // Swipe support (pointer events; buttons cover keyboard paths).
  const pointer = useRef(null);
  const onPointerDown = (e) => {
    pointer.current = e.clientX;
  };
  const onPointerUp = (e) => {
    if (pointer.current == null) return;
    const dx = e.clientX - pointer.current;
    pointer.current = null;
    if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  };

  const current = slides[index];
  const image = testimonialImages[index];

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Voices from the journey"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={() => setHoverPaused(true)}
      onBlur={() => setHoverPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className={cn("group relative flex h-full flex-col overflow-hidden rounded-2xl border border-sand-200 shadow-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marigold-600", className)}
    >
      <div className="relative h-[380px] flex-1 sm:h-[420px] lg:h-full lg:min-h-[380px]" aria-live="off">
        <AnimatePresence initial={false}>
          <motion.figure
            key={index}
            className="absolute inset-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -28 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: [0.45, 0, 0.25, 1] }}
          >
            <Img
              src={image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/15 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="font-display text-h4 font-medium leading-snug text-white sm:text-[1.4rem] sm:leading-snug">
                "{current.quote}"
              </p>
              <p className="mt-4 text-small font-medium text-sand-100">
                {current.name}
                <span className="mx-2 text-sand-300" aria-hidden="true">·</span>
                <span className="font-normal text-sand-200">{tag}</span>
              </p>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      {/* Progress + controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end gap-4 bg-gradient-to-t from-ink-900/60 to-transparent px-5 pb-2.5 pt-10">
        <div className="flex flex-1 items-end gap-1.5" aria-label="Quotes">
          {slides.map((slide, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to quote ${i + 1} of ${count}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => {
                go(i);
                setPlaying(true);
              }}
              className="group/bar h-6 flex-1 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-300"
            >
              <span className="block h-[3px] w-full overflow-hidden rounded-full bg-white/30">
                <span
                  key={`${i}-${index}-${playing}`}
                  className={cn(
                    "block h-full origin-left rounded-full bg-sand-50",
                    i === index && !paused && "carousel-progress"
                  )}
                  style={i === index && paused ? { transform: "scaleX(0)" } : undefined}
                />
              </span>
            </button>
          ))}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              go(index - 1);
              setPlaying(true);
            }}
            aria-label="Previous quote"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors duration-fast ease-soft hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-300"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause rotation" : "Play rotation"}
            aria-pressed={!playing}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors duration-fast ease-soft hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-300"
          >
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => {
              go(index + 1);
              setPlaying(true);
            }}
            aria-label="Next quote"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors duration-fast ease-soft hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-300"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}