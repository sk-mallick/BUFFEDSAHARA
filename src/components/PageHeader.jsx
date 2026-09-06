import Reveal from "../ui/Reveal";

export default function PageHeader({ eyebrow, title, lead, children }) {
  return (
    <section className="border-b border-sand-200 bg-sand-50 pb-16 pt-32 md:pb-20 md:pt-40">
      <div className="shell">
        <Reveal>
          <p className="eyebrow-text">{eyebrow}</p>
        </Reveal>
        <Reveal delay={0.06}>
          <h1 className="mt-3 max-w-3xl text-h1 text-ink-900">{title}</h1>
        </Reveal>
        {lead && (
          <Reveal delay={0.12}>
            <p className="mt-5 max-w-2xl text-body-lg text-ink-700">{lead}</p>
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}