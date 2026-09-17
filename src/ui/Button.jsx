import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import cn from "../lib/cn";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-md font-medium leading-none select-none transition-all duration-fast ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  default:
    "bg-marigold-600 text-white hover:bg-marigold-700 hover:shadow-2 active:bg-marigold-800 shadow-1",
  primary:
    "bg-marigold-600 text-white hover:bg-marigold-700 hover:shadow-2 active:bg-marigold-800 shadow-1",
  secondary:
    "bg-white text-ink-900 border border-sand-300 hover:bg-sand-100 hover:border-sand-400 hover:shadow-1 active:bg-sand-200",
  outline:
    "border border-sand-300 bg-white/80 text-ink-900 hover:bg-sand-100 hover:border-sand-400 hover:shadow-1",
  ghost: "bg-transparent text-ink-900 hover:bg-sand-100 active:bg-sand-200",
  quiet: "bg-transparent text-ink-700 hover:text-ink-900 hover:underline underline-offset-4 px-2",
  destructive:
    "bg-critical-600 text-white hover:bg-critical-700 active:bg-critical-800 shadow-1",
  sage:
    "bg-sage-600 text-white hover:bg-sage-700 active:bg-sage-800 shadow-1",
  link: "bg-transparent text-marigold-600 underline-offset-4 hover:underline hover:text-marigold-700 p-0 min-h-0",
  "on-dark": "bg-white/10 text-white border border-white/20 hover:bg-white/20",
};

const sizes = {
  sm: "min-h-[36px] px-3.5 py-1.5 text-xs",
  md: "min-h-[44px] px-5 py-2.5 text-sm",
  lg: "min-h-[50px] px-7 py-3 text-base font-semibold",
  icon: "h-10 w-10 min-h-[40px] p-0 rounded-md",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    className,
    to,
    href,
    disabled,
    loading,
    children,
    type = "button",
    ...rest
  },
  ref
) {
  const busy = Boolean(loading);
  const cls = cn(
    base,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    (disabled || busy) && "pointer-events-none opacity-60",
    className
  );

  const inner = (
    <>
      {busy && <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden="true" />}
      <span className={cn("inline-flex items-center gap-2", busy && "opacity-80")}>
        {children}
      </span>
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} aria-busy={busy} {...rest}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={cls} aria-busy={busy} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      disabled={disabled || busy}
      aria-busy={busy}
      {...rest}
    >
      {inner}
    </button>
  );
});

export default Button;
export { Button };