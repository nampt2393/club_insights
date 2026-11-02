'use client';

import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeekPoint } from '../../lib/api-types';
import { useWeekly } from '../../lib/client/api';
import { COPY } from '../../lib/copy';
import { formatRange, formatWeek, weekTickLabel } from '../../lib/format';
import { todayLocal } from '../../lib/clock';
import { mondayOf } from '../../lib/time';
import type { DateRange } from '../../lib/time';

// Green/yellow pair checked with the dataviz palette validator (lightness band, colour-blind
// separation). The yellow is low-contrast on white, so bars carry visible value labels.
const SERIES = {
  activePlayers: { full: '#15803d', partial: '#bbf7d0', label: 'Active players' },
  noShows: { full: '#e0a800', partial: '#fde68a', label: 'No-shows' },
} as const;
type SeriesKey = keyof typeof SERIES;
const INK = '#475569'; // slate-600: values wear text colour, not series colour
/** Each week needs this much width for two value labels not to collide; below it, the tooltip has the numbers. */
const MIN_PX_PER_LABELLED_WEEK = 44;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** 'Asia/Ho_Chi_Minh' → 'Ho Chi Minh City' (the brief's name for it); other zones → last segment. */
export function zoneLabel(timeZone: string): string {
  if (timeZone === 'Asia/Ho_Chi_Minh') return 'Ho Chi Minh City';
  return timeZone.split('/').pop()!.replace(/_/g, ' ');
}

type Props = { clubId: string; timeZone: string; q: Partial<DateRange>; empty?: boolean };

export function WeeklyChart({ clubId, timeZone, q, empty }: Props) {
  const weekly = useWeekly(clubId, q);
  const data = weekly.data; // only arrives for a full range: the API 400s otherwise
  const thisMonday = mondayOf(todayLocal(timeZone));
  const [chartRef, chartWidth] = useWidth<HTMLDivElement>();
  const labelled = !!data && chartWidth / Math.max(data.weeks.length, 1) >= MIN_PX_PER_LABELLED_WEEK;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="weekly-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="weekly-title" className="text-base font-semibold text-slate-900">
          Active players and no-shows per week
        </h2>
        <p className="text-xs text-slate-500">Weeks run Monday–Sunday, {zoneLabel(timeZone)} time</p>
      </div>

      <div ref={chartRef} className="relative mt-4 h-64">
        {weekly.error ? (
          <p className="flex h-full items-center justify-center text-sm text-rose-700">{weekly.error.message}</p>
        ) : !data ? (
          <div className="h-full animate-pulse rounded-lg bg-slate-100" aria-hidden />
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={empty ? [] : data.weeks} margin={{ top: 20, right: 8, bottom: 0, left: -16 }} barGap={2} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="weekStart"
                  tickFormatter={(d: string) => weekTickLabel(d, thisMonday)}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip cursor={{ fill: '#eef2ff' }} content={<WeekTooltip range={{ from: q.from!, to: q.to! }} thisMonday={thisMonday} />} />
                {seriesBars(data.weeks, labelled)}
              </BarChart>
            </ResponsiveContainer>
            {empty && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">{COPY.emptyChart}</p>
            )}
          </>
        )}
      </div>

      {!empty && (
        <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Legend color={SERIES.activePlayers.full} label={SERIES.activePlayers.label} />
            <Legend color={SERIES.noShows.full} label={SERIES.noShows.label} />
            <Legend color="#e2e8f0" label="Lighter, dashed: partial week (cut by the period)" dashed />
          </span>
          {data?.weeks.some((w) => w.noShows === null) && <span className="sm:text-right">{COPY.weekNoShowsUnknown}</span>}
        </div>
      )}
    </section>
  );
}

function seriesBars(weeks: WeekPoint[], labelled: boolean) {
  return (Object.keys(SERIES) as SeriesKey[]).map((key) => {
    const c = SERIES[key];
    return (
      <Bar
        key={key}
        dataKey={key}
        name={c.label}
        radius={[4, 4, 0, 0]}
        maxBarSize={32}
        // A true 0 stays visible as a sliver; an unknown week (null no-shows) draws no bar at all.
        minPointSize={(value) => (value == null ? 0 : 3)}
        isAnimationActive={false}
      >
        {weeks.map((w) => (
          <Cell
            key={w.weekStart}
            fill={w.partial ? c.partial : c.full}
            stroke={w.partial ? c.full : undefined}
            strokeDasharray={w.partial ? '3 3' : undefined}
          />
        ))}
        {labelled && <LabelList dataKey={key} position="top" fontSize={11} fill={INK} />}
      </Bar>
    );
  });
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: color, border: dashed ? '1px dashed #64748b' : undefined }} />
      {label}
    </span>
  );
}

type TooltipProps = { active?: boolean; payload?: { payload: WeekPoint }[]; range: DateRange; thisMonday: string };

function WeekTooltip({ active, payload, range, thisMonday }: TooltipProps) {
  const w = active && payload?.[0]?.payload;
  if (!w) return null;
  const clipped = {
    from: w.weekStart < range.from ? range.from : w.weekStart,
    to: w.weekEnd > range.to ? range.to : w.weekEnd,
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-900">{formatWeek(w.weekStart, w.weekEnd)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-slate-700">
        <Swatch color={SERIES.activePlayers.full} />
        <strong className="tabular-nums">{w.activePlayers}</strong> active players
      </p>
      <p className="flex items-center gap-1.5 text-slate-700">
        <Swatch color={SERIES.noShows.full} />
        {w.noShows === null ? (
          <span>No-shows unknown: attendance not taken</span>
        ) : (
          <span>
            <strong className="tabular-nums">{w.noShows}</strong> no-shows{' '}
            <span className="text-slate-500">
              (attendance taken at {w.recordedSessions} of {w.sessionsHeld} sessions)
            </span>
          </span>
        )}
      </p>
      <p className="mt-1 text-slate-500">{w.sessionsHeld} sessions held</p>
      {w.partial && <p className="mt-1 text-amber-700">Partial week: only {formatRange(clipped)} in this period</p>}
      {w.weekStart === thisMonday && <p className="text-slate-500">Week in progress: counts so far</p>}
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} aria-hidden />;
}
