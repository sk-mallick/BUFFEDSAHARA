import { HeartHandshake, PhoneCall, ShieldCheck, UserRound } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import Img from "../ui/Img";
import HelplineCard from "../components/HelplineCard";
import { helplines } from "../data/helplines";

const kinds = [
  {
    icon: UserRound,
    title: "Someone to talk to",
    body: "A counsellor who listens first and plans with you at a pace that feels safe — this week, not in a queue.",
  },
  {
    icon: ShieldCheck,
    title: "Help that follows you",
    body: "Safety planning, legal aid, housing, children's schooling — one person who helps you connect the dots, as long as you need them.",
  },
  {
    icon: HeartHandshake,
    title: "Support for your family too",
    body: "Those closest to you are often the most affected. Family members can be included in your support plan — only with your say-so.",
  },
];

const firstSteps = [
  { title: "Call 14566 or ask someone to", body: "The helpline is 24×7 and confidential. If calling feels hard, you can ask a trusted person to call with you or for you." },
  { title: "Give consent in your own words", body: "Nothing starts without it, nothing continues without it, and 'no' is respected without a single question." },
  { title: "Support continues at your pace", body: "Weekly check-ins you can skip, a caseworker who knows your story, and the right to pause or stop whenever you need to." },
];

export default function ForVictimsPage() {
  return (
    <>
      <PageHeader
        eyebrow="For victims & families"
        title="You've been through enough. This should be easy."
        lead="Sahara exists so that after the courage of filing a complaint, you are never left alone with the aftermath. Everything here is written to be read by someone who may be exhausted, afraid, or reading on a borrowed phone."
      >
        <Reveal delay={0.18}>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button href="tel:14566" size="lg">
              <PhoneCall size={18} aria-hidden="true" />
              Call 14566 now
            </Button>
            <Button to="/how-it-works" variant="secondary" size="lg">
              Understand the process first
            </Button>
          </div>
        </Reveal>
      </PageHeader>

      <Section tone="white" eyebrow="What support looks like" title="Three kinds of help, one point of contact.">
        <div className="grid gap-5 md:grid-cols-3">
          {kinds.map((kind, i) => (
            <Reveal key={kind.title} delay={i * 0.08} className="h-full">
              <article className="card h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-marigold-50">
                  <kind.icon size={20} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-h4 text-ink-900">{kind.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-700">{kind.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="sand" eyebrow="How to begin" title="Three steps. No forms in triplicate.">
        <div className="grid gap-5 md:grid-cols-3">
          {firstSteps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08} className="h-full">
              <article className="card h-full border-t-4 border-t-marigold-600">
                <p className="font-mono text-sm font-medium text-marigold-600">Step {i + 1}</p>
                <h3 className="mt-2 text-h4 text-ink-900">{step.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-700">{step.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="white">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-xl border border-sand-200 shadow-3">
              <Img
                src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=80"
                alt="Sunlight through trees — a calm, quiet place"
                className="h-[420px] w-full object-cover"
              />
            </div>
          </Reveal>
          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="eyebrow-text">An honest word</p>
              <h2 className="mt-3 text-h2 text-ink-900">What monitoring does — and never does</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-4 text-body text-ink-700">
                Some people are rightly cautious about the word "monitoring." You should be. So here is the plainest
                version: Sahara watches nothing about you except what you choose to share in your check-ins. It has no
                camera on your life. It has no interest in your location. Its only job is to notice when you seem to be
                struggling, and to make sure a human reaches you before things get harder.
              </p>
              <p className="mt-4 text-body text-ink-700">
                And if you ever want it to stop watching even that — it stops. One tap. No questions.
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

      <Section tone="sand" eyebrow="A voice from the journey" title="What being supported can feel like.">
        <Reveal>
          <figure className="card mx-auto max-w-3xl text-center">
            <blockquote>
              <p className="font-display text-h3 font-medium leading-relaxed text-ink-900">
                "I filed my complaint and went home to silence. Three weeks later, a counsellor called to ask how I was —
                really ask. Not about the case. About me."
              </p>
            </blockquote>
            <figcaption className="mt-5 text-small text-ink-700">
              Asha, 34 · <span className="text-ink-500">Representative account — not a real person</span>
            </figcaption>
          </figure>
        </Reveal>
      </Section>

      <Section tone="white" eyebrow="Reach out" title="Help is one call away.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {helplines.slice(0, 4).map((item) => (
            <Reveal key={item.name}>
              <HelplineCard item={item} />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}