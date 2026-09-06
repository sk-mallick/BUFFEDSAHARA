import { useState } from "react";
import cn from "../lib/cn";

/** Image with a quiet fallback: if the photo fails, a sand field + arch mark. */
export default function Img({ src, alt, className, eager = false, ...rest }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("flex items-center justify-center border border-sand-200 bg-sand-100", className)}
      >
        <svg width="44" height="44" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <path d="M10 46 V26 C10 14 24 7 28 7 C32 7 46 14 46 26 V46" stroke="var(--color-sand-400)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M10 46 H46" stroke="var(--color-sand-400)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      loading={eager ? "eager" : "lazy"}
      fetchpriority={eager ? "high" : "auto"}
      decoding="async"
      className={className}
      {...rest}
    />
  );
}