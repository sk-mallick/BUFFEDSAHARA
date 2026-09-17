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
import { HeartHandshake, PhoneCall, ShieldAlert, ShieldCheck } from "lucide-react";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import Skeleton from "../ui/Skeleton";
import cn from "../lib/cn";
import { useLang } from "../lib/i18n";
import { wellbeingFlags, wellbeingThreshold, wellbeingTrend } from "../data/mock";

const stepMeta = [
  {
    icon: ShieldCheck,
    tag: "Consent & Baseline",
    badgeCls: "bg-sand-100 text-ink-800 border-sand-200",
    tagCls: "text-ink-600 bg-sand-100/70 border border-sand-200/60",
    cardCls: "border-sand-200 bg-white hover:border-sand-300",
    nodeCls: "bg-ink-600 ring-4 ring-sand-100",
  },
  {
    icon: ShieldAlert,
    tag: "Threshold Signal",
    badgeCls: "bg-marigold-50 text-marigold-900 border-marigold-200",
    tagCls: "text-marigold-700 bg-marigold-50 border border-marigold-200/80 font-semibold",
    cardCls: "border-marigold-200/80 bg-marigold-50/30 hover:border-marigold-300",
    nodeCls: "bg-marigold-600 ring-4 ring-marigold-100",
  },
  {
    icon: PhoneCall,
    tag: "Human Outreach",
    badgeCls: "bg-sage-50 text-sage-900 border-sage-200",
    tagCls: "text-sage-700 bg-sage-50 border border-sage-200/80 font-semibold",
    cardCls: "border-sage-200/80 bg-sage-50/30 hover:border-sage-300",
    nodeCls: "bg-sage-600 ring-4 ring-sage-100",
  },
  {
    icon: HeartHandshake,
    tag: "Sustained Recovery",
    badgeCls: "bg-emerald-50 text-emerald-900 border-emerald-200",
    tagCls: "text-emerald-700 bg-emerald-50 border border-emerald-200/80 font-semibold",
    cardCls: "border-sand-200 bg-white hover:border-sand-300",
    nodeCls: "bg-emerald-600 ring-4 ring-emerald-100",
  },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const score = payload[0].value;
  const isAi = label === wellbeingFlags.ai.day;
  const isHuman = label === wellbeingFlags.human.day;
  return (
    <div className="min-w-[150px] rounded-xl border border-sand-200 bg-white p-2.5 text-[11px] leading-tight shadow-2">
      <div className="flex items-center justify-between gap-3 border-b border-sand-100 pb-1 font-mono text-[10px] text-ink-500">
        <span>Day {label}</span>
        <span className="font-semibold text-ink-900">{score}/100</span>
      </div>
      {isAi && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-marigold-700">
          <span className="h-1.5 w-1.5 rounded-full bg-marigold-600" />
          AI early signal flagged (55)
        </div>
      )}
      {isHuman && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-sage-700">
          <span className="h-1.5 w-1.5 rounded-full bg-sage-600" />
          Counsellor phone outreach (66)
        </div>
      )}
      {!isAi && !isHuman && (
        <p className="mt-1 text-[10px] text-ink-500">
          {score >= wellbeingThreshold ? "Above review threshold" : "Within safe baseline"}
        </p>
      )}
    </div>
  );
}

function ChartCard() {
  const { ai, human } = wellbeingFlags;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={wellbeingTrend} margin={{ top: 16, right: 18, left: -6, bottom: 4 }}>
        <CartesianGrid stroke="#E9DFCE" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          ticks={[1, 15, 30, 45, 60]}
          tickFormatter={(d) => `Day ${d}`}
          tick={{ fontSize: 11, fill: "#66707C" }}
          axisLine={{ stroke: "#E9DFCE" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fontSize: 11, fill: "#66707C" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* The calm threshold — crossing it asks a human to look */}
        <ReferenceLine
          y={wellbeingThreshold}
          stroke="#D97706"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{
            value: `Threshold (${wellbeingThreshold})`,
            fill: "#B45309",
            fontSize: 10,
            position: "insideTopRight",
            offset: 8,
          }}
        />
        {/* AI flag: the system notices, never acts */}
        <ReferenceDot
          x={ai.day}
          y={ai.score}
          r={6}
          fill="#FFFFFF"
          stroke="#9E4A26"
          strokeWidth={2.5}
          ifOverflow="visible"
        />
        {/* Human contact: where the story actually turns */}
        <ReferenceDot
          x={human.day}
          y={human.score}
          r={6}
          fill="#FFFFFF"
          stroke="#2D6A4F"
          strokeWidth={2.5}
          ifOverflow="visible"
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#1F2733"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, fill: "#FFFFFF", stroke: "#1F2733" }}
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
      <div className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Left — the narrative in elevated milestone cards */}
        <div className="flex flex-col justify-between">
          <Reveal>
            <ol className="relative ml-3 space-y-3 border-l-2 border-sand-300/80 pl-5 sm:pl-6">
              {story.map((item, i) => {
                const meta = stepMeta[i] ?? stepMeta[0];
                const Icon = meta.icon;
                return (
                  <li key={item.d} className="group relative">
                    {/* Node indicator on the rail */}
                    <span
                      className={cn(
                        "absolute -left-[27px] sm:-left-[31px] top-3.5 h-3 w-3 rounded-full border-2 border-sand-50 shadow-xs transition-transform group-hover:scale-110",
                        meta.nodeCls
                      )}
                    />

                    {/* Milestone card */}
                    <div
                      className={cn(
                        "rounded-xl border p-3.5 shadow-xs transition-all duration-fast hover:shadow-1",
                        meta.cardCls
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold shadow-2xs",
                            meta.badgeCls
                          )}
                        >
                          <Icon size={12} aria-hidden="true" />
                          {item.d}
                        </span>
                        <span className={cn("rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wide", meta.tagCls)}>
                          {meta.tag}
                        </span>
                      </div>
                      <p className="mt-2 text-small font-medium leading-relaxed text-ink-800">
                        {item.t}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Reveal>

          {/* Disclaimer reassurance */}
          <Reveal delay={0.15}>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-sand-200 bg-white/70 px-3.5 py-2 text-caption text-ink-600 shadow-2xs">
              <ShieldAlert size={14} className="shrink-0 text-sand-400" aria-hidden="true" />
              <span>{t("demo.disclaimer")}</span>
            </div>
          </Reveal>
        </div>

        {/* Right — the annotated chart stage */}
        <div ref={stageRef} className="h-full">
          <Reveal delay={0.08} className="h-full">
            <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-sand-200 bg-white p-5 shadow-1 sm:p-6">
              <div>
                {/* Stage Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-100 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                      <h3 className="font-display text-h4 font-medium text-ink-900">Case #SA-24-083</h3>
                      <span className="rounded-full bg-sand-100 px-2 py-0.5 font-mono text-[10px] text-ink-600">Anonymized</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-500">60-day longitudinal trajectory · weekly cadence</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-sand-200 bg-sand-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-ink-800">
                    <span>28</span>
                    <span className="text-sand-400">→</span>
                    <span className="text-marigold-700">55</span>
                    <span className="text-sand-400">→</span>
                    <span className="text-sage-700">66</span>
                    <span className="text-sand-400">→</span>
                    <span className="text-emerald-700">33</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-caption text-ink-700">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-ink-900" />
                      {t("demo.score")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-marigold-800">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-marigold-600 bg-white" />
                      {t("demo.ai")} · D{ai.day}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sage-800">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-sage-600 bg-white" />
                      {t("demo.human")} · D{human.day}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    <span aria-hidden="true" className="inline-block w-3 border-t-2 border-dashed border-amber-500" />
                    {t("demo.threshold")} {wellbeingThreshold}
                  </span>
                </div>

                {/* Live Chart Canvas */}
                <div className="mt-3 h-[260px]">
                  <AnimatePresence mode="wait">
                    {loaded ? (
                      <motion.div
                        key="chart"
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, ease: [0.45, 0, 0.25, 1] }}
                        className="h-full"
                      >
                        <ChartCard />
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

              {/* Milestone Summary Tiles */}
              <div className="mt-4 grid gap-2 border-t border-sand-100 pt-3 sm:grid-cols-3">
                <div className="rounded-xl border border-sand-200/80 bg-sand-50/60 p-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-500">Day 01–35</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-ink-800">Gentle Baseline</p>
                  <p className="mt-0.5 text-[9.5px] leading-tight text-ink-500">Weekly check-ins at survivor's pace.</p>
                </div>
                <div className="rounded-xl border border-marigold-200/80 bg-marigold-50/60 p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-marigold-700">Day 36 Signal</p>
                    <span className="h-1.5 w-1.5 rounded-full bg-marigold-600" />
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold text-marigold-900">Score 55 Flagged</p>
                  <p className="mt-0.5 text-[9.5px] leading-tight text-ink-700">Quiet alert sent to caseworker.</p>
                </div>
                <div className="rounded-xl border border-sage-200/80 bg-sage-50/60 p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-sage-700">Day 41 Support</p>
                    <span className="h-1.5 w-1.5 rounded-full bg-sage-600" />
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold text-sage-900">Human Connection</p>
                  <p className="mt-0.5 text-[9.5px] leading-tight text-ink-700">Phone conversation starts recovery.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}