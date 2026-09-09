import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  HeartHandshake,
  LockKeyhole,
  MessageCircleHeart,
  Phone,
  Send,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../lib/auth";
import { apiFetch, ApiError } from "../lib/api";
import cn from "../lib/cn";
import {
  CHAT_LANGS,
  CHECKIN_OPTIONS,
  CHECKIN_STAGES,
  copy,
  LANG_LABELS,
} from "../data/talkI18n";

/**
 * Talk to Sahara — the beneficiary portal's multilingual support companion.
 *
 * Conversation content is owned by the backend (services/chat_i18n.py):
 * welcome, quick actions, crisis card, check-in prompts. This page only
 * renders chrome + handles the flow: language picker (en/hi/or), quick
 * actions, a guided wellbeing check-in whose answers are submitted
 * through the EXISTING check-in/risk engine, a deterministic crisis card
 * when the backend flags one, a human-support request, and a real delete.
 */

const HIDDEN_QUICK_ACTIONS = new Set(["human"]); // dedicated button exists

function Bubble({ msg, name }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <span
          aria-hidden="true"
          className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white"
        >
          <HeartHandshake size={15} strokeWidth={1.8} />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed shadow-1",
          isUser
            ? "rounded-br-md bg-sage-600 text-white"
            : "rounded-bl-md bg-sand-50 text-ink-900 ring-1 ring-sand-200"
        )}
      >
        <p>{msg.content}</p>
        <p
          className={cn(
            "mt-1.5 text-caption",
            isUser ? "text-sage-100/80" : "text-ink-400"
          )}
        >
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      {isUser && (
        <span
          aria-hidden="true"
          className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marigold-600 text-white"
        >
          <User size={15} strokeWidth={1.8} />
        </span>
      )}
      <span className="sr-only">{isUser ? name : "Sahara"}</span>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-end gap-2" aria-label="Sahara is typing" role="status">
      <span
        aria-hidden="true"
        className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-sage-600 text-white"
      >
        <HeartHandshake size={15} strokeWidth={1.8} />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-sand-50 px-4 py-3.5 ring-1 ring-sand-200">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-300"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function TalkPage() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  const listRef = useRef(null);
  const inputRef = useRef(null);
  // Contextual entry points (e.g. from the wellbeing section) carry a
  // starter message (?q=…); it is sent once the conversation is open.
  // (react-router already decodes the query value.)
  const starterRef = useRef(params.get("q") || "");

  const [state, setState] = useState({
    status: "loading", // loading | ready | error
    sessionId: null,
    provider: "",
    messages: [],
    welcome: null,
  });
  const [lang, setLang] = useState(
    ["en", "hi", "or"].includes(user?.language_preference)
      ? user.language_preference
      : "en"
  );
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [crisis, setCrisis] = useState(null); // crisis card payload or null
  const [support, setSupport] = useState(null); // {requested, at}
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const [checkinStage, setCheckinStage] = useState(null); // index into CHECKIN_STAGES
  const [error, setError] = useState("");

  const say = (key) => copy(lang, key);

  const scrollDown = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [reduce]);

  useEffect(scrollDown, [state.messages, typing, crisis, checkinStage, scrollDown]);

  const openSession = useCallback(
    async (preferredLang) => {
      try {
        const data = await apiFetch("/api/chat/sessions", {
          method: "POST",
          body: { language: preferredLang || "en" },
        });
        const w = data.welcome || {};
        setLang(data.session?.language || preferredLang || "en");
        // A resumed session restores its stored conversation; a brand-new
        // session starts with the localised welcome message.
        const stored = data.session?.messages || [];
        const initial =
          stored.length > 0
            ? stored.map((m) => ({
                id: m.message_id,
                role: m.sender,
                content: m.content,
                timestamp: new Date(m.timestamp),
              }))
            : [
                {
                  id: "welcome",
                  role: "assistant",
                  content: w.text || "",
                  timestamp: new Date(),
                },
              ];
        if (data.session?.human_support_requested) {
          setSupport({ requested: true, at: new Date(data.session.human_support_at) });
        }
        setState({
          status: "ready",
          sessionId: data.session.session_id,
          provider: data.provider || "",
          welcome: w,
          messages: initial,
        });
        setError("");
      } catch (err) {
        setError(err.message);
        setState((s) => ({ ...s, status: "error" }));
      }
    },
    []
  );

  useEffect(() => {
    if (state.status === "loading") openSession(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send a deep-link starter message once the session is ready.
  const sentStarter = useRef(false);
  useEffect(() => {
    const starter = starterRef.current;
    if (!starter || sentStarter.current || state.status !== "ready" || typing) return;
    sentStarter.current = true;
    const text = starter === "checkin" ? "__quick_action_checkin__" : starter;
    send(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // A quick-answer chip or typed message must advance the guided check-in
  // when it matches the question (mirrors the backend parser).
  const advanceCheckin = (text) => {
    if (checkinStage === null) return;
    const stage = CHECKIN_STAGES[checkinStage];
    const t = text.trim().toLowerCase();
    const valid =
      stage === "mood" || stage === "sleep"
        ? /^([1-9]|10)$/.test(t)
        : stage === "safe"
          ? ["yes", "y", "no", "n", "sometimes", "हाँ", "नहीं", "कभी-कभी", "ହଁ", "ନାହିଁ", "ବେଳେବେଳେ"].includes(t)
          : ["yes", "y", "no", "n", "हाँ", "नहीं", "ହଁ", "ନାହିଁ"].includes(t);
    if (valid) {
      setCheckinStage(checkinStage >= CHECKIN_STAGES.length - 1 ? null : checkinStage + 1);
    }
  };

  const send = async (rawText) => {
    const text = rawText.trim();
    if (!text || typing || !state.sessionId) return;
    setError("");
    setDraft("");
    if (text === "__quick_action_checkin__") setCheckinStage(0);
    else advanceCheckin(text);

    // Quick actions bubble the label the person tapped (localised), not the
    // internal marker sent to the API.
    const quickLabel = (state.welcome?.quick_actions || []).find(
      (qa) => qa.prompt === text
    )?.label;
    const userMsg = {
      id: `u${Date.now()}`,
      role: "user",
      content: quickLabel || text,
      timestamp: new Date(),
    };
    setState((s) => ({ ...s, messages: [...s.messages, userMsg] }));
    setTyping(true);
    try {
      const data = await apiFetch(`/api/chat/sessions/${state.sessionId}/messages`, {
        method: "POST",
        body: { content: text, language: lang },
      });
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          { id: `a${Date.now()}`, role: "assistant", content: data.reply, timestamp: new Date() },
        ],
      }));
      if (data.crisis_detected || data.crisis_card) {
        setCrisis({ ...data.crisis_card, keywords: data.keywords_found || [] });
      }
      if (data.safety_level === "crisis") setCheckinStage(null);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 403
          ? "This conversation belongs to your own account only."
          : say("error") || "I could not respond right now. Please try again.";
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          { id: `e${Date.now()}`, role: "assistant", content: msg, timestamp: new Date() },
        ],
      }));
      setError(err.message);
    } finally {
      setTyping(false);
    }
  };

  const requestHumanSupport = async () => {
    if (!state.sessionId || support?.requested) return;
    setError("");
    try {
      await apiFetch(`/api/chat/sessions/${state.sessionId}/human-support`, {
        method: "POST",
        body: { note: "Requested from Talk to Sahara." },
      });
      setSupport({ requested: true, at: new Date() });
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          { id: `hs${Date.now()}`, role: "assistant", content: say("humanRequested"), timestamp: new Date() },
        ],
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteConversation = async () => {
    if (!state.sessionId) return;
    try {
      await apiFetch(`/api/chat/sessions/${state.sessionId}`, { method: "DELETE" });
      setCrisis(null);
      setSupport(null);
      setCheckinStage(null);
      setConfirmDelete(false);
      setNotice(say("deleted"));
      setState({ status: "loading", sessionId: null, provider: "", messages: [], welcome: null });
      openSession(lang);
    } catch (err) {
      setError(err.message);
      setConfirmDelete(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (draft.trim()) send(draft);
  };

  const quickActions = (state.welcome?.quick_actions || []).filter(
    (qa) => !HIDDEN_QUICK_ACTIONS.has(qa.key)
  );
  const demoMode = state.provider === "mock" || state.provider === "fallback";
  const checkinOpts = checkinStage !== null ? CHECKIN_OPTIONS[CHECKIN_STAGES[checkinStage]] : null;

  return (
    <>
      <PageHeader eyebrow={say("eyebrow")} title={say("title")} lead={say("lead")}>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Language picker — en / hi / or, extensible. */}
          <div
            role="group"
            aria-label={say("langLabel")}
            className="inline-flex items-center rounded-full border border-sand-300 bg-white p-0.5"
          >
            {CHAT_LANGS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-small font-medium transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600",
                  lang === code
                    ? "bg-marigold-600 text-white"
                    : "text-ink-600 hover:bg-sand-100"
                )}
              >
                {LANG_LABELS[code]}
              </button>
            ))}
          </div>
          <Buttonish onRequestHumanSupport={requestHumanSupport} support={support} say={say} />
          {support?.requested && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1.5 text-caption font-semibold text-sage-800"
            >
              <LockKeyhole size={13} aria-hidden="true" /> {say("humanRequested")}
            </span>
          )}
        </div>
      </PageHeader>

      <section aria-label="Talk to Sahara" className="bg-sand-50 pb-20">
        <div className="shell">
          {error && (
            <p role="alert" className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-small text-amber-800">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-6 rounded-xl border border-sage-300 bg-sage-50 px-4 py-3 text-small text-sage-800">
              {notice}
            </p>
          )}

          {/* Persistent crisis banner — always visible at top when active */}
          {crisis && state.status === "ready" && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3"
            >
              <p className="flex items-center gap-2 text-small font-semibold text-amber-900">
                <Phone size={15} aria-hidden="true" />
                {crisis.ack}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(crisis.numbers || []).map((n) => (
                  <a
                    key={n.number}
                    href={`tel:${n.number}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-small font-semibold text-ink-900 ring-1 ring-amber-300 transition-colors hover:ring-amber-500"
                  >
                    <Phone size={12} aria-hidden="true" /> {n.number}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Chat card */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-1">
            <div className="flex items-center justify-between gap-3 border-b border-sand-200 bg-sand-50 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-600 text-white">
                  <MessageCircleHeart size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-h4 font-semibold leading-tight text-ink-900">
                    Talk to Sahara
                  </p>
                  <p className="text-caption text-ink-500">
                    {state.status === "loading" ? say("loading") : say("connected")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-small font-medium text-ink-500 transition-colors duration-fast hover:bg-sand-100 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
              >
                <Trash2 size={15} aria-hidden="true" />
                <span className="hidden sm:inline">{say("deleteLabel")}</span>
                <span className="sr-only sm:hidden">{say("deleteLabel")}</span>
              </button>
            </div>

            {demoMode && state.status === "ready" && (
              <p className="border-b border-sand-200 bg-sand-50 px-5 py-2 text-caption text-ink-500">
                {say("demoNote")}
              </p>
            )}

            {/* Messages */}
            <div
              ref={listRef}
              role="log"
              aria-live="polite"
              aria-label="Support conversation"
              className="flex max-h-[34rem] min-h-[24rem] flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6"
            >
              {state.status === "loading" && (
                <p className="text-small text-ink-500">{say("loading")}</p>
              )}
              {state.status === "error" && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-small text-amber-800 ring-1 ring-amber-200">
                  {say("error")}
                </div>
              )}

              {state.messages.map((m) => (
                <Bubble key={m.id} msg={m} name={user?.name || say("you")} />
              ))}

              {typing && <TypingDots />}

              {/* Crisis card — calm amber, never red; numbers always visible. */}
              {crisis && state.status === "ready" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-1 rounded-2xl border border-amber-300 bg-amber-50 p-4"
                  role="alert"
                >
                  <p className="flex items-start gap-2 font-medium text-amber-900">
                    <Phone size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                    <span>{crisis.ack}</span>
                  </p>
                  <ul className="mt-3 space-y-2">
                    {(crisis.numbers || []).map((n) => (
                      <li key={n.number} className="flex flex-wrap items-center gap-2 text-small">
                        <a
                          href={`tel:${n.number}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold text-ink-900 ring-1 ring-amber-300 transition-colors hover:ring-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                        >
                          <Phone size={13} aria-hidden="true" /> {n.number}
                        </a>
                        <span className="text-amber-900">{n.label}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <CtaButton onClick={requestHumanSupport} disabled={support?.requested} say={say}>
                      {crisis.human_cta}
                    </CtaButton>
                  </div>
                </motion.div>
              )}

              {/* Guided check-in quick answers */}
              {checkinOpts && !typing && (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick answers">
                  {checkinOpts.kind === "scale" && checkinOpts.labels?.[lang] && (
                    <span className="text-caption font-medium text-ink-500 mr-1">
                      {checkinOpts.labels[lang].low}
                    </span>
                  )}
                  {(checkinOpts.kind === "scale" ? checkinOpts.options : checkinOpts.options[lang] || []).map(
                    (opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => send(opt)}
                        className="rounded-full border border-sage-300 bg-sage-50 px-3.5 py-2 text-small font-medium text-sage-800 transition-colors duration-fast hover:bg-sage-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600"
                      >
                        {opt}
                      </button>
                    )
                  )}
                  {checkinOpts.kind === "scale" && checkinOpts.labels?.[lang] && (
                    <span className="text-caption font-medium text-ink-500 ml-1">
                      {checkinOpts.labels[lang].high}
                    </span>
                  )}
                </div>
              )}

              {/* Quick actions */}
              {quickActions.length > 0 && state.status === "ready" && !typing &&
                state.messages.length <= 2 && (
                <div className="mt-2 space-y-2" role="group" aria-label="Quick actions">
                  <p className="text-caption font-medium uppercase tracking-wider text-ink-500">
                    {state.welcome?.title || "How are you doing today?"}
                  </p>
                  {quickActions.map((qa) => (
                    <button
                      key={qa.key}
                      type="button"
                      onClick={() => send(qa.prompt)}
                      className="block w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-left text-small font-medium text-ink-800 shadow-1 transition-all duration-fast ease-soft hover:-translate-y-0.5 hover:border-marigold-300 hover:text-marigold-800 hover:shadow-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Composer */}
            <form onSubmit={submit} className="flex items-end gap-2 border-t border-sand-200 bg-sand-50 px-4 py-3">
              <label htmlFor="talk-input" className="sr-only">
                {say("placeholder")}
              </label>
              <input
                id="talk-input"
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={say("placeholder")}
                autoComplete="off"
                disabled={state.status !== "ready"}
                className="min-h-[44px] w-full rounded-md border border-sand-300 bg-white px-3.5 py-2.5 text-[0.9375rem] text-ink-900 placeholder:text-ink-400 focus:border-marigold-500 focus:outline-none focus:ring-2 focus:ring-marigold-500/30 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!draft.trim() || typing || state.status !== "ready"}
                aria-label={say("send")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-marigold-600 text-white transition-colors duration-fast ease-soft hover:bg-marigold-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600 disabled:opacity-50"
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </form>
          </div>

          {/* Privacy + human-in-the-loop */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-sand-200 bg-white p-5">
              <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-sage-700">
                <ShieldCheck size={15} aria-hidden="true" /> Privacy, plainly
              </p>
              <p className="mt-2 text-small leading-relaxed text-ink-700">
                {state.welcome?.privacy_note || say("privacy")}
              </p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-white p-5">
              <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-marigold-700">
                <LockKeyhole size={15} aria-hidden="true" /> Human in the loop
              </p>
              <p className="mt-2 text-small leading-relaxed text-ink-700">{say("aiNote")}</p>
            </div>
          </div>

          {/* Delete confirmation */}
          {confirmDelete && (
            <div
              className="fixed inset-0 z-drawer flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-title"
            >
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-3">
                <h2 id="delete-title" className="font-display text-h4 font-semibold text-ink-900">
                  {say("deleteConfirm")}
                </h2>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[44px] rounded-md border border-sand-300 bg-white px-5 py-2.5 text-small font-medium text-ink-800 transition-colors duration-fast hover:bg-sand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
                  >
                    {lang === "hi" ? "रद्द करें" : lang === "or" ? "ବାତିଲ୍" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={deleteConversation}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-amber-700 px-5 py-2.5 text-small font-medium text-white transition-colors duration-fast hover:bg-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    {lang === "hi" ? "हटाएँ" : lang === "or" ? "ହଟାନ୍ତୁ" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/** Small internal button helper for in-page actions (avoids router Button `to`). */
function CtaButton({ onClick, disabled, say, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-amber-600 px-5 py-2.5 text-small font-medium text-white transition-all duration-fast ease-soft hover:bg-amber-700 hover:shadow-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-60"
    >
      <Phone size={15} aria-hidden="true" />
      {children}
    </button>
  );
}

/** Header-level "Talk to a person" control. */
function Buttonish({ onRequestHumanSupport, support, say }) {
  if (support?.requested) return null;
  return (
    <button
      type="button"
      onClick={onRequestHumanSupport}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-marigold-300 bg-marigold-50 px-5 py-2 text-small font-semibold text-marigold-800 transition-colors duration-fast ease-soft hover:bg-marigold-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
    >
      <HeartHandshake size={16} aria-hidden="true" />
      {say("humanCta")}
    </button>
  );
}
