import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogIn, LogOut, Menu, Phone, Shield } from "lucide-react";
import ArchMark from "../components/ArchMark";
import LangSwitcher from "../components/LangSwitcher";
import { useLang } from "../lib/i18n";
import { useAuth, isStaffRole } from "../lib/auth";
import cn from "../lib/cn";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";

const roleLabel = {
  national_admin: "National admin",
  state_admin: "State admin",
  district_officer: "District officer",
  caseworker: "Caseworker",
  beneficiary: "Beneficiary",
};

/**
 * Role-aware sign in/out control. Frontend role checks are UX only — the
 * backend derives identity and scope from the bearer token on every request.
 */
function AuthControl({ className, mobile = false }) {
  const { t } = useLang();
  const { user, status, logout } = useAuth();
  const location = useLocation();

  if (status !== "authed" || !user) {
    if (location.pathname === "/login") return null;
    return (
      <Link
        to="/login"
        className={cn(
          "inline-flex items-center gap-1.5 h-9 rounded-full bg-marigold-600 px-4 text-xs font-semibold text-white shadow-xs transition-colors duration-fast hover:bg-marigold-700 select-none shrink-0",
          mobile && "w-full justify-center h-10",
          className
        )}
      >
        <LogIn size={13} aria-hidden="true" />
        <span>{t("nav.signIn")}</span>
      </Link>
    );
  }
  return (
    <div className={cn("inline-flex items-center gap-2 shrink-0", mobile && "w-full flex-col", className)}>
      {!mobile && (
        <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-sand-200/80 px-2.5 h-9 text-[11px] font-medium text-ink-700">
          <span className="h-1.5 w-1.5 rounded-full bg-sage-600" />
          {user.name ? user.name.split(" ")[0] : roleLabel[user.role] || user.role}
        </span>
      )}
      <button
        type="button"
        onClick={logout}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 rounded-full border border-sand-300/80 bg-white/90 px-3 text-xs font-semibold text-ink-700 shadow-xs transition-colors duration-fast hover:border-red-300 hover:bg-red-50/80 hover:text-red-700 select-none",
          mobile && "w-full justify-center h-10"
        )}
        title={`${t("nav.signOut")} — ${roleLabel[user.role] || user.role}`}
      >
        <LogOut size={13} aria-hidden="true" />
        <span>{t("nav.signOut")}</span>
      </button>
    </div>
  );
}

const navLinks = [
  { to: "/", labelKey: "nav.home", end: true },
  { to: "/how-it-works", labelKey: "nav.how" },
  { to: "/for-victims", labelKey: "nav.victims" },
  { to: "/for-officials", labelKey: "nav.officials" },
  { to: "/resources", labelKey: "nav.resources" },
  { to: "/contact", labelKey: "nav.contact" },
];

function Wordmark() {
  return (
    <div className="group inline-flex items-center gap-2.5 select-none">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-marigold-500 to-marigold-700 text-white shadow-xs transition-shadow duration-200 group-hover:shadow-sm shrink-0">
        <ArchMark size={20} strokeWidth={3.5} className="text-white" />
      </span>
      <span className="flex flex-col text-left">
        <span className="font-display text-lg font-bold leading-tight tracking-tight text-ink-900 flex items-baseline gap-1">
          Sahara <span className="text-xs font-semibold text-marigold-700 font-sans">सहारा</span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 leading-none">
          Support System
        </span>
      </span>
    </div>
  );
}

function HelplinePill({ className, showLabel = false }) {
  const { t } = useLang();
  return (
    <a
      href="tel:14566"
      className={cn(
        "group inline-flex items-center gap-2 h-9 rounded-full border border-amber-300/80 bg-amber-50/90 px-3 text-xs font-semibold text-amber-900 shadow-xs transition-colors duration-fast hover:border-amber-400 hover:bg-amber-100/90 select-none shrink-0",
        className
      )}
      aria-label="National Helpline 14566"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white shadow-xs shrink-0">
        <Phone size={10} aria-hidden="true" />
      </span>
      <span className={cn("hidden xl:inline", showLabel && "inline")}>{t("nav.helpline")}</span>
      <span className="font-mono text-[11px] font-bold text-amber-950 bg-amber-200/80 rounded-full px-2 py-0.5 shadow-2xs">
        14566
      </span>
    </a>
  );
}

export default function NavBar() {
  const { t } = useLang();
  const { user, status } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Conditional nav links for logged-in users
  const loggedinLinks = (() => {
    if (status !== "authed" || !user) return [];
    if (user.role === "beneficiary") {
      return [
        { to: "/beneficiary", labelKey: "nav.mySpace" },
        { to: "/talk", labelKey: "nav.talkToSahara" },
      ];
    }
    if (isStaffRole(user.role)) {
      const dashLink = user.role === "caseworker" ? "/caseworker" : "/command";
      return [{ to: dashLink, labelKey: "nav.dashboard" }];
    }
    return [];
  })();

  const overHero = !scrolled && !open && location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-nav transition-all duration-300",
        scrolled || open
          ? "border-b border-sand-200/80 bg-sand-50/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl"
          : overHero
            ? "border-b border-sand-200/40 bg-sand-50/60 shadow-xs backdrop-blur-lg"
            : "border-b border-sand-200/50 bg-sand-50/80 backdrop-blur-md"
      )}
    >
      <div className="shell">
        <div className="flex h-16 md:h-[72px] items-center justify-between gap-3 lg:gap-4">
          <Link to="/" aria-label="Sahara — home" className="shrink-0">
            <Wordmark />
          </Link>

          {/* Desktop Nav: Encapsulated Floating Island Pill */}
          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-0.5 rounded-full border border-sand-300/70 bg-white/85 p-1 shadow-xs backdrop-blur-md"
          >
            {loggedinLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center justify-center h-8 px-3 rounded-full text-xs font-semibold transition-all duration-fast leading-none select-none",
                    isActive
                      ? "bg-marigold-600 text-white shadow-xs"
                      : "text-marigold-800 bg-marigold-50 hover:bg-marigold-100"
                  )
                }
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center justify-center h-8 px-3 rounded-full text-xs font-medium transition-all duration-fast leading-none select-none",
                    isActive
                      ? "bg-ink-900 text-white font-semibold shadow-xs"
                      : "text-ink-700 hover:text-ink-950 hover:bg-sand-200/50"
                  )
                }
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
          </nav>

          {/* Action Bar */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <HelplinePill className="hidden md:inline-flex" />
            <AuthControl className="hidden lg:inline-flex" />
            <LangSwitcher className="hidden sm:inline-flex" />

            {/* Mobile / Tablet Sheet Trigger */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label={open ? "Close navigation menu" : "Open navigation menu"}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-sand-300 bg-white/70 text-ink-900 transition-colors duration-fast ease-soft hover:bg-sand-100 lg:hidden shadow-sm"
                >
                  <Menu size={20} aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col justify-between overflow-y-auto w-full sm:w-[380px]">
                <div>
                  <SheetHeader className="pb-6 border-b border-sand-200">
                    <SheetTitle>
                      <Wordmark />
                    </SheetTitle>
                    {user && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-sand-100 px-3 py-1 text-xs text-ink-700">
                        <Shield size={12} className="text-marigold-600" />
                        <span>Signed in as <strong className="font-semibold">{roleLabel[user.role] || user.role}</strong></span>
                      </div>
                    )}
                  </SheetHeader>

                  <nav aria-label="Mobile Navigation" className="mt-6 flex flex-col space-y-1">
                    {loggedinLinks.length > 0 && (
                      <div className="mb-4 pb-3 border-b border-sand-200">
                        <span className="text-xs font-semibold uppercase tracking-wider text-marigold-600 px-3">
                          Active Workspace
                        </span>
                        <div className="mt-2 space-y-1">
                          {loggedinLinks.map((link) => (
                            <NavLink
                              key={link.to}
                              to={link.to}
                              onClick={() => setOpen(false)}
                              className={({ isActive }) =>
                                cn(
                                  "flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                                  isActive
                                    ? "bg-marigold-50 text-marigold-800 font-semibold"
                                    : "text-ink-900 hover:bg-sand-100"
                                )
                              }
                            >
                              {t(link.labelKey)}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 px-3 pb-1">
                      Menu
                    </span>
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                            isActive
                              ? "bg-sand-100 text-marigold-700 font-semibold"
                              : "text-ink-700 hover:bg-sand-100 hover:text-ink-900"
                          )
                        }
                      >
                        {t(link.labelKey)}
                      </NavLink>
                    ))}
                  </nav>
                </div>

                <div className="mt-8 space-y-4 border-t border-sand-200 pt-6">
                  <div className="flex flex-col gap-2.5">
                    <HelplinePill showLabel className="w-full justify-center h-10" />
                    <AuthControl mobile />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <LangSwitcher />
                    <span className="text-xs text-ink-500">SIH 2026 · MSJE</span>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}