'use client';

import type { ReactNode } from 'react';
import { deltaTone, type Delta } from '../../lib/format';
import { InfoIcon } from './InfoIcon';

type Props = {
  label: string;
  value: string;
  muted?: boolean; // value is "Unknown" / "Not yet"
  delta?: Delta;
  goodWhen: 'up' | 'down';
  comparable?: boolean; // false → change shown in neutral grey, not good/bad colours
  deltaNote?: string;
  definition: string;
  extra?: ReactNode;
  onOpen(): void;
  disabled?: boolean;
};

const TONE = { good: 'bg-emerald-50 text-emerald-700', bad: 'bg-rose-50 text-rose-700', neutral: 'bg-slate-100 text-slate-600' };

export function MetricCard({ label, value, muted, delta, goodWhen, comparable = true, deltaNote, definition, extra, onOpen, disabled }: Props) {
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
      <span className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-4xl font-semibold tabular-nums ${muted ? 'text-slate-400' : 'text-slate-900'}`}>{value}</span>
        {delta && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${TONE[deltaTone(delta.direction, goodWhen, comparable)]}`}>
            {delta.text}
            {delta.direction !== 'none' && <span className="sr-only"> vs previous period</span>}
          </span>
        )}
      </span>
      {delta && deltaNote && <span className="mt-1 text-xs text-slate-500">{deltaNote}</span>}
      {extra && <span className="mt-2 flex flex-col gap-0.5 text-sm text-slate-700">{extra}</span>}
      <span className="mt-auto flex gap-1.5 pt-4 text-xs leading-relaxed text-slate-500">
        <InfoIcon />
        <span>{definition}</span>
      </span>
    </div>
  );
}
