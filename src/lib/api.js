// ============================================================================
// API client — the ONE place the Sahara backend is called from.
// Attaches the bearer token from the auth layer; never trusts the token
// for authorisation (the backend is the security boundary) — this module
// only exists so requests carry the session and errors surface cleanly.
// ============================================================================

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

let _token = null;
let _onUnauthorized = null;

export const apiBase = API_BASE;
export const setToken = (token) => {
  _token = token;
};
export const getToken = () => _token;
export const onUnauthorized = (fn) => {
  _onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(status, detail, url) {
    super(detail || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && _token) headers.Authorization = `Bearer ${_token}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    // Network failure — friendly, never technical.
    throw new ApiError(0, "Could not reach the Sahara service. Please try again shortly.", path);
  }
  if (res.status === 401 && auth) {
    if (_onUnauthorized) _onUnauthorized();
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail =
      (data && (data.detail || (Array.isArray(data.detail) ? data.detail[0]?.msg : null))) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail), path);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Administrative monitoring hierarchy (national / state / district). Every
// endpoint returns AGGREGATES only — the backend scopes each response to the
// authenticated account's role and never returns private case content.
// ---------------------------------------------------------------------------
export const adminApi = {
  getNationalSummary: () => apiFetch("/api/admin/national/summary"),
  getStates: () => apiFetch("/api/admin/states"),
  getStateSummary: (state) =>
    apiFetch(`/api/admin/states/${encodeURIComponent(state)}/summary`),
  getStateDistricts: (state) =>
    apiFetch(`/api/admin/states/${encodeURIComponent(state)}/districts`),
  getDistrictSummary: (district, state) =>
    apiFetch(
      `/api/admin/districts/${encodeURIComponent(district)}/summary` +
        (state ? `?state=${encodeURIComponent(state)}` : "")
    ),
  getDistrictCaseworkers: (district, state) =>
    apiFetch(
      `/api/admin/districts/${encodeURIComponent(district)}/caseworkers` +
        (state ? `?state=${encodeURIComponent(state)}` : "")
    ),
  getAdminTrends: ({ days = 30, state, district } = {}) => {
    const params = new URLSearchParams({ days: String(days) });
    if (state) params.set("state", state);
    if (district) params.set("district", district);
    return apiFetch(`/api/admin/trends?${params.toString()}`);
  },
};

// ---------------------------------------------------------------------------
// Beneficiary wellbeing space (STEP 1 backend). Every call is owner-bound:
// identity comes from the bearer token — there is no user_id anywhere.
// ---------------------------------------------------------------------------
export const wellbeingApi = {
  getPlan: () => apiFetch("/api/wellbeing/plan"),
  getProgress: () => apiFetch("/api/wellbeing/progress"),
  completeActivity: (activityId) =>
    apiFetch(`/api/wellbeing/activities/${encodeURIComponent(activityId)}/complete`, {
      method: "POST",
    }),
  getReflections: () => apiFetch("/api/wellbeing/reflections"),
  saveReflection: (text) =>
    apiFetch("/api/wellbeing/reflections", { method: "POST", body: { text } }),
  requestSupport: () => apiFetch("/api/wellbeing/support-request", { method: "POST" }),
  getSupportStatus: () => apiFetch("/api/wellbeing/support-status"),
};
