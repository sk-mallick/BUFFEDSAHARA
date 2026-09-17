import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Phone } from "lucide-react";
import ArchMark from "../components/ArchMark";
import LangSwitcher from "../components/LangSwitcher";
import { useLang } from "../lib/i18n";

const columns = [
  {
    titleKey: "footer.platform",
    links: [
      { to: "/", labelKey: "nav.home" },
      { to: "/how-it-works", labelKey: "nav.how" },
      { to: "/for-victims", labelKey: "nav.victims" },
      { to: "/for-officials", labelKey: "nav.officials" },
      { to: "/command", labelKey: "nav.command" },
    ],
  },
  {
    titleKey: "footer.learn",
    links: [
      { to: "/about", labelKey: "footer.about" },
      { to: "/resources", labelKey: "nav.resources" },
      { to: "/contact", labelKey: "nav.contact" },
      { to: "/privacy", labelKey: "footer.privacy" },
      { to: "/privacy#accessibility", labelKey: "footer.accessibility" },
    ],
  },
];

export default function Footer() {
  const { t } = useLang();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [sending, setSending] = useState(false);
  const timer = useRef(null);

  const subscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    // MOCK SUBMIT — replace with a real API call.
    timer.current = setTimeout(() => {
      setSending(false);
      setSubscribed(true);
    }, 700);
  };

  return (
    <footer className="bg-ink-900 text-sand-100">
      {/* Emergency helpline band */}
      <div className="border-b border-white/10">
        <div className="shell flex flex-col items-center gap-4 py-8 md:flex-row md:justify-between">
          <p className="inline-flex items-center gap-3 text-small text-sand-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600/90 text-white shadow-xs">
              <Phone size={16} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-caption uppercase tracking-wider text-sand-300">
                {t("footer.helpline")}
              </span>
              <a href="tel:14566" className="font-mono text-xl font-medium text-white transition-colors hover:text-amber-200">
                14566
              </a>
            </span>
          </p>
          <LangSwitcher dark />
        </div>
      </div>

      <div className="shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_0.9fr_1.1fr_1.3fr] lg:gap-8">
        {/* Brand */}
        <div className="max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Sahara — home">
            <ArchMark size={30} className="text-marigold-300" />
            <span className="font-display text-xl font-semibold text-white">
              Sahara <span className="text-marigold-300">सहारा</span>
            </span>
          </Link>
          <p className="mt-4 text-small leading-relaxed text-sand-200">{t("footer.tagline")}</p>
          <div className="mt-6 flex items-center gap-2.5 text-caption text-sand-300">
            <span className="inline-block h-2 w-2 rounded-full bg-sage-400" aria-hidden="true" />
            <span>DPDP Act 2023 Aligned · Encrypted & Confidential</span>
          </div>
        </div>

        {/* Link columns */}
        {columns.map((col) => (
          <nav key={col.titleKey} aria-label={t(col.titleKey)}>
            <h2 className="text-caption font-semibold uppercase tracking-wider text-sand-300">
              {t(col.titleKey)}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.labelKey}>
                  <Link
                    to={link.to}
                    className="text-small text-sand-100 underline-offset-4 transition-colors duration-fast ease-soft hover:text-white hover:underline"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* Newsletter */}
        <div>
          <h2 className="text-caption font-semibold uppercase tracking-wider text-sand-300">
            {t("footer.news")}
          </h2>
          <p className="mt-4 text-small text-sand-200">{t("footer.newsSub")}</p>
          <AnimatePresence mode="wait" initial={false}>
            {subscribed ? (
              <motion.p
                key="ok"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 flex items-center gap-2.5 rounded-md border border-sage-500/40 bg-sage-900/40 px-4 py-3 text-small text-sage-100"
                role="status"
              >
                <Check size={15} className="shrink-0 text-sage-300" aria-hidden="true" />
                {t("footer.subscribed")}
              </motion.p>
            ) : (
              <motion.form
                key="form"
                exit={{ opacity: 0 }}
                className="mt-4 flex gap-2"
                onSubmit={subscribe}
              >
                <label className="sr-only" htmlFor="newsletter-email">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sending}
                  placeholder="you@example.com"
                  className="h-11 w-full min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-3.5 text-small text-white placeholder:text-sand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-300 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="relative inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md bg-marigold-600 px-4 text-small font-medium text-white transition-colors duration-fast ease-soft hover:bg-marigold-500 disabled:opacity-70"
                >
                  {sending ? (
                    <span aria-hidden="true" className="btn-spinner" />
                  ) : (
                    <>
                      {t("footer.subscribe")}
                      <ArrowRight size={15} aria-hidden="true" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MoSJE affiliation */}
      <div className="border-t border-white/10">
        <div className="shell flex flex-col items-center gap-3 py-6 text-center md:flex-row md:justify-between md:text-left">
          <p className="text-caption text-sand-300">{t("footer.mosje")}</p>
          <p className="text-caption text-sand-300">
            {t("footer.rights")} · {t("footer.made")}
          </p>
        </div>
      </div>
    </footer>
  );
}