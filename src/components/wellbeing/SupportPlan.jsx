import { CheckCircle2, HeartHandshake, Loader2, Sparkles } from "lucide-react";
import cn from "../../lib/cn";
import { categoryLabel } from "../../data/wellbeingI18n";

// Localise a stable backend key (summary_*, basis_*, reason_*); if the
// current dictionary lacks it, fall back to the English text the server
// actually sent — a raw key must never reach the beneficiary.
function localise(key, fallback, say) {
  if (!key) return fallback || "";
  const v = say(key);
  return v && v !== key ? v : fallback;
}

/**
 * "Your support plan" — the personalised activity list returned by the real
 * backend (GET /api/wellbeing/plan). Loading / error / empty / success states
 * included; never substitutes mock data.
 */
export default function SupportPlan({
  plan,
  progress,
  loading,
  error,
  lang,
  say,
  act,
  onRetry,
  onStart,
}) {
  return (
    <section
      aria-label={say("planTitle")}
      className="rounded-2xl border border-sand-200 bg-white p-5 sm:p-6"
    >
      <h3 className="flex items-center gap-2 text-h4 font-semibold text-ink-900">
        <Sparkles size={17} strokeWidth={1.5} className="text-sage-600" aria-hidden="true" />
        {say("planTitle")}
      </h3>

      {loading && (
        <p className="mt-4 inline-flex items-center gap-2 text-small text-ink-500">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" /> {say("loading")}
        </p>
      )}

      {error && !plan && (
        <div className="mt-4 space-y-3" role="alert">
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-small text-amber-800">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-sand-300 bg-white px-5 py-2.5 text-small font-medium text-ink-800 transition-colors duration-fast hover:bg-sand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
          >
            {say("retry")}
          </button>
        </div>
      )}

      {plan && (
        <>
          {/* Adaptive, explainable summary — localised via summary_key, with
              the English text the server sent as the unknown-key fallback. */}
          <div className="mt-3 rounded-xl bg-sand-100/80 px-4 py-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-500">
              {say("planSummaryPrefix")}
            </p>
            <p className="mt-1 text-body font-medium leading-relaxed text-ink-900">
              {localise(plan.summary_key, plan.summary, say)}
            </p>
            <p className="mt-1.5 text-caption leading-relaxed text-ink-500">
              {localise(plan.basis_key, plan.basis, say)}
            </p>
          </div>

          {/* ONE recommended next small step + plain "why this step" line.
              Hidden entirely on the crisis path (a person comes first). */}
          {plan.next_step && plan.next_step.activity && (
            <div className="mt-4 rounded-2xl border border-marigold-300 bg-marigold-50/70 p-4">
              <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-marigold-800">
                <Sparkles size={13} aria-hidden="true" /> {say("nextStepEyebrow")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="font-medium text-ink-900">
                  {act(lang, plan.next_step.activity.activity_id, plan.next_step.activity.title).t}
                </p>
                <span className="rounded-full bg-marigold-200/70 px-2 py-0.5 text-[11px] font-medium text-marigold-900">
                  {plan.next_step.activity.duration_minutes} {say("minUnit")}
                </span>
                <span className="rounded-full bg-marigold-200/70 px-2 py-0.5 text-[11px] font-medium text-marigold-900">
                  {categoryLabel(lang, plan.next_step.activity.category)}
                </span>
              </div>
              <p className="mt-2 text-small leading-relaxed text-ink-700">
                <span className="font-semibold text-ink-800">{say("nextWhy")} </span>
                {localise(plan.next_step.reason_key, plan.next_step.reason, say)}
              </p>
              <button
                type="button"
                onClick={() => onStart(plan.next_step.activity)}
                className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-md bg-marigold-600 px-6 py-2 text-small font-semibold text-white transition-colors duration-fast ease-soft hover:bg-marigold-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
              >
                {say("startActivity")}
              </button>
            </div>
          )}

          {/* Human-support-first strip (never red; calm amber; text + icon). */}
          {plan.human_support_priority && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-small font-semibold text-amber-900">
                <HeartHandshake size={16} className="shrink-0 text-amber-700" aria-hidden="true" />
                {say("humanFirstTitle")}
              </p>
              <p className="mt-1.5 text-small leading-relaxed text-ink-800">
                {plan.crisis_priority ? say("crisisFirstNote") : say("humanFirstNote")}
              </p>
            </div>
          )}

          {plan.activities && plan.activities.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {plan.activities.map((a) => {
                const { t, d } = act(lang, a.activity_id, a.title);
                return (
                  <li
                    key={a.activity_id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-sand-200 bg-sand-50/60 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-medium text-ink-900">{t}</p>
                        <span className="rounded-full bg-sand-200 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                          {a.duration_minutes} {say("minUnit")}
                        </span>
                        <span className="rounded-full bg-sand-200 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                          {categoryLabel(lang, a.category)}
                        </span>
                        {a.completed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2.5 py-0.5 text-[11px] font-semibold text-sage-800">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            {a.completed_today ? say("completedTodayBadge") : say("doneBadge")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-small leading-relaxed text-ink-700">{d}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStart(a)}
                      className={cn(
                        "inline-flex min-h-[44px] items-center gap-2 rounded-md px-5 py-2 text-small font-semibold transition-colors duration-fast ease-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                        a.completed
                          ? "border border-sand-300 bg-white text-ink-800 hover:bg-sand-100 focus-visible:outline-marigold-600"
                          : "bg-sage-600 text-white hover:bg-sage-700 focus-visible:outline-sage-600"
                      )}
                    >
                      {a.completed ? say("redoActivity") : say("startActivity")}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 text-small leading-relaxed text-ink-700">{say("planEmpty")}</p>
          )}

          {/* Gentle completion count (all-time, real progress API). */}
          {progress && (
            <p className="mt-4 flex items-center gap-2 border-t border-sand-100 pt-3 text-caption text-ink-500">
              <CheckCircle2 size={13} className="text-sage-600" aria-hidden="true" />
              {progress.total_completed} {say("planCompletedCount")}
            </p>
          )}
          <p className="mt-2 text-caption leading-relaxed text-ink-500">{say("planNote")}</p>
        </>
      )}
    </section>
  );
}
