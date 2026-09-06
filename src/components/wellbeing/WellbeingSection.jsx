import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  MessageCircleHeart,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { wellbeingApi } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useLang } from "../../lib/i18n";
import cn from "../../lib/cn";
import Button from "../../ui/Button";
import {
  activityCopy,
  categoryLabel,
  copy as i18nCopy,
  WB_LANGS,
  WB_LANG_LABELS,
} from "../../data/wellbeingI18n";
import ActivityModal from "./ActivityModal";
import SupportPlan from "./SupportPlan";
import ReflectionCard from "./ReflectionCard";

const WB_LANG_KEY = "sahara-wellbeing-lang";

// ---------------------------------------------------------------------------
// Plain-language words for the progress view. Never numbers: each check-in
// band maps to one calm word (stable / improving / needs attention /
// significant concern). "Improving" is used when a monitoring-level point
// follows something harder — an honest, gentle reading of the direction.
// ---------------------------------------------------------------------------
const RANK = { stable: 0, monitoring: 1, needs_attention: 2, urgent: 3 };

function trendWord(history, say) {
  if (!history || history.length === 0) return "";
  const last = history[history.length - 1];
  const lastRank = RANK[last.risk_level] ?? 1;
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const prevRank = prev ? RANK[prev.risk_level] ?? 1 : null;
  if (lastRank === 0) return say("wordStable");
  if (lastRank === 3) return say("wordConcern");
  if (lastRank === 2) return say("wordAttention");
  if (prevRank !== null && prevRank > lastRank) return say("wordImproving");
  return say("wordAttention");
}

function wordFor(level, prevRank, say) {
  const r = RANK[level] ?? 1;
  if (r === 0) return say("wordStable");
  if (r === 3) return say("wordConcern");
  if (r === 2) return say("wordAttention");
  if (prevRank !== null && prevRank > r) return say("wordImproving");
  return say("wordAttention");
}

const SUPPORT_STATE_KEY = {
  none: "stNone",
  awaiting_review: "stAwaiting",
  support_requested: "stAwaiting",
  action_planned: "stAction",
  follow_up_scheduled: "stScheduled",
  follow_up_completed: "stCompleted",
  escalated: "stEscalated",
};

export default function WellbeingSection({ history }) {
  const { user } = useAuth();
  const { lang: siteLang } = useLang();
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem(WB_LANG_KEY);
      if (WB_LANGS.includes(stored)) return stored;
    } catch {
      /* storage unavailable */
    }
    if (WB_LANGS.includes(user?.language_preference)) return user.language_preference;
    return WB_LANGS.includes(siteLang) ? siteLang : "en";
  });
  const say = useCallback((key) => i18nCopy(lang, key), [lang]);
  const act = useCallback(
    (l, id, backendTitle) => activityCopy(l, id, backendTitle),
    []
  );

  // ---- plan + progress -----------------------------------------------------
  const [plan, setPlan] = useState(null);
  const [planError, setPlanError] = useState("");
  const [progress, setProgress] = useState(null);
  const [activeActivity, setActiveActivity] = useState(null);

  const loadPlan = useCallback(async () => {
    setPlanError("");
    try {
      const [p, pr] = await Promise.all([
        wellbeingApi.getPlan(),
        wellbeingApi.getProgress(),
      ]);
      setPlan(p);
      setProgress(pr);
    } catch (err) {
      setPlanError(err.message || say("error"));
    }
  }, [say]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // ---- support request -----------------------------------------------------
  const [support, setSupport] = useState(null); // backend status object
  const [supportLoading, setSupportLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");

  const loadSupport = useCallback(async () => {
    try {
      const st = await wellbeingApi.getSupportStatus();
      setSupport(st);
    } catch {
      setSupport(null);
    } finally {
      setSupportLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSupport();
  }, [loadSupport]);

  const requestSupport = async () => {
    if (requesting) return;
    setRequesting(true);
    setSupportMsg("");
    try {
      await wellbeingApi.requestSupport();
      await loadSupport();
      setSupportMsg(say("humanRequested"));
    } catch (err) {
      setSupportMsg(err.message || say("error"));
    } finally {
      setRequesting(false);
    }
  };

  // ---- completions + reflections -------------------------------------------
  const completeActivity = useCallback(
    async (activityId) => {
      const resp = await wellbeingApi.completeActivity(activityId);
      await loadPlan();
      return resp; // { feedback_key, feedback, ... } — shown in the modal
    },
    [loadPlan]
  );

  const [refKey, setRefKey] = useState(0);
  const bumpReflections = () => setRefKey((k) => k + 1);
  const saveReflection = useCallback(async (text) => {
    await wellbeingApi.saveReflection(text);
    bumpReflections();
  }, []);

  const openTalk = (q) =>
    `/talk?q=${encodeURIComponent(q)}`;

  const supportKey = support ? SUPPORT_STATE_KEY[support.status] || "stNone" : "stNone";
  const hasOpenRequest =
    support && support.support_requested && !support.human_response_recorded;
  const planNeedsHuman = plan?.human_support_priority;

  return (
    <section aria-labelledby="wellbeing-heading" className="mt-8">
      {/* Header + language picker */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow-text">{say("eyebrow")}</p>
          <h2
            id="wellbeing-heading"
            className="mt-2 font-display text-h2 font-semibold text-ink-900"
          >
            {say("title")}
          </h2>
          <p className="mt-3 text-body leading-relaxed text-ink-700">{say("lead")}</p>
        </div>
        <div
          role="group"
          aria-label={say("langLabel")}
          className="inline-flex items-center rounded-full border border-sand-300 bg-white p-0.5"
        >
          {WB_LANGS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLang(code);
                try {
                  localStorage.setItem(WB_LANG_KEY, code);
                } catch {
                  /* session-only preference is fine */
                }
              }}
              aria-pressed={lang === code}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-small font-medium transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600",
                lang === code
                  ? "bg-marigold-600 text-white"
                  : "text-ink-600 hover:bg-sand-100"
              )}
            >
              {WB_LANG_LABELS[code]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-5">
        {/* 1. TODAY'S WELLBEING */}
        <Card className="lg:col-span-2" label={say("todayTitle")}>
          <p className="mt-1 text-caption uppercase tracking-wider text-ink-500">
            {lang === "hi" ? "एक मिनट, पूरी गोपनीयता" : lang === "or" ? "ଗୋଟିଏ ମିନିଟ୍, ସମ୍ପୂର୍ଣ୍ଣ ଗୋପନୀୟତା" : "About a minute · fully private"}
          </p>
          {history === null ? (
            <p className="mt-4 inline-flex items-center gap-2 text-small text-ink-500">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" /> {say("todayLoading")}
            </p>
          ) : (
            <>
              <p className="mt-2 text-small leading-relaxed text-ink-700">{say("todayLead")}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button to={openTalk("checkin")} variant="primary" size="md" className="flex-1">
                  {say("checkinCta")}
                </Button>
                <Button to="/talk" variant="secondary" size="md" className="flex-1">
                  {say("talkCta")}
                </Button>
              </div>
              <p className="mt-4 flex items-start gap-2 text-caption leading-relaxed text-ink-500">
                <LockKeyhole size={13} className="mt-0.5 shrink-0 text-sage-600" aria-hidden="true" />
                {say("todayPrivacy")}
              </p>
            </>
          )}
        </Card>

        {/* 4. WELLBEING PROGRESS (plain words from the real history) */}
        <Card className="lg:col-span-3" label={say("progressTitle")}>
          <p className="mt-1 text-caption uppercase tracking-wider text-ink-500">{say("progressLead")}</p>
          {history && history.length > 0 ? (
            <TrendBlock history={history} say={say} />
          ) : history && history.length === 0 ? (
            <p className="mt-4 text-small leading-relaxed text-ink-700">{say("noHistory")}</p>
          ) : (
            <p className="mt-4 inline-flex items-center gap-2 text-small text-ink-500">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" /> {say("todayLoading")}
            </p>
          )}
        </Card>
      </div>

      {/* 2. SUPPORT PLAN */}
      <div className="mt-6">
        <SupportPlan
          plan={plan}
          progress={progress}
          loading={plan === null && !planError}
          error={planError}
          lang={lang}
          say={say}
          act={act}
          onRetry={loadPlan}
          onStart={setActiveActivity}
          onRequestSupport={requestSupport}
          requesting={requesting}
          hasOpenRequest={Boolean(hasOpenRequest)}
        />
      </div>

      {/* 5. REFLECTION + 6/7. HUMAN SUPPORT & TALK TO SAHARA */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ReflectionCard lang={lang} say={say} refreshKey={refKey} onSave={saveReflection} />

        <div className="flex flex-col gap-6">
          {/* Human support */}
          <Card
            label={
              <span className="flex items-center gap-2">
                <HeartHandshake size={18} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                {say("humanTitle")}
              </span>
            }
            className="flex-1"
          >
            <p className="mt-2 text-small leading-relaxed text-ink-700">{say("humanLead")}</p>

            {supportLoading ? (
              <p className="mt-4 inline-flex items-center gap-2 text-small text-ink-500">
                <Loader2 size={15} className="animate-spin" aria-hidden="true" /> {say("loading")}
              </p>
            ) : hasOpenRequest ? (
              <p
                role="status"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-sage-100 px-4 py-2 text-small font-semibold text-sage-800"
              >
                <CheckCircle2 size={15} aria-hidden="true" /> {say("humanPending")}
              </p>
            ) : (
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="md"
                  loading={requesting}
                  onClick={requestSupport}
                  className="w-full sm:w-auto"
                >
                  {say("humanCta")}
                </Button>
              </div>
            )}

            {supportMsg && (
              <p role="status" className={cn(
                "mt-3 text-small leading-relaxed",
                support && support.support_requested ? "text-sage-800" : "text-amber-800"
              )}>
                {supportMsg}
              </p>
            )}
            {support && !hasOpenRequest && support.support_requested && (
              <p className="mt-3 text-small text-ink-600">
                {say(supportKey) || say("stCompleted")}
              </p>
            )}

            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-sand-100 pt-3 text-caption text-ink-500">
              <span className="flex items-center gap-1.5">
                <Phone size={12} aria-hidden="true" />
                <a href="tel:14566" className="font-semibold text-ink-800 underline decoration-sand-300 underline-offset-2 hover:text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600">
                  {say("humanHelpline")}
                </a>
              </span>
              <span aria-hidden="true">·</span>
              <span className="sr-only">, </span>
              <span>{say("supportSystemNote")}</span>
            </p>
          </Card>

          {/* Talk to Sahara contextual entries */}
          <Card
            label={
              <span className="flex items-center gap-2">
                <MessageCircleHeart size={18} strokeWidth={1.5} className="text-sage-700" aria-hidden="true" />
                {say("talkTitle")}
              </span>
            }
          >
            <p className="mt-2 text-small leading-relaxed text-ink-700">{say("talkLead")}</p>
            <ul className="mt-4 space-y-2">
              {[
                { label: say("talkFeel"), q: say("talkFeelQ") },
                { label: say("talkCalm"), q: say("talkCalmQ") },
                { label: say("talkPlan"), q: say("talkPlanQ") },
              ].map((e) => (
                <li key={e.q}>
                  <Link
                    to={openTalk(e.q)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-sand-200 bg-white px-4 py-3 text-small font-medium text-ink-800 shadow-1 transition-all duration-fast ease-soft hover:-translate-y-0.5 hover:border-marigold-300 hover:text-marigold-800 hover:shadow-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
                  >
                    {e.label}
                    <ChevronRight
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 transition-transform duration-fast group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Human-in-the-loop note */}
      <p className="mt-6 flex items-start gap-2 rounded-2xl border border-sand-200 bg-white px-5 py-4 text-caption leading-relaxed text-ink-600">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-sage-600" aria-hidden="true" />
        {say("humanInLoop")}
      </p>

      {/* Interactive activity */}
      {activeActivity && (
        <ActivityModal
          activity={activeActivity}
          lang={lang}
          say={say}
          act={act}
          onClose={() => setActiveActivity(null)}
          onComplete={completeActivity}
          onSaveReflection={saveReflection}
        />
      )}
    </section>
  );
}

function Card({ label, children, className }) {
  return (
    <section
      aria-label={typeof label === "string" ? label : undefined}
      className={cn("rounded-2xl border border-sand-200 bg-white p-5", className)}
    >
      <h3 className="flex items-center gap-2 text-h4 font-semibold text-ink-900">
        {typeof label === "string" ? (
          <>
            <Sparkles size={17} strokeWidth={1.5} className="text-sage-600" aria-hidden="true" />
            {label}
          </>
        ) : (
          label
        )}
      </h3>
      {children}
    </section>
  );
}

/** Plain-word trend strip — last six check-ins as labelled chips, no scores. */
function TrendBlock({ history, say }) {
  const latest = history[history.length - 1];
  const last = trendWord(history, say);
  const recent = history.slice(-6);
  const icon =
    last === say("wordConcern")
      ? "bg-amber-100 text-amber-800 ring-amber-300"
      : last === say("wordAttention")
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : last === say("wordImproving")
          ? "bg-sage-100 text-sage-800 ring-sage-300"
          : "bg-sage-50 text-sage-700 ring-sage-200";

  return (
    <div className="mt-4">
      <p className="text-small font-medium text-ink-500">{say("progressHl")}</p>
      <p className={cn("mt-2 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-small font-semibold ring-1", icon)}>
        {last}
      </p>

      <p className="mt-5 text-caption font-medium uppercase tracking-wider text-ink-500">
        {say("recentLabel")}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label={say("srProgress")}>
        {recent.map((h, i) => {
          const prev = recent[i - 1];
          const prevRank = prev ? RANK[prev.risk_level] ?? 1 : null;
          const word = wordFor(h.risk_level, prevRank, say);
          const tone =
            word === say("wordConcern")
              ? "border-amber-400 bg-amber-50 text-amber-800"
              : word === say("wordAttention")
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : word === say("wordImproving")
                  ? "border-sage-300 bg-sage-50 text-sage-800"
                  : "border-sage-200 bg-sage-50 text-sage-700";
          return (
            <li
              key={h.checkin_id}
              className={cn("rounded-full border px-3 py-1 text-caption font-medium", tone)}
            >
              <span aria-hidden="true" className="mr-1.5 font-mono">
                {h.date.slice(5)}
              </span>
              {word}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex items-start gap-2 border-t border-sand-100 pt-3 text-caption leading-relaxed text-ink-500">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-sage-600" aria-hidden="true" />
        {say("progressNote")}
        <span className="ml-auto hidden shrink-0 sm:inline text-ink-400">
          {history.length} {say("checkinsWord")}
        </span>
      </p>
    </div>
  );
}


