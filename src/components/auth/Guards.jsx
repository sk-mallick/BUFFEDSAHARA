import { Navigate, useLocation } from "react-router-dom";
import { useAuth, roleHome } from "../../lib/auth";
import PageSkeleton from "../../ui/PageSkeleton";

/**
 * Route guard. `roles` limits who may render the wrapped content.
 * NOTE: this is navigation UX ONLY. The backend independently derives the
 * caller's identity and scope from the bearer token on every request, so
 * removing or editing this guard can never widen real access.
 */
export default function Guard({ roles, children }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "restoring") {
    return <PageSkeleton />;
  }
  if (status !== "authed" || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

/** Redirects an already-authenticated visitor away from /login. */
export function PublicOnly({ children }) {
  const { user, status } = useAuth();
  if (status === "restoring") return <PageSkeleton />;
  if (status === "authed" && user) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return children;
}
