import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";

const charter = [
  {
    title: "What we collect",
    body: "Only what a person chooses to share: check-in responses, and the support record they build with their caseworker (notes, plans, contacts). Nothing is read from the device — no location, no messages, no call logs.",
  },
  {
    title: "Who can see what",
    body: "The person themselves sees everything, always. Their caseworker sees only their own assigned cases. Managers see aggregate trends, never identities. Analytics are anonymised and never sold — there is no advertising model, and there never will be.",
  },
  {
    title: "Consent & withdrawal",
    body: "Each capability — monitoring, reminders, sharing with family, use for research — carries its own consent, given in plain language and revocable in one tap. Withdrawing consent never affects the underlying complaint or any legal process.",
  },
  {
    title: "Retention & erasure",
    body: "Data is retained only as long as the support relationship is active or the law requires. A person can request a full copy of their record, and request erasure, from their privacy panel — deletion is honoured in full within 30 days.",
  },
  {
    title: "DPDP Act 2023 alignment",
    body: "Sahara is built to the Digital Personal Data Protection Act, 2023: lawful, consent-based processing; purpose limitation; a Data Protection Officer contactable by any user; breach notification procedures; and data fiduciary obligations documented with every partner.",
  },
  {
    title: "The AI, explained",
    body: "The distress model reads only de-identified check-in patterns and produces a score with a written rationale. It is a triage aid for caseworkers, never a finding about a person, never a substitute for professional assessment, and its outputs are auditable and overridable.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy & data ethics"
        title="The Data Charter."
        lead="For a platform serving people at their most vulnerable, privacy is not a feature — it is the foundation. This charter is written to be read by the people it protects, not just by lawyers."
      />

      <Section tone="white">
        <div className="mx-auto max-w-3xl">
          {charter.map((item, i) => (
            <Reveal key={item.title} delay={i % 2 === 0 ? 0 : 0.06}>
              <article className="border-b border-sand-200 py-8 first:pt-0 last:border-b-0">
                <h2 className="flex items-baseline gap-4 text-h3 text-ink-900">
                  <span className="font-mono text-caption font-medium text-marigold-600">0{i + 1}</span>
                  {item.title}
                </h2>
                <p className="mt-3 text-body leading-relaxed text-ink-700">{item.body}</p>
              </article>
            </Reveal>
          ))}

          <Reveal delay={0.1}>
            <p className="mt-10 rounded-xl border border-sand-200 bg-sand-100 px-5 py-4 text-caption leading-relaxed text-ink-500">
              Questions about this charter? Write to{" "}
              <a href="mailto:privacy@sahara.in" className="text-marigold-600 underline underline-offset-2">
                privacy@sahara.in
              </a>{" "}
              or read the{" "}
              <Link to="/privacy#accessibility" className="text-marigold-600 underline underline-offset-2">
                accessibility statement
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" className="!pb-24">
        <div id="accessibility" className="scroll-mt-24">
          <Reveal>
            <p className="eyebrow-text">Accessibility statement</p>
            <h2 className="mt-3 text-h2 text-ink-900">Built to be used by everyone.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="prose-sahara mt-4">
              <p>
                Sahara targets WCAG 2.1 AA. That means: full keyboard navigation with visible focus, a 44px minimum
                touch target, colour never used as the only signal, text that resizes without breaking, and motion that
                respects{" "}
                <em className="font-medium not-italic text-ink-900">prefers-reduced-motion</em>. Every public and
                portal page carries an exit control for anyone reading in a shared space.
              </p>
              <p>
                Many users will read in Hindi on low-cost phones with patchy connections. The interface is built for
                low data use, works on small screens, and every flow has a "call 14566 instead" path for anyone who
                prefers a human voice to a screen.
              </p>
              <p>
                If something here is hard to use, that is a bug in our design, not a limitation of you. Tell us at{" "}
                <a href="mailto:accessibility@sahara.in">accessibility@sahara.in</a> and we will fix it.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}