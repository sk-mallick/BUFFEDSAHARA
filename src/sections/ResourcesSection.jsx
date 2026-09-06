import { ArrowRight } from "lucide-react";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import HelplineCard from "../components/HelplineCard";
import Button from "../ui/Button";
import { useLang } from "../lib/i18n";

export default function ResourcesSection({ items }) {
  const { t } = useLang();
  return (
    <Section tone="sand" eyebrow={t("resources.eyebrow")} title={t("resources.title")} lead={t("resources.lead")}>
      <Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <HelplineCard key={item.name} item={item} />
          ))}
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="mt-8">
          <Button to="/resources" variant="secondary" size="lg">
            {t("resources.viewAll")}
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </div>
      </Reveal>
    </Section>
  );
}