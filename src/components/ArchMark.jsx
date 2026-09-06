/** The signature: a single-stroke shelter doorway. Color via `currentColor`. */
export default function ArchMark({ size = 32, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true" className={className}>
      <path d="M10 46 V26 C10 14 24 7 28 7 C32 7 46 14 46 26 V46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 46 H46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}