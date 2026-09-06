import { Link } from "react-router-dom";
import { Eye, GitBranch, ListChecks, ScrollText, ShieldCheck, Timer } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import BrowserFrame from "../components/BrowserFrame";
import DashboardMock from "../components/DashboardMock";

const capabilities = [
  {
    icon: ListChecks,
    title: "Risk-scored queue",
    body: "Every open case carries a distress score and a reason. The queue sorts by need, so the most fragile people are seen first — and nothing falls through because someone was busy.",
  },
  {
    icon: GitBranch,
    title: "Case timelines that hold context",
    body: "Every call, check-in, and action lands on one timeline. A caseworker arriving mid-story can catch up in minutes, not meetings.",
  },
  {
    icon: Timer,
    title: "Alert triage with SLAs",
    body: "Escalation thresholds and response clocks keep one promise visible everywhere: no distress signal waits unanswered.",
  },
  {
    icon: ScrollText,
    title: "Audit trails, always on",
    body: "Who saw what, when, and why — recorded and reviewable. Accountability is a feature, not an afterthought.",
  },
];

const ethics = [
  {
    icon: Eye,
    title: "Predictive, never prescriptive",
    body: "The model forecasts risk from consent-based check-in data. It cannot and does not issue findings about any case.",
  },
  {
    icon: ShieldCheck,
    title: "Human sign-off on every alert",
    body: "An alert is a request for a human to look. No contact, referral, or note is ever sent automatically.",
  },
  {
    icon: ScrollText,
    title: "Explained scores",
    body: "Every score carries a plain-language rationale a caseworker can read, question, and override — and the system keeps the override.",
  },
];

export default function ForOfficialsPage() {
  return (
    <>
      <PageHeader
        eyebrow="For caseworkers & officials"
        title="Amplify human counsellors. Never replace them."
        lead="Sahara Casework is a decision-support tool for the people carrying India's hardest caseloads. It triages, remembers, and flags — the judgement stays with the professional, where it belongs."
      >
        <p className="mt-5 max-w-2xl">
          <Link to="/command" className="underline-draw inline-flex items-center gap-1.5 text-small font-medium text-marigold-700">
            Explore the national → state → district monitoring view
          </Link>
        </p>
      </PageHeader>

      <Section tone="white">
        <Reveal>
          <BrowserFrame url="sahara.in/caseworker/queue" className="mx-auto max-w-5xl">
            <DashboardMock />
          </BrowserFrame>
        </Reveal>
      </Section>

      <Section tone="sand" eyebrow="Capabilities" title="What a calmer caseload looks like.">
        <div className="grid gap-5 sm:grid-cols-2">
          {capabilities.map((cap, i) => (
            <Reveal key={cap.title} delay={i * 0.07} className="h-full">
              <article className="card h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-marigold-50">
                  <cap.icon size={20} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-h4 text-ink-900">{cap.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-700">{cap.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="white" eyebrow="Ethics, built in" title="The rules the machine must obey.">
        <div className="grid gap-5 md:grid-cols-3">
          {ethics.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08} className="h-full">
              <article className="card h-full border-t-4 border-t-sage-600">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-50">
                  <item.icon size={20} strokeWidth={1.5} className="text-sage-700" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-h4 text-ink-900">{item.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-700">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="sand" eyebrow="Partner with us" title="Built for ministries. Ready for states.">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="text-body-lg leading-relaxed text-ink-700">
                Sahara is designed around the systems states already run — One Stop Centres, the NHAA helpline, and
                grievance desks. Integration, data governance and DPDP Act 2023 alignment are documented from the first
                line of code, not bolted on later.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Deployment models for state and district scale",
                  "Data residency and consent architecture reviewed with your legal team",
                  "Training and handover for caseworkers and counsellors",
                  "Open, documented APIs for existing helpline and CRM systems",
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-small leading-relaxed text-ink-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-marigold-600" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button to="/contact" size="lg">
                  Start the conversation
                </Button>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="card border-t-4 border-t-ink-900">
              <p className="eyebrow-text">For evaluators</p>
              <h3 className="mt-3 text-h4 text-ink-900">A demonstration build</h3>
              <p className="mt-3 text-small leading-relaxed text-ink-700">
                Sahara is a Smart India Hackathon 2026 submission sponsored by the Ministry of Social Justice and
                Empowerment. The caseworker interface shown here is a high-fidelity prototype; the scoring model, audit
                system and state integrations are specified in the accompanying architecture documentation.
              </p>
              <p className="mt-3 text-small leading-relaxed text-ink-700">
                No real victim data is stored or processed anywhere in this demo.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}