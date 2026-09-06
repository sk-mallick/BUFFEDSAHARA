import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Send, X } from "lucide-react";
import cn from "../../lib/cn";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import CrisisBanner from "./CrisisBanner";

const PLACEHOLDER = { en: "Type a message…", hi: "संदेश लिखें…" };

/**
 * ChatWindow — the Sahara Support conversation panel.
 * Slides up gently from the corner (y: 20 -> 0, opacity 0 -> 1, 300ms,
 * ease-out — no springs). Header carries the language toggle; the list
 * auto-scrolls to the newest message; Enter sends.
 */
export default function ChatWindow({
  messages,
  sendMessage,
  isLoading,
  crisis,
  dismissCrisis,
  language,
  setLanguage,
  onClose,
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const reduce = useReducedMotion();

  // Auto-scroll to the latest message (also when the typing dot appears).
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus the input on open; Escape closes the window.
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim() || isLoading) return;
    sendMessage(draft);
    setDraft("");
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-24 right-4 z-drawer flex h-[min(34rem,72dvh)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-4 sm:right-6"
      role="dialog"
      aria-label="Sahara support chat"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-sand-200 bg-sand-50 px-4 py-3">
        <div className="min-w-0">
          <p className="font-display text-h4 font-semibold leading-tight text-ink-900">
            Sahara Support
          </p>
          <p className="text-caption text-ink-500">Powered by AI · a human is always there</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            role="group"
            aria-label="Chat language"
            className="flex overflow-hidden rounded-md border border-sand-200 bg-white"
          >
            {[
              { code: "en", label: "EN" },
              { code: "hi", label: "हिंदी" },
            ].map(({ code, label }) => (
              <button
                key={code}
                type="button"
                aria-pressed={language === code}
                onClick={() => setLanguage(code)}
                className={cn(
                  "px-2 py-1 text-caption font-medium transition-colors duration-fast",
                  language === code
                    ? "bg-[var(--chat-primary)] text-white"
                    : "text-ink-500 hover:bg-sand-100 hover:text-ink-900"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-md p-1.5 text-ink-500 transition-colors duration-fast hover:bg-sand-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Crisis banner */}
      {crisis && <div className="px-3 pt-3"><CrisisBanner onDismiss={dismissCrisis} /></div>}

      {/* Messages */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      {/* Input bar */}
      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-sand-200 bg-white px-3 py-3"
      >
        <label htmlFor="chat-input" className="sr-only">
          {language === "hi" ? "अपना संदेश लिखें" : "Type your message"}
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={PLACEHOLDER[language]}
          className="min-w-0 flex-1 rounded-md border border-sand-300 bg-white px-3 py-2 text-small text-ink-900 placeholder:text-ink-300 focus:border-marigold-600 focus:outline-none focus:ring-[3px] focus:ring-marigold-600/15"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isLoading}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--chat-primary)] text-white transition-all duration-base ease-gentle hover:bg-[var(--chat-primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--chat-primary)]"
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </motion.div>
  );
}