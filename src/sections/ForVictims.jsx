import { ArrowRight, Check, EyeOff, Languages, PauseCircle, ShieldCheck, UserRound, X } from "lucide-react";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import ImpactCarousel from "../components/ImpactCarousel";
import { useLang } from "../lib/i18n";

const promiseIcons = [ShieldCheck, PauseCircle, UserRound, Languages];

export default function ForVictims() {
  const { t } = useLang();
  const promises = t("victims.promises");
  const does = t("victims.does");
  const doesNot = t("victims.doesNot");
  const slides = t("victims.slides");

  return (
    <Section tone="white" eyebrow={t("victims.eyebrow")} title={t("victims.title")} lead={t("victims.lead")}>
      {/* Row 1: 50% Promise Cards (Left) & 50% Testimonials Carousel (Right) */}
      <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Left — 4 Promise Cards in 2x2 grid */}
        <div className="grid h-full gap-4 sm:grid-cols-2">
          {promises.map((item, i) => {
            const Icon = promiseIcons[i];
            return (
              <Reveal key={item.title} delay={i * 0.06} className="h-full">
                <article className="card card-lift flex h-full flex-col justify-between rounded-2xl p-5 sm:p-6 transition-all duration-fast hover:border-sand-300 hover:shadow-2">
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-marigold-200/60 bg-marigold-50 shadow-2xs">
                      <Icon size={20} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{item.title}</h3>
                    <p className="mt-2 text-small leading-relaxed text-ink-700">{item.line}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* Right — Voices carousel matching height */}
        <Reveal delay={0.1} className="h-full">
          <div className="h-full">
            <ImpactCarousel slides={slides} tag={t("victims.quoteTag")} className="h-full" />
          </div>
        </Reveal>
      </div>

      {/* Row 2: Full-width Explicit Transparency & Human Safeguards */}
      <Reveal delay={0.15}>
        <div className="mt-8 rounded-2xl border border-sand-200 bg-white p-6 shadow-1 sm:mt-10 sm:p-8">
          <div className="grid gap-8 md:grid-cols-2 md:divide-x md:divide-sand-200">
            {/* What Sahara does */}
            <div className="md:pr-8">
              <h3 className="flex items-center gap-2 text-small font-bold uppercase tracking-wider text-sage-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                  <Check size={13} aria-hidden="true" />
                </span>
                {t("victims.doesTitle")}
              </h3>
              <ul className="mt-4 space-y-3">
                {does.map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-small leading-relaxed text-ink-700">
                    <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-600" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What Sahara never does */}
            <div className="border-t border-sand-200 pt-6 md:border-t-0 md:pt-0 md:pl-8">
              <h3 className="flex items-center gap-2 text-small font-bold uppercase tracking-wider text-ink-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sand-200 text-ink-600">
                  <EyeOff size={13} aria-hidden="true" />
                </span>
                {t("victims.doesNotTitle")}
              </h3>
              <ul className="mt-4 space-y-3">
                {doesNot.map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-small leading-relaxed text-ink-600">
                    <X size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-critical-600/70" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Reassurance note + CTA Button */}
          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-sand-100 pt-6 sm:flex-row sm:items-center">
            <p className="text-caption text-ink-500">
              Consent is explicit, confidential, and can be paused or stopped anytime.
            </p>
            <Button to="/for-victims" variant="secondary" size="lg" className="shrink-0 rounded-full px-6 shadow-xs">
              {t("victims.cta")}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}