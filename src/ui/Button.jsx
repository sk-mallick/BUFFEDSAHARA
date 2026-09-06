import { Link } from "react-router-dom";
import cn from "../lib/cn";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-md font-medium leading-none select-none transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-fast ease-soft min-h-[44px] px-6 py-3 text-[0.9375rem]";

const variants = {
  primary:
    "bg-marigold-600 text-white hover:bg-marigold-700 hover:shadow-3 hover:-translate-y-0.5 active:bg-marigold-800 active:translate-y-0",
  secondary:
    "bg-white text-ink-900 border border-sand-300 hover:bg-sand-100 hover:border-ink-300 hover:shadow-2 hover:-translate-y-0.5 active:bg-sand-200 active:translate-y-0",
  ghost: "bg-transparent text-ink-900 hover:bg-sand-100 active:bg-sand-200",
  quiet: "bg-transparent text-ink-700 hover:text-ink-900 hover:underline underline-offset-4 px-2",
  "on-dark": "bg-white/10 text-white border border-white/20 hover:bg-white/20",
};

const sizes = {
  sm: "min-h-[40px] px-4 py-2 text-small",
  md: "min-h-[44px] px-6 py-3 text-[0.9375rem]",
  lg: "min-h-[52px] px-8 py-4 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  to,
  href,
  disabled,
  loading,
  children,
  ...rest
}) {
  const busy = Boolean(loading);
  const cls = cn(
    base,
    variants[variant],
    sizes[size],
    (disabled || busy) && "pointer-events-none opacity-60",
    className
  );

  const inner = (
    <>
      <span className={cn("inline-flex items-center gap-2", busy && "invisible")}>{children}</span>
      {busy && (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="btn-spinner" />
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cls} aria-busy={busy} {...rest}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} aria-busy={busy} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={cls} disabled={disabled || busy} {...rest}>
      {inner}
    </button>
  );
}