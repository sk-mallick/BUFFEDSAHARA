import { motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import cn from "../../lib/cn";

/**
 * MessageBubble — one chat turn.
 * User: right-aligned, primary-colour fill, white text, 16/16/4/16 radius.
 * Bot:  left-aligned, warm off-white fill, charcoal text, 16/16/16/4 radius,
 *       with a small primary-colour avatar (Heart icon) and a tiny timestamp.
 * Motion: gentle 8px rise + fade, 240ms ease-out (never springy).
 */
export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const reduce = useReducedMotion();

  const time = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--chat-primary)] text-white"
        >
          <Heart size={13} strokeWidth={1.75} />
        </span>
      )}

      <div className={cn("max-w-[80%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "whitespace-pre-wrap px-4 py-2.5 text-small leading-relaxed",
            isUser
              ? "rounded-[16px_16px_4px_16px] bg-[var(--chat-user-bubble)] text-white"
              : "rounded-[16px_16px_16px_4px] border border-sand-200 bg-[var(--chat-bot-bubble)] text-ink-900"
          )}
        >
          {message.content}
        </div>
        <p
          className={cn(
            "mt-1 px-1 text-caption text-ink-500",
            isUser && "text-right"
          )}
        >
          {time}
        </p>
      </div>
    </motion.div>
  );
}