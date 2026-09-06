import cn from "../lib/cn";

/**
 * Branded skeleton: warm sand shimmer (never default gray).
 * Usage: <Skeleton className="h-4 w-2/3" /> and compose with real layout.
 */
export default function Skeleton({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "skeleton inline-block animate-shimmer rounded-md",
        className
      )}
    />
  );
}