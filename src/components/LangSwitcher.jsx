import { Languages } from "lucide-react";
import { useLang } from "../lib/i18n";
import cn from "../lib/cn";

export default function LangSwitcher({ dark = false, className }) {
  const { lang, setLang } = useLang();

  return (
    <label className={cn("inline-flex items-center gap-2", className)}>
      <Languages
        size={16}
        aria-hidden="true"
        className={cn("shrink-0", dark ? "text-sand-300" : "text-ink-500")}
      />
      <span className="sr-only">Choose language</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className={cn(
          "cursor-pointer appearance-none rounded-md border px-2.5 py-1.5 pr-7 text-small font-medium focus-visible:outline-2 focus-visible:outline-offset-2",
          dark
            ? "border-white/20 bg-transparent text-sand-100 focus-visible:outline-marigold-300"
            : "border-sand-200 bg-white text-ink-700 focus-visible:outline-marigold-600"
        )}
      >
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
        <option value="mr" disabled>
          मराठी · coming soon
        </option>
      </select>
    </label>
  );
}