import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import HelplineCard from "./HelplineCard";
import cn from "../lib/cn";

const selectCls =
  "h-11 cursor-pointer rounded-md border border-sand-300 bg-white px-3 text-small text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600";

export default function HelplineDirectory({ items, compact = false, className }) {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("all");
  const [state, setState] = useState("all");

  const languages = useMemo(
    () => [...new Set(items.flatMap((i) => (i.languages ? i.languages.split(", ") : [])))],
    [items]
  );
  const states = useMemo(
    () => [...new Set(items.filter((i) => i.state).map((i) => i.state))],
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const hay = `${item.name} ${item.note || ""} ${item.org || ""}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (lang !== "all" && !(item.languages || "").includes(lang)) return false;
      if (state !== "all" && item.state !== state) return false;
      return true;
    });
  }, [items, q, lang, state]);

  if (compact) {
    return (
      <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {items.map((item) => (
          <HelplineCard key={item.name} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search helplines</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or service…"
            className="h-11 w-full rounded-md border border-sand-300 bg-white pl-10 pr-4 text-small text-ink-900 placeholder:text-ink-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-small text-ink-700">
            Language
            <select value={lang} onChange={(e) => setLang(e.target.value)} className={selectCls}>
              <option value="all">All</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-small text-ink-700">
            State
            <select value={state} onChange={(e) => setState(e.target.value)} className={selectCls}>
              <option value="all">All India</option>
              {states
                .filter((s) => s !== "All India")
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      <p className="mt-4 text-caption text-ink-500" aria-live="polite">
        Showing {filtered.length} of {items.length} resources
      </p>

      {filtered.length === 0 ? (
        <div className="card mt-4 flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-100">
            <Search size={20} className="text-ink-500" aria-hidden="true" />
          </span>
          <h3 className="text-h4 text-ink-900">No matching helplines</h3>
          <p className="max-w-sm text-small text-ink-700">
            Try a different search, or clear the filters. Help is still one call away on 14566.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setLang("all");
              setState("all");
            }}
            className="rounded-md px-4 py-2 text-small font-medium text-marigold-600 transition-colors duration-fast ease-soft hover:bg-marigold-50"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <HelplineCard key={item.name} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}