'use client';

import type { ReactNode } from 'react';
import { deltaTone, type Delta } from '../../lib/format';
import { InfoTip } from './InfoTip';

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
  // The card is a div, not a button, so the info icon can be its own button (buttons can't nest).
  // "See details" stretches over the whole card with ::after, so a click anywhere still opens it.
  return (
    <div className="group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition has-[[data-details]:hover]:border-indigo-300 has-[[data-details]:hover]:shadow-md has-[[data-details]:focus-visible]:ring-2 has-[[data-details]:focus-visible]:ring-indigo-400">
      <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-600">
        <span className="flex items-center gap-1">
          {label}
          <InfoTip label={`What counts as ${label.toLowerCase()}?`} text={definition} />
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={onOpen}
            data-details
            aria-label={`${label}: ${value}. See details`}
            className="shrink-0 text-xs font-normal text-indigo-600 opacity-70 after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:opacity-100 focus:outline-none group-hover:opacity-100"
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
    </div>
  );
}
