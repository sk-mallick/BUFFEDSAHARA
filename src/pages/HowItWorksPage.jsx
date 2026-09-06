import { HandHeart, Landmark, UserRound } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import Accordion from "../ui/Accordion";

const lanes = [
  {
    icon: UserRound,
    title: "I need support",
    body: "You don't need to understand the system to use it. Call 14566, or ask anyone you trust to reach out for you — consent stays yours either way.",
    to: "/for-victims",
    cta: "See how support begins",
  },
  {
    icon: HandHeart,
    title: "I'm a caseworker or counsellor",
    body: "The tool ranks your queue by distress signal and keeps every contact in one timeline — so your judgment, not your inbox, decides what happens next.",
    to: "/for-officials",
    cta: "Explore the caseworker tool",
  },
  {
    icon: Landmark,
    title: "I'm a government partner",
    body: "Sahara is designed for state integration — One Stop Centres, helplines and grievance desks — with DPDP-aligned data governance from day one.",
    to: "/contact",
    cta: "Talk to the team",
  },
];

const faqs = [
  {
    q: "Does Sahara replace the NHAA helpline?",
    a: "No. Sahara begins where the helpline ends. 14566 stays the first door for reporting and immediate help; Sahara provides the quiet, continuous support after the complaint is filed.",
  },
  {
    q: "How does the AI decide who needs help?",
    a: "It doesn't decide — it suggests. The system reads patterns from a person's own check-ins and flags a change in risk to a human caseworker. Every alert is reviewed by a trained person before any contact is made, and no action ever happens automatically.",
  },
  {
    q: "What data is used, and who can see it?",
    a: "Only what a person consents to share: their check-in responses and the support record they build with their caseworker. Location and messages are never used. Access is role-limited, encrypted, and fully visible to the person it belongs to.",
  },
  {
    q: "Can someone stop using Sahara at any time?",
    a: "Yes — pausing or ending monitoring is one tap, and consent can be withdrawn as easily as it was given. Nothing about the underlying complaint depends on continuing with Sahara.",
  },
  {
    q: "Is Sahara available in languages other than Hindi and English?",
    a: "The design supports every major Indian script, and check-ins are written to translate cleanly. Regional language rollout follows state partnerships.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="From complaint to care, in six quiet steps."
        lead="Sahara is designed to be felt, not noticed. Here is exactly what happens — and who it happens with — at every step."
      />

      <Section tone="white">
        <Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lanes.map((lane) => (
              <article key={lane.title} className="card flex h-full flex-col">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-marigold-50">
                  <lane.icon size={20} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-h4 text-ink-900">{lane.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-700">{lane.body}</p>
                <div className="mt-auto pt-5">
                  <Button to={lane.to} variant="secondary" size="sm">
                    {lane.cta}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section tone="sand" eyebrow="Questions, answered" title="Asked often, answered plainly.">
        <Reveal>
          <Accordion items={faqs} className="bg-white" />
        </Reveal>
      </Section>
    </>
  );
}