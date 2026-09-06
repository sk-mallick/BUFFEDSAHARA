import { HandHeart, Landmark, Languages, Scale, ShieldCheck } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";

const pillars = [
  {
    icon: HandHeart,
    title: "Support, not surveillance",
    body: "The system exists to connect people to help sooner. It is designed to be switched off by the person it serves, at any time, without friction.",
  },
  {
    icon: ShieldCheck,
    title: "Consent in every layer",
    body: "Data collection, monitoring, sharing, and even reminders each carry their own consent — informed, granular, and revocable in plain language.",
  },
  {
    icon: Scale,
    title: "Human judgment leads",
    body: "AI ranks and flags; people decide. Every alert ends with a human conversation, and every score can be questioned and overridden.",
  },
];

const values = [
  { icon: Landmark, title: "Institutional, not corporate", body: "Government-grade credibility: auditable, accountable, built to outlast any single team." },
  { icon: Languages, title: "Multilingual by design", body: "Hindi and English first, every major Indian script ready — because dignity speaks every language." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About & mission"
        title="The courage is theirs. The system should carry the weight."
        lead="Sahara exists for one reason: people who file complaints under the SC/ST (Prevention of Atrocities) Act should never be left alone with the aftermath. We build the quiet infrastructure of that promise."
      />

      <Section tone="white">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="eyebrow-text">The problem we're answering</p>
            <h2 className="mt-3 text-h2 text-ink-900">A complaint is filed. Then what?</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="prose-sahara mt-4">
              <p>
                Filing an atrocity complaint takes immense courage — and then the person goes home. The legal process
                moves in its own time. Meanwhile, the psychological weight of what happened, and of reporting it, grows
                in silence. Research and caseworker experience both point the same way: the highest risk of crisis
                comes in the weeks after filing, when contact is thinnest.
              </p>
              <p>
                Sahara sits in that gap. It is a wellbeing layer over the existing system — NHAA's helpline 14566 and
                the integrated grievance portal — that keeps a gentle, consent-based watch and makes sure a human
                reaches out before distress becomes crisis.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" eyebrow="Our approach" title="Three commitments that shape every screen.">
        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="h-full">
              <article className="card h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-marigold-50">
                  <p.icon size={20} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-h4 text-ink-900">{p.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-700">{p.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="white" eyebrow="Who we are" title="Built for SIH 2026, designed for real deployment.">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="prose-sahara">
              <p>
                Sahara is a submission to the Smart India Hackathon 2026 under the Ministry of Social Justice and
                Empowerment's problem statement SIH26094. The team brings together product engineers, and advisors
                with experience in crisis counselling and government digital infrastructure.
              </p>
              <p>
                The demonstration you're browsing is a design-first build: the interface, the consent model, and the
                data-ethics architecture are fully specified, so that a production pilot can move fast without
                re-litigating the fundamentals.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08} className="h-full">
                <article className="card h-full border-t-4 border-t-sage-600">
                  <v.icon size={20} strokeWidth={1.5} className="text-sage-700" aria-hidden="true" />
                  <h3 className="mt-3 text-h4 text-ink-900">{v.title}</h3>
                  <p className="mt-2 text-small leading-relaxed text-ink-700">{v.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="sand" className="!pb-24">
        <Reveal>
          <div className="card mx-auto flex max-w-3xl flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div>
              <h2 className="text-h3 text-ink-900">Want to see the caseworker side?</h2>
              <p className="mt-2 text-small leading-relaxed text-ink-700">
                The full dashboard — risk queue, case timelines, alert triage — is demonstrated on the officials page.
              </p>
            </div>
            <Button to="/for-officials" size="lg" className="shrink-0">
              Explore the dashboard
            </Button>
          </div>
        </Reveal>
      </Section>
    </>
  );
}