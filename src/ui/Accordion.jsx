import { useState } from "react";
import { ChevronDown } from "lucide-react";
import cn from "../lib/cn";

export default function Accordion({ items, className }) {
  const [open, setOpen] = useState(0);

  return (
    <div className={cn("divide-y divide-sand-200 border-y border-sand-200", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                aria-controls={`acc-panel-${i}`}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="text-h4 text-ink-900">{item.q}</span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 text-marigold-600 transition-transform duration-base ease-soft",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
            </h3>
            <div
              id={`acc-panel-${i}`}
              role="region"
              aria-label={item.q}
              className={cn(
                "grid transition-[grid-template-rows] duration-slow ease-soft",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-6 text-body text-ink-700">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}