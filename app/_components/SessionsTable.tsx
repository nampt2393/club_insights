'use client';

import type { SessionListItem } from '../../lib/api-types';
import { useSessions } from '../../lib/client/api';
import { formatSessionTime } from '../../lib/format';
import type { DateRange } from '../../lib/time';
import { PanelState, TableShell, td, th } from './DrillDownDialog';

type Props = { clubId: string; timeZone: string; q: Partial<DateRange> };

export function SessionsTable({ clubId, timeZone, q }: Props) {
  const { data, error, isLoading } = useSessions(clubId, q, true);
  if (!data || data.held.length + data.cancelled.length === 0)
    return <PanelState loading={isLoading} error={error} empty={!!data} />;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm text-gray-600">
          <strong className="tabular-nums text-gray-900">{data.held.length}</strong> sessions held, newest first.
        </p>
        {data.held.length > 0 && <Rows items={data.held} timeZone={timeZone} />}
      </div>
      {data.cancelled.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Cancelled (not counted)</h3>
          <Rows items={data.cancelled} timeZone={timeZone} cancelled />
        </div>
      )}
    </div>
  );
}

function Rows({ items, timeZone, cancelled }: { items: SessionListItem[]; timeZone: string; cancelled?: boolean }) {
  return (
    <TableShell>
      <thead>
        <tr>
          <th className={th}>When</th>
          <th className={th}>Session</th>
          <th className={`${th} text-right`}>Booked</th>
          {!cancelled && <th className={th}>Attendance</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((s) => (
          <tr key={s.id} className={cancelled ? 'text-gray-500' : undefined}>
            <td className={`${td} whitespace-nowrap`}>{formatSessionTime(s.startsAt, timeZone)}</td>
            <td className={td}>{s.title}</td>
            <td className={`${td} text-right tabular-nums`}>
              {s.booked}/{s.places}
            </td>
            {!cancelled && (
              <td className={td}>
                {s.absent === null ? (
                  <span className="text-gray-500">Not taken</span>
                ) : (
                  <span>
                    Taken · <span className={s.absent > 0 ? 'font-medium text-rose-700' : ''}>{s.absent} absent</span>
                  </span>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}
