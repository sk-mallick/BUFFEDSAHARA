import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-marigold-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-sand-200 bg-sand-100 text-ink-700",
        primary:
          "border-marigold-200 bg-marigold-50 text-marigold-700",
        sage:
          "border-sage-200 bg-sage-50 text-sage-700",
        amber:
          "border-amber-200 bg-amber-50 text-amber-800",
        destructive:
          "border-critical-200 bg-critical-50 text-critical-700",
        outline:
          "border-sand-300 text-ink-700 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
export default Badge;
