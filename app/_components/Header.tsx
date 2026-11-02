'use client';

import type { ClubDto, PreviousPeriod } from '../../lib/api-types';
import { COPY } from '../../lib/copy';
import { formatLocalDate, formatRange } from '../../lib/format';
import type { Preset } from '../../lib/ranges';
import type { DateRange, LocalDate } from '../../lib/time';
import { RangePicker } from './RangePicker';

type Props = {
  clubs: ClubDto[];
  club: ClubDto;
  range: DateRange | undefined; // what the dashboard asked for; undefined when the URL's range is broken
  previous: PreviousPeriod | undefined; // from summary, once it loads
  presets: Preset[];
  today: LocalDate;
  onClubChange(id: string): void;
  onRangeChange(r: DateRange): void;
};

export function Header({ clubs, club, range, previous, presets, today, onClubChange, onRangeChange }: Props) {
  return (
    <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Club Insights</p>
          <label className="mt-1 block">
            <span className="sr-only">Club</span>
            <select
              className="max-w-full truncate rounded-lg border border-transparent bg-transparent py-1 pr-8 text-xl font-semibold text-slate-900 hover:border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:text-2xl"
              value={club.id}
              onChange={(e) => onClubChange(e.target.value)}
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-xs text-slate-500">{COPY.dataAsOf}</p>
        </div>
        {range && <RangePicker key={`${range.from}:${range.to}`} range={range} presets={presets} today={today} onChange={onRangeChange} />}
      </div>
      {range && previous && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{formatRange(range)}</span>
          {previous.previousRange ? (
            <>
              {' '}
              compared with <span className="font-medium text-slate-900">{formatRange(previous.previousRange)}</span>
              {previous.previousClipped && <span className="text-slate-500"> {COPY.previousClipped}</span>}
            </>
          ) : (
            <span className="text-slate-500"> · {COPY.noEarlierPeriod(formatLocalDate(club.createdAt))}</span>
          )}
        </p>
      )}
    </header>
  );
}
