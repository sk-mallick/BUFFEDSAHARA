import { Lock } from "lucide-react";
import cn from "../lib/cn";

export default function BrowserFrame({ url = "sahara.in/caseworker/queue", children, className }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-2", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-sand-200 bg-sand-100 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
          </span>
          <span className="flex max-w-xs items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 py-1 font-mono text-[11px] text-ink-500">
            <Lock size={11} aria-hidden="true" className="shrink-0 text-sage-600" />
            <span className="truncate">{url}</span>
          </span>
        </div>
        <div className="hidden items-center gap-2 text-[10px] font-medium text-ink-500 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-sage-500 animate-pulse" aria-hidden="true" />
          <span>Encrypted Session · MoSJE Triage</span>
        </div>
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}