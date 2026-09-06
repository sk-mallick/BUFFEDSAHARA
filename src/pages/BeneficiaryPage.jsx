import { useCallback, useEffect, useState } from "react";
import { HeartHandshake, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Sparkline from "../components/Sparkline";
import Button from "../ui/Button";
import cn from "../lib/cn";
import { apiFetch, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import WellbeingSection from "../components/wellbeing/WellbeingSection";
import CalmCorner from "../components/calm/CalmCorner";

const badgeLevel = (level) => (level === "needs_attention" ? "attention" : level);

export default function BeneficiaryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [probe, setProbe] = useState(null);
  const [probing, setProbing] = useState(false);

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

  // Scope check: the caseworker console is staff-only — this session is a
  // beneficiary, so the server must refuse.
  const runProbe = async () => {
    setProbing(true);
    setProbe(null);
    try {
      await apiFetch("/api/dashboard/risk-queue");
      setProbe({ ok: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setProbe({ ok: false, status: 403 });
      else setProbe({ ok: false, status: err.status || 0 });
    } finally {
      setProbing(false);
    }
  };

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

          {/* Talk to Sahara — multilingual support companion (beneficiary portal) */}
          <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-sage-200 bg-sage-50 p-5 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white">
              <HeartHandshake size={20} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-h4 font-semibold text-ink-900">Talk to Sahara</p>
              <p className="mt-1 text-small leading-relaxed text-ink-700">
                Share how you are feeling, complete a wellbeing check-in, or ask for human
                support — in English, हिंदी or ଓଡ଼ିଆ. A safe place to talk; a human is always
                behind it.
              </p>
            </div>
            <Button to="/talk" variant="primary" size="sm" className="shrink-0">
              Open conversation
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <section aria-label="Current wellbeing" className="rounded-2xl border border-sand-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-h4 text-ink-900">
                <HeartHandshake size={18} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                How you are doing
              </h2>
              {!history && !error && (
                <p className="mt-5 inline-flex items-center gap-2 text-small text-ink-500">
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading your data…
                </p>
              )}
              {latest && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-caption uppercase tracking-wider text-ink-500">Latest check-in</p>
                      <p className="mt-1 font-display text-3xl font-semibold text-ink-900">
                        {latest.distress_score}
                        <span className="text-lg text-ink-400">/100</span>
                      </p>
                      <p className="text-caption text-ink-500">distress score</p>
                    </div>
                    <StatusBadge level={badgeLevel(latest.risk_level)} />
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
                        {history.length} check-in{history.length === 1 ? "" : "s"} stored — only you can see this.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {history && history.length === 0 && (
                <p className="mt-5 text-small leading-relaxed text-ink-700">
                  No check-ins yet. When you complete a check-in from the support line, your own trend
                  will appear here.
                </p>
              )}
              <p className="mt-5 flex items-start gap-2 border-t border-sand-100 pt-3 text-caption leading-relaxed text-ink-500">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-sage-600" aria-hidden="true" />
                AI-assisted risk estimates are never a diagnosis, and no score ever closes your case.
              </p>
            </section>

            <section aria-label="Your check-in timeline" className="rounded-2xl border border-sand-200 bg-white p-5 lg:col-span-2">
              <h2 className="flex items-center gap-2 text-h4 text-ink-900">
                <Sparkles size={17} strokeWidth={1.5} className="text-sage-600" aria-hidden="true" />
                Your check-in timeline
              </h2>
              <p className="mt-1 text-caption text-ink-500">Dates, scores and risk levels from your own history.</p>

              {!history && !error && (
                <p className="mt-5 inline-flex items-center gap-2 text-small text-ink-500">
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading…
                </p>
              )}
              <ul className="mt-4 divide-y divide-sand-100">
                {(history || []).map((h) => (
                  <li key={h.checkin_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                    <time className="w-24 shrink-0 font-mono text-caption text-ink-500">{h.date}</time>
                    <StatusBadge level={badgeLevel(h.risk_level)} size="sm" />
                    <span className="font-mono text-small text-ink-900">
                      {h.distress_score}<span className="text-ink-400">/100</span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* Scope probe */}
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-caption font-semibold text-amber-800">
                  <LockKeyhole size={14} aria-hidden="true" /> Your data stays yours — verified live
                </p>
                <p className="mt-1.5 text-caption leading-relaxed text-ink-700">
                  This session is signed in as a beneficiary, so staff-only views must refuse it:
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="secondary" onClick={runProbe} disabled={probing}>
                    {probing && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
                    Try to open the caseworker console
                  </Button>
                  {probe && (
                    <span
                      role="status"
                      className={cn(
                        "rounded-full px-3 py-1 text-caption font-semibold",
                        probe.ok
                          ? "bg-critical-50 text-critical-700"
                          : probe.status === 403
                            ? "bg-sage-100 text-sage-800"
                            : "bg-sand-200 text-ink-700"
                      )}
                    >
                      {probe.ok
                        ? "Unexpected: access allowed (notify your administrator)"
                        : probe.status === 403
                          ? "403 Forbidden — denied by the server ✓"
                          : `Blocked (HTTP ${probe.status})`}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-caption leading-relaxed text-ink-600">
                  No other person — caseworker, district office or state office — can open your history
                  through this portal. That boundary is enforced by the server, not by this page.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
