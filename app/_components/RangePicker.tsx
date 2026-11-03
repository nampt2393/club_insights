'use client';

import { useState } from 'react';
import type { Preset } from '../../lib/ranges';
import type { DateRange, LocalDate } from '../../lib/time';

type Props = {
  range: DateRange;
  presets: Preset[];
  today: LocalDate;
  disabled?: boolean;
  onChange(range: DateRange): void;
};

const inputClass =
  'rounded-full border-2 border-gray-100 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400';

export function RangePicker({ range, presets, today, disabled, onChange }: Props) {
  // Local copies so a half-typed date doesn't fire a request; apply only when the pair is valid.
  // The parent keys this component by range, so it starts fresh whenever the range changes.
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const active = presets.find((p) => p.range.from === range.from && p.range.to === range.to);
  const invalid = from && to && from > to;

  function apply(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    if (nextFrom && nextTo && nextFrom <= nextTo && nextTo <= today) onChange({ from: nextFrom, to: nextTo });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-gray-400">
          Period
          <select
            className={inputClass}
            disabled={disabled}
            value={active?.id ?? 'custom'}
            onChange={(e) => {
              const p = presets.find((x) => x.id === e.target.value);
              if (p) onChange(p.range);
            }}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom" disabled>
              Custom
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-gray-400">
          From
          <input type="date" className={inputClass} disabled={disabled} value={from} max={today} onChange={(e) => apply(e.target.value, to)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-gray-400">
          To
          <input type="date" className={inputClass} disabled={disabled} value={to} max={today} onChange={(e) => apply(from, e.target.value)} />
        </label>
      </div>
      {invalid && (
        <p className="text-xs text-rose-600" role="alert">
          “From” must be on or before “To”.
        </p>
      )}
    </div>
  );
}
