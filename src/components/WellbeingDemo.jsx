import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import Skeleton from "../ui/Skeleton";
import { useLang } from "../lib/i18n";
import { wellbeingFlags, wellbeingThreshold, wellbeingTrend } from "../data/mock";

const tooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid #E9DFCE",
  borderRadius: 12,
  boxShadow: "0 2px 4px rgba(31,39,51,.05), 0 8px 20px -4px rgba(31,39,51,.10)",
  fontSize: 12,
  color: "#1F2733",
};

function ChartCard({ t }) {
  const { ai, human } = wellbeingFlags;
  return (
    <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 520, height: 280 }}>
      <LineChart data={wellbeingTrend} margin={{ top: 14, right: 18, left: -14, bottom: 0 }}>
        <CartesianGrid stroke="#E9DFCE" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={(d) => (d === 1 || d % 10 === 0 ? `D${d}` : "")}
          tick={{ fontSize: 11, fill: "#66707C" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#66707C" }}
          axisLine={false}
          tickLine={false}
          label={{ value: "", angle: 0 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value}/100`, t("demo.score")]}
          labelFormatter={(day) => `Day ${day}`}
        />
        {/* The calm threshold — crossing it asks a human to look */}
        <ReferenceLine y={wellbeingThreshold} stroke="#E0B75E" strokeDasharray="5 5" />
        {/* AI flag: the system notices, never acts */}
        <ReferenceDot
          x={ai.day}
          y={ai.score}
          r={5}
          fill="#FFFFFF"
          stroke="#9E4A26"
          strokeWidth={2.5}
          ifOverflow="visible"
        />
        {/* Human contact: where the story actually turns */}
        <ReferenceDot
          x={human.day}
          y={human.score}
          r={5}
          fill="#FFFFFF"
          stroke="#4E6A40"
          strokeWidth={2.5}
          ifOverflow="visible"
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#1F2733"
          strokeWidth={2.25}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
          animationDuration={1400}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function WellbeingDemo() {
  const { t } = useLang();
  const reduce = useReducedMotion();
  const stageRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // MOCK LOADING — replace with a real API fetch; components read `loaded`.
  // Loading begins when the stage nears the viewport (IO + scroll-proximity,
  // with a safety timer), so the line-draw animation is seen, not missed.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let done = false;
    let io;
    let timer;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85 && r.bottom > 0) finish();
    };
    const cleanup = () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
    const finish = () => {
      if (done) return;
      done = true;
      cleanup();
      setLoaded(true);
    };
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) finish();
        },
        { rootMargin: "0px 0px -12% 0px" }
      );
      io.observe(el);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // already near the fold (e.g., deep-link)? start immediately
    timer = setTimeout(finish, 5000); // safety: never strand the skeleton
    return cleanup;
  }, []);

  const story = t("demo.story");
  const { ai, human } = wellbeingFlags;

  return (
    <Section tone="sand" eyebrow={t("demo.eyebrow")} title={t("demo.title")} lead={t("demo.lead")}>
      <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.3fr] lg:gap-16">
        {/* Left — the narrative in plain words */}
        <div className="lg:sticky lg:top-28">
          <Reveal>
            <ol className="space-y-5">
              {story.map((item) => (
                <li key={item.d} className="flex items-start gap-4">
                  <span className="mt-0.5 shrink-0 rounded-md bg-white px-2.5 py-1 font-mono text-caption font-medium text-marigold-700 shadow-1">
                    {item.d}
                  </span>
                  <p className="text-small leading-relaxed text-ink-700">{item.t}</p>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 text-caption leading-relaxed text-ink-500">※ {t("demo.disclaimer")}</p>
          </Reveal>
        </div>

        {/* Right — the annotated chart stage */}
        <div ref={stageRef}>
          <Reveal delay={0.08}>
            <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white p-5 shadow-3 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-h4 text-ink-900">Case #SA-24-083 · anonymized</h3>
                <span className="font-mono text-caption text-ink-500">60 days · check-in cadence weekly</span>
              </div>

              {/* Legend */}
              <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-ink-700">
                <li className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="h-0.5 w-5 bg-ink-900" />
                  {t("demo.score")}
                </li>
                <li className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-marigold-600 bg-white" />
                  {t("demo.ai")} · D{ai.day}
                </li>
                <li className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-sage-600 bg-white" />
                  {t("demo.human")} · D{human.day}
                </li>
                <li className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block w-5 border-t border-dashed border-amber-400" />
                  {t("demo.threshold")} {wellbeingThreshold}
                </li>
              </ul>

              <div className="mt-4 h-[280px]">
                <AnimatePresence mode="wait">
                  {loaded ? (
                    <motion.div
                      key="chart"
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, ease: [0.45, 0, 0.25, 1] }}
                      className="h-full"
                    >
                      <ChartCard t={t} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="skeleton"
                      exit={{ opacity: 0 }}
                      className="flex h-full flex-col justify-between py-2"
                      aria-busy="true"
                      aria-label="Loading the wellbeing trend"
                    >
                      <div className="flex items-end justify-between gap-4">
                        <Skeleton className="h-2 w-16" />
                        <Skeleton className="h-2 w-16" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                      <div className="relative h-40 overflow-hidden rounded-xl border border-sand-200/70 bg-sand-50/50">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Skeleton className="h-full w-4/5" />
                        </div>
                      </div>
                      <Skeleton className="h-2 w-24" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}