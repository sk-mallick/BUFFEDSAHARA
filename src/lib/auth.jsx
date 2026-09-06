import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, onUnauthorized, setToken } from "./api";

// ---------------------------------------------------------------------------
// Auth state for the React app. Tokens live in sessionStorage (cleared when
// the tab closes) and are attached to every API call by src/lib/api.js.
//
// SECURITY NOTE: the frontend uses the role ONLY to shape navigation UI.
// Every permission check happens server-side — deleting a guard or editing
// this file can never widen access, because the API derives identity and
// scope from the token itself.
// ---------------------------------------------------------------------------

const TOKEN_KEY = "sahara.access_token";
const USER_KEY = "sahara.user";
const AuthContext = createContext(null);

/** Where each role lands after sign-in (drives redirects + portal links). */
export const roleHome = (role) => {
  switch (role) {
    case "national_admin":
    case "state_admin":
    case "district_officer":
      return "/command";
    case "caseworker":
      return "/caseworker";
    case "beneficiary":
      return "/beneficiary";
    default:
      return "/";
  }
};

export const isStaffRole = (role) =>
  ["national_admin", "state_admin", "district_officer", "caseworker"].includes(role);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState(() => (token ? "restoring" : "anon"));

  const clearSession = useCallback(() => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable — nothing to clear */
    }
    setToken(null);
    setTokenState(null);
    setUser(null);
    setStatus("anon");
  }, []);

  const applySession = useCallback((tok, usr) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, tok);
      sessionStorage.setItem(USER_KEY, JSON.stringify(usr));
    } catch {
      /* non-persistent session is fine for a demo */
    }
    setToken(tok);
    setTokenState(tok);
    setUser(usr);
    setStatus("authed");
  }, []);

  // Restore a session on first paint: refresh /me from the token.
  useEffect(() => {
    onUnauthorized(clearSession);
    setToken(token);
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { user: me } = await apiFetch("/api/auth/me", { auth: true });
        if (!cancelled) applySession(token, me);
      } catch {
        if (!cancelled) clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      applySession(data.access_token, data.user);
      return data.user;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", auth: true });
    } catch {
      /* token may already be invalid — always clear locally */
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, status, login, logout, isStaff: isStaffRole(user?.role) }),
    [user, status, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
