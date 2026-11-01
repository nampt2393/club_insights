import { toLocalDate, type LocalDate } from './time';

// The brief fixes "now" at Monday 5 October 2026, 09:00 in Ho Chi Minh City (UTC+7).
// Everything that needs "now" reads it from here; nothing else calls new Date() for it.
export const NOW = new Date('2026-10-05T02:00:00.000Z');

export function todayLocal(timeZone: string): LocalDate {
  return toLocalDate(NOW, timeZone);
}
