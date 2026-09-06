import cn from "../lib/cn";
import Reveal from "./Reveal";

const tones = {
  sand: "bg-sand-50",
  white: "bg-white",
  field: "bg-sand-100",
};

export default function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className,
  tone = "sand",
  align = "left",
}) {
  const hasHeader = Boolean(eyebrow || title || lead);
  return (
    <section id={id} className={cn(tones[tone], "py-20 md:py-24", className)}>
      <div className="shell">
        {hasHeader && (
          <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
            {eyebrow && (
              <Reveal>
                <p className="eyebrow-text">{eyebrow}</p>
              </Reveal>
            )}
            {title && (
              <Reveal delay={0.06}>
                <h2 className="mt-3 text-h2 text-ink-900">{title}</h2>
              </Reveal>
            )}
            {lead && (
              <Reveal delay={0.12}>
                <p className="mt-4 text-body-lg text-ink-700">{lead}</p>
              </Reveal>
            )}
          </div>
        )}
        <div className={cn(hasHeader && "mt-10 md:mt-12")}>{children}</div>
      </div>
    </section>
  );
}