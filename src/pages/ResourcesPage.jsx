import { Download, Phone } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import HelplineDirectory from "../components/HelplineDirectory";
import { guides, helplines } from "../data/helplines";

export default function ResourcesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resources & helplines"
        title="Help that's one tap away — day or night."
        lead="Every number below is a real, working line. On a phone, tapping the number dials it. Filter by language or state to find the help closest to you."
      >
        <Reveal delay={0.16}>
          <a
            href="tel:14566"
            className="mt-8 inline-flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 transition-colors duration-fast ease-soft hover:border-amber-300 hover:bg-amber-100"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-white">
              <Phone size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-caption font-medium uppercase tracking-wider text-amber-700">
                NHAA — SC/ST Helpline · 24×7
              </span>
              <span className="block font-mono text-2xl font-medium text-ink-900">14566</span>
            </span>
          </a>
        </Reveal>
      </PageHeader>

      <Section tone="white">
        <Reveal>
          <HelplineDirectory items={helplines} />
        </Reveal>
      </Section>

      <Section tone="sand" eyebrow="Guides" title="Written to be understood, made to be printed.">
        <div className="grid gap-5 md:grid-cols-3">
          {guides.map((guide, i) => (
            <Reveal key={guide.title} delay={i * 0.08} className="h-full">
              <a
                href={guide.href}
                target="_blank"
                rel="noreferrer"
                className="card flex h-full flex-col transition-all duration-base ease-gentle hover:-translate-y-1 hover:shadow-3"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand-100">
                  <Download size={19} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-h4 text-ink-900">{guide.title}</h3>
                <p className="mt-1 text-caption font-medium text-marigold-600">{guide.meta}</p>
                <p className="mt-3 text-small leading-relaxed text-ink-700">{guide.note}</p>
              </a>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <p className="mt-6 text-caption text-ink-500">
            Official guide links open the National Commission for Scheduled Castes and Ministry of Women &amp; Child
            Development sites. In the demonstration build they point to the relevant official portal; production will
            host the documents directly.
          </p>
        </Reveal>
      </Section>
    </>
  );
}