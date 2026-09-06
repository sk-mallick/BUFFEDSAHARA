import cn from "../lib/cn";

/** Thin arch divider — the threshold motif used sparingly (max 1 per viewport). */
export default function ArchRule({ className }) {
  return (
    <div className={cn("flex items-center gap-4", className)} aria-hidden="true">
      <span className="h-px flex-1 bg-sand-200" />
      <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
        <path d="M10 46 V26 C10 14 24 7 28 7 C32 7 46 14 46 26 V46" stroke="var(--color-marigold-600)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="h-px flex-1 bg-sand-200" />
    </div>
  );
}