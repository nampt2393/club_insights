'use client';

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SummaryResponse } from '../../lib/api-types';
import { comparisonRows, noShowsComparisonNote, type ComparisonRow } from '../../lib/compare';
import { COPY } from '../../lib/copy';
import { formatLocalDate, formatRange } from '../../lib/format';

// "This period" carries the brand colour; the previous period recedes in grey, so the eye lands
// on now and reads the grey bar as the reference. Values are always labelled, so colour never
// carries the comparison alone.
const CURRENT = '#4f46e5'; // indigo-600
const PREVIOUS = '#cbd5e1'; // slate-300
const INK = '#475569'; // slate-600
const TONE_TEXT = { good: '#047857', bad: '#be123c', neutral: '#64748b' }; // emerald-700, rose-700, slate-500

export function ComparisonCard({ s }: { s: SummaryResponse }) {
  const rows = comparisonRows(s.metrics);
  const note = noShowsComparisonNote(s.metrics.noShows);
  const prev = s.previousRange;
  const anyUnknown = rows.some((r) => r.current === null || r.previous === null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="compare-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="compare-title" className="text-base font-semibold text-slate-900">
          Compared with the previous period
        </h2>
        {prev && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <Legend color={PREVIOUS} label={`Previous: ${formatRange(prev)}`} />
            <Legend color={CURRENT} label={`This period: ${formatRange(s.range)}`} />
          </p>
        )}
      </div>

      {!prev ? (
        <p className="mt-4 text-sm text-slate-500">{COPY.noEarlierPeriod(formatLocalDate(s.club.createdAt))}</p>
      ) : (
        <>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: -8 }} barGap={2} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="key" tick={<GroupTick rows={rows} />} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} interval={0} height={44} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip cursor={{ fill: '#eef2ff' }} content={<CompareTooltip />} />
                <Bar dataKey="previous" name="Previous period" fill={PREVIOUS} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                  <LabelList dataKey="previous" position="top" fontSize={12} fill={INK} />
                </Bar>
                <Bar dataKey="current" name="This period" fill={CURRENT} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                  <LabelList dataKey="current" position="top" fontSize={12} fontWeight={600} fill="#0f172a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(note || anyUnknown) && (
            <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500">
              {note && <p>{note}</p>}
              {anyUnknown && <p>A missing bar means unknown: attendance wasn&apos;t taken in that period.</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** X-axis tick: the metric name, and under it the change, coloured good/bad/neutral. */
function GroupTick({ x, y, payload, rows }: { x?: number; y?: number; payload?: { value: string }; rows: ComparisonRow[] }) {
  const row = rows.find((r) => r.key === payload?.value);
  if (!row || x === undefined || y === undefined) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={14} textAnchor="middle" fontSize={12} fill="#334155" fontWeight={500}>
        {row.label}
      </text>
      <text dy={30} textAnchor="middle" fontSize={12} fill={TONE_TEXT[row.tone]}>
        {row.change}
      </text>
    </g>
  );
}

function CompareTooltip({ active, payload }: { active?: boolean; payload?: { payload: ComparisonRow }[] }) {
  const r = active && payload?.[0]?.payload;
  if (!r) return null;
  const show = (v: number | null) => (v === null ? COPY.unknown : v);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-900">{r.label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-slate-700">
        <Swatch color={CURRENT} /> This period: <strong className="tabular-nums">{show(r.current)}</strong>
      </p>
      <p className="flex items-center gap-1.5 text-slate-700">
        <Swatch color={PREVIOUS} /> Previous: <strong className="tabular-nums">{show(r.previous)}</strong>
      </p>
      <p className="mt-1" style={{ color: TONE_TEXT[r.tone] }}>
        {r.change}
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Swatch color={color} />
      {label}
    </span>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} aria-hidden />;
}
