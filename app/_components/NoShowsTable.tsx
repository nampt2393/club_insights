'use client';

import { useNoShows } from '../../lib/client/api';
import { formatSessionTime } from '../../lib/format';
import type { DateRange } from '../../lib/time';
import { PanelState } from './DrillDownDialog';

type Props = { clubId: string; timeZone: string; q: Partial<DateRange> };

export function NoShowsTable({ clubId, timeZone, q }: Props) {
  const { data, error, isLoading } = useNoShows(clubId, q, true);
  if (!data) return <PanelState loading={isLoading} error={error} empty={false} />;
  const unknown = data.totalSessions - data.recordedSessions;
  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Only the <strong className="tabular-nums">{data.recordedSessions}</strong> of {data.totalSessions} sessions with attendance taken
        are included.
        {unknown > 0 && <> For the other {unknown}, we don’t know who turned up.</>}
      </p>
      {data.players.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          {data.recordedSessions === 0 ? 'No attendance was taken in this period.' : 'Nobody was marked absent in this period.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {data.players.map((p) => (
            <li key={p.playerId}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 hover:bg-gray-50">
                  <span className="font-medium text-gray-900">{p.name}</span>
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      Absent <strong className="tabular-nums text-rose-700">{p.noShows}</strong> of {p.recordedBooked} recorded{' '}
                      {p.recordedBooked === 1 ? 'session' : 'sessions'}
                    </span>
                    <span className="text-gray-400 transition group-open:rotate-90" aria-hidden>
                      ›
                    </span>
                  </span>
                </summary>
                <ul className="bg-gray-50 px-3 pb-2 pt-1 text-sm text-gray-700">
                  {p.missed.map((m) => (
                    <li key={m.sessionId} className="flex justify-between gap-3 py-1">
                      <span>{m.title}</span>
                      <span className="whitespace-nowrap text-gray-500">{formatSessionTime(m.startsAt, timeZone)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
