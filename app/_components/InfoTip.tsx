'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Props = { label: string; text: string; align?: 'start' | 'end' };

/**
 * A circled "i" that reveals a short explanation. Opens on hover and keyboard focus, toggles on
 * click/tap (phones have no hover), closes on Esc, on blur, or on a tap elsewhere.
 */
export function InfoTip({ label, text, align = 'start' }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const id = useId();
  // Hover and focus both open the tip before the click lands, so a click must not simply toggle:
  // a mouse click keeps it open, a tap closes it only if it was already open when the tap began.
  const press = useRef<{ type: string; wasOpen: boolean } | null>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  return (
    <span
      ref={wrap}
      className="relative z-10 inline-flex"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerDown={(e) => (press.current = { type: e.pointerType, wasOpen: open })}
        onClick={(e) => {
          e.stopPropagation(); // never also open the card's details
          const p = press.current;
          press.current = null;
          if (!p) setOpen((o) => !o); // keyboard Enter/Space
          else setOpen(p.type === 'mouse' ? true : !p.wasOpen);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.preventDefault(); // inside the drill-down, Esc closes the tip, not the panel
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className="rounded-full p-0.5 text-slate-400 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 aria-expanded:text-indigo-600"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 9v5" strokeLinecap="round" />
          <circle cx="10" cy="6.25" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute top-full z-20 mt-1.5 w-64 max-w-[calc(100vw-3rem)] rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-normal leading-relaxed text-slate-600 shadow-lg ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
