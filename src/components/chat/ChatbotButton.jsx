import { motion, useReducedMotion } from "framer-motion";
import { MessageCircle } from "lucide-react";

/**
 * ChatbotButton — the floating trigger, fixed bottom-right.
 * A calm primary-colour circle with a gentle expanding pulse ring
 * (decorative only — removed under prefers-reduced-motion). Mounts and
 * unmounts with a soft scale + fade so opening/closing the chat feels
 * unhurried.
 */
export default function ChatbotButton({ onOpen }) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={reduce ? false : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={reduce ? undefined : { scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Open Sahara support chat"
      className="chat-pulse fixed right-4 z-drawer flex h-14 w-14 items-center justify-center rounded-full bg-[var(--chat-primary)] text-white shadow-4 transition-colors duration-base hover:bg-[var(--chat-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 active:scale-95 bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:bottom-6 sm:right-6"
    >
      <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />
    </motion.button>
  );
}