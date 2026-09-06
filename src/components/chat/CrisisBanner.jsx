import { motion, useReducedMotion } from "framer-motion";
import { Phone, X } from "lucide-react";

/**
 * CrisisBanner — the one place a victim-facing screen may talk about
 * danger, and it must stay CALM: soft amber, never red, never alarming.
 * Leads with the helpline number as a click-to-call link, dismissible
 * so it never traps the person reading it.
 */
export default function CrisisBanner({ onDismiss }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <Phone size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="text-small leading-snug text-amber-800">
          If you are in immediate danger, please call{" "}
          <a
            href="tel:14566"
            className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
          >
            14566
          </a>{" "}
          — people are ready to help, any time.
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss crisis banner"
        className="absolute right-2 top-2 rounded-md p-1 text-amber-600 transition-colors duration-fast hover:bg-amber-100 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </motion.div>
  );
}