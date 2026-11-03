'use client';

import type { ReactNode } from 'react';
import { InfoIcon } from './InfoIcon';

/** The three numbers as one list: title and definition on the left, value and "See details" on the right. */
export function MetricList({ children, dimmed }: { children: ReactNode; dimmed?: boolean }) {
  return (
    <section
      aria-label="Key numbers"
      className={`divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-card transition-opacity ${dimmed ? 'opacity-70' : ''}`}
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
    <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-gray-800">{label}</h3>
        <p className="mt-0.5 flex gap-1.5 text-xs leading-relaxed text-gray-500">
          <InfoIcon />
          <span>{definition}</span>
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="sm:text-right">
          <p className={`text-4xl font-black tabular-nums ${muted ? 'text-gray-300' : 'text-gray-800'}`}>{value}</p>
          {note && <p className="text-xs text-gray-500">{note}</p>}
        </div>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`See details: ${label}`}
            className="shrink-0 rounded-full border-2 border-transparent bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            See details →
          </button>
        )}
      </div>
    </div>
  );
}

export function MetricListSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-card" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-3">
          <div className="flex-1">
            <div className="h-3 w-28 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-2/3 rounded bg-gray-100" />
          </div>
          <div className="h-8 w-14 rounded bg-gray-200" />
          <div className="h-9 w-32 rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
