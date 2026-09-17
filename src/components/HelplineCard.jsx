import { Clock, ExternalLink, Languages, MapPin, Phone } from "lucide-react";

export default function HelplineCard({ item }) {
  const { name, number, hours, languages, state, note, org, href } = item;
  return (
    <article className="card card-lift flex h-full flex-col rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-h4 font-medium text-ink-900">{name}</h3>
        {org && <span className="badge-neutral shrink-0">{org}</span>}
      </div>

      {number ? (
        <a
          href={`tel:${number}`}
          className="group mt-4 inline-flex w-full items-center justify-between rounded-xl border border-sand-200 bg-sand-50/80 px-3.5 py-2.5 transition-all duration-fast hover:border-marigold-300 hover:bg-marigold-50/50 hover:shadow-xs"
          aria-label={`Call ${name} on ${number}`}
        >
          <span className="font-mono text-2xl font-semibold tracking-wide text-ink-900 transition-colors duration-fast group-hover:text-marigold-700">
            {number}
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-marigold-600 shadow-xs transition-colors duration-fast group-hover:bg-marigold-600 group-hover:text-white">
            <Phone size={15} aria-hidden="true" />
          </span>
        </a>
      ) : null}

      {note && <p className="mt-3 text-small leading-relaxed text-ink-700">{note}</p>}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-caption text-ink-500">
        {hours && (
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} aria-hidden="true" className="shrink-0 text-ink-400" />
            {hours}
          </span>
        )}
        {languages && (
          <span className="inline-flex items-center gap-1.5">
            <Languages size={13} aria-hidden="true" className="shrink-0 text-ink-400" />
            {languages}
          </span>
        )}
        {state && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} aria-hidden="true" className="shrink-0 text-ink-400" />
            {state}
          </span>
        )}
      </div>

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex items-center gap-1.5 pt-4 text-small font-medium text-marigold-600 underline-offset-4 transition-colors hover:text-marigold-700 hover:underline"
        >
          Visit official site
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}