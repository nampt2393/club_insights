/** Circled "i" that marks a definition. Decorative; screen readers hear "Definition:" instead. */
export function InfoIcon() {
  return (
    <>
      <svg viewBox="0 0 20 20" className="mt-px h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 9v5" strokeLinecap="round" />
        <circle cx="10" cy="6.25" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      <span className="sr-only">Definition: </span>
    </>
  );
}
