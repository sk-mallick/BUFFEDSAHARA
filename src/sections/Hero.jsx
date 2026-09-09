import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, HandHeart, Lock, Play, UserRound } from "lucide-react";
import Img from "../ui/Img";
import Button from "../ui/Button";
import { useLang } from "../lib/i18n";

const SCENE = "/hero-landscape.jpg";


/**
 * A depth layer. Two nested planes:
 *  · outer — scroll-progress translation (useScroll)
 *  · inner — pointer translation (spring-smoothed motion values)
 * Everything is translate3d-only: no layout work, no repaints per frame.
 */
function Layer({
  sx,
  sy,
  mx = 0,
  my = 0,
  scrollY,
  scrollRange = [0, 0],
  className = "",
  innerClassName = "",
  children,
  active = true,
}) {
  const x = useTransform(sx, (v) => v * mx);
  const y = useTransform(sy, (v) => v * my);
  const scroll = useTransform(scrollY, [0, 1], scrollRange);
  return (
    <motion.div aria-hidden="true" style={active ? { y: scroll } : undefined} className={className}>
      <motion.div style={active ? { x, y } : undefined} className={innerClassName}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/*
 * Ridge mask — an SVG path traced to the photograph's actual horizon line
 * (viewBox 0 0 100 100 stretched over the layer). The slight blur (stdDev 0.7)
 * softens the cut so it reads as atmospheric haze at the ridge, not a decal.
 * Everything below the ridge is opaque, so the mountain pixels physically
 * occlude the "Hope" typography sitting underneath this layer.
 */
const RIDGE_MASK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cfilter id='b' x='-10%25' y='-10%25' width='120%25' height='120%25'%3E%3CfeGaussianBlur stdDeviation='0.7'/%3E%3C/filter%3E%3Cpath d='M0 41 L6 36 L14 31 L21 35 L28 30 L34 34 L41 28 L49 31 L56 24.5 L63 30.5 L70 34 L78 37 L86 39 L94 42 L100 44 L100 101 L0 101 Z' fill='white' filter='url(%23b)'/%3E%3C/svg%3E\")";
const FORE_MASK =
  "linear-gradient(to top, black 0%, black 16%, rgba(0,0,0,0.5) 24%, transparent 34%)";

export default function Hero() {
  const { t } = useLang();
  const reduce = useReducedMotion();
  const ref = useRef(null);

  /* ---- pointer + ambient parallax: motion values only, never React state ----
   *  px/py     – cursor position in [-1, 1]
   *  rawX/rawY – cursor offset blended with a slow continuous drift; these feed
   *              the springs, so the smoothing/interpolation is preserved.
   *  A requestAnimationFrame loop keeps a gentle ambient sway running even when
   *  the cursor is completely still (and keeps going after pointerleave), so the
   *  hero feels alive without requiring any mouse movement.
   */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const sx = useSpring(rawX, { stiffness: 60, damping: 26, mass: 0.9 });
  const sy = useSpring(rawY, { stiffness: 60, damping: 26, mass: 0.9 });

  useEffect(() => {
    const fine = window.matchMedia?.("(pointer: fine)").matches;
    const el = ref.current;
    if (!el) return;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      px.set(((e.clientX - r.left) / r.width - 0.5) * 2);
      py.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    const onLeave = () => {
      px.set(0);
      py.set(0);
    };

    let raf = 0;
    let abort = false;

    // Continuous idle drift — slow, subtle, cinematic. Off under reduced-motion.
    const tick = (now) => {
      if (abort) return;
      const t = now / 1000;
      if (!reduce) {
        const ax = Math.sin(t * 0.18) * 0.06 + Math.sin(t * 0.045) * 0.025;
        const ay = Math.sin(t * 0.13 + 1.3) * 0.045 + Math.cos(t * 0.06) * 0.02;
        rawX.set(px.get() + ax);
        rawY.set(py.get() + ay);
      } else {
        rawX.set(0);
        rawY.set(0);
      }
      raf = requestAnimationFrame(tick);
    };

    if (fine && !reduce) {
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      raf = requestAnimationFrame(tick);
    }
    return () => {
      abort = true;
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [px, py, rawX, rawY, reduce]);

  /* ---- scroll progress ---- */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const on = !reduce;
  const live = { sx, sy, scrollY: scrollYProgress, active: on };

  /* Atmospheric text drifts upward, independently of the scenery. */
  const hopeScroll = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const hopeFade = useTransform(scrollYProgress, [0, 0.85], [1, 0.25]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const contentFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={ref}
      aria-label="Sahara — support that finds you"
      className="relative isolate flex h-[100svh] min-h-[620px] flex-col overflow-hidden bg-ink-900"
    >
      {/* LAYER 1 · SKY / SUN — base photograph, slowest plane */}
      <Layer {...live} mx={1.5} my={1} scrollRange={[0, 46]} className="absolute inset-0 z-0" innerClassName="absolute inset-0">
        <Img
          src={SCENE}
          alt=""
          eager
          className="h-full w-full scale-[1.15] object-cover object-[68%_center]"
        />
      </Layer>

      {/* Warm light around the sunrise — part of the photography's mood */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-[radial-gradient(560px_at_79%_40%,rgba(255,196,120,0.20),transparent_70%)]"
      />

      {/* LAYER 6 · ATMOSPHERIC TYPOGRAPHY — "Hope Still Rises", BEHIND the mountains */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 select-none"
        style={on ? { y: hopeScroll, opacity: hopeFade } : undefined}
      >
        {/* Lowered so the ridge physically slices through the lower glyphs —
            occlusion (not opacity) is what sells the depth. */}
        <Layer {...live} mx={4.5} my={2.5} className="absolute inset-0" innerClassName="absolute inset-0">
          <div className="absolute left-[30vw] top-[9vh] flex items-start md:left-[33vw] md:top-[12vh]">
            <span className="font-display text-[17vw] font-medium leading-[0.9] tracking-[-0.03em] text-[#EDE6D6] opacity-[0.26] md:text-[15vw] lg:text-[16vw]">
              Hope
            </span>
            <span className="ml-[1vw] mt-[4vh] font-display text-[5vw] font-medium leading-[1.05] tracking-[-0.01em] text-[#E9C79A] opacity-[0.24] md:text-[3.8vw] lg:text-[3.2vw]">
              Still
              <br />
              Rises
            </span>
          </div>
        </Layer>
      </motion.div>

      {/* LAYERS 2–4 · MOUNTAINS + MIST — the same photograph re-framed.
          The mask keeps only the ridge and everything below it, so the ridge
          physically occludes the lower half of "Hope" — type behind mountain. */}
      <Layer {...live} mx={3} my={1.8} scrollRange={[0, 92]} className="absolute inset-0 z-20" innerClassName="absolute inset-0">
        <Img
          src={SCENE}
          alt=""
          eager
          className="h-full w-full scale-[1.15] object-cover object-[68%_center]"
          style={{ maskImage: RIDGE_MASK, WebkitMaskImage: RIDGE_MASK }}
        />
        {/* valley mist breathing between the planes (off with reduced motion) */}
        <motion.div
          className="absolute inset-x-0 top-[42%] h-[26%] bg-[linear-gradient(to_bottom,transparent,rgba(226,229,231,0.10),transparent)]"
          animate={on ? { opacity: [0.6, 1, 0.6] } : undefined}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      </Layer>

      {/* LAYER 5 · FOREGROUND ROCKS & VEGETATION — closest plane, strongest parallax */}
      <Layer {...live} mx={8} my={4.5} scrollRange={[0, 168]} className="absolute inset-0 z-30" innerClassName="absolute inset-0">
        <Img
          src={SCENE}
          alt=""
          eager
          className="h-full w-full scale-[1.34] object-cover object-bottom"
          style={{ maskImage: FORE_MASK, WebkitMaskImage: FORE_MASK }}
        />
      </Layer>

      {/* Legibility — directional but gentle; the photograph stays bright.
          Plus a localised atmospheric treatment (soft dark pool + faint blur)
          that exists only around the content region, never over the range. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[35] bg-[linear-gradient(78deg,rgba(17,22,30,0.72)_0%,rgba(17,22,30,0.46)_36%,rgba(17,22,30,0)_58%)]"
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-[35] h-40 bg-gradient-to-t from-black/45 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-[35] h-32 bg-gradient-to-b from-black/45 via-black/20 to-transparent" />

      {/* LAYER 7 · CONTENT — stable foreground, max 2px pointer drift */}
      <motion.div
        style={{ zIndex: 40, translateZ: 0, ...(on ? { y: contentY, opacity: contentFade } : {}) }}
        className="pointer-events-none relative z-40 flex flex-1 items-center"
      >
        <div className="shell pointer-events-auto relative w-full pb-24 pt-[calc(6rem+5vh)] md:pb-32">
          <motion.div className="max-w-2xl">
            <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/85 [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">
              {t("hero.eyebrow2")}
              <span aria-hidden="true" className="h-px w-14 bg-white/50" />
            </p>
          </motion.div>

          <motion.h1
            
            className="mt-5 max-w-xl font-display text-[2.6rem] font-medium leading-[1.05] tracking-[-0.02em] text-white [text-shadow:0_2px_24px_rgba(10,14,20,0.35)] md:text-[4.2rem] md:leading-[1.02]"
          >
            {t("hero.title")}
          </motion.h1>

          <motion.p
            
            className="mt-5 max-w-xl font-medium text-white text-body-lg [text-shadow:0_1px_16px_rgba(6,9,14,0.75),0_1px_3px_rgba(6,9,14,0.6)]"
          >
            {t("hero.sub")}
          </motion.p>

          <motion.div  className="mt-8 flex flex-wrap items-center gap-4">
            <Button to="/talk" size="lg" className="rounded-full px-7">
              {t("hero.cta1")}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
            <Button to="/how-it-works" size="lg" variant="secondary" className="rounded-full px-6">
              <Play size={16} aria-hidden="true" className="text-marigold-600" />
              {t("hero.watch")}
            </Button>
          </motion.div>

          <motion.p
            
            className="mt-7 inline-flex flex-wrap items-center gap-x-6 gap-y-2 text-small font-medium text-white/90 [text-shadow:0_1px_12px_rgba(10,14,20,0.55),0_1px_3px_rgba(10,14,20,0.4)]"
          >
            <span className="inline-flex items-center gap-1.5">
              <Lock size={14} aria-hidden="true" className="text-white/70" />
              {t("hero.trust1")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HandHeart size={14} aria-hidden="true" className="text-white/70" />
              {t("hero.trust2")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={14} aria-hidden="true" className="text-white/70" />
              {t("hero.trust3")}
            </span>
          </motion.p>
        </div>
      </motion.div>

      {/* Scroll indicator — minimal line wipe, no bouncing */}
      <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2" style={{ zIndex: 40 }}>
        <a
          href="#after-hero"
          onClick={(e) => {
            e.preventDefault();
            ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
          }}
          className="group inline-flex items-center gap-3 text-white/75 [text-shadow:0_1px_10px_rgba(10,14,20,0.5)] transition-colors duration-fast ease-soft hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80"
        >
          <span className="relative h-12 w-px overflow-hidden bg-white/25">
            <motion.span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1/2 bg-white"
              style={{ originY: 0 }}
              animate={on ? { y: ["-100%", "220%"] } : undefined}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
          <span className="text-[11px] leading-[1.5] tracking-[0.08em]">
            {t("hero.scroll").split(" ")[0]}
            <br />
            {t("hero.scroll").split(" ").slice(1).join(" ")}
          </span>
        </a>
      </div>

      {/* Ministry attribution — quiet, bottom-right */}
      <p className="absolute bottom-20 right-6 z-40 text-right text-[10.5px] leading-[1.6] text-white/70 [text-shadow:0_1px_8px_rgba(10,14,20,0.4)]">
        <span className="font-semibold text-white/85">{t("hero.initiative")}</span>
        <br />
        {t("hero.ministry")}
        <br />
        {t("hero.government")}
      </p>

      {/* Anchor for the scroll cue — the content after the hero */}
      <span id="after-hero" className="absolute -bottom-px" />


    </section>
  );

}

