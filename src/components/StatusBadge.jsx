import { Activity, BellRing, ShieldCheck, TriangleAlert } from "lucide-react";
import cn from "../lib/cn";

/**
 * Status language, calm by design: colour + icon + label, never colour alone,
 * never a bare red dot. Victim-facing surfaces may use stable/monitoring/
 * attention/urgent; `critical` is reserved for the caseworker dashboard.
 */
const levels = {
  stable: {
    cls: "border-sage-200 bg-sage-50 text-sage-700",
    label: "Stable",
    Icon: ShieldCheck,
  },
  monitoring: {
    cls: "border-amber-200 bg-amber-50 text-amber-700",
    label: "Monitoring",
    Icon: Activity,
  },
  attention: {
    cls: "border-amber-300 bg-amber-100 text-amber-800",
    label: "Needs attention",
    Icon: TriangleAlert,
  },
  urgent: {
    cls: "border-amber-400 bg-amber-50 text-amber-800",
    label: "Urgent",
    Icon: BellRing,
  },
  critical: {
    cls: "border-critical-200 bg-critical-50 text-critical-700",
    label: "Critical",
    Icon: TriangleAlert,
  },
};

export default function StatusBadge({ level = "stable", size = "md", className, label }) {
  const config = levels[level];
  const Icon = config.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "md" ? "px-2.5 py-1 text-caption" : "px-2 py-0.5 text-[11px] leading-5",
        config.cls,
        className
      )}
    >
      <Icon size={size === "md" ? 13 : 11} aria-hidden="true" />
      {label ?? config.label}
    </span>
  );
}