import { motion, useReducedMotion } from "framer-motion";
import { BellRing, GitBranch, ListChecks } from "lucide-react";
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
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div>
          <ul className="space-y-6">
            {feats.map((feat, i) => {
              const Icon = featIcons[i];
              return (
                <li key={feat.title}>
                  <Reveal delay={i * 0.08}>
                    <div className="flex items-start gap-4">
                      <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-1">
                        <Icon size={19} strokeWidth={1.5} className="text-marigold-600" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="font-display text-h4 text-ink-900">{feat.title}</h3>
                        <p className="mt-1.5 text-small leading-relaxed text-ink-700">{feat.line}</p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ul>

          <Reveal delay={0.25}>
            <blockquote className="mt-8 border-l-2 border-marigold-600 pl-5">
              <p className="font-display text-h3 font-medium leading-snug text-ink-900">{t("officials.ethic")}</p>
            </blockquote>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-8">
              <Button to="/for-officials" size="lg">
                {t("officials.cta")}
              </Button>
            </div>
          </Reveal>
        </div>

        {/* The frame arrives slightly tilted and settles upright — a slow nod,
            not a parallax game. Reduced motion renders it static. */}
        <div className="relative" style={{ perspective: 1200 }}>
          <motion.div
            initial={reduce ? undefined : { opacity: 0, rotateX: 7, y: 18, scale: 0.98 }}
            whileInView={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
            className="relative will-change-transform"
          >
            <BrowserFrame>
              <DashboardMock />
            </BrowserFrame>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}