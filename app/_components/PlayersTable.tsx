'use client';

import { usePlayers } from '../../lib/client/api';
import { formatLocalDate } from '../../lib/format';
import type { DateRange } from '../../lib/time';
import { PanelState, TableShell, td, th } from './DrillDownDialog';

export function PlayersTable({ clubId, q }: { clubId: string; q: Partial<DateRange> }) {
  const { data, error, isLoading } = usePlayers(clubId, q, true);
  const rows = data?.players ?? [];
  if (!data || rows.length === 0) return <PanelState loading={isLoading} error={error} empty={!!data} />;
  return (
    <>
      <p className="mb-3 text-sm text-slate-600">
        <strong className="tabular-nums text-slate-900">{rows.length}</strong> players, most sessions first.
      </p>
      <TableShell>
        <thead>
          <tr>
            <th className={th}>Player</th>
            <th className={`${th} text-right`}>Sessions played</th>
            <th className={th}>Last played</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.playerId}>
              <td className={`${td} font-medium text-slate-900`}>{p.name}</td>
              <td className={`${td} text-right tabular-nums`}>{p.sessionsPlayed}</td>
              <td className={`${td} text-slate-600`}>{formatLocalDate(p.lastPlayed)}</td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </>
  );
}
