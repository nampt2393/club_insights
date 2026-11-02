// Display formatting for the dashboard. Dates are club-local; English (en-GB) wording.

import type { DateRange, LocalDate } from './time';

// Assembled from Intl parts so the output is stable ('Sep', not en-GB's 'Sept'), day before month.
function parts(instant: Date, timeZone: string, withTime = false): Record<string, string> {
  const out: Record<string, string> = {};
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}),
  });
  for (const p of fmt.formatToParts(instant)) out[p.type] = p.value;
  return out;
}
// LocalDates are calendar dates: read them in UTC so the viewer's own zone can't shift them.
const local = (d: LocalDate) => parts(new Date(`${d}T00:00:00Z`), 'UTC');
const dm = (d: LocalDate) => { const p = local(d); return `${p.day} ${p.month}`; };
const dmy = (d: LocalDate) => `${dm(d)} ${local(d).year}`;
const wdm = (d: LocalDate) => `${local(d).weekday} ${dm(d)}`;

export function formatLocalDate(d: LocalDate): string {
  return dmy(d);
}

/** '7 Sep – 4 Oct'; years shown only when the two ends are in different years. */
export function formatRange(r: DateRange): string {
  if (r.from === r.to) return dm(r.from);
  const fmt = r.from.slice(0, 4) === r.to.slice(0, 4) ? dm : dmy;
  return `${fmt(r.from)} – ${fmt(r.to)}`;
}

export function formatWeek(weekStart: LocalDate, weekEnd: LocalDate): string {
  return `${wdm(weekStart)} – ${wdm(weekEnd)}`;
}

export function formatShortDay(d: LocalDate): string {
  return dm(d);
}


/** 'Mon 28 Sep, 19:00' in the club's time zone. */
export function formatSessionTime(iso: string, timeZone: string): string {
  const p = parts(new Date(iso), timeZone, true);
  return `${p.weekday} ${p.day} ${p.month}, ${p.hour}:${p.minute}`;
}

export type Delta = { text: string; direction: 'up' | 'down' | 'flat' | 'none' };

export function formatDelta(current: number | null, previous: number | null): Delta {
  if (current === null || previous === null) return { text: '—', direction: 'none' };
  const diff = current - previous;
  if (diff === 0) return { text: 'No change', direction: 'flat' };
  const sign = diff > 0 ? '▲ +' : '▼ −';
  return { text: `${sign}${Math.abs(diff)}`, direction: diff > 0 ? 'up' : 'down' };
}

/** X-axis label: the week containing "today" reads 'This week' so a low, unfinished week isn't mistaken for a drop. */
export function weekTickLabel(weekStart: LocalDate, thisMonday: LocalDate): string {
  return weekStart === thisMonday ? 'This week' : formatShortDay(weekStart);
}

/** Colour of a change: good or bad by direction; no change or unknown is neutral. */
export function deltaTone(direction: Delta['direction'], goodWhen: 'up' | 'down'): 'good' | 'bad' | 'neutral' {
  if (direction === 'flat' || direction === 'none') return 'neutral';
  return direction === goodWhen ? 'good' : 'bad';
}
