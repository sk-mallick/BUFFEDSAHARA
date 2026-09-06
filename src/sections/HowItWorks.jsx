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
      <ol className="relative hidden lg:grid lg:grid-cols-6 lg:gap-6">
        <li aria-hidden="true" className="absolute left-0 right-0 top-7 border-t border-sand-200" />
        {steps.map((step, i) => {
          const Icon = icons[i];
          return (
            <li key={step.label} className="relative">
              <Reveal delay={i * 0.09} className="h-full">
                <div className="flex h-full flex-col items-center pt-2 text-center">
                  <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-sand-200 bg-white shadow-1">
                    <Icon size={22} strokeWidth={1.5} className="text-marigold-600" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-small font-semibold leading-snug text-ink-900">{step.label}</h3>
                  <p className="mt-2 text-caption leading-relaxed text-ink-500">{step.sub}</p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>

      {/* Mobile / tablet: vertical rail */}
      <ol className="relative lg:hidden">
        <li aria-hidden="true" className="absolute bottom-4 left-7 top-4 border-l border-sand-200" />
        {steps.map((step, i) => {
          const Icon = icons[i];
          return (
            <li key={step.label} className="relative pb-8 pl-0 last:pb-0">
              <Reveal delay={i * 0.06}>
                <div className="flex items-start gap-5">
                  <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-sand-200 bg-white shadow-1">
                    <Icon size={22} strokeWidth={1.5} className="text-marigold-600" aria-hidden="true" />
                  </span>
                  <div className="pt-1.5">
                    <h3 className="font-display text-h4 text-ink-900">{step.label}</h3>
                    <p className="mt-1.5 text-small leading-relaxed text-ink-500">{step.sub}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>

      <Reveal delay={0.15}>
        <div className="mt-12 flex items-start gap-3 rounded-xl border border-sage-200 bg-sage-50 px-5 py-4">
          <HandHeart size={20} className="mt-0.5 shrink-0 text-sage-600" aria-hidden="true" />
          <p className="text-small leading-relaxed text-ink-700">{t("how.footnote")}</p>
        </div>
      </Reveal>
    </Section>
  );
}