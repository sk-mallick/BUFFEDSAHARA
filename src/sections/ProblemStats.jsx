import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import CountUp from "../ui/CountUp";
import { useLang } from "../lib/i18n";

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
            <article className="card card-lift h-full border-t-4 border-t-marigold-600">
              <p className="font-mono text-5xl font-medium leading-none text-ink-900">
                {/* Static value for assistive tech; animated figure for sighted readers */}
                <span className="sr-only">
                  {inFormat.format(item.n)}
                  {item.suffix}
                </span>
                <span aria-hidden="true">
                  <CountUp to={item.n} format={(v) => inFormat.format(Math.round(v))} duration={1.6} />
                  <span className="text-marigold-600">{item.suffix}</span>
                </span>
              </p>
              <p className="mt-4 text-small leading-relaxed text-ink-700">{item.label}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.2}>
        <p className="mt-6 text-caption text-ink-500">
          <span aria-hidden="true">※ </span>
          {t("stats.footnote")}
        </p>
      </Reveal>
    </Section>
  );
}