import { FileCheck2, Lock, Scale, UserCheck } from "lucide-react";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import { useLang } from "../lib/i18n";

const items = [
  { icon: Scale, key: "trust.items.0" },
  { icon: UserCheck, key: "trust.items.1" },
  { icon: FileCheck2, key: "trust.items.2" },
  { icon: Lock, key: "trust.items.3" },
];

/**
 * Trust section — rendered like a charter, not a feature grid: one bordered
 * panel, hairline-divided rows, sage seals. Deliberately unlike the
 * icon-in-circle card grids used elsewhere.
 */
export default function TrustEthics() {
  const { t } = useLang();
  const rows = t("trust.items");

  return (
    <Section tone="white" eyebrow={t("trust.eyebrow")} title={t("trust.title")} lead={t("trust.lead")}>
      <Reveal>
        <div className="grid overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-1 lg:grid-cols-2">
          {rows.map((row, i) => {
            const Icon = items[i].icon;
            return (
              <Reveal key={row.title} delay={0.05} className="h-full">
                <div
                  className={
                    "flex h-full gap-5 p-7 " +
                    (i >= 1 ? "border-t border-sand-200 " : "") +
                    (i >= 2 ? "lg:border-t lg:border-sand-200 " : "lg:border-t-0 ") +
                    (i % 2 === 1 ? "lg:border-l lg:border-sand-200 " : "")
                  }
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-sage-200 bg-sage-50">
                    <Icon size={19} strokeWidth={1.5} className="text-sage-700" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-h4 text-ink-900">{row.title}</h3>
                    <p className="mt-1.5 text-small leading-relaxed text-ink-700">{row.line}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="mt-6 rounded-xl border border-sand-200 bg-sand-100 px-5 py-4 text-caption leading-relaxed text-ink-500">
          {t("trust.disclaimer")}
        </p>
      </Reveal>
    </Section>
  );
}