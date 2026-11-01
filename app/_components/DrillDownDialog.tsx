'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { InfoIcon } from './InfoIcon';

type Props = { open: boolean; title: string; subtitle: string; definition: string; onClose(): void; children: ReactNode };

// Native <dialog>: showModal() gives us the backdrop, focus trapping, Esc to close and focus
// returning to the card that opened it, without a library.
export function DrillDownDialog({ open, title, subtitle, definition, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // click on the backdrop
      aria-labelledby="drill-title"
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-none bg-white p-0 shadow-2xl md:max-w-xl"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 id="drill-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <p className="text-sm text-slate-600">{subtitle}</p>
            <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-slate-500">
              <InfoIcon />
              <span>{definition}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </dialog>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  // Wide tables scroll inside the panel on phones, never the page.
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[28rem] text-left text-sm">{children}</table>
    </div>
  );
}

export const th = 'bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500';
export const td = 'border-t border-slate-100 px-3 py-2 align-top';

export function PanelState({ loading, error, empty }: { loading: boolean; error?: Error; empty: boolean }) {
  if (error) return <p className="text-sm text-rose-700">{error.message}</p>;
  if (loading) return <div className="h-40 animate-pulse rounded-lg bg-slate-100" aria-hidden />;
  if (empty) return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Nothing in this period.</p>;
  return null;
}
