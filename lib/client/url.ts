import type { DateRange } from '../time';

/** Builds an API URL. The API requires both from and to; an empty one is left out (and gets a 400). */
export function apiUrl(path: string, q: Partial<DateRange> = {}): string {
  const sp = new URLSearchParams();
  if (q.from) sp.set('from', q.from);
  if (q.to) sp.set('to', q.to);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
