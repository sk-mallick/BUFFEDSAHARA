import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../ui/Button";
import { roleHome, useAuth } from "../lib/auth";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        eyebrow="Access restricted"
        title="This view isn't part of your role."
        lead={
          user
            ? `You are signed in as ${user.name || user.user_id} (${user.role.replace("_", " ")}). ` +
              "The administrative hierarchy keeps national, state, district and case-level views separate — " +
              "the server enforced this when the page asked for data."
            : "Sign in with a role that can view this page."
        }
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button to={roleHome(user?.role) || "/"} variant="secondary">
            Go to your portal
          </Button>
          <Link
            to="/"
            className="underline-draw inline-flex items-center gap-1.5 px-2 py-2 text-small font-medium text-ink-700"
          >
            Back to the public site
          </Link>
        </div>
      </PageHeader>
      <section className="bg-sand-50 pb-24 pt-10">
        <div className="shell">
          <div className="card max-w-2xl border-t-4 border-t-amber-400">
            <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-amber-800">
              <ShieldAlert size={15} aria-hidden="true" />
              Why you saw this
            </p>
            <p className="mt-3 text-small leading-relaxed text-ink-700">
              Sahara scopes every request on the server: caseworkers reach only their assigned cases,
              district officers only their district, and so on up the hierarchy. This page was refused
              because your authenticated role is not allowed there — and editing the address bar (or a
              role label in the frontend) cannot change that.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
