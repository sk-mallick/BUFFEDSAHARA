import { motion, useReducedMotion } from "framer-motion";

/**
 * TypingIndicator — three dots that breathe in a gentle, staggered loop.
 * Deliberately NOT a bounce: a slow opacity pulse, 1.2s per cycle,
 * repeating in reverse so it never snaps.
 */
export default function TypingIndicator() {
  const reduce = useReducedMotion();

  return (
    <div
      role="status"
      aria-label="Sahara is typing"
      className="flex items-center gap-2 pl-1"
    >
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--chat-primary)] text-white"
      >
        <svg width="13" height="13" viewBox="0 0 56 56" fill="none">
          <path d="M10 46 V26 C10 14 24 7 28 7 C32 7 46 14 46 26 V46" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <path d="M10 46 H46" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </span>
      <div className="flex items-center gap-1.5 rounded-[16px_16px_16px_4px] border border-sand-200 bg-[var(--chat-bot-bubble)] px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-ink-500"
            animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.18,
            }}
          />
        ))}
      </div>
    </div>
  );
}