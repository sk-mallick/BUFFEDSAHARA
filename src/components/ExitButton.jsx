import { LogOut } from "lucide-react";
import { useLang } from "../lib/i18n";
import cn from "../lib/cn";

/**
 * Safety escape hatch: instantly redirects to a neutral page and clears
 * local session data. Present on every public page (IA B8).
 */
export default function ExitButton({ className }) {
  const { t } = useLang();
  const handleExit = (e) => {
    e.preventDefault();
    try {
      sessionStorage.clear();
      // Only clear auth/session keys, keep language preferences
      const keysToKeep = ["sahara-lang", "sahara-wellbeing-lang", "sahara-calm-lang"];
      const saved = {};
      for (const k of keysToKeep) {
        const v = localStorage.getItem(k);
        if (v) saved[k] = v;
      }
      localStorage.clear();
      for (const [k, v] of Object.entries(saved)) {
        localStorage.setItem(k, v);
      }
    } catch {
      /* private mode — nothing to clear */
    }
    window.location.replace("https://www.weather.com");
  };

  return (
    <a
      href="https://www.weather.com"
      onClick={handleExit}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-small font-medium text-ink-500 transition-colors duration-fast ease-soft hover:bg-sand-100 hover:text-ink-900",
        className
      )}
      aria-label={`${t("nav.exit")} — opens a neutral page`}
    >
      <LogOut size={15} aria-hidden="true" />
      {t("nav.exit")}
    </a>
  );
}