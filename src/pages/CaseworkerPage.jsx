import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  BookOpen,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Flag,
  Inbox,
  Loader2,
  LockKeyhole,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Button from "../ui/Button";
import cn from "../lib/cn";
import { apiFetch, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// ---------------------------------------------------------------------------
// Small presentational helpers shared by the console sections.
// ---------------------------------------------------------------------------

const badgeLevel = (level) => (level === "needs_attention" ? "attention" : level);

const TREND_ICON = {
  worsening: { Icon: ArrowUpRight, cls: "text-critical-600" },
  improving: { Icon: ArrowDownRight, cls: "text-sage-600" },
};
function TrendTag({ trend }) {
  const cfg = TREND_ICON[trend];
  if (!cfg) return <span className="text-caption text-ink-500">Stable</span>;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-caption font-medium", cfg.cls)}>
      <cfg.Icon size={12} aria-hidden="true" />
      {trend === "worsening" ? "Worsening" : "Improving"}
    </span>
  );
}

const KIND_META = {
  ai: { label: "AI", Icon: Bot, cls: "border-marigold-200 bg-marigold-50 text-marigold-800" },
  human: { label: "Human", Icon: UserCheck, cls: "border-sage-200 bg-sage-50 text-sage-700" },
  system: { label: "System", Icon: Inbox, cls: "border-sand-200 bg-sand-50 text-ink-600" },
};

function fmtAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const secs = Math.max(1, Math.round((Date.now() - then.getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const isoDate = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const addDays = (base, n) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};
const dateToIso = (value) => (value ? new Date(`${value}T12:00:00`).toISOString() : null);

// Alert centre contract — matches GET /api/alerts query params.
const FILTERS = [
  ["all", "All"],
  ["unread", "Unread"],
  ["urgent", "Urgent"],
  ["needs_attention", "Needs attention"],
  ["monitoring", "Monitoring"],
  ["acknowledged", "Acknowledged"],
  ["awaiting_followup", "Awaiting follow-up"],
];
const SORTS = [
  ["urgency", "Highest urgency"],
  ["newest", "Newest"],
  ["highest_risk", "Highest risk"],
  ["longest_awaiting", "Longest awaiting review"],
];

// Authorised human decisions — values match the backend enum.
const ACTION_OPTIONS = [
  { value: "contact_beneficiary", label: "Contact beneficiary", icon: PhoneCall },
  { value: "schedule_counselling", label: "Schedule counselling", icon: CalendarClock },
  { value: "provide_resources", label: "Provide support resources", icon: BookOpen },
  { value: "refer_service", label: "Refer to appropriate service", icon: ExternalLink },
  { value: "welfare_followup", label: "Request welfare follow-up", icon: Flag },
  { value: "escalate_senior_review", label: "Escalate for senior review", icon: ShieldAlert },
  { value: "other", label: "Other authorised action", icon: ClipboardList },
];

// Human-only lifecycle states (matches the backend FollowUpStatus).
const FUP_STATUS = [
  ["awaiting_review", "Awaiting review"],
  ["reviewed", "Reviewed"],
  ["action_planned", "Action planned"],
  ["follow_up_scheduled", "Follow-up scheduled"],
  ["follow_up_completed", "Follow-up completed"],
  ["escalated", "Escalated"],
];
const statusChipCls = {
  awaiting_review: "border-amber-300 bg-amber-50 text-amber-800",
  reviewed: "border-sand-300 bg-white text-ink-600",
  action_planned: "border-marigold-200 bg-marigold-50 text-marigold-800",
  follow_up_scheduled: "border-marigold-200 bg-marigold-50 text-marigold-800",
  follow_up_completed: "border-sage-300 bg-sage-50 text-sage-800",
  escalated: "border-sage-300 bg-sage-50 text-sage-800",
};
function StatusChip({ status }) {
  const label = (FUP_STATUS.find(([v]) => v === status) || [])[1] || status;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusChipCls[status] || "border-sand-300 bg-white text-ink-600")}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// The console page.
// ---------------------------------------------------------------------------

export default function CaseworkerPage() {
  const { user } = useAuth();
  const workerId = user?.staff_id || "CW-KHR-01";

  const [activeMobileTab, setActiveMobileTab] = useState("queue");

  // ---- Real data (all fetched from the live API) -------------------------
  const [queue, setQueue] = useState(null);
  const [queueError, setQueueError] = useState("");
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState(null); // null = first load in flight
  const [alertsError, setAlertsError] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("urgency");

  // ---- Selected case (opened from the queue or an alert) -----------------
  const [selected, setSelected] = useState(null); // { userId, caseId, riskLevel, score, name }
  const [timeline, setTimeline] = useState(null);
  const [timelineError, setTimelineError] = useState("");
  const [ackBusy, setAckBusy] = useState(null);

  // ---- Human support action form ------------------------------------------
  const [chosenAction, setChosenAction] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionDone, setActionDone] = useState("");
  const [fup, setFup] = useState({
    status: "follow_up_scheduled",
    actionDate: isoDate(new Date()),
    followUpDate: isoDate(addDays(new Date(), 3)),
    actionTaken: "",
    outcome: "",
    notes: "",
  });
  const [fupBusy, setFupBusy] = useState(false);
  const [fupDone, setFupDone] = useState("");

  const detailRef = useRef(null);
  const didAutoPick = useRef(false);

  // -------------------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------------------
  const loadQueue = useCallback(async () => {
    try {
      const q = await apiFetch("/api/dashboard/risk-queue");
      setQueue(q.queue || []);
      setQueueError("");
    } catch (err) {
      setQueueError(err.message);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const s = await apiFetch("/api/dashboard/alerts-summary");
      setSummary(s);
    } catch {
      setSummary(null);
    }
  }, []);

  const loadAlerts = useCallback(async (f, s) => {
    setAlertsError("");
    try {
      const rows = await apiFetch(`/api/alerts?filter=${encodeURIComponent(f)}&sort=${encodeURIComponent(s)}`);
      setAlerts(rows);
    } catch (err) {
      setAlertsError(err.message);
      setAlerts([]);
    }
  }, []);

  const loadTimeline = useCallback(async (userId) => {
    setTimelineError("");
    try {
      const tl = await apiFetch(`/api/cases/${encodeURIComponent(userId)}/timeline`);
      setTimeline(tl.events || []);
    } catch (err) {
      setTimelineError(err.message);
      setTimeline([]);
    }
  }, []);

  // Open a case from whichever surface offered it (queue row or alert row).
  const openCase = useCallback(
    (pick) => {
      setSelected(pick);
      setActiveMobileTab("detail");
      setTimeline(null);
      setChosenAction("");
      setActionNote("");
      setActionDone("");
      setFupDone("");
      setFup((prev) => ({
        ...prev,
        actionTaken: "",
        outcome: "",
        notes: "",
        actionDate: isoDate(new Date()),
        followUpDate: isoDate(addDays(new Date(), 3)),
      }));
      loadTimeline(pick.userId);
      if (detailRef.current && window.matchMedia("(max-width: 1023px)").matches) {
        detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [loadTimeline]
  );

  // Everything the console shows is derived from live data; mutations below
  // re-pull so counts, chips and the timeline always match the database.
  const refreshAll = useCallback(async () => {
    await Promise.all([loadQueue(), loadSummary(), loadAlerts(filter, sort)]);
  }, [filter, sort, loadQueue, loadSummary, loadAlerts]);

  // Scope-enforcement demo (kept from the previous console): DEMO-031 is on
  // another caseworker's caseload — the server must refuse it.
  const [probe, setProbe] = useState(null);
  const [probeBusy, setProbeBusy] = useState(false);
  const runProbe = async () => {
    setProbeBusy(true);
    setProbe(null);
    try {
      await apiFetch("/api/user/ben-cuttack/history");
      setProbe({ ok: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setProbe({ ok: false, status: 403 });
      } else {
        setProbe({ ok: false, status: err.status || 0 });
      }
    } finally {
      setProbeBusy(false);
    }
  };

  useEffect(() => {
    loadQueue();
    loadSummary();
  }, [loadQueue, loadSummary]);

  useEffect(() => {
    loadAlerts(filter, sort);
  }, [filter, sort, loadAlerts]);

  // Initial convenience: open the newest open alert's case so the console
  // lands on the thing needing attention (only before any manual pick).
  useEffect(() => {
    if (didAutoPick.current || selected || !alerts) return;
    const firstOpen = alerts.find((a) => !a.resolved);
    if (firstOpen) {
      didAutoPick.current = true;
      openCase({
        userId: firstOpen.user_id,
        caseId: firstOpen.case_id || firstOpen.user_id,
        riskLevel: firstOpen.risk_level,
        score: firstOpen.risk_score,
        name: "",
        alertId: firstOpen.alert_id,
      });
    }
  }, [alerts, selected, openCase]);

  // -------------------------------------------------------------------------
  // Alert lifecycle actions (human-only, wired to the live API)
  // -------------------------------------------------------------------------
  const acknowledge = async (alert) => {
    setAckBusy(alert.alert_id);
    try {
      await apiFetch(`/api/alerts/${alert.alert_id}/acknowledge`, {
        method: "POST",
        body: { caseworker_id: workerId, note: "" },
      });
      if (selected?.userId === alert.user_id) await loadTimeline(alert.user_id);
      await refreshAll();
    } catch (err) {
      setAlertsError(err.message);
    } finally {
      setAckBusy(null);
    }
  };

  // The open alert tied to the case being worked (server truth from the list).
  const openAlertForSelected = (alerts || []).find(
    (a) => selected && a.user_id === selected.userId && !a.resolved
  );

  const recordDecision = async () => {
    if (!chosenAction || !selected) return;
    setActionBusy(true);
    setActionDone("");
    try {
      await apiFetch(`/api/cases/${encodeURIComponent(selected.userId)}/interventions`, {
        method: "POST",
        body: {
          action_type: chosenAction,
          caseworker_id: workerId,
          note: actionNote,
          alert_id: selected.alertId || openAlertForSelected?.alert_id || null,
        },
      });
      const label = (ACTION_OPTIONS.find((o) => o.value === chosenAction) || {}).label;
      setActionDone(`Decision recorded — ${label}. This human action is on the case timeline.`);
      await refreshAll();
      await loadTimeline(selected.userId);
    } catch (err) {
      setActionDone("");
      setTimelineError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const recordFollowUp = async () => {
    if (!selected || !fup.actionTaken.trim()) return;
    setFupBusy(true);
    setFupDone("");
    try {
      await apiFetch(`/api/cases/${encodeURIComponent(selected.userId)}/follow-up`, {
        method: "POST",
        body: {
          caseworker_id: workerId,
          action_taken: fup.actionTaken.trim(),
          action_date: dateToIso(fup.actionDate),
          follow_up_date: dateToIso(fup.followUpDate),
          outcome: fup.outcome.trim(),
          status: fup.status,
          notes: fup.notes.trim(),
          alert_id: selected.alertId || openAlertForSelected?.alert_id || null,
        },
      });
      setFupDone(
        fup.status === "follow_up_completed" || fup.status === "escalated"
          ? "Follow-up recorded and the open alert was resolved by this human action."
          : "Follow-up recorded. Risk score is unchanged — the AI never decides care."
      );
      await refreshAll();
      await loadTimeline(selected.userId);
    } catch (err) {
      setFupDone("");
      setTimelineError(err.message);
    } finally {
      setFupBusy(false);
    }
  };

  const counters = [
    { label: "Total monitored", value: summary?.total_monitored, cls: "text-ink-900" },
    { label: "Awaiting review", value: summary?.awaiting_review, cls: "text-amber-700" },
    { label: "Needs attention", value: summary?.needs_attention, cls: "text-marigold-700" },
    { label: "Urgent", value: summary?.urgent, cls: "text-critical-600" },
    { label: "Follow-ups due", value: summary?.follow_ups_due, cls: "text-sage-700" },
    { label: "Follow-ups overdue", value: summary?.follow_ups_overdue, cls: "text-amber-800" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Caseworker console · signed in"
        title={`${user?.name || "Caseworker"}, your caseload.`}
        lead="Cases are scoped server-side to your assignment (CW-KHR-01 · Odisha, Khordha). Risk scores are AI-assisted estimates — not clinical diagnosis."
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-sand-300 bg-white px-3 py-1.5 text-caption font-medium text-ink-700">
            Signed in · {user?.role?.replace("_", " ")}
          </span>
        </div>
      </PageHeader>

      <section className="bg-sand-50 pb-20">
        <div className="shell pt-10">
          {queueError && (
            <p role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-small text-amber-800">
              {queueError}
            </p>
          )}

          {/* Live counters — GET /api/dashboard/alerts-summary (never hard-coded) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {counters.map((c) => (
              <Card key={c.label} className="border-sand-200 bg-white">
                <CardContent className="p-3.5 sm:p-4">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-ink-500">{c.label}</p>
                  <p className={cn("mt-1.5 font-display text-2xl sm:text-3xl font-semibold leading-none", c.cls)}>
                    {c.value ?? "—"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-2 text-caption text-ink-500">
            All counters and rows below come from the database — no numbers are hard-coded.
          </p>

          {/* Mobile & Tablet Tab Bar */}
          <div className="mt-6 lg:hidden">
            <Tabs value={activeMobileTab} onValueChange={setActiveMobileTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="queue">Caseload &amp; Alerts</TabsTrigger>
                <TabsTrigger value="detail">
                  {selected ? `Case ${selected.caseId}` : "Case Timeline"}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className={cn("mt-6 grid gap-5 lg:grid-cols-5", activeMobileTab === "detail" ? "hidden lg:grid" : "grid")}>
            {/* ------------------------------------------------------------------
                My caseload — GET /api/dashboard/risk-queue (real)
                ------------------------------------------------------------------ */}
            <section aria-label="My caseload" className="rounded-2xl border border-sand-200 bg-white p-5 lg:col-span-2">
              <h2 className="flex items-center gap-2 text-h4 text-ink-900">
                <ShieldCheck size={17} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                My caseload
              </h2>
              <p className="mt-1 text-caption text-ink-500">
                Select a case to open its timeline and record human support.
              </p>

              {!queue && !queueError && (
                <p className="mt-5 inline-flex items-center gap-2 text-small text-ink-500">
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading your caseload…
                </p>
              )}
              {queue && queue.length === 0 && (
                <p className="mt-5 text-small text-ink-700">No cases are currently assigned to you.</p>
              )}

              <ul className="mt-4 space-y-2.5">
                {(queue || []).map((row) => {
                  const active = selected?.userId === row.user_id;
                  return (
                    <li key={row.user_id}>
                      <button
                        type="button"
                        onClick={() =>
                          openCase({
                            userId: row.user_id,
                            caseId: row.case_id,
                            riskLevel: row.risk_level,
                            score: row.latest_score,
                            name: row.display_name,
                          })
                        }
                        aria-pressed={active}
                        className={cn(
                          "w-full rounded-xl px-4 py-3 text-left ring-1 transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600",
                          active ? "bg-marigold-50/70 ring-marigold-300" : "bg-sand-50 ring-sand-200 hover:bg-sand-100"
                        )}
                      >
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-small font-semibold text-ink-900">{row.case_id}</span>
                          <StatusBadge level={badgeLevel(row.risk_level)} size="sm" />
                        </span>
                        <span className="mt-1 block text-caption text-ink-600">
                          {row.display_name} · score <span className="font-mono">{row.latest_score}</span>/100
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <TrendTag trend={row.trend} />
                          {row.crisis_flag && (
                            <span className="rounded-full bg-critical-50 px-2 py-0.5 text-[10px] font-semibold text-critical-700">
                              Safety signal — human review required
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Scope probe */}
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-caption font-semibold text-amber-800">
                  <LockKeyhole size={14} aria-hidden="true" /> Scope check — live
                </p>
                <p className="mt-1.5 text-caption leading-relaxed text-ink-700">
                  DEMO-031 (ben-cuttack) is assigned to a different caseworker. Trying to read it from
                  this session proves the server refuses out-of-scope access:
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="secondary" onClick={runProbe} disabled={probeBusy}>
                    {probeBusy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
                    Try opening another case
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
                          ? "403 Forbidden — access denied by the server ✓"
                          : `Blocked (HTTP ${probe.status})`}
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------------
                Alerts & escalations — GET /api/alerts (real, filters + sort)
                ------------------------------------------------------------------ */}
            <section aria-label="Alerts and escalations" className="rounded-2xl border border-sand-200 bg-white p-5 lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-h4 text-ink-900">
                    <BellRing size={17} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                    Alerts &amp; escalations
                  </h2>
                  <p className="mt-1 text-caption text-ink-500">
                    Raised by the risk engine for your cases. AI never closes an alert — a human review does.
                  </p>
                </div>
                <span className="rounded-full bg-marigold-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-marigold-800">
                  Live from the database
                </span>
              </div>

              {/* Filters + sort */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter alerts">
                  {FILTERS.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={filter === key}
                      onClick={() => setFilter(key)}
                      className={cn(
                        "min-h-[36px] rounded-full px-3 py-1 text-caption font-semibold transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600",
                        filter === key ? "bg-ink-800 text-sand-100" : "bg-sand-100 text-ink-600 hover:bg-sand-200"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-ink-500 font-medium">Sort:</span>
                  <Select value={sort} onValueChange={(val) => setSort(val)}>
                    <SelectTrigger className="h-9 w-[170px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORTS.map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {alertsError && (
                <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-small text-amber-800">
                  {alertsError}
                </p>
              )}

              {!alerts && !alertsError && (
                <p className="mt-5 inline-flex items-center gap-2 text-small text-ink-500">
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading alerts…
                </p>
              )}

              {alerts && alerts.length === 0 && (
                <div className="mt-6 rounded-xl bg-sand-50 px-6 py-10 text-center">
                  <CheckCircle2 size={22} className="mx-auto text-sage-500" aria-hidden="true" />
                  <p className="mt-2 text-small font-medium text-ink-800">No alerts in this view.</p>
                  <p className="mx-auto mt-1 max-w-sm text-caption leading-relaxed text-ink-500">
                    Try the “All” filter to include reviewed and resolved alerts, or check back after the
                    next check-in or risk assessment.
                  </p>
                </div>
              )}

              <ul className="mt-4 space-y-2.5">
                {(alerts || []).map((alert) => {
                  const unread = !alert.acknowledged && !alert.resolved;
                  const active = selected?.userId === alert.user_id;
                  const critical = alert.severity === "critical";
                  return (
                    <li
                      key={alert.alert_id}
                      className={cn(
                        "rounded-xl px-4 py-3.5 ring-1 transition-colors duration-fast",
                        active ? "bg-marigold-50/60 ring-marigold-300" : "bg-white ring-sand-200",
                        alert.resolved && "bg-sand-50/70 ring-sand-100"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge level={badgeLevel(alert.risk_level)} size="sm" />
                        <p className="text-small font-semibold text-ink-900">{alert.title}</p>
                        {unread && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            Unread
                          </span>
                        )}
                        {critical && (
                          <span className="rounded-full border border-critical-200 bg-critical-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-critical-700">
                            Urgent — human review required
                          </span>
                        )}
                        <span className="ml-auto">
                          <StatusChip status={alert.review_status} />
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-[11px] text-ink-500">
                        Case {alert.case_id || alert.user_id} · risk {alert.risk_score}/100
                        {alert.previous_risk_score != null && (
                          <span> (from {alert.previous_risk_score})</span>
                        )}
                        {" · "}
                        {fmtAgo(alert.created_at)}
                      </p>
                      <p className="mt-1 text-caption leading-relaxed text-ink-700">{alert.description}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant={active ? "primary" : "secondary"}
                          onClick={() =>
                            openCase({
                              userId: alert.user_id,
                              caseId: alert.case_id || alert.user_id,
                              riskLevel: alert.risk_level,
                              score: alert.risk_score,
                              name: "",
                              alertId: alert.alert_id,
                            })
                          }
                        >
                          {active ? "Case open" : "Review case"}
                        </Button>
                        {unread && (
                          <Button
                            size="sm"
                            variant={critical ? "primary" : "secondary"}
                            loading={ackBusy === alert.alert_id}
                            onClick={() => acknowledge(alert)}
                          >
                            <Check size={13} aria-hidden="true" /> Mark as reviewed
                          </Button>
                        )}
                        {!unread && !alert.resolved && (
                          <span className="text-caption text-ink-500">
                            Open — awaiting follow-up from the case panel.
                          </span>
                        )}
                        {alert.resolved && (
                          <span className="text-caption text-ink-400">Closed by human action</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* ------------------------------------------------------------------
              Selected case — timeline + human support action (real endpoints)
              ------------------------------------------------------------------ */}
          <div ref={detailRef} className={cn("mt-5 scroll-mt-4", activeMobileTab === "queue" ? "hidden lg:block" : "block")}>
            {selected && (
              <div className="lg:hidden mb-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveMobileTab("queue")}
                  className="text-ink-600 hover:text-ink-900 -ml-2"
                >
                  ← Back to caseload &amp; alerts
                </Button>
              </div>
            )}
            {!selected ? (
              <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
                <p className="text-small font-medium text-ink-700">
                  Open a case from “My caseload” or an alert to review its timeline and record human support.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-1">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 bg-sand-50/70 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="flex items-center gap-2 text-h4 text-ink-900">
                      <ShieldCheck size={17} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                      Case {selected.caseId}
                    </h2>
                    {selected.riskLevel && (
                      <StatusBadge level={badgeLevel(selected.riskLevel)} size="sm" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-caption text-ink-500">
                    {selected.score != null && (
                      <span>
                        Risk score <span className="font-mono text-ink-700">{selected.score}</span>/100
                      </span>
                    )}
                    {selected.name && <span>· {selected.name}</span>}
                    <span className="rounded-full bg-marigold-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-marigold-800">
                      SIH demonstration data
                    </span>
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-5">
                  {/* Timeline */}
                  <section aria-label={`Timeline for case ${selected.caseId}`} className="p-5 lg:col-span-3 lg:border-r lg:border-sand-200">
                    <h3 className="flex items-center gap-2 text-small font-semibold uppercase tracking-wider text-ink-600">
                      <Inbox size={14} aria-hidden="true" /> Case timeline
                    </h3>
                    <p className="mt-1 text-caption text-ink-500">
                      Merged stream: AI events, human actions and system events — each typed in text,
                      never by colour alone. Live from the database.
                    </p>

                    {timelineError && (
                      <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-small text-amber-800">
                        {timelineError}
                      </p>
                    )}
                    {!timeline && !timelineError && (
                      <p className="mt-5 inline-flex items-center gap-2 text-small text-ink-500">
                        <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading timeline…
                      </p>
                    )}
                    {timeline && timeline.length === 0 && (
                      <p className="mt-5 text-small text-ink-700">No events recorded for this case yet.</p>
                    )}

                    <ol className="mt-5 space-y-0">
                      {(timeline || []).map((ev, i) => {
                        const kind = KIND_META[ev.event_type] || KIND_META.system;
                        const Icon = kind.Icon;
                        return (
                          <li key={`${ev.label}-${ev.timestamp}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                            {i < timeline.length - 1 && (
                              <span className="absolute left-[9px] top-6 h-full w-px bg-sand-200" aria-hidden="true" />
                            )}
                            <span
                              className={cn(
                                "z-10 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border",
                                kind.cls
                              )}
                            >
                              <Icon size={9} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "rounded border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider",
                                    kind.cls
                                  )}
                                >
                                  {kind.label}
                                </span>
                                <p className="text-small font-semibold text-ink-900">{ev.label}</p>
                                {ev.timestamp && (
                                  <time className="text-caption text-ink-400">
                                    {new Date(ev.timestamp).toLocaleDateString(undefined, {
                                      day: "numeric", month: "short",
                                    })}
                                  </time>
                                )}
                              </div>
                              {ev.detail && (
                                <p className="mt-1 text-caption leading-relaxed text-ink-600">{ev.detail}</p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </section>

                  {/* Human support action */}
                  <section
                    aria-label="Human support action"
                    className="bg-sand-50/50 p-5 lg:col-span-2"
                  >
                    <h3 className="flex items-center gap-2 text-small font-semibold uppercase tracking-wider text-ink-600">
                      <UserCheck size={14} aria-hidden="true" /> Human support action
                    </h3>
                    <p className="mt-1 text-caption leading-relaxed text-ink-500">
                      Decisions here are recorded by an authorised caseworker. Prototype actions — no real
                      call or counselling session is claimed.
                    </p>

                    {/* Step 1 — record an intervention */}
                    <p className="mt-4 text-caption font-semibold text-ink-800">1 · Record a decision</p>
                    <div className="mt-2 grid grid-cols-1 gap-1.5">
                      {ACTION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setChosenAction(opt.value);
                            setActionDone("");
                          }}
                          aria-pressed={chosenAction === opt.value}
                          className={cn(
                            "flex min-h-[40px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-small font-medium transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600",
                            chosenAction === opt.value
                              ? "border-marigold-500 bg-marigold-50 text-marigold-800"
                              : "border-sand-200 bg-white text-ink-700 hover:border-sand-300 hover:bg-sand-100"
                          )}
                        >
                          <opt.icon size={14} aria-hidden="true" /> {opt.label}
                        </button>
                      ))}
                    </div>

                    {chosenAction && (
                      <div className="mt-3 space-y-3 rounded-xl border border-sand-200 bg-white p-3">
                        <label className="block">
                          <span className="text-caption font-semibold text-ink-700">Note (caseworker’s own words)</span>
                          <Textarea
                            rows={2}
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                            placeholder="Optional — what was agreed or observed…"
                            className="mt-1"
                          />
                        </label>
                        <Button size="sm" variant="primary" loading={actionBusy} onClick={recordDecision}>
                          <Check size={13} aria-hidden="true" /> Record decision
                        </Button>
                        {actionDone && (
                          <p role="status" className="flex items-start gap-1.5 text-caption leading-relaxed text-sage-700">
                            <CheckCircle2 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                            {actionDone}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step 2 — follow-up record */}
                    <p className="mt-5 text-caption font-semibold text-ink-800">2 · Record follow-up</p>
                    <div className="mt-2 space-y-3 rounded-xl border border-sand-200 bg-white p-3">
                      <label className="block">
                        <span className="text-caption font-semibold text-ink-700">Action taken</span>
                        <Textarea
                          rows={2}
                          value={fup.actionTaken}
                          onChange={(e) => setFup((p) => ({ ...p, actionTaken: e.target.value }))}
                          placeholder="What was done — required"
                          className="mt-1"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-caption font-semibold text-ink-700">Action date</span>
                          <Input
                            type="date"
                            value={fup.actionDate}
                            onChange={(e) => setFup((p) => ({ ...p, actionDate: e.target.value }))}
                            className="mt-1"
                          />
                        </label>
                        <label className="block">
                          <span className="text-caption font-semibold text-ink-700">
                            Follow-up date <span className="font-normal text-ink-400">(optional)</span>
                          </span>
                          <Input
                            type="date"
                            value={fup.followUpDate}
                            onChange={(e) => setFup((p) => ({ ...p, followUpDate: e.target.value }))}
                            className="mt-1"
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-caption font-semibold text-ink-700">Status</span>
                        <Select value={fup.status} onValueChange={(val) => setFup((p) => ({ ...p, status: val }))}>
                          <SelectTrigger className="mt-1 h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FUP_STATUS.map(([key, label]) => (
                              <SelectItem key={key} value={key} className="text-sm">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="block">
                        <span className="text-caption font-semibold text-ink-700">Outcome</span>
                        <Textarea
                          rows={2}
                          value={fup.outcome}
                          onChange={(e) => setFup((p) => ({ ...p, outcome: e.target.value }))}
                          placeholder="Optional — how the contact went"
                          className="mt-1"
                        />
                      </label>
                      <label className="block">
                        <span className="text-caption font-semibold text-ink-700">Notes</span>
                        <Textarea
                          rows={2}
                          value={fup.notes}
                          onChange={(e) => setFup((p) => ({ ...p, notes: e.target.value }))}
                          placeholder="Optional — kept separate from AI explanations"
                          className="mt-1"
                        />
                      </label>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={fupBusy}
                        disabled={!fup.actionTaken.trim()}
                        onClick={recordFollowUp}
                      >
                        <Check size={13} aria-hidden="true" /> Save follow-up record
                      </Button>
                      {fupDone && (
                        <p role="status" className="flex items-start gap-1.5 text-caption leading-relaxed text-sage-700">
                          <CheckCircle2 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                          {fupDone}
                        </p>
                      )}
                      <p className="text-caption leading-relaxed text-ink-500">
                        Recording a follow-up never lowers the AI risk score or marks anyone safe — it is a
                        human audit record.
                      </p>
                    </div>
                  </section>
                </div>

                <p className="border-t border-sand-100 px-5 py-3 text-caption italic leading-relaxed text-ink-500">
                  AI-assisted risk estimates support caseworker review. They do not replace professional
                  judgement or determine care independently. Urgent safety signals always require human review.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
