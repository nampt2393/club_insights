'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeekPoint } from '../../lib/api-types';
import { useWeekly } from '../../lib/client/api';
import { COPY } from '../../lib/copy';
import { formatRange, formatShortDay, formatWeek } from '../../lib/format';
import type { DateRange } from '../../lib/time';

const FULL = '#4f46e5'; // indigo-600
const PARTIAL = '#c7d2fe'; // indigo-200

/** 'Asia/Ho_Chi_Minh' → 'Ho Chi Minh City' (the brief's name for it); other zones → last segment. */
export function zoneLabel(timeZone: string): string {
  if (timeZone === 'Asia/Ho_Chi_Minh') return 'Ho Chi Minh City';
  return timeZone.split('/').pop()!.replace(/_/g, ' ');
}

type Props = { clubId: string; timeZone: string; q: Partial<DateRange>; empty?: boolean };

export function WeeklyChart({ clubId, timeZone, q, empty }: Props) {
  const weekly = useWeekly(clubId, q);
  const data = weekly.data;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="weekly-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="weekly-title" className="text-base font-semibold text-slate-900">
          Active players per week
        </h2>
        <p className="text-xs text-slate-500">Weeks run Monday–Sunday, {zoneLabel(timeZone)} time</p>
      </div>

      <div className="relative mt-4 h-64">
        {weekly.error ? (
          <p className="flex h-full items-center justify-center text-sm text-rose-700">{weekly.error.message}</p>
        ) : !data ? (
          <div className="h-full animate-pulse rounded-lg bg-slate-100" aria-hidden />
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={empty ? [] : data.weeks} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="weekStart"
                  tickFormatter={formatShortDay}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip cursor={{ fill: '#eef2ff' }} content={<WeekTooltip range={data.range} />} />
                <Bar dataKey="activePlayers" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                  {data.weeks.map((w) => (
                    <Cell key={w.weekStart} fill={w.partial ? PARTIAL : FULL} stroke={w.partial ? FULL : undefined} strokeDasharray={w.partial ? '3 3' : undefined} />
                  ))}
                </Bar>
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
          <span className="flex items-center gap-3">
            <Legend color={FULL} label="Full week" />
            <Legend color={PARTIAL} label="Partial week (cut by the period)" dashed />
          </span>
          <span>{COPY.weeklyNote}</span>
        </div>
      )}
    </section>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: color, border: dashed ? `1px dashed ${FULL}` : undefined }} />
      {label}
    </span>
  );
}

type TooltipProps = { active?: boolean; payload?: { payload: WeekPoint }[]; range: DateRange };

function WeekTooltip({ active, payload, range }: TooltipProps) {
  const w = active && payload?.[0]?.payload;
  if (!w) return null;
  const clipped = {
    from: w.weekStart < range.from ? range.from : w.weekStart,
    to: w.weekEnd > range.to ? range.to : w.weekEnd,
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-900">{formatWeek(w.weekStart, w.weekEnd)}</p>
      <p className="mt-1 text-slate-700">
        <strong className="tabular-nums">{w.activePlayers}</strong> active players
      </p>
      <p className="text-slate-700">
        <strong className="tabular-nums">{w.sessionsHeld}</strong> sessions held
      </p>
      {w.partial && <p className="mt-1 text-amber-700">Partial week: only {formatRange(clipped)} in this period</p>}
    </div>
  );
}
