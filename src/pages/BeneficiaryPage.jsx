import { useCallback, useEffect, useState } from "react";
import { HeartHandshake, Loader2, LockKeyhole, ShieldCheck, Sparkles, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Sparkline from "../components/Sparkline";
import Button from "../ui/Button";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import WellbeingSection from "../components/wellbeing/WellbeingSection";
import CalmCorner from "../components/calm/CalmCorner";

const badgeLevel = (level) => (level === "needs_attention" ? "attention" : level);

const ONBOARDING_KEY = "sahara.onboarded";

export default function BeneficiaryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem(ONBOARDING_KEY);
    } catch {
      return false;
    }
  });

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      /* private mode */
    }
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await apiFetch(`/api/user/${user.user_id}/history`);
      setHistory(data.history || []);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const latest = history && history.length ? history[history.length - 1] : null;
  const scores = (history || []).map((h) => h.distress_score);

  return (
    <>
      <PageHeader
        eyebrow="My Sahara · private space"
        title="Your wellbeing, in your hands."
        lead="This view shows only your own check-in history — nothing else. You decide what you share, and a human is always there if you want one."
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-sand-300 bg-white px-3 py-1.5 text-caption font-medium text-ink-700">
            {user?.name || "You"} · beneficiary
          </span>
        </div>
      </PageHeader>

      <section className="bg-sand-50 pb-20">
        <div className="shell pt-10">
          {/* First-time onboarding — simple 3-step welcome */}
          {showOnboarding && (
            <div className="mb-6 rounded-2xl border border-sage-200 bg-sage-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-h4 font-semibold text-ink-900">Welcome to your space</p>
                  <p className="mt-2 text-small leading-relaxed text-ink-700">
                    This is your private area. Here is what you can do:
                  </p>
                  <ol className="mt-3 space-y-2 text-small text-ink-700">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-600 text-[11px] font-bold text-white">1</span>
                      <span><strong>Talk to Sahara</strong> — share how you are feeling, in English, हिंदी or ଓଡ଼ିଆ</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-600 text-[11px] font-bold text-white">2</span>
                      <span><strong>Complete a check-in</strong> — your wellbeing trend will appear here</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-600 text-[11px] font-bold text-white">3</span>
                      <span><strong>You are always in control</strong> — exit anytime, delete your conversation anytime</span>
                    </li>
                  </ol>
                </div>
                <button
                  type="button"
                  onClick={dismissOnboarding}
                  className="shrink-0 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sage-100 hover:text-ink-700"
                  aria-label="Dismiss welcome message"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button to="/talk" variant="primary" size="sm">
                  Talk to Sahara
                </Button>
                <button
                  type="button"
                  onClick={dismissOnboarding}
                  className="text-small font-medium text-ink-500 hover:text-ink-700"
                >
                  I will explore on my own
                </button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-small text-amber-800">
              {error}
            </p>
          )}

          {/* Wellbeing & Support — real plan/progress/reflections/support (STEP 2) */}
          <WellbeingSection history={history} />

          {/* Calm Corner — always-available quiet space (scenes / sounds / journal) */}
          <div className="my-5">
            <CalmCorner />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-sand-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-marigold-50 text-marigold-700">
                  <HeartHandshake size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h2 className="font-display text-lg font-semibold text-ink-900">How you are doing</h2>
              </div>

              {!history && !error && (
                <p className="mt-5 inline-flex items-center gap-2 text-small text-ink-500">
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading your data…
                </p>
              )}
              {latest && (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-caption uppercase tracking-wider text-ink-500">Latest check-in</p>
                    <StatusBadge level={badgeLevel(latest.risk_level)} className="mt-1.5" />
                  </div>
                  <div>
                    <p className="text-caption uppercase tracking-wider text-ink-500">Over your check-ins</p>
                    <div className="mt-2">
                      <Sparkline
                        data={scores}
                        color="var(--color-marigold-600)"
                        width={180}
                        height={36}
                        className="max-w-full"
                      />
                      <p className="mt-1 text-caption text-ink-500">
                        {history.length} check-in{history.length === 1 ? "" : "s"} stored — visible only to you.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {history && history.length === 0 && (
                <p className="mt-5 text-small leading-relaxed text-ink-600">
                  No check-ins yet. When you complete a check-in from Talk to Sahara, your trend will appear here.
                </p>
              )}
              <div className="mt-6 flex items-start gap-2.5 border-t border-sand-100 pt-4 text-caption leading-relaxed text-ink-500">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-sage-600" aria-hidden="true" />
                <span>AI-assisted estimates are never a diagnosis, and no score ever closes your case.</span>
              </div>
            </div>

            <div className="rounded-2xl border border-sand-200/80 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-50 text-sage-700">
                    <Sparkles size={16} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink-900">Check-in timeline</h2>
                    <p className="text-caption text-ink-500">Dates, distress scores, and risk classifications</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1 text-[11px] font-medium text-ink-700">
                  <LockKeyhole size={12} className="text-sage-600" aria-hidden="true" /> Private record
                </span>
              </div>

              {!history && !error && (
                <p className="mt-5 inline-flex items-center gap-2 text-small text-ink-500">
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading…
                </p>
              )}
              {history && history.length > 0 ? (
                <ul className="mt-4 divide-y divide-sand-100">
                  {history.map((h) => (
                    <li key={h.checkin_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <time className="font-mono text-small text-ink-700">{h.date}</time>
                        {h.distress_score !== undefined && (
                          <span className="rounded bg-sand-100 px-2 py-0.5 font-mono text-[11px] text-ink-600">
                            Score: {h.distress_score}
                          </span>
                        )}
                      </div>
                      <StatusBadge level={badgeLevel(h.risk_level)} size="sm" />
                    </li>
                  ))}
                </ul>
              ) : history && (
                <p className="mt-4 text-small text-ink-500">No recorded check-ins yet.</p>
              )}

              <div className="mt-6 rounded-xl border border-sand-200 bg-sand-50/60 p-4">
                <p className="flex items-center gap-2 text-caption font-semibold text-ink-800">
                  <ShieldCheck size={14} className="text-sage-600" aria-hidden="true" /> DPDP Act 2023 Compliant · Data sovereignty guaranteed
                </p>
                <p className="mt-1 text-caption leading-relaxed text-ink-600">
                  Your wellbeing history is cryptographically tied to your personal session. No caseworker or official can modify or delete your personal check-ins without explicit authorization.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
