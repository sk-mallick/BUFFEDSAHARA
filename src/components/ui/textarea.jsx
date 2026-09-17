import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-sand-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500 focus-visible:border-marigold-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
export default Textarea;
