'use client';

import type { ReactNode } from 'react';

/** The three numbers as one list: title and definition on the left, value and "See details" on the right. */
export function MetricList({ children, dimmed }: { children: ReactNode; dimmed?: boolean }) {
  return (
    <section
      aria-label="Key numbers"
      className={`divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm transition-opacity ${dimmed ? 'opacity-70' : ''}`}
    >
      {children}
    </section>
  );
}

type RowProps = {
  label: string;
  definition: string;
  value: string;
  muted?: boolean; // value is "Unknown" / "Not yet"
  note?: ReactNode; // small line under the value
  onOpen?: () => void; // omitted → no details to show
};

export function MetricRow({ label, definition, value, muted, note, onOpen }: RowProps) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{definition}</p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="sm:text-right">
          <p className={`text-3xl font-semibold tabular-nums ${muted ? 'text-slate-400' : 'text-slate-900'}`}>{value}</p>
          {note && <p className="text-xs text-slate-500">{note}</p>}
        </div>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`See details: ${label}`}
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            See details →
          </button>
        ) : (
          // keeps values aligned with rows that have a button
          <span className="hidden w-[7.5rem] shrink-0 sm:block" aria-hidden />
        )}
      </div>
    </div>
  );
}

export function MetricListSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-6 p-5">
          <div className="flex-1">
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
          </div>
          <div className="h-8 w-14 rounded bg-slate-200" />
          <div className="h-8 w-28 rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
