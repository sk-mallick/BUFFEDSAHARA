import { Check, EyeOff, Languages, PauseCircle, ShieldCheck, UserRound, X } from "lucide-react";
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
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left — reassurance */}
        <div>
          <div className="grid gap-5 sm:grid-cols-2">
            {promises.map((item, i) => {
              const Icon = promiseIcons[i];
              return (
                <Reveal key={item.title} delay={i * 0.07}>
                  <article className="card card-lift h-full">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marigold-50">
                      <Icon size={19} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-h4 text-ink-900">{item.title}</h3>
                    <p className="mt-2 text-small leading-relaxed text-ink-700">{item.line}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>

          {/* Explicit transparency: what it does / does not do */}
          <Reveal delay={0.1}>
            <div className="mt-6 grid gap-5 rounded-xl border border-sand-200 bg-white p-6 sm:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 text-small font-semibold text-sage-700">
                  <Check size={15} aria-hidden="true" />
                  {t("victims.doesTitle")}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {does.map((line) => (
                    <li key={line} className="flex gap-2.5 text-small leading-relaxed text-ink-700">
                      <Check size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-600" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-small font-semibold text-ink-700">
                  <EyeOff size={15} aria-hidden="true" />
                  {t("victims.doesNotTitle")}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {doesNot.map((line) => (
                    <li key={line} className="flex gap-2.5 text-small leading-relaxed text-ink-700">
                      <X size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-500" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-6">
              <Button to="/for-victims" variant="secondary" size="lg">
                {t("victims.cta")}
              </Button>
            </div>
          </Reveal>
        </div>

        {/* Right — voices, rotating gently */}
        <Reveal delay={0.1}>
          <ImpactCarousel slides={slides} tag={t("victims.quoteTag")} />
        </Reveal>
      </div>
    </Section>
  );
}