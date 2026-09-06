import { Lock } from "lucide-react";
import cn from "../lib/cn";

export default function BrowserFrame({ url = "sahara.in/caseworker/queue", children, className }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-5", className)}>
      <div className="flex items-center gap-3 border-b border-sand-200 bg-sand-100 px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
        </span>
        <span className="flex max-w-xs flex-1 items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 py-1 font-mono text-[11px] text-ink-500">
          <Lock size={11} aria-hidden="true" className="shrink-0 text-sage-600" />
          <span className="truncate">{url}</span>
        </span>
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}