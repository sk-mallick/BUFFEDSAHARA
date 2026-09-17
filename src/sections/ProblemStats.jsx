import { Info } from "lucide-react";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import CountUp from "../ui/CountUp";
import { useLang } from "../lib/i18n";
import cn from "../lib/cn";

const inFormat = new Intl.NumberFormat("en-IN");

export default function ProblemStats() {
  const { t } = useLang();
  const items = t("stats.items");

  return (
    <Section
      tone="white"
      eyebrow={t("stats.eyebrow")}
      title={t("stats.title")}
      lead={t("stats.lead")}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <Reveal key={item.label} delay={i * 0.08} className="h-full">
            <article className="card card-lift flex h-full flex-col justify-between border-t-4 border-t-marigold-600 p-6 sm:p-7">
              <div>
                <p className="font-mono text-4xl sm:text-5xl font-medium leading-none text-ink-900 flex items-baseline">
                  {/* Static value for assistive tech; animated figure for sighted readers */}
                  <span className="sr-only">
                    {inFormat.format(item.n)}
                    {item.suffix}
                  </span>
                  <span aria-hidden="true" className="flex items-baseline">
                    <CountUp to={item.n} format={(v) => inFormat.format(Math.round(v))} duration={1.6} />
                    <span
                      className={cn(
                        "text-marigold-600",
                        item.suffix.trim().length > 2
                          ? "text-xl sm:text-2xl font-sans ml-1.5 font-normal"
                          : "text-3xl sm:text-4xl ml-0.5"
                      )}
                    >
                      {item.suffix}
                    </span>
                  </span>
                </p>
                <p className="mt-4 text-small leading-relaxed text-ink-700">{item.label}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.2}>
        <div className="mt-8 inline-flex items-center gap-2 rounded-xl border border-sand-200 bg-sand-100/70 px-4 py-2.5 text-caption text-ink-600">
          <Info size={14} className="shrink-0 text-marigold-600" aria-hidden="true" />
          <span>{t("stats.footnote")}</span>
        </div>
      </Reveal>
    </Section>
  );
}