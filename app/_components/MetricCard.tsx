'use client';

import type { ReactNode } from 'react';
import { InfoIcon } from './InfoIcon';

type Props = {
  label: string;
  value: string;
  muted?: boolean; // value is "Unknown" / "Not yet"
  definition: string;
  extra?: ReactNode;
  onOpen(): void;
  disabled?: boolean;
};

export function MetricCard({ label, value, muted, definition, extra, onOpen, disabled }: Props) {
  // Only "See details" opens the drill-down; the rest of the card is plain content.
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-600">
        {label}
        {!disabled && (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`See details: ${label}`}
            className="-m-1 rounded p-1 text-xs font-normal text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            See details →
          </button>
        )}
      </span>
      <span className={`mt-2 text-4xl font-semibold tabular-nums ${muted ? 'text-slate-400' : 'text-slate-900'}`}>{value}</span>
      {extra && <span className="mt-2 flex flex-col gap-0.5 text-sm text-slate-700">{extra}</span>}
      <span className="mt-auto flex gap-1.5 pt-4 text-xs leading-relaxed text-slate-500">
        <InfoIcon />
        <span>{definition}</span>
      </span>
    </div>
  );
}
