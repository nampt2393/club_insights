import type { DateRange } from '../time';

/** Builds an API URL; empty range params are left out so the API applies its default range. */
export function apiUrl(path: string, q: Partial<DateRange> = {}): string {
  const sp = new URLSearchParams();
  if (q.from) sp.set('from', q.from);
  if (q.to) sp.set('to', q.to);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
