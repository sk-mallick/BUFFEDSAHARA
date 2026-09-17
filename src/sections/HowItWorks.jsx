import { Activity, BellRing, HandHeart, Heart, PhoneCall, Radar } from "lucide-react";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import { useLang } from "../lib/i18n";

const icons = [PhoneCall, Heart, Radar, Activity, BellRing, HandHeart];

export default function HowItWorks() {
  const { t } = useLang();
  const steps = t("how.steps");

  return (
    <Section tone="field" eyebrow={t("how.eyebrow")} title={t("how.title")} lead={t("how.lead")}>
      {/* Desktop: horizontal rail of steps */}
      <ol className="relative hidden lg:grid lg:grid-cols-6 lg:gap-5">
        <li aria-hidden="true" className="absolute left-8 right-8 top-9 border-t border-sand-300/80" />
        {steps.map((step, i) => {
          const Icon = icons[i];
          return (
            <li key={step.label} className="relative">
              <Reveal delay={i * 0.08} className="h-full">
                <div className="group flex h-full flex-col items-center pt-2 text-center">
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-sand-200 bg-white shadow-xs transition-colors transition-shadow duration-fast group-hover:border-marigold-400 group-hover:shadow-sm">
                    <Icon size={22} strokeWidth={1.5} className="text-marigold-600" aria-hidden="true" />
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-marigold-600 text-[10px] font-mono font-bold text-white shadow-xs">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-small font-semibold leading-snug text-ink-900">{step.label}</h3>
                  <p className="mt-2 text-caption leading-relaxed text-ink-600">{step.sub}</p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>

      {/* Mobile / tablet: vertical rail */}
      <ol className="relative lg:hidden">
        <li aria-hidden="true" className="absolute bottom-4 left-7 top-4 border-l border-sand-300" />
        {steps.map((step, i) => {
          const Icon = icons[i];
          return (
            <li key={step.label} className="relative pb-8 pl-0 last:pb-0">
              <Reveal delay={i * 0.06}>
                <div className="flex items-start gap-5">
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sand-200 bg-white shadow-sm">
                    <Icon size={22} strokeWidth={1.5} className="text-marigold-600" aria-hidden="true" />
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-marigold-600 text-[10px] font-mono font-bold text-white shadow-xs">
                      0{i + 1}
                    </span>
                  </div>
                  <div className="pt-1.5">
                    <h3 className="font-display text-h4 text-ink-900">{step.label}</h3>
                    <p className="mt-1.5 text-small leading-relaxed text-ink-600">{step.sub}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>

      <Reveal delay={0.15}>
        <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 rounded-2xl border border-sage-300/80 bg-sage-50/90 p-5 shadow-xs">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-600 text-white shadow-xs">
            <HandHeart size={20} aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-sage-800">Human-In-The-Loop Principle</p>
            <p className="mt-0.5 text-small leading-relaxed text-ink-700">{t("how.footnote")}</p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}