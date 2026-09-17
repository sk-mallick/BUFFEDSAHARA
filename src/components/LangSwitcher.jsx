import { Check, ChevronDown, Globe } from "lucide-react";
import { useLang } from "../lib/i18n";
import cn from "../lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function LangSwitcher({ dark = false, className }) {
  const { lang, setLang } = useLang();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Select application language"
          className={cn(
            "inline-flex items-center gap-1.5 h-9 rounded-full border px-3 text-xs font-semibold transition-all duration-fast shadow-xs select-none outline-none focus-visible:ring-2 focus-visible:ring-marigold-500 cursor-pointer",
            dark
              ? "border-white/20 bg-white/10 text-sand-100 hover:border-white/40 hover:bg-white/15"
              : "border-sand-300/80 bg-white/90 text-ink-800 hover:border-marigold-400 hover:bg-white hover:text-ink-900",
            className
          )}
        >
          <Globe
            size={13}
            className={cn("shrink-0", dark ? "text-sand-300" : "text-marigold-700")}
            aria-hidden="true"
          />
          <span className="font-semibold uppercase tracking-wider">{lang}</span>
          <ChevronDown size={11} className="opacity-60 transition-transform duration-fast" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 p-1 rounded-xl shadow-lg border border-sand-200 bg-white/95 backdrop-blur-md">
        <DropdownMenuItem
          onClick={() => setLang("en")}
          className={cn(
            "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
            lang === "en" ? "bg-marigold-50 text-marigold-800 font-semibold" : "text-ink-800 hover:bg-sand-100"
          )}
        >
          <span>English (EN)</span>
          {lang === "en" && <Check size={13} className="text-marigold-700" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLang("hi")}
          className={cn(
            "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
            lang === "hi" ? "bg-marigold-50 text-marigold-800 font-semibold" : "text-ink-800 hover:bg-sand-100"
          )}
        >
          <span>हिन्दी (HI)</span>
          {lang === "hi" && <Check size={13} className="text-marigold-700" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}