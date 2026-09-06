import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogIn, LogOut, Menu, Phone, X } from "lucide-react";
import ArchMark from "../components/ArchMark";
import LangSwitcher from "../components/LangSwitcher";
import ExitButton from "../components/ExitButton";
import { useLang } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import cn from "../lib/cn";

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
    // Hide the sign-in link while already on the login page.
    if (location.pathname === "/login") return null;
    return (
      <Link
        to="/login"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-white/70 py-1.5 pl-3 pr-4 text-small font-medium text-ink-700 transition-colors duration-fast ease-soft hover:border-marigold-300 hover:bg-white hover:text-marigold-800",
          mobile && "self-start",
          className
        )}
      >
        <LogIn size={14} aria-hidden="true" />
        {t("nav.signIn")}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={logout}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-white/70 py-1.5 pl-3 pr-4 text-small font-medium text-ink-700 transition-colors duration-fast ease-soft hover:border-amber-300 hover:bg-white hover:text-amber-800",
        mobile && "self-start",
        className
      )}
      title={`${t("nav.signOut")} — ${roleLabel[user.role] || user.role}`}
    >
      <LogOut size={14} aria-hidden="true" />
      {t("nav.signOut")}
    </button>
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
    <span className="inline-flex items-center gap-2.5">
      <ArchMark size={30} className="text-marigold-600" />
      <span className="font-display text-xl font-semibold tracking-tight text-ink-900">
        Sahara <span className="text-marigold-600">सहारा</span>
      </span>
    </span>
  );
}

function HelplinePill({ className }) {
  const { t } = useLang();
  return (
    <a
      href="tel:14566"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 py-1.5 pl-3 pr-4 text-small font-medium text-amber-700 transition-colors duration-fast ease-soft hover:border-amber-300 hover:bg-amber-100",
        className
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white">
        <Phone size={11} aria-hidden="true" />
      </span>
      {t("nav.helpline")}
    </a>
  );
}

export default function NavBar() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const reduce = useReducedMotion();

  // Over the cinematic hero (home, top of page) the transparent nav sits on a
  // bright sky — inactive links need full ink + a soft halo to stay legible.
  const overHero = !scrolled && !open && location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation; lock body scroll while open.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-nav transition-all duration-base ease-soft",
        scrolled || open
          ? "border-b border-sand-200 bg-sand-50/95 shadow-1 backdrop-blur-md"
          : overHero
            ? "border-b border-transparent bg-[linear-gradient(to_bottom,rgba(250,246,238,0.66),rgba(250,246,238,0.34)_58%,transparent)] backdrop-blur-[7px]"
            : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="shell">
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          <Link to="/" aria-label="Sahara — home" className="shrink-0">
            <Wordmark />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    "relative py-2 text-small font-medium transition-colors duration-fast ease-soft after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:rounded-full after:bg-marigold-600 after:transition-all after:duration-fast after:ease-soft",
                    isActive
                      ? "text-ink-900 after:w-full"
                      : cn(
                          overHero
                            ? "text-ink-900 [text-shadow:0_1px_12px_rgba(255,241,219,0.55),0_0_2px_rgba(255,241,219,0.6)]"
                            : "text-ink-500",
                          "hover:text-ink-900 after:w-0 hover:after:w-full"
                        )
                  )
                }
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <HelplinePill className="hidden md:inline-flex" />
            <AuthControl className="hidden lg:inline-flex" />
            <LangSwitcher className="hidden lg:inline-flex" />
            <ExitButton className="hidden lg:inline-flex" />
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-11 w-11 items-center justify-center rounded-md text-ink-900 transition-colors duration-fast ease-soft hover:bg-sand-100 lg:hidden"
            >
              {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.45, 0, 0.25, 1] }}
            className="fixed inset-0 top-16 z-drawer flex flex-col overflow-y-auto bg-sand-50 md:top-20 lg:hidden"
          >
            <nav aria-label="Mobile" className="shell flex flex-1 flex-col py-8">
              <ul className="space-y-1">
                {navLinks.map((link, i) => (
                  <motion.li
                    key={link.to}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                  >
                    <NavLink
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        cn(
                          "block border-b border-sand-200 py-4 font-display text-3xl font-medium transition-colors duration-fast ease-soft",
                          isActive ? "text-marigold-600" : "text-ink-900"
                        )
                      }
                    >
                      {t(link.labelKey)}
                    </NavLink>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.36, delay: 0.3 }}
                className="mt-auto flex flex-col gap-5 pb-4 pt-10"
              >
                <HelplinePill className="self-start" />
                <AuthControl mobile />
                <div className="flex items-center justify-between gap-4">
                  <LangSwitcher />
                  <ExitButton />
                </div>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}