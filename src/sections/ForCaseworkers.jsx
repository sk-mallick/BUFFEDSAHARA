import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BellRing, GitBranch, ListChecks } from "lucide-react";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import BrowserFrame from "../components/BrowserFrame";
import DashboardMock from "../components/DashboardMock";
import { useLang } from "../lib/i18n";

const featIcons = [ListChecks, GitBranch, BellRing];

export default function ForCaseworkers() {
  const { t } = useLang();
  const feats = t("officials.feats");
  const reduce = useReducedMotion();

  return (
    <Section tone="sand" eyebrow={t("officials.eyebrow")} title={t("officials.title")} lead={t("officials.lead")}>
      {/* 1. Caseworker Console Showcase */}
      <div className="relative" style={{ perspective: 1200 }}>
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 20, scale: 0.99 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
          className="relative will-change-transform"
        >
          <BrowserFrame>
            <DashboardMock />
          </BrowserFrame>
        </motion.div>
      </div>

      {/* 2. Below the Caseworker console: 3 feature cards */}
      <div className="mt-10 sm:mt-12">
        <ul className="grid gap-6 md:grid-cols-3">
          {feats.map((feat, i) => {
            const Icon = featIcons[i];
            return (
              <li key={feat.title} className="h-full">
                <Reveal delay={i * 0.08} className="h-full">
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-sand-200 bg-white p-6 shadow-1 transition-all duration-fast hover:border-sand-300 hover:shadow-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-marigold-600 shadow-xs">
                          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <span className="font-mono text-caption font-semibold text-sand-400">0{i + 1}</span>
                      </div>
                      <h3 className="mt-4 font-display text-h4 text-ink-900">{feat.title}</h3>
                      <p className="mt-2 text-small leading-relaxed text-ink-700">{feat.line}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>

        {/* 3. Ethic quote & CTA */}
        <Reveal delay={0.25}>
          <div className="mt-8 flex flex-col items-start justify-between gap-6 rounded-2xl border border-sand-300/80 bg-gradient-to-r from-marigold-50/40 via-white to-sand-50/60 p-6 shadow-1 sm:flex-row sm:items-center sm:p-8">
            <blockquote className="border-l-4 border-marigold-600 pl-4 sm:pl-5">
              <p className="font-display text-h3 font-medium leading-snug text-ink-900">
                {t("officials.ethic")}
              </p>
              <p className="mt-1 text-caption text-ink-500">
                Human-in-the-loop triage · Every escalation is reviewed and decided by a human caseworker.
              </p>
            </blockquote>

            <div className="shrink-0">
              <Button to="/for-officials" size="lg">
                {t("officials.cta")}
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}