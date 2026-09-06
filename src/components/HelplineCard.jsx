import { Clock, ExternalLink, Languages, MapPin, Phone } from "lucide-react";

export default function HelplineCard({ item }) {
  const { name, number, hours, languages, state, note, org, href } = item;
  return (
    <article className="card card-lift flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-h4 text-ink-900">{name}</h3>
        {org && <span className="badge-neutral shrink-0">{org}</span>}
      </div>

      {number ? (
        <a
          href={`tel:${number}`}
          className="mt-4 inline-flex w-fit items-baseline gap-2 rounded-md group"
          aria-label={`Call ${name} on ${number}`}
        >
          <span className="font-mono text-3xl font-medium tracking-wide text-ink-900 transition-colors duration-fast ease-soft group-hover:text-marigold-600">
            {number}
          </span>
          <Phone size={17} className="translate-y-0.5 text-marigold-600" aria-hidden="true" />
        </a>
      ) : null}

      {note && <p className="mt-3 text-small text-ink-700">{note}</p>}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-caption text-ink-500">
        {hours && (
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} aria-hidden="true" />
            {hours}
          </span>
        )}
        {languages && (
          <span className="inline-flex items-center gap-1.5">
            <Languages size={13} aria-hidden="true" />
            {languages}
          </span>
        )}
        {state && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} aria-hidden="true" />
            {state}
          </span>
        )}
      </div>

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="underline-draw mt-auto inline-flex items-center gap-1.5 pt-4 text-small font-medium text-marigold-600 hover:text-marigold-700"
        >
          Visit official site
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}