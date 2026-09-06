import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Section from "../ui/Section";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";
import cn from "../lib/cn";

const inputCls = (invalid) =>
  cn(
    "w-full rounded-md border bg-white px-3.5 py-3 text-small text-ink-900 placeholder:text-ink-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600 transition-colors duration-fast ease-soft",
    invalid ? "border-amber-600" : "border-sand-300"
  );

const topics = [
  "Government partnership & onboarding",
  "State or district deployment",
  "NGO / civil-society collaboration",
  "Caseworker or counsellor access",
  "Press & media",
  "Something else",
];

const empty = { name: "", org: "", email: "", topic: topics[0], message: "" };

function validate(values) {
  const next = {};
  if (!values.name.trim()) next.name = "Please tell us your name.";
  if (!values.email.trim()) next.email = "We need an email to reply to.";
  else if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = "This email doesn't look complete — please check.";
  if (!values.message.trim() || values.message.trim().length < 20)
    next.message = "Please add a little more detail so we can point you to the right person.";
  return next;
}

function FieldError({ children }) {
  return (
    <AnimatePresence>
      {children ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.45, 0, 0.25, 1] }}
          className="mt-1.5 flex items-center gap-1.5 text-caption text-amber-700"
        >
          <span
            aria-hidden="true"
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current text-[9px] font-bold"
          >
            !
          </span>
          {children}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

export default function ContactPage() {
  const reduce = useReducedMotion();
  const [values, setValues] = useState(empty);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const errors = validate(values);
  const showError = (field) => (attempted || touched[field]) && errors[field];

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  const submit = (e) => {
    e.preventDefault();
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
    setSending(true);
    // MOCK SUBMIT — replace with a real POST; the UI contract stays identical.
    timer.current = setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1100);
  };

  const reset = () => {
    setValues(empty);
    setTouched({});
    setAttempted(false);
    setSent(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to the Sahara team."
        lead="Partnerships, deployments and press — we reply within three working days. If someone needs help right now, the helpline is the faster door."
      >
        <Reveal delay={0.16}>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button href="tel:14566">
              <Phone size={17} aria-hidden="true" />
              14566 — for help right now
            </Button>
          </div>
        </Reveal>
      </PageHeader>

      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          {/* Form */}
          <Reveal>
            <div className="card">
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="sent"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="py-10 text-center"
                    role="status"
                  >
                    <motion.span
                      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-50"
                    >
                      <CheckCircle2 size={32} className="text-sage-600" aria-hidden="true" />
                    </motion.span>
                    <h2 className="mt-5 text-h2 text-ink-900">Message sent.</h2>
                    <p className="mx-auto mt-3 max-w-md text-body text-ink-700">
                      Thank you — we reply within three working days. If your matter is urgent, the helpline 14566 is
                      available right now.
                    </p>
                    <div className="mt-6">
                      <Button variant="secondary" onClick={reset}>
                        Send another message
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.24, ease: [0.45, 0, 0.25, 1] }}
                    onSubmit={submit}
                    noValidate
                  >
                    <h2 className="text-h3 text-ink-900">Send a message</h2>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="c-name" className="mb-1.5 block text-small font-medium text-ink-900">
                          Your name
                        </label>
                        <input
                          id="c-name"
                          type="text"
                          value={values.name}
                          onChange={set("name")}
                          onBlur={blur("name")}
                          aria-invalid={!!showError("name")}
                          aria-describedby={showError("name") ? "c-name-err" : undefined}
                          className={inputCls(showError("name"))}
                          placeholder="Full name"
                          disabled={sending}
                        />
                        <div id="c-name-err">
                          <FieldError>{showError("name")}</FieldError>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="c-org" className="mb-1.5 block text-small font-medium text-ink-900">
                          Organisation <span className="font-normal text-ink-500">(optional)</span>
                        </label>
                        <input
                          id="c-org"
                          type="text"
                          value={values.org}
                          onChange={set("org")}
                          className={inputCls(false)}
                          placeholder="Ministry, NGO, institution…"
                          disabled={sending}
                        />
                      </div>
                      <div>
                        <label htmlFor="c-email" className="mb-1.5 block text-small font-medium text-ink-900">
                          Email
                        </label>
                        <input
                          id="c-email"
                          type="email"
                          value={values.email}
                          onChange={set("email")}
                          onBlur={blur("email")}
                          aria-invalid={!!showError("email")}
                          aria-describedby={showError("email") ? "c-email-err" : undefined}
                          className={inputCls(showError("email"))}
                          placeholder="you@organisation.in"
                          disabled={sending}
                        />
                        <div id="c-email-err">
                          <FieldError>{showError("email")}</FieldError>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="c-topic" className="mb-1.5 block text-small font-medium text-ink-900">
                          What's this about?
                        </label>
                        <select
                          id="c-topic"
                          value={values.topic}
                          onChange={set("topic")}
                          className={inputCls(false)}
                          disabled={sending}
                        >
                          {topics.map((tp) => (
                            <option key={tp}>{tp}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="c-msg" className="mb-1.5 block text-small font-medium text-ink-900">
                          Message
                        </label>
                        <textarea
                          id="c-msg"
                          rows={5}
                          value={values.message}
                          onChange={set("message")}
                          onBlur={blur("message")}
                          aria-invalid={!!showError("message")}
                          aria-describedby={showError("message") ? "c-msg-err" : undefined}
                          className={cn(inputCls(showError("message")), "resize-y")}
                          placeholder="Tell us about your organisation, the context, and what you'd like to explore…"
                          disabled={sending}
                        />
                        <div id="c-msg-err">
                          <FieldError>{showError("message")}</FieldError>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <Button type="submit" size="lg" loading={sending}>
                        Send message
                      </Button>
                    </div>
                    <p className="mt-4 text-caption text-ink-500">
                      We reply within 3 working days. Nothing you write here is shared outside the Sahara team.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>

          {/* Side details */}
          <Reveal delay={0.1}>
            <div className="space-y-5">
              <div className="card">
                <h3 className="text-h4 text-ink-900">Other ways in</h3>
                <ul className="mt-4 space-y-4">
                  <li className="flex items-start gap-3">
                    <Mail size={17} className="mt-0.5 shrink-0 text-marigold-600" aria-hidden="true" />
                    <div>
                      <p className="text-small font-medium text-ink-900">Partnerships</p>
                      <a
                        href="mailto:partners@sahara.in"
                        className="underline-draw text-small text-marigold-600 hover:text-marigold-700"
                      >
                        partners@sahara.in
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone size={17} className="mt-0.5 shrink-0 text-marigold-600" aria-hidden="true" />
                    <div>
                      <p className="text-small font-medium text-ink-900">NHAA helpline</p>
                      <a href="tel:14566" className="font-mono text-small text-marigold-600 hover:text-marigold-700">
                        14566
                      </a>
                      <p className="text-caption text-ink-500">24×7 · for urgent support</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin size={17} className="mt-0.5 shrink-0 text-marigold-600" aria-hidden="true" />
                    <div>
                      <p className="text-small font-medium text-ink-900">For the record</p>
                      <p className="text-caption leading-relaxed text-ink-500">
                        Smart India Hackathon 2026 · Problem statement SIH26094 · Ministry of Social Justice and
                        Empowerment
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="card border-t-4 border-t-amber-600">
                <h3 className="text-h4 text-ink-900">Urgent, or a case concern?</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-700">
                  This form is not monitored 24×7. If you or someone you know is in danger or distress, call{" "}
                  <a href="tel:14566" className="font-mono font-medium text-amber-700 underline underline-offset-2">
                    14566
                  </a>{" "}
                  or the emergency line{" "}
                  <a href="tel:112" className="font-mono font-medium text-amber-700 underline underline-offset-2">
                    112
                  </a>{" "}
                  now.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}