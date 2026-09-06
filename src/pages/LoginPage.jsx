import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Info, Loader2, Lock, LogIn, Mail } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../ui/Button";
import cn from "../lib/cn";
import { PublicOnly } from "../components/auth/Guards";
import { roleHome, useAuth } from "../lib/auth";

// SIH demonstration accounts — fictional, development-only. Documented in
// sahara-backend/seed_auth_accounts.py + README; MUST NOT exist in production.
const DEMO_ACCOUNTS = [
  {
    role: "national_admin",
    label: "National Admin",
    email: "national.demo@sahara-demo.local",
    blurb: "National → State → District monitoring",
  },
  {
    role: "state_admin",
    label: "State Admin",
    email: "state.demo@sahara-demo.local",
    blurb: "Odisha state aggregates",
  },
  {
    role: "district_officer",
    label: "District Officer",
    email: "district.demo@sahara-demo.local",
    blurb: "Odisha · Khordha",
  },
  {
    role: "caseworker",
    label: "Caseworker",
    email: "caseworker.demo@sahara-demo.local",
    blurb: "Caseload incl. DEMO-042",
  },
  {
    role: "beneficiary",
    label: "Beneficiary",
    email: "beneficiary.demo@sahara-demo.local",
    blurb: "P. Kumar — own wellbeing only",
  },
];
const DEMO_PASSWORD = "SIH-Demo-2026!";

function LoginForm({ onDone }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filling, setFilling] = useState(false);

  const submit = async (ev) => {
    ev?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setFilling(false);
    try {
      const user = await login(email.trim(), password);
      onDone?.(user);
      navigate(from && from !== "/login" ? from : roleHome(user.role), { replace: true });
    } catch (err) {
      // Uniform message — never reveals whether an email exists.
      setError("Invalid email or password. Please check your details and try again.");
    } finally {
      setBusy(false);
      setFilling(false);
    }
  };

  const quickLogin = async (acc) => {
    setEmail(acc.email);
    setPassword(DEMO_PASSWORD);
    setError("");
    setFilling(acc.email);
    // Submit immediately with the demo credentials.
    setBusy(true);
    try {
      const user = await login(acc.email, DEMO_PASSWORD);
      onDone?.(user);
      navigate(from && from !== "/login" ? from : roleHome(user.role), { replace: true });
    } catch {
      setError("Demo sign-in failed — is the backend running? (uvicorn main:app)");
      setBusy(false);
      setFilling(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
      {/* Sign-in card */}
      <form onSubmit={submit} className="card self-start" noValidate>
        <div>
          <p className="eyebrow-text">Secure sign-in</p>
          <h2 className="mt-3 text-h3 text-ink-900">Welcome back</h2>
          <p className="mt-2 text-small leading-relaxed text-ink-700">
            Sign in with the account your programme office issued. Passwords never leave this form
            unencrypted, and the server decides what your role may see.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-caption font-medium text-ink-700">
              Email
            </label>
            <div className="relative mt-1.5">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@programme.gov.in"
                className="h-11 w-full rounded-md border border-sand-300 bg-white pl-10 pr-3 text-body text-ink-900 outline-none transition-colors duration-fast placeholder:text-ink-300 focus:border-marigold-600 focus:ring-2 focus:ring-marigold-200"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-caption font-medium text-ink-700">
              Password
            </label>
            <div className="relative mt-1.5">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input
                id="login-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-md border border-sand-300 bg-white pl-10 pr-11 text-body text-ink-900 outline-none transition-colors duration-fast placeholder:text-ink-300 focus:border-marigold-600 focus:ring-2 focus:ring-marigold-200"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-500 transition-colors duration-fast hover:bg-sand-100 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-marigold-600"
              >
                {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-small text-amber-800">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy || !email || !password} className="mt-6 w-full" size="lg">
          {busy || filling ? (
            <>
              <Loader2 size={17} className="animate-spin" aria-hidden="true" /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </Button>

        <p className="mt-4 flex items-start gap-2 text-caption leading-relaxed text-ink-500">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Sign-in failures show one uniform message so nobody can discover which accounts exist.
        </p>
      </form>

      {/* Demo accounts — clearly labelled */}
      <aside aria-label="SIH demonstration accounts" className="self-start rounded-2xl border border-marigold-200 bg-marigold-50 p-6">
        <p className="eyebrow-text text-marigold-800">For the SIH demonstration</p>
        <h2 className="mt-3 text-h4 text-ink-900">Demo accounts</h2>
        <p className="mt-2 text-caption leading-relaxed text-ink-700">
          One fictional account per role. Selecting one signs you in instantly — development-only
          password, never used for real accounts.
        </p>
        <ul className="mt-4 space-y-2.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <li key={acc.email}>
              <button
                type="button"
                disabled={Boolean(busy || filling)}
                onClick={() => quickLogin(acc)}
                className={cn(
                  "group flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600",
                  filling === acc.email
                    ? "border-marigold-300 opacity-70"
                    : "border-sand-200 hover:border-marigold-300 hover:bg-marigold-50/60"
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <LogIn size={14} className="shrink-0 text-marigold-600" aria-hidden="true" />
                    <span className="truncate text-small font-semibold text-ink-900">{acc.label}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-ink-500">
                    {acc.email} · {acc.blurb}
                  </span>
                </span>
                {filling === acc.email ? (
                  <Loader2 size={16} className="shrink-0 animate-spin text-marigold-700" aria-hidden="true" />
                ) : (
                  <ArrowRight size={16} className="shrink-0 text-marigold-400 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-marigold-700" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-caption italic leading-relaxed text-ink-500">
          SIH demonstration account — must not exist in production.
        </p>
      </aside>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PublicOnly>
      <PageHeader
        eyebrow="Sahara portal"
        title="Sign in to your workspace."
        lead="Beneficiaries, caseworkers and administrators each arrive at the view their role is allowed to hold — nothing more, and nothing less."
      />
      <section className="bg-sand-50 pb-24 pt-12">
        <div className="shell">
          <LoginForm />
        </div>
      </section>
    </PublicOnly>
  );
}
