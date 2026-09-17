import * as React from "react";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-marigold-600 text-white hover:bg-marigold-700 active:bg-marigold-800 shadow-1",
        secondary:
          "bg-sand-100 text-ink-900 hover:bg-sand-200 active:bg-sand-300 border border-sand-200",
        outline:
          "border border-sand-300 bg-white/80 text-ink-900 hover:bg-sand-100 hover:border-sand-400",
        ghost:
          "text-ink-700 hover:bg-sand-100 hover:text-ink-900",
        destructive:
          "bg-critical-600 text-white hover:bg-critical-700 active:bg-critical-800 shadow-1",
        sage:
          "bg-sage-600 text-white hover:bg-sage-700 active:bg-sage-800 shadow-1",
        link:
          "text-marigold-600 underline-offset-4 hover:underline hover:text-marigold-700 p-0 h-auto",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base font-semibold",
        icon: "h-10 w-10 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
export default Button;
