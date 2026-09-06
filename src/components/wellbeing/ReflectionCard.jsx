import { useCallback, useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Loader2, LockKeyhole, PenLine } from "lucide-react";
import { wellbeingApi } from "../../lib/api";

/**
 * Private reflection — the beneficiary's own words, stored owner-only on
 * the backend (POST/GET /api/wellbeing/reflections). The backend has no
 * staff/admin read path for these, and this card says so plainly.
 */
export default function ReflectionCard({ lang, say, refreshKey, onSave }) {
  const [text, setText] = useState("");
  const [list, setList] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const rows = await wellbeingApi.getReflections();
      setList(rows || []);
    } catch (err) {
      setError(err.message || say("error"));
      setList([]);
    }
  }, [say]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const submit = async () => {
    if (!text.trim() || saving) {
      if (!text.trim()) setError(say("reflectionEmpty"));
      return;
    }
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await onSave(text.trim());
      setText("");
      setSaved(true);
      setList(null); // show loading while the fresh list loads
      await load();
    } catch (err) {
      setError(err.message || say("reflectionError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label={say("reflectionTitle")} className="rounded-2xl border border-sand-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-h4 font-semibold text-ink-900">
        <BookOpen size={17} strokeWidth={1.5} className="text-sage-600" aria-hidden="true" />
        {say("reflectionTitle")}
      </h3>

      <p className="mt-3 flex items-start gap-2 rounded-xl border border-sage-200 bg-sage-50 px-3.5 py-3 text-caption leading-relaxed text-ink-800">
        <LockKeyhole size={14} className="mt-0.5 shrink-0 text-sage-700" aria-hidden="true" />
        <span>
          <span className="font-semibold text-sage-800">
            {lang === "hi" ? "केवल आपके लिए · " : lang === "or" ? "କେବଳ ଆପଣଙ୍କ ପାଇଁ · " : "Only for you · "}
          </span>
          {say("reflectionPrivacy")}
        </span>
      </p>

      <div className="mt-4">
        <label htmlFor="wb-reflection" className="sr-only">
          {say("reflectionPlaceholder")}
        </label>
        <textarea
          id="wb-reflection"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          rows={4}
          maxLength={2000}
          placeholder={say("reflectionPlaceholder")}
          className="w-full rounded-md border border-sand-300 bg-white px-3.5 py-2.5 text-[0.9375rem] text-ink-900 placeholder:text-ink-400 focus:border-marigold-500 focus:outline-none focus:ring-2 focus:ring-marigold-500/30"
        />
        {error && (
          <p role="alert" className="mt-2 text-caption font-medium text-amber-800">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-marigold-600 px-5 py-2.5 text-small font-semibold text-white transition-colors duration-fast ease-soft hover:bg-marigold-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <PenLine size={15} aria-hidden="true" />
            )}
            {say("reflectionSave")}
          </button>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-small font-medium text-sage-800">
              <CheckCircle2 size={15} aria-hidden="true" /> {say("reflectionSaved")}
            </span>
          )}
        </div>
      </div>

      {/* Recent reflections (owner's own, newest first) */}
      <div className="mt-5 border-t border-sand-100 pt-4">
        <p className="text-caption font-medium uppercase tracking-wider text-ink-500">
          {say("reflectionRecent")}
        </p>
        {list === null && (
          <p className="mt-3 inline-flex items-center gap-2 text-small text-ink-500">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> {say("loading")}
          </p>
        )}
        {list !== null && list.length === 0 && (
          <p className="mt-3 text-small text-ink-600">{say("reflectionNone")}</p>
        )}
        {list && list.length > 0 && (
          <>
            <ul className="mt-3 space-y-2.5">
              {list.slice(0, 4).map((r) => (
                <li key={r.reflection_id} className="rounded-lg bg-sand-50 px-3.5 py-2.5 ring-1 ring-sand-200">
                  <p className="whitespace-pre-wrap break-words text-small leading-relaxed text-ink-800">
                    {r.text}
                  </p>
                  <p className="mt-1.5 text-caption text-ink-400">
                    {new Date(r.created_at).toLocaleDateString(lang === "en" ? undefined : lang, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-caption text-ink-500">
              {list.length}{lang === "hi" ? " निजी विचार रखे गए" : lang === "or" ? "ଗୋପନୀୟ ଭାବନା ରଖାଯାଇଛି" : ` reflection${list.length === 1 ? "" : "s"} kept privately`}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
