import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  Building2,
  CalendarCheck,
  ChevronRight,
  ExternalLink,
  Info,
  Landmark,
  Loader2,
  MapPin,
  Minus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Button from "../ui/Button";
import cn from "../lib/cn";
import { adminApi, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// ---------------------------------------------------------------------------
// Risk-band presentation. Colours are the Sahara system's own (sage → amber →
// warm marigold → restrained critical red) — used WITH labels, never alone.
// ---------------------------------------------------------------------------
const BANDS = [
  { key: "stable", label: "Stable", hex: "#648552" },
  { key: "monitoring", label: "Monitoring", hex: "#E0B75E" },
  { key: "needs_attention", label: "Needs attention", hex: "#B37D22" },
  { key: "urgent", label: "Urgent", hex: "#A0452D" },
];

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

// DEMO-042 — Odisha · Khordha, the Step-1 story case. Only used to surface a
// deep link when the LIVE database reports it; no case is hard-coded in rows.
const DEMO_CASE = "DEMO-042";

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const tooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid #E9DFCE",
  borderRadius: 12,
  boxShadow: "0 2px 4px rgba(31,39,51,.05), 0 8px 20px -4px rgba(31,39,51,.10)",
  fontSize: 12,
  color: "#1F2733",
};

// Friendly error copy — never raw exception text on an administrative view.
function friendlyError(err) {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your session has expired. Please sign in again.";
    if (err.status === 403) return "You do not have permission to view this area.";
    if (err.status === 404) return "No monitoring data is available for this region.";
    if (err.status === 0) return "Unable to reach the Sahara service. Please try again shortly.";
    return "Unable to load administrative data. Please try again shortly.";
  }
  return "Unable to load administrative data. Please try again shortly.";
}

function TrendTag({ trend }) {
  if (trend === "worsening")
    return (
      <span className="inline-flex items-center gap-1 text-caption font-medium text-critical-600">
        <ArrowUpRight size={13} aria-hidden="true" /> Worsening
      </span>
    );
  if (trend === "improving")
    return (
      <span className="inline-flex items-center gap-1 text-caption font-medium text-sage-600">
        <ArrowDownRight size={13} aria-hidden="true" /> Improving
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-caption font-medium text-ink-500">
      <Minus size={13} aria-hidden="true" /> Stable
    </span>
  );
}

const badgeLevel = (key) => (key === "needs_attention" ? "attention" : key);

// ---------------------------------------------------------------------------
// Small stat block used for the overview counts.
// ---------------------------------------------------------------------------
function Stat({ label, value, tone = "text-ink-900", loading }) {
  return (
    <Card className="border-sand-200 bg-white">
      <CardContent className="p-3.5 sm:p-4">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
        <p className={cn("mt-1 font-display text-2xl sm:text-3xl font-semibold leading-tight", tone)}>
          {loading ? "—" : value}
        </p>
      </CardContent>
    </Card>
  );
}

function InlineLoader({ children }) {
  return (
    <p className="inline-flex items-center gap-2 text-small text-ink-500">
      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
      {children}
    </p>
  );
}

function ErrorBanner({ children }) {
  return (
    <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-small text-amber-800">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Segmented band bar — counts are also printed, so colour is never the only
// channel.
// ---------------------------------------------------------------------------
function BandBar({ counts }) {
  const total = Math.max(1, counts.total);
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-sand-100" aria-hidden="true">
      {BANDS.map((b) => (
        <div
          key={b.key}
          className="h-full"
          style={{ width: `${(counts[b.key] / total) * 100}%`, background: b.hex }}
        />
      ))}
    </div>
  );
}

function BandLegend({ counts }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {BANDS.map((b) => (
        <li key={b.key} className="inline-flex items-center gap-1.5 text-caption text-ink-700">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: b.hex }}
            aria-hidden="true"
          />
          <span className="font-medium">{counts[b.key]}</span> {b.label}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// A selectable region row (state or district) with its distribution bar.
// ---------------------------------------------------------------------------
function RegionRow({ row, onOpen, hint }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(row.name)}
        className="group flex w-full flex-col gap-3 rounded-xl border border-sand-200 bg-white px-4 py-3.5 text-left transition-colors duration-fast hover:border-marigold-300 hover:bg-marigold-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
      >
        <span className="flex w-full items-center justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-ink-700 transition-colors duration-fast group-hover:bg-marigold-100 group-hover:text-marigold-700">
              {hint === "state" ? (
                <Landmark size={17} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <MapPin size={17} strokeWidth={1.5} aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-body font-semibold text-ink-900">{row.name}</span>
              <span className="block text-caption text-ink-500">
                {row.total} monitored · {row.worsening} worsening
              </span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-caption font-medium text-marigold-700">
            Open dashboard
            <ChevronRight size={14} aria-hidden="true" className="transition-transform duration-fast group-hover:translate-x-0.5" />
          </span>
        </span>
        <span className="w-full">
          <span className="sr-only">
            {row.name}: stable {row.stable}, monitoring {row.monitoring},
            needs attention {row.needs_attention}, urgent {row.urgent}.
          </span>
          <BandBar counts={row} />
          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {BANDS.map((b) => (
              <span key={b.key} className="inline-flex items-center gap-1.5 text-caption text-ink-500">
                <span className="h-2 w-2 rounded-full" style={{ background: b.hex }} aria-hidden="true" />
                <span className="font-mono font-medium text-ink-700">{row[b.key]}</span> {b.label}
              </span>
            ))}
          </span>
        </span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// The page itself: National → State → District drill-down over the LIVE API.
// ---------------------------------------------------------------------------
export default function AdminDashboardPage() {
  // Administrative scope comes from the AUTHENTICATED account — never from a
  // URL or query value. The API re-checks the same boundaries server-side.
  const { user } = useAuth();
  const role = user?.role;
  const [state, setState] = useState(() =>
    role && role !== "national_admin" ? user?.state || null : null
  );
  const [district, setDistrict] = useState(() =>
    role === "district_officer" ? user?.district || null : null
  );
  const [days, setDays] = useState(30);

  // Live scope data + trend. `data` is nulled while a NEW scope loads so old
  // numbers are never shown as though they belong to the new selection.
  const [data, setData] = useState(null);
  const [dataError, setDataError] = useState("");
  const [trend, setTrend] = useState(null);
  const [trendError, setTrendError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [tick, setTick] = useState(0); // manual refresh
  const [announce, setAnnounce] = useState("");
  const dataSeq = useRef(0);
  const trendSeq = useRef(0);
  const announceTimer = useRef(null);

  const level = district ? "district" : state ? "state" : "national";
  const scopeLabel = district ? `${district} · ${state}` : state || "India";

  const say = useCallback((text) => {
    setAnnounce(text);
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnounce(""), 6000);
  }, []);

  // Navigate the monitoring scope (breadcrumb drill-down).
  const nav = useCallback(
    (nextState, nextDistrict, spoken) => {
      setData(null);
      setTrend(null);
      setDataError("");
      setTrendError("");
      setState(nextState);
      setDistrict(nextDistrict);
      if (spoken) say(spoken);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [say]
  );

  // -------------------------------------------------------------------------
  // Live loading — every value rendered below originates from these calls.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const id = ++dataSeq.current;
    setData(null);
    setDataError("");
    setTrendError(""); // a scoped trend is being reloaded alongside

    (async () => {
      try {
        let scopeData;
        if (level === "national") {
          const [summary, regions] = await Promise.all([
            adminApi.getNationalSummary(),
            adminApi.getStates(),
          ]);
          scopeData = { ...summary, regions };
        } else if (level === "state") {
          const [summary, regions] = await Promise.all([
            adminApi.getStateSummary(state),
            adminApi.getStateDistricts(state),
          ]);
          scopeData = { ...summary, regions };
        } else {
          const [summary, caseworkers] = await Promise.all([
            adminApi.getDistrictSummary(district, state),
            adminApi.getDistrictCaseworkers(district, state),
          ]);
          scopeData = { ...summary, regions: caseworkers };
        }
        if (id !== dataSeq.current) return;
        setData(scopeData);
        setDataError("");
        setRefreshedAt(new Date());
      } catch (err) {
        if (id !== dataSeq.current) return;
        setData(null);
        setDataError(friendlyError(err));
      }
    })();
  }, [level, state, district, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trend is keyed to the range as well; a range change only blanks the chart,
  // never the scope counters.
  useEffect(() => {
    const id = ++trendSeq.current;
    setTrend(null);
    setTrendError("");
    (async () => {
      try {
        const t = await adminApi.getAdminTrends({ days, state, district });
        if (id !== trendSeq.current) return;
        setTrend(t);
      } catch (err) {
        if (id !== trendSeq.current) return;
        setTrend(null);
        setTrendError(friendlyError(err));
      }
    })();
  }, [days, state, district, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeRange = (next) => {
    setDays(next);
    setTrend(null);
    say(`Showing the last ${next} days for ${scopeLabel}.`);
  };

  const counts = data?.counts;
  const alerts = data?.alerts;
  const followUps = data?.follow_ups;
  const completion = data?.follow_ups ? Math.round(data.follow_ups.completion_rate * 100) : 0;
  const series = trend?.series || [];
  const lastDay = series[series.length - 1] || { stable: 0, monitoring: 0, needs_attention: 0, urgent: 0 };

  // DEMO-042 deep link — only shown when the live Khordha dataset reports it.
  const demoRow =
    district === "Khordha" && state === "Odisha" && Array.isArray(data?.cases)
      ? data.cases.find((c) => c.case_id === DEMO_CASE) || null
      : null;

  const loadingScope = !data && !dataError;
  const atNational = !state;
  const atState = Boolean(state) && !district;
  const atDistrict = Boolean(state && district);

  const canOpenState = role === "national_admin";
  const canOpenDistrict = (name) =>
    role === "national_admin" || (role === "state_admin" && !district) ||
    (role === "district_officer" && name === user?.district && !district);

  const openState = (name) => {
    if (!canOpenState) return;
    nav(name, null, `Opening the ${name} state view.`);
  };
  const openDistrictRow = (name) => {
    if (!canOpenDistrict(name)) return;
    nav(state, name, `Opening the ${name} district view.`);
  };
  const backNational = () => nav(null, null, "Showing the national overview.");
  const backState = () => nav(state, null, `Showing ${state} state districts.`);

  // Breadcrumb trail, honouring the authenticated role's scope. A district
  // officer sees only their own district (the server refuses broader views);
  // a state admin can move within their state; national admin can move freely.
  const crumbs = [];
  if (role === "district_officer") {
    crumbs.push({ label: district ? `${district} · ${state}` : "My district" });
  } else if (role === "state_admin") {
    if (level === "state") crumbs.push({ label: state || "My state" });
    else {
      crumbs.push({ label: state, action: backState });
      crumbs.push({ label: district });
    }
  } else if (role === "national_admin") {
    if (level === "national") crumbs.push({ label: "National · India" });
    else if (level === "state") {
      crumbs.push({ label: "National · India", action: backNational });
      crumbs.push({ label: state });
    } else {
      crumbs.push({ label: "National · India", action: backNational });
      crumbs.push({ label: state, action: backState });
      crumbs.push({ label: district });
    }
  } else {
    crumbs.push({ label: "National · India" });
  }

  const isEmpty =
    data &&
    counts &&
    counts.total === 0 &&
    !(data.regions && data.regions.length) &&
    !(data.cases && data.cases.length);

  return (
    <>
      <PageHeader
        eyebrow="Command view · National → State → District"
        title="Aggregated care. Never exposed at the wrong level."
        lead="Administrative views show programme-level numbers — how many cases sit at each risk level, which regions need attention, where follow-ups are slipping. Individual case files stay with the authorised caseworker who knows the person behind the case ID."
      >
        <p className="mt-5 inline-flex items-start gap-2 rounded-lg border border-sand-200 bg-white/70 px-3 py-2 text-caption text-ink-700">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-sage-600" aria-hidden="true" />
          <span>
            Administrative views display aggregated programme information. Individual case information
            is restricted to authorised personnel. Figures are served live from the Sahara programme API
            over the{" "}
            <strong className="font-semibold text-ink-900">SIH demonstration database — fictional cases</strong>.
          </span>
        </p>
      </PageHeader>

      <div className="bg-sand-50 pb-20 md:pb-24">
        <div className="shell">
          {/* Screen-reader live region for loading / range / scope changes */}
          <p className="sr-only" role="status" aria-live="polite">
            {announce || (loadingScope ? `Loading ${level} monitoring data.` : "")}
          </p>

          {/* ---- Scope navigation (breadcrumb) ---- */}
          <nav aria-label="Monitoring scope" className="flex flex-wrap items-center gap-2 pt-8">
            {crumbs.map((c, i) => (
              <span key={c.label} className="inline-flex items-center gap-2">
                {i > 0 && <ChevronRight size={14} className="text-ink-300" aria-hidden="true" />}
                {i === crumbs.length - 1 ? (
                  <span
                    aria-current="page"
                    className="rounded-full border border-marigold-200 bg-marigold-50 px-3 py-1.5 text-caption font-semibold text-marigold-800"
                  >
                    {c.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={c.action}
                    className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-caption font-medium text-ink-700 transition-colors duration-fast hover:border-marigold-300 hover:text-marigold-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
                  >
                    {c.label}
                  </button>
                )}
              </span>
            ))}
            <span className="ml-auto hidden items-center gap-1.5 text-caption text-ink-500 sm:inline-flex">
              <Info size={13} aria-hidden="true" />
              AI-assisted risk monitoring. Not a clinical diagnosis.
            </span>
          </nav>

          {role !== "national_admin" && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-sand-200 bg-white px-3 py-2 text-caption text-ink-600">
              <ShieldCheck size={14} className="shrink-0 text-sage-600" aria-hidden="true" />
              View scoped to your account ({user?.state}
              {role === "district_officer" ? ` · ${user?.district}` : ""}) — the server enforces the
              same boundary on the live API.
            </p>
          )}

          {/* ---- Status line: loading / error / refresh ---- */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {dataError ? (
              <div className="w-full">
                <ErrorBanner>{dataError}</ErrorBanner>
              </div>
            ) : loadingScope ? (
              <InlineLoader>Loading administrative data for {scopeLabel}…</InlineLoader>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-caption font-medium text-sage-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-500" aria-hidden="true" />
                  Live from the programme database
                </span>
                <Button size="sm" variant="secondary" onClick={() => setTick((t) => t + 1)}>
                  <RefreshCw size={13} aria-hidden="true" /> Refresh data
                </Button>
                {refreshedAt && (
                  <span className="text-caption text-ink-500">
                    Refreshed at{" "}
                    {refreshedAt.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                )}
              </>
            )}
          </div>

          {/* ---- Overview counts ---- */}
          <section aria-label={`Overview — ${scopeLabel}`} className="mt-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-h3 text-ink-900">
                {atDistrict ? `${district} district` : atState ? `${state} state` : "India — all monitored cases"}
              </h2>
              <p className="text-caption text-ink-500">
                Latest assessment per case · {data?.source_note || "SIH Demonstration Data"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <Stat label="Total monitored" value={counts?.total} loading={!counts} />
              <Stat label="Stable" value={counts?.stable} tone="text-sage-600" loading={!counts} />
              <Stat label="Monitoring" value={counts?.monitoring} tone="text-amber-600" loading={!counts} />
              <Stat label="Needs attention" value={counts?.needs_attention} tone="text-marigold-700" loading={!counts} />
              <Stat label="Urgent" value={counts?.urgent} tone="text-critical-600" loading={!counts} />
              <Stat label="Worsening" value={counts?.worsening} tone="text-critical-600" loading={!counts} />
            </div>
            {isEmpty && (
              <p className="mt-3 rounded-xl bg-sand-100 px-4 py-3 text-small text-ink-600">
                No monitoring data is available for {scopeLabel} yet — it appears once a case in this
                region has a stored risk assessment.
              </p>
            )}
          </section>

          {/* ---- Trend + alerts/follow-ups ---- */}
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {/* Risk-level trend chart */}
            <section
              aria-label={`Cases by risk level over ${days} days`}
              className="rounded-2xl border border-sand-200 bg-white p-5 lg:col-span-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-h4 text-ink-900">Cases by risk level</h3>
                  <p className="mt-1 text-caption text-ink-500">
                    How many cases sat at each band, per day ({scopeLabel}) — served by
                    GET /api/admin/trends.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div role="group" aria-label="Time range" className="hidden sm:flex rounded-lg border border-sand-200 bg-sand-50 p-0.5">
                    {RANGES.map((r) => (
                      <button
                        key={r.days}
                        type="button"
                        aria-pressed={days === r.days}
                        onClick={() => changeRange(r.days)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-caption font-medium transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-marigold-600",
                          days === r.days ? "bg-white text-ink-900 shadow-1" : "text-ink-500 hover:text-ink-900"
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div className="sm:hidden w-28">
                    <Select value={String(days)} onValueChange={(val) => changeRange(Number(val))}>
                      <SelectTrigger className="h-8 text-xs bg-sand-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RANGES.map((r) => (
                          <SelectItem key={r.days} value={String(r.days)} className="text-xs">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {trendError ? (
                <div className="mt-4">
                  <ErrorBanner>{trendError}</ErrorBanner>
                </div>
              ) : !trend ? (
                <div className="mt-6 flex h-56 items-center justify-center sm:h-64">
                  <InlineLoader>Loading the last {days} days…</InlineLoader>
                </div>
              ) : series.length === 0 ? (
                <p className="mt-6 rounded-xl bg-sand-100 px-4 py-6 text-center text-small text-ink-600">
                  No assessment history is available for {scopeLabel} in the last {days} days.
                </p>
              ) : (
                <div className="mt-4 h-56 sm:h-64" role="img" aria-label={`Stacked chart of cases by risk level over the last ${days} days`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        {BANDS.map((b) => (
                          <linearGradient key={b.key} id={`grad-${b.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={b.hex} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={b.hex} stopOpacity={0.04} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="#E9DFCE" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        tick={{ fontSize: 10, fill: "#66707C" }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={28}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#66707C" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(l) => shortDate(l)}
                        formatter={(value, name) => [value, BANDS.find((b) => b.key === name)?.label ?? name]}
                      />
                      {BANDS.map((b) => (
                        <Area
                          key={b.key}
                          type="monotone"
                          dataKey={b.key}
                          stackId="1"
                          stroke={b.hex}
                          strokeWidth={1.5}
                          fill={`url(#grad-${b.key})`}
                          isAnimationActive={false}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <BandLegend counts={lastDay} />
                <p className="text-caption text-ink-500">
                  Today: {counts?.total ?? "—"} monitored · {counts?.worsening ?? "—"} worsening
                </p>
              </div>
              <p className="sr-only">
                Over the last {days} days, cases by risk level today: stable {lastDay.stable},
                monitoring {lastDay.monitoring}, needs attention {lastDay.needs_attention}, urgent {lastDay.urgent}.
              </p>
            </section>

            {/* Alerts + follow-ups column */}
            <div className="space-y-5">
              <section aria-label="Alert summary" className="rounded-2xl border border-sand-200 bg-white p-5">
                <h3 className="flex items-center gap-2 text-h4 text-ink-900">
                  <BellRing size={17} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                  Alerts
                </h3>
                <ul className="mt-3 divide-y divide-sand-100">
                  {[
                    ["Unreviewed alerts", alerts?.unreviewed, "text-amber-700"],
                    ["Needs attention", alerts?.needs_attention, "text-marigold-700"],
                    ["Urgent / safety signals", alerts?.urgent, "text-critical-600"],
                  ].map(([label, value, tone]) => (
                    <li key={label} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-small text-ink-700">{label}</span>
                      <span className={cn("font-display text-lg font-semibold", tone)}>
                        {value ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-sand-100 pt-2 text-caption text-ink-500">
                  {alerts?.crisis_signals ?? "—"} open critical safety signal
                  {(alerts?.crisis_signals ?? 1) === 1 ? "" : "s"} — human review required.
                </p>
              </section>

              <section aria-label="Follow-up summary" className="rounded-2xl border border-sand-200 bg-white p-5">
                <h3 className="flex items-center gap-2 text-h4 text-ink-900">
                  <CalendarCheck size={17} strokeWidth={1.5} className="text-sage-600" aria-hidden="true" />
                  Follow-ups
                </h3>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-small text-ink-700">
                      {followUps?.due ?? "—"} due ·{" "}
                      <span className="font-semibold text-amber-700">{followUps?.overdue ?? "—"} overdue</span>
                    </p>
                    <p className="mt-1 text-caption text-ink-500">
                      Completion rate {data?.follow_ups ? completion : "—"}% of recorded human follow-ups
                    </p>
                  </div>
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-sand-100"
                  role="progressbar"
                  aria-valuenow={completion}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Follow-up completion rate ${completion} percent`}
                >
                  <div className="h-full rounded-full bg-sage-500" style={{ width: `${completion}%` }} />
                </div>
              </section>

              <section aria-label="Worsening vs improving" className="rounded-2xl border border-sand-200 bg-white p-5">
                <h3 className="flex items-center gap-2 text-h4 text-ink-900">
                  <TrendingUp size={17} strokeWidth={1.5} className="text-critical-600" aria-hidden="true" />
                  Momentum
                </h3>
                <div className="mt-3 flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-critical-50 px-2.5 py-1 text-caption font-medium text-critical-700">
                    <TrendingUp size={13} aria-hidden="true" /> {counts?.worsening ?? "—"} worsening
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 px-2.5 py-1 text-caption font-medium text-sage-700">
                    <TrendingDown size={13} aria-hidden="true" /> {counts?.improving ?? "—"} improving
                  </span>
                </div>
                <p className="mt-3 text-caption leading-relaxed text-ink-500">
                  Trend direction comes from each case's latest assessment —{" "}
                  {(counts?.worsening ?? 0) > (counts?.improving ?? 0)
                    ? "more cases are rising than settling. Worth watching at the next level down."
                    : "settling cases currently outnumber rising ones."}
                </p>
              </section>
            </div>
          </div>

          {/* ---- Distribution / drill-down list ---- */}
          {atNational && (
            <section aria-label="State-wise distribution" className="mt-10">
              <h2 className="text-h3 text-ink-900">Select a state</h2>
              <p className="mt-2 max-w-2xl text-small leading-relaxed text-ink-700">
                Each state opens to its districts. Rows show risk distribution and worsening counts for
                the demonstration caseload — served by GET /api/admin/states.
              </p>
              {!data && !dataError && (
                <div className="mt-5">
                  <InlineLoader>Loading states…</InlineLoader>
                </div>
              )}
              {data && (!data.regions || data.regions.length === 0) && (
                <p className="mt-5 text-small text-ink-600">
                  No state data is available yet.
                </p>
              )}
              <ul className="mt-5 grid gap-3 md:grid-cols-2">
                {(data?.regions || [])
                  .filter((row) => canOpenState && row.name)
                  .map((row) => (
                    <RegionRow key={row.name} row={row} hint="state" onOpen={openState} />
                  ))}
              </ul>
            </section>
          )}

          {atState && (
            <section aria-label={`${state} districts`} className="mt-10">
              <h2 className="text-h3 text-ink-900">Select a district in {state}</h2>
              <p className="mt-2 max-w-2xl text-small leading-relaxed text-ink-700">
                Districts aggregate to caseworkers below. Individual case details are not shown at this
                level.
              </p>
              {!data && !dataError && (
                <div className="mt-5">
                  <InlineLoader>Loading districts…</InlineLoader>
                </div>
              )}
              {data && (!data.regions || data.regions.length === 0) && (
                <p className="mt-5 text-small text-ink-600">
                  No monitoring data is available for districts in {state} yet.
                </p>
              )}
              <ul className="mt-5 grid gap-3 md:grid-cols-2">
                {(data?.regions || [])
                  .filter((row) => canOpenDistrict(row.name) || row.name === user?.district)
                  .map((row) => (
                    <RegionRow key={row.name} row={row} hint="district" onOpen={openDistrictRow} />
                  ))}
              </ul>
            </section>
          )}

          {atDistrict && (
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {/* Caseworker workload */}
              <section aria-label="Caseworker workload" className="rounded-2xl border border-sand-200 bg-white p-5">
                <h2 className="flex items-center gap-2 text-h4 text-ink-900">
                  <Users size={17} strokeWidth={1.5} className="text-marigold-700" aria-hidden="true" />
                  Caseworker workload
                </h2>
                <p className="mt-1 text-caption text-ink-500">
                  Aggregate active cases per caseworker — staff labels only, from the live district API.
                </p>
                {!data && !dataError && (
                  <div className="mt-5">
                    <InlineLoader>Loading caseworkers…</InlineLoader>
                  </div>
                )}
                {data && (!data.regions || data.regions.length === 0) && (
                  <p className="mt-5 text-small text-ink-600">
                    No caseworker assignments are recorded for {district} yet.
                  </p>
                )}
                <ul className="mt-4 space-y-2.5">
                  {(data?.regions || []).map((cw) => (
                    <li key={cw.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sand-50 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-small font-semibold text-ink-900">{cw.name}</span>
                        <span className="text-caption text-ink-500">{cw.id}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-caption font-medium text-ink-700 ring-1 ring-sand-200">
                          {cw.active_cases} active
                        </span>
                        {cw.urgent > 0 && (
                          <span className="rounded-full bg-critical-50 px-2.5 py-1 text-caption font-medium text-critical-700">
                            {cw.urgent} urgent
                          </span>
                        )}
                        {cw.needs_attention > 0 && (
                          <span className="rounded-full bg-marigold-50 px-2.5 py-1 text-caption font-medium text-marigold-800">
                            {cw.needs_attention} attention
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* District case rows — minimal, privacy-preserving */}
              <section aria-label={`Cases in ${district}`} className="rounded-2xl border border-sand-200 bg-white p-5">
                <h2 className="flex items-center gap-2 text-h4 text-ink-900">
                  <Building2 size={17} strokeWidth={1.5} className="text-sage-600" aria-hidden="true" />
                  Cases in {district}
                </h2>
                <p className="mt-1 text-caption text-ink-500">
                  Case IDs and risk only. Notes, messages and names are never shown in administrative views.
                </p>
                {!data && !dataError && (
                  <div className="mt-5">
                    <InlineLoader>Loading cases…</InlineLoader>
                  </div>
                )}
                {data && (!data.cases || data.cases.length === 0) && (
                  <p className="mt-5 text-small text-ink-600">
                    No monitored cases are recorded in {district} yet.
                  </p>
                )}
                <ul className="mt-4 divide-y divide-sand-100">
                  {(data?.cases || []).map((row) => (
                    <li key={row.case_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-mono text-small font-medium text-ink-900">{row.case_id}</span>
                          {row.case_id === DEMO_CASE && (
                            <span className="rounded-full bg-marigold-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-marigold-800">
                              Demo case
                            </span>
                          )}
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          <StatusBadge level={badgeLevel(row.risk_level)} size="sm" />
                          <span className="font-mono text-caption text-ink-700">
                            {row.distress_score}<span className="text-ink-400">/100</span>
                          </span>
                          <TrendTag trend={row.trend} />
                        </span>
                      </span>
                      {row.case_id === DEMO_CASE ? (
                        <Button to="/caseworker" variant="secondary" size="sm" className="shrink-0">
                          Case record <ExternalLink size={13} aria-hidden="true" />
                        </Button>
                      ) : (
                        <span className="text-caption italic text-ink-400">
                          file restricted to assigned caseworker
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Demo-case deep link strip */}
              {demoRow && (
                <aside className="rounded-2xl border border-marigold-200 bg-marigold-50 p-5 lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-marigold-700 ring-1 ring-marigold-200">
                      <Landmark size={20} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-small font-semibold text-ink-900">
                        DEMO-042 — the full demonstration workflow
                      </p>
                      <p className="mt-0.5 text-caption leading-relaxed text-ink-700">
                        This fictional case (Odisha · Khordha) connects the whole pipeline: risk trend →
                        AI explanation → alert → caseworker review → human follow-up. Opening the case
                        record takes you to the caseworker console for DEMO-042.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      <StatusBadge level={badgeLevel(demoRow.risk_level)} size="sm" />
                      <Button to="/caseworker">
                        Open case record
                        <ExternalLink size={14} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          )}

          {/* ---- Honesty footer ---- */}
          <footer className="mt-10 space-y-2 rounded-2xl border border-sand-200 bg-white p-5">
            <p className="text-small font-medium text-ink-900">
              About this view
            </p>
            <p className="max-w-3xl text-caption leading-relaxed text-ink-700">
              Counts aggregate the latest stored risk assessment per case (risk_assessments), open
              alerts (alerts), and human follow-up records (caseworker_actions) — the same sources the
              caseworker dashboard reads, summarised server-side by GET /api/admin/* over the live
              programme database. No beneficiary name, message, note, or free-text response is ever
              returned by these endpoints. The dataset is SIH demonstration data: fictional cases
              seeded through seed_demo.py and seed_admin_data.py. Role levels are enforced by the
              authenticated account — national_admin / state_admin / district_officer — and the server
              derives scope from the token, never from the frontend.{" "}
              <strong className="font-semibold">
                AI-assisted risk estimates support human review and are not a clinical diagnosis.
              </strong>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
