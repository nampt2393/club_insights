import type { RangeInfo } from '@/lib/api-types';
import { isLocalDate, previousRange, type LocalDate } from '@/lib/time';

export type RangeQuery = { from?: string | null; to?: string | null };

/** Validates ?from&to (club-local dates, both required) and works out the comparison period. */
export function resolveRange(
  q: RangeQuery,
  clubCreated: LocalDate,
  today: LocalDate,
): { ok: true; info: RangeInfo } | { ok: false; error: string } {
  if (!q.from || !q.to || !isLocalDate(q.from) || !isLocalDate(q.to))
    return { ok: false, error: 'from and to must both be given, as YYYY-MM-DD' };
  if (q.from > q.to) return { ok: false, error: 'from must be on or before to' };
  if (q.to > today) return { ok: false, error: `to cannot be after today (${today})` };
  const range = { from: q.from, to: q.to };

  const prev = previousRange(range);
  if (prev.to < clubCreated) return { ok: true, info: { range, previousRange: null, previousClipped: false } };
  if (prev.from < clubCreated)
    return { ok: true, info: { range, previousRange: { from: clubCreated, to: prev.to }, previousClipped: true } };
  return { ok: true, info: { range, previousRange: prev, previousClipped: false } };
}
