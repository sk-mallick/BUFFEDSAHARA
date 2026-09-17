import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Flag,
  Inbox,
  LayoutGrid,
  MessagesSquare,
  Minus,
  PhoneCall,
  Search,
  Settings,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import cn from "../lib/cn";

// ===========================================================================
// MOCK DATA — shaped exactly like the real backend contracts:
//   alerts   -> GET /api/alerts            counters -> GET /api/dashboard/alerts-summary
//   timeline -> GET /api/cases/{id}/timeline
// Actions below (acknowledge / interventions / follow-up) map 1:1 to the
// POST endpoints in routers/alerts.py and routers/cases.py. All rows are
// fictional — SIH demonstration data.
// ===========================================================================

// MOCK — GET /api/dashboard/risk-queue
const queue = [
  {
    id: "DEMO-042", level: "attention", score: 63, trend: "worsening", esc: 58,
    priority: "High", priorityLevel: "attention", followUp: "2 days ago",
    reason: "Distress increased significantly over the last 7 days.",
    spark: [18, 26, 38, 46, 52, 55, 58, 63], by: "RP",
  },
  {
    id: "SA-24118", level: "urgent", score: 88, trend: "worsening", esc: 91,
    priority: "Urgent", priorityLevel: "urgent", followUp: "Never",
    reason: "Crisis language detected in a recent check-in — safety signal.",
    spark: [38, 44, 52, 60, 66, 74, 81, 88], by: "SK", crisis: true,
  },
  {
    id: "SA-24097", level: "monitoring", score: 46, trend: "stable", esc: 31,
    priority: "Medium", priorityLevel: "monitoring", followUp: "5 days ago",
    reason: "Repeated negative sentiment in recent conversations.",
    spark: [30, 34, 32, 44, 50, 52, 48, 46], by: "MB",
  },
  {
    id: "SA-24083", level: "stable", score: 22, trend: "improving", esc: 12,
    priority: "Low", priorityLevel: "stable", followUp: "1 day ago",
    reason: "Steady improvement across the last 14 days.",
    spark: [60, 55, 50, 44, 40, 36, 34, 32], by: "AR",
  },
];

// MOCK — GET /api/dashboard/chat-flags (keywords + sentiment only, never raw chats)
const chatFlags = [
  { id: "SA-24118", name: "R. Singh", time: "6 min ago", keywords: ["dar lag raha", "akela hun"] },
  { id: "SA-24118", name: "R. Singh", time: "11 min ago", keywords: ["jina nahi"] },
];

// MOCK — GET /api/alerts. levels map to StatusBadge tiers; severity is the
// backend's own (only genuine safety conditions are critical).
const alertSeed = [
  {
    id: "al-101", caseId: "DEMO-042", type: "risk_increase",
    severity: "high", level: "attention", score: 63, prevScore: 46,
    title: "Risk level increased",
    reason: "Distress score increased from 46 → 63; risk rose from Monitoring to Needs Attention over 7 days.",
    time: "2 min ago", acked: false, reviewStatus: "awaiting_review",
  },
  {
    id: "al-102", caseId: "SA-24118", type: "crisis_signal",
    severity: "critical", level: "urgent", score: 88, prevScore: 74,
    title: "Crisis safety signal",
    reason: "A crisis safety signal requires immediate human review.",
    time: "11 min ago", acked: false, reviewStatus: "awaiting_review",
    safety: true,
  },
  {
    id: "al-103", caseId: "SA-24097", type: "missed_followup",
    severity: "medium", level: "monitoring", score: 46, prevScore: null,
    title: "Human follow-up overdue",
    reason: "Case has been at Monitoring risk past its follow-up window.",
    time: "1 hr ago", acked: false, reviewStatus: "awaiting_review",
  },
  {
    id: "al-104", caseId: "SA-24083", type: "risk_increase",
    severity: "low", level: "stable", score: 22, prevScore: 30,
    title: "Risk level changed",
    reason: "Review completed — follow-up recorded.",
    time: "1 day ago", acked: true, reviewStatus: "follow_up_completed", resolved: true,
  },
];

// MOCK — DEMO-042 explainability factors.
const demoFactors = [
  { impact: "high", text: "Distress increased significantly over the last 7 days." },
  { impact: "medium", text: "Repeated negative sentiment in recent conversations." },
  { impact: "medium", text: "Recent check-ins indicate reduced sleep quality." },
  { impact: "low", text: "No human follow-up recorded yet for this case." },
];

// MOCK — GET /api/cases/DEMO-042/timeline (typed events: ai | human | system).
// event_type is TEXT on every row — colour is never the only indicator.
const demoTimeline = [
  { day: "Day 1", text: "Initial check-in — consent given", kind: "system" },
  { day: "Day 15", text: "Stable", kind: "system" },
  { day: "Day 28", text: "Monitoring", kind: "ai" },
  { day: "Day 35", text: "Risk assessment generated · monitoring / 46", kind: "ai" },
  { day: "Day 36", text: "Risk increased · monitoring → needs attention (46 → 63)", kind: "ai" },
  { day: "Day 36", text: "Alert raised: “Risk level increased” — awaiting human review", kind: "ai" },
];

const actionOptions = [
  { value: "contact_beneficiary", label: "Contact beneficiary", icon: PhoneCall },
  { value: "schedule_counselling", label: "Schedule counselling", icon: CalendarClock },
  { value: "provide_resources", label: "Provide support resources", icon: BookOpen },
  { value: "refer_service", label: "Refer to appropriate service", icon: ExternalLink },
  { value: "welfare_followup", label: "Request welfare follow-up", icon: Flag },
  { value: "escalate_senior_review", label: "Escalate for senior review", icon: ShieldAlert },
  { value: "other", label: "Other authorised action", icon: ClipboardList },
];

const statusOptions = [
  "awaiting_review", "reviewed", "action_planned",
  "follow_up_scheduled", "follow_up_completed", "escalated",
];
const statusLabel = {
  awaiting_review: "Awaiting review", reviewed: "Reviewed", action_planned: "Action planned",
  follow_up_scheduled: "Follow-up scheduled", follow_up_completed: "Follow-up completed", escalated: "Escalated",
};

const filters = [
  ["all", "All"], ["unread", "Unread"], ["urgent", "Urgent"], ["attention", "Needs attention"],
  ["monitoring", "Monitoring"], ["acknowledged", "Acknowledged"], ["awaiting", "Awaiting follow-up"],
];
const sorts = [
  ["urgency", "Highest urgency"], ["newest", "Newest"], ["risk", "Highest risk"], ["oldest", "Longest awaiting review"],
];

const nav = [
  { icon: LayoutGrid, label: "Overview" },
  { icon: ShieldAlert, label: "Risk queue", active: true },
  { icon: Bell, label: "Alerts", badge: true },
  { icon: MessagesSquare, label: "Chat logs" },
  { icon: BarChart3, label: "Reports" },
  { icon: Users, label: "Team" },
  { icon: Settings, label: "Settings" },
];

const trendCell = {
  worsening: { Icon: ArrowUpRight, cls: "text-critical-600" },
  stable: { Icon: Minus, cls: "text-ink-500" },
  improving: { Icon: ArrowDownRight, cls: "text-sage-600" },
};

const kindMeta = {
  ai: { label: "AI EVENT", Icon: Bot, cls: "text-marigold-700 bg-marigold-50 border-marigold-200", dot: "bg-marigold-500" },
  human: { label: "HUMAN ACTION", Icon: UserCheck, cls: "text-sage-700 bg-sage-50 border-sage-200", dot: "bg-sage-500" },
  system: { label: "SYSTEM EVENT", Icon: Inbox, cls: "text-ink-500 bg-sand-50 border-sand-200", dot: "bg-ink-300" },
};

function TrendCell({ trend }) {
  const t = trendCell[trend] ?? trendCell.stable;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", t.cls)}>
      <t.Icon size={11} aria-hidden="true" />
      {trend === "worsening" ? "Worsening" : trend === "improving" ? "Improving" : "Stable"}
    </span>
  );
}

export default function DashboardMock() {
  const [alerts, setAlerts] = useState(alertSeed);
  const [timeline, setTimeline] = useState(demoTimeline);
  const [filter, setFilter] = useState("unread");
  const [sort, setSort] = useState("urgency");
  const [chosenAction, setChosenAction] = useState(null);
  const [followUpStatus, setFollowUpStatus] = useState("follow_up_scheduled");
  const [savedFollowUp, setSavedFollowUp] = useState(false);
  const [timelineEnd, setTimelineEnd] = useState("Day 37");
  const [activeTab, setActiveTab] = useState("queue"); // "queue" | "case" for responsive viewports
  const [selectedCaseId, setSelectedCaseId] = useState("DEMO-042");

  // ---- Derived counters (the dashboard header reads real aggregates from
  // ---- GET /api/dashboard/alerts-summary; here they derive from mock state).
  const counters = useMemo(() => {
    const open = alerts.filter((a) => !a.resolved);
    return {
      totalMonitored: 42,
      awaitingReview: open.filter((a) => !a.acked).length,
      needsAttention: open.filter((a) => a.level === "attention").length,
      urgent: open.filter((a) => a.level === "urgent").length,
      followUpsDue: alerts.filter((a) => a.reviewStatus === "follow_up_scheduled" && !a.resolved).length,
      followUpsOverdue: alerts.filter((a) => a.type === "missed_followup" && !a.acked).length,
    };
  }, [alerts]);

  // ---- Filter + sort pipeline (mirrors GET /api/alerts?filter=&sort=).
  const visibleAlerts = useMemo(() => {
    let rows = [...alerts];
    if (filter === "unread") rows = rows.filter((a) => !a.acked && !a.resolved);
    else if (filter === "urgent") rows = rows.filter((a) => a.level === "urgent");
    else if (filter === "attention") rows = rows.filter((a) => a.level === "attention");
    else if (filter === "monitoring") rows = rows.filter((a) => a.level === "monitoring");
    else if (filter === "acknowledged") rows = rows.filter((a) => a.acked);
    else if (filter === "awaiting") rows = rows.filter((a) => !a.resolved);
    // awaiting_review default sort: severity critical > high > medium > low
    const sevRank = { critical: 4, high: 3, medium: 2, low: 1 };
    if (sort === "newest") rows.sort((x, y) => (x.time < y.time ? 1 : -1));
    else if (sort === "risk") rows.sort((x, y) => y.score - x.score);
    else if (sort === "oldest") rows.sort((x, y) => (x.time > y.time ? 1 : -1));
    else rows.sort((x, y) => (sevRank[y.severity] ?? 0) - (sevRank[x.severity] ?? 0));
    return rows;
  }, [alerts, filter, sort]);

  const acknowledge = (alert) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alert.id
          ? { ...a, acked: true, reviewStatus: "reviewed", ackBy: "SK", ackedAt: "now" }
          : a
      )
    );
    setTimeline((prev) => [
      ...prev,
      {
        day: timelineEnd, kind: "human", append: true,
        text: "AI-generated risk alert reviewed by caseworker",
        text2: `“${alert.title}” acknowledged — case opened for human support.`,
      },
    ]);
  };

  const recordAction = (value) => {
    setChosenAction(value);
    setSavedFollowUp(false);
  };

  const saveFollowUp = () => {
    const action = actionOptions.find((o) => o.value === chosenAction);
    if (!action) return;
    const events = [
      {
        day: timelineEnd, kind: "human", append: true,
        text: action.label, text2: "Recorded by caseworker SK — decision logged, risk score unchanged.",
      },
    ];
    if (followUpStatus === "follow_up_scheduled") {
      events.push({
        day: timelineEnd, kind: "human", append: true,
        text: "Follow-up scheduled", text2: "Next contact due in 3 days · status: Follow-up scheduled.",
      });
    } else if (followUpStatus === "follow_up_completed") {
      events.push({
        day: timelineEnd, kind: "human", append: true,
        text: "Follow-up completed", text2: "Outcome recorded — support continues. Case not auto-marked safe.",
      });
    }
    setTimeline((prev) => [...prev, ...events]);
    setAlerts((prev) =>
      prev.map((a) =>
        a.caseId === "DEMO-042" && !a.resolved
          ? { ...a, reviewStatus: followUpStatus, acked: true, resolved: followUpStatus === "follow_up_completed" || followUpStatus === "escalated" }
          : a
      )
    );
    setSavedFollowUp(true);
  };

  const action = actionOptions.find((o) => o.value === chosenAction);
  const statusChip = (st) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8.5px] font-semibold",
        st === "awaiting_review" && "border-amber-300 bg-amber-50 text-amber-800",
        st === "reviewed" && "border-sand-300 bg-white text-ink-600",
        (st === "action_planned" || st === "follow_up_scheduled") && "border-marigold-200 bg-marigold-50 text-marigold-800",
        (st === "follow_up_completed" || st === "escalated") && "border-sage-300 bg-sage-50 text-sage-800"
      )}
    >
      {statusLabel[st]}
    </span>
  );

  return (
    <div className="flex text-ink-900" aria-hidden="true">
      {/* Sidebar */}
      <div className="hidden w-40 shrink-0 flex-col gap-0.5 bg-ink-900 p-3 sm:flex">
        <div className="mb-3 flex items-center gap-2 px-2 pt-1">
          <svg width="18" height="18" viewBox="0 0 56 56" fill="none">
            <path d="M10 46 V26 C10 14 24 7 28 7 C32 7 46 14 46 26 V46" stroke="#E0A276" strokeWidth="5" strokeLinecap="round" />
            <path d="M10 46 H46" stroke="#E0A276" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-semibold text-sand-100">Sahara Casework</span>
        </div>
        {nav.map((item) => (
          <span
            key={item.label}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium",
              item.active ? "bg-white/10 text-white" : "text-sand-300"
            )}
          >
            <span className="relative">
              <item.icon size={13} />
              {item.badge && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 text-[7px] font-bold text-ink-900">
                  {counters.awaitingReview}
                </span>
              )}
            </span>
            {item.label}
          </span>
        ))}
        <span className="mt-auto rounded-lg bg-white/5 p-2 text-[10px] leading-4 text-sand-300">
          AI-assisted triage — human-verified
        </span>
      </div>

      {/* Main column */}
      <div className={cn("min-w-0 flex-1 space-y-3 p-3 sm:p-4", activeTab === "case" ? "hidden lg:block" : "block")}>
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-ink-900">Caseworker console</p>
              <span className="rounded-full border border-sage-200 bg-sage-50 px-2 py-0.5 text-[8.5px] font-medium text-sage-700">Live Triage</span>
            </div>
            <p className="truncate text-[10px] text-ink-500">SIH demonstration data — fictional cases, no real beneficiaries</p>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher for tablet/mobile (< lg) */}
            <div className="flex items-center rounded-lg border border-sand-200 bg-sand-100 p-0.5 lg:hidden">
              <button
                type="button"
                onClick={() => setActiveTab("queue")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                  activeTab === "queue" ? "bg-white text-ink-900 shadow-xs" : "text-ink-600 hover:text-ink-900"
                )}
              >
                <ShieldAlert size={11} aria-hidden="true" />
                <span>Queue &amp; Alerts</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("case")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                  activeTab === "case" ? "bg-white text-ink-900 shadow-xs" : "text-ink-600 hover:text-ink-900"
                )}
              >
                <UserCheck size={11} aria-hidden="true" />
                <span>DEMO-042</span>
              </button>
            </div>

            <span className="hidden items-center gap-1.5 rounded-full border border-sand-200 bg-sand-50 px-2.5 py-1 text-[10px] text-ink-500 lg:inline-flex">
              <Search size={10} aria-hidden="true" /> Search…
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-marigold-100 text-[10px] font-semibold text-marigold-700" title="Caseworker SK">SK</span>
          </div>
        </div>

        {/* Live counters — GET /api/dashboard/alerts-summary */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ["Total monitored", counters.totalMonitored, "text-ink-900"],
            ["Awaiting review", counters.awaitingReview, "text-amber-700"],
            ["Needs attention", counters.needsAttention, "text-marigold-700"],
            ["Urgent", counters.urgent, "text-critical-700"],
            ["Follow-ups due", counters.followUpsDue, "text-sage-700"],
            ["Follow-ups overdue", counters.followUpsOverdue, "text-amber-800"],
          ].map(([label, value, cls]) => (
            <div key={label} className="rounded-xl border border-sand-200 bg-white px-3 py-2">
              <p className="text-[8.5px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
              <p className={cn("font-display text-lg font-semibold leading-tight", cls)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Queue */}
        <div className="overflow-hidden rounded-xl border border-sand-200 bg-white">
          <div className="flex items-center justify-between border-b border-sand-200 bg-sand-50 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Distress-risk queue</span>
            <span className="text-[9px] text-ink-400">prioritised by the risk engine</span>
          </div>
          <div className="divide-y divide-sand-200 overflow-x-auto">
            {queue.map((row) => (
              <div
                key={row.id}
                onClick={() => {
                  setSelectedCaseId(row.id);
                  if (row.id === "DEMO-042") setActiveTab("case");
                }}
                className={cn(
                  "grid min-w-[340px] cursor-pointer grid-cols-2 items-center gap-2 px-3 py-2 transition-colors duration-fast sm:min-w-0 sm:grid-cols-[1.4fr_0.9fr_0.6fr_0.8fr_0.6fr_0.8fr_0.8fr] hover:bg-sand-50/80",
                  row.id === selectedCaseId && "bg-marigold-50/60"
                )}
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] font-medium text-ink-900">
                    <span className="shrink-0">{row.id}</span>
                    {row.crisis && (
                      <span className="shrink-0 rounded-full bg-critical-50 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-critical-700">Safety</span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[9px] leading-3 text-ink-500">{row.reason}</span>
                </div>
                <StatusBadge level={row.level} size="sm" />
                <span className="hidden font-mono text-[11px] text-ink-900 sm:inline">{row.score}<span className="text-[9px] text-ink-500">/100</span></span>
                <span className="hidden sm:inline"><TrendCell trend={row.trend} /></span>
                <span className="hidden font-mono text-[11px] text-ink-700 md:inline">{row.esc}%</span>
                <span className="hidden lg:inline"><StatusBadge level={row.priorityLevel} size="sm" label={row.priority} /></span>
                <span className="hidden text-[10px] text-ink-500 lg:inline">{row.followUp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ALERT CENTER — GET /api/alerts */}
        <div className="overflow-hidden rounded-xl border border-sand-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 bg-sand-50 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-600">
              Alerts &amp; escalations
            </span>
            <span className="flex flex-wrap items-center gap-1">
              {filters.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors duration-fast",
                    filter === key ? "bg-ink-800 text-sand-100" : "bg-white text-ink-500 hover:bg-sand-100"
                  )}
                >
                  {label}
                </button>
              ))}
            </span>
            <span className="flex items-center gap-1 text-[9px] text-ink-500">
              Sort
              <span className="rounded-md border border-sand-200 bg-white px-1.5 py-0.5 text-[9px]">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-transparent text-[9px] text-ink-700 outline-none"
                >
                  {sorts.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </span>
            </span>
          </div>

          <ul className="divide-y divide-sand-200">
            {visibleAlerts.length === 0 && (
              <li className="px-4 py-6 text-center">
                <CheckCircle2 size={18} className="mx-auto text-sage-500" />
                <p className="mt-1 text-[11px] font-medium text-ink-700">No alerts here right now.</p>
                <p className="text-[9.5px] text-ink-500">Help is still one call away on 14566. New alerts appear as the risk engine flags patterns.</p>
              </li>
            )}
            {visibleAlerts.map((alert) => (
              <li
                key={alert.id}
                className={cn(
                  "flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start",
                  !alert.acked && !alert.resolved && "bg-white",
                  alert.resolved && "bg-sand-50/60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge level={alert.level} size="sm" />
                    <span className="text-[11px] font-semibold text-ink-900">{alert.title}</span>
                    {!alert.acked && !alert.resolved && (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-amber-800">Unread</span>
                    )}
                    {alert.safety && (
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-critical-200 bg-critical-50 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-critical-700">
                        Urgent — human review required
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] text-ink-500">{alert.caseId} · risk {alert.score}/100{alert.prevScore ? ` (from ${alert.prevScore})` : ""}</p>
                  <p className="mt-1 text-[10px] leading-4 text-ink-700">{alert.reason}</p>
                  <p className="mt-1 text-[9px] text-ink-400">
                    {alert.time} · required action: {alert.safety ? "immediate human review" : "human review recommended"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 sm:flex-col sm:items-end">
                  {statusChip(alert.reviewStatus)}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCaseId(alert.caseId);
                        if (alert.caseId === "DEMO-042") setActiveTab("case");
                      }}
                      className="rounded-md border border-sand-300 bg-white px-2 py-1 text-[9px] font-semibold text-ink-700 transition-colors duration-fast hover:bg-sand-50"
                    >
                      Review case
                    </button>
                    {!alert.acked && (
                      <button
                        type="button"
                        onClick={() => acknowledge(alert)}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold transition-colors duration-fast",
                          alert.safety
                            ? "bg-amber-600 text-white hover:bg-amber-700"
                            : "bg-[#9E4A26] text-white hover:bg-[#823C20]"
                        )}
                      >
                        <Check size={9} /> Mark as reviewed
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Human-in-the-loop safeguard — quiet, never hidden */}
        <p className="text-[9px] leading-4 text-ink-500">
          AI-assisted risk estimates support caseworker review. They do not replace professional judgement or determine care independently.
          Urgent safety signals always require human review.
        </p>
      </div>

      {/* Case detail — DEMO-042 */}
      <div
        className={cn(
          "w-full shrink-0 space-y-2.5 border-sand-200 p-3 sm:p-4 lg:w-80 lg:border-l",
          activeTab === "case" ? "block" : "hidden lg:block"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className="flex items-center gap-1 rounded border border-sand-200 bg-white px-2 py-0.5 text-[9.5px] font-semibold text-ink-700 hover:bg-sand-50 lg:hidden"
            >
              ← Queue
            </button>
            <div>
              <span className="font-mono text-xs font-semibold text-ink-900">{selectedCaseId}</span>
              <span className="ml-1.5 text-[9.5px] text-ink-500">· P. Kumar</span>
            </div>
          </div>
          <StatusBadge level="attention" size="sm" />
        </div>
        <p className="text-[9px] text-ink-500">SIH demonstration data — fictional case · Active monitoring</p>

        {/* Telemetry Grid: Current Risk & Forecast side by side */}
        <div className="grid grid-cols-2 gap-2">
          {/* Current Risk */}
          <div className="rounded-xl border border-sand-200 bg-sand-50/80 p-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[8.5px] font-semibold uppercase tracking-wider text-ink-500">Current risk</p>
              <span className="font-mono text-[8px] font-medium text-amber-700">7d ↑</span>
            </div>
            <p className="mt-1 font-display text-xl font-semibold leading-none text-ink-900">
              63 <span className="text-[10px] font-normal text-ink-500">/ 100</span>
            </p>
            <div className="mt-2 flex items-center gap-1">
              {statusChip(alerts.find((a) => a.caseId === selectedCaseId && !a.resolved)?.reviewStatus ?? "awaiting_review")}
            </div>
          </div>

          {/* Escalation Forecast */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5">
            <p className="text-[8.5px] font-semibold uppercase tracking-wider text-amber-700">7d Forecast</p>
            <p className="mt-1 text-xs font-semibold leading-tight text-amber-900">58% escalation</p>
            <p className="mt-1 text-[8px] leading-3 text-amber-700">Predictive distress trajectory</p>
          </div>
        </div>

        {/* Why prioritised */}
        <div className="rounded-xl border border-sand-200 bg-white p-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-600">Why prioritised</p>
          <ul className="mt-1.5 space-y-1">
            {demoFactors.map((f) => (
              <li key={f.text} className="flex items-start gap-1.5">
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", f.impact === "high" ? "bg-marigold-500" : f.impact === "medium" ? "bg-amber-400" : "bg-ink-300")} />
                <span className="text-[9.5px] leading-3.5 text-ink-700">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Case Timeline */}
        <div className="rounded-xl border border-sand-200 bg-white p-2.5">
          <div className="flex items-center justify-between border-b border-sand-100 pb-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-600">Case timeline</p>
            <span className="font-mono text-[8.5px] text-ink-400">{timeline.length} events</span>
          </div>
          <ol className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {timeline.map((ev, i) => {
              const meta = kindMeta[ev.kind] ?? kindMeta.system;
              return (
                <li key={`${ev.day}-${i}`} className="flex items-start gap-1.5 text-[9.5px]">
                  <span className={cn("mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border", meta.cls)} aria-hidden="true">
                    <meta.Icon size={8} />
                  </span>
                  <span className="min-w-0 leading-tight text-ink-700">
                    <span className="font-mono text-[8.5px] font-medium text-ink-500">{ev.day}</span>
                    <span className="mx-1 text-ink-300">·</span>
                    <span className="font-medium text-ink-900">{ev.text}</span>
                    {ev.text2 && <span className="block text-[8.5px] text-ink-500">{ev.text2}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Human Support Actions */}
        <div className="rounded-xl border border-sand-200 bg-white p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-600">Human support actions</p>
            <span className="text-[8px] font-medium text-sage-700">Caseworker Decision</span>
          </div>
          <p className="mt-0.5 text-[8.5px] leading-3 text-ink-500">
            Decisions recorded by caseworker · Risk score unchanged.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {actionOptions.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => recordAction(opt.value)}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-1.5 py-1 text-left text-[9px] font-medium transition-colors duration-fast",
                  idx === actionOptions.length - 1 ? "col-span-2" : "",
                  chosenAction === opt.value
                    ? "border-marigold-500 bg-marigold-50 text-marigold-800 font-semibold"
                    : "border-sand-200 bg-white text-ink-700 hover:border-sand-300 hover:bg-sand-50"
                )}
              >
                <opt.icon size={10} className="shrink-0 text-marigold-600" aria-hidden="true" />
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>

          {chosenAction && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-sand-200 bg-sand-50 p-2">
              <p className="text-[9px] font-semibold text-ink-700">
                Record follow-up · {action.label}
              </p>
              <label className="flex items-center justify-between gap-2 text-[8.5px] text-ink-600">
                Action date
                <span className="font-medium text-ink-800">12 Sep 2026</span>
              </label>
              <label className="flex items-center justify-between gap-2 text-[8.5px] text-ink-600">
                Follow-up date
                <span className="rounded border border-sand-300 bg-white px-1.5 py-0.5 font-medium text-ink-800">15 Sep 2026</span>
              </label>
              <label className="flex items-center justify-between gap-2 text-[8.5px] text-ink-600">
                Status
                <select
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value)}
                  className="rounded border border-sand-300 bg-white px-1.5 py-0.5 text-[9px] text-ink-800 outline-none"
                >
                  {statusOptions.map((st) => (
                    <option key={st} value={st}>{statusLabel[st]}</option>
                  ))}
                </select>
              </label>
              <textarea
                rows={2}
                defaultValue="Caseworker note: Follow-up session coordinated."
                className="w-full rounded border border-sand-300 bg-white px-1.5 py-1 text-[9px] text-ink-700 outline-none"
              />
              <button
                type="button"
                onClick={saveFollowUp}
                className={cn(
                  "flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[9.5px] font-semibold text-white transition-colors duration-fast",
                  savedFollowUp ? "bg-sage-600" : "bg-[#9E4A26] hover:bg-[#823C20]"
                )}
              >
                {savedFollowUp ? (<><Check size={10} /> Follow-up recorded</>) : "Save follow-up record"}
              </button>
              {savedFollowUp && (
                <p className="text-center text-[8.5px] leading-3.5 text-sage-700">
                  Recorded as a human action. Risk score unchanged — the AI never decides care.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Explainability */}
        <details className="rounded-xl border border-sand-200 bg-white p-2.5">
          <summary className="cursor-pointer text-[9.5px] font-semibold text-ink-700">How this score was calculated</summary>
          <ol className="mt-2 space-y-1 text-[9.5px] leading-3.5 text-ink-700">
            {["Signals considered", "Recent wellbeing", "Longitudinal trend", "Conversation sentiment", "Crisis indicators", "Risk estimate"].map((step, i) => (
              <li key={step} className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-marigold-600">{i + 1}</span>
                {step}
                {i < 5 && <ArrowUpRight size={9} className="text-ink-300" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </details>

        {/* Crisis Chat Flags */}
        <div className="rounded-xl border border-sand-200 bg-white p-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-600">Crisis chat flags</p>
          <ul className="mt-1.5 space-y-1.5">
            {chatFlags.map((f, i) => (
              <li key={`${f.id}-${i}`} className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9.5px] font-medium text-ink-900">{f.id}</span>
                  <StatusBadge level="urgent" size="sm" />
                </div>
                <p className="mt-0.5 text-[9px] text-ink-700">{f.name} · {f.time}</p>
                <p className="mt-0.5 text-[8.5px] leading-3 text-ink-500">{f.keywords.map((k) => `“${k}”`).join(", ")}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
