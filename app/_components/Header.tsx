'use client';

import type { ClubDto, PreviousPeriod } from '../../lib/api-types';
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
  rangeDisabled?: boolean; // new club with no sessions yet: nothing to pick a range over
  onClubChange(id: string): void;
  onRangeChange(r: DateRange): void;
};

export function Header({ clubs, club, range, previous, presets, today, rangeDisabled, onClubChange, onRangeChange }: Props) {
  return (
    <header className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Club Insights</p>
          <label className="mt-1 block">
            <span className="sr-only">Club</span>
            <select
              className="max-w-full truncate rounded-full border-2 border-transparent bg-transparent py-1 pr-8 text-3xl font-black text-gray-800 hover:border-gray-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-200 sm:text-4xl"
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
          <p className="mt-1 text-xs text-gray-500">Data as of Mon 5 Oct 2026, 09:00 (Ho Chi Minh City)</p>
        </div>
        {range && <RangePicker key={`${range.from}:${range.to}`} range={range} presets={presets} today={today} disabled={rangeDisabled} onChange={onRangeChange} />}
      </div>
      {range && previous && (
        <p className="mt-4 border-t border-gray-100 pt-3 text-sm font-semibold text-gray-500">
          <span className="font-semibold text-gray-800">{formatRange(range)}</span>
          {previous.previousRange ? (
            <>
              {' '}
              compared with <span className="font-semibold text-gray-800">{formatRange(previous.previousRange)}</span>
              {previous.previousClipped && <span className="text-gray-500"> (previous period starts at club creation)</span>}
            </>
          ) : (
            <span className="text-gray-500"> · No earlier period: club created {formatLocalDate(club.createdAt)}</span>
          )}
        </p>
      )}
    </header>
  );
}
