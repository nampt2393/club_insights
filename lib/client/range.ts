import { defaultRange } from '../ranges';
import type { DateRange, LocalDate } from '../time';

/**
 * The range to ask the API for. The API requires ?from&to, so with no range in the URL the client
 * fills in the default (last 4 complete weeks, or creation → today for a newer club). A half or
 * malformed range is passed on untouched so the API's 400 says what's wrong.
 */
export function requestedRange(from: string | null, to: string | null, clubCreated: LocalDate, today: LocalDate): Partial<DateRange> {
  if (!from && !to) return defaultRange(clubCreated, today);
  return { from: from ?? undefined, to: to ?? undefined };
}
