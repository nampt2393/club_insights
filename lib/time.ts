// Club-local calendar dates and their UTC boundaries.
//
// A LocalDate is a plain 'YYYY-MM-DD' string in the club's time zone. Day arithmetic is done on
// the calendar (via Date.UTC), so it never depends on the server's own time zone. Only
// localMidnightUtc / toLocalDate touch a real time zone, through Intl.

export type LocalDate = string;
export type DateRange = { from: LocalDate; to: LocalDate }; // inclusive on both ends
export type Window = { start: Date; end: Date }; // UTC, end exclusive

const DAY_MS = 86_400_000;
const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(date: LocalDate): number {
  const m = LOCAL_DATE_RE.exec(date);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function format(utcMs: number): LocalDate {
  return new Date(utcMs).toISOString().slice(0, 10);
}

export function isLocalDate(s: string): boolean {
  const m = LOCAL_DATE_RE.exec(s);
  if (!m) return false;
  // Round-trip catches 2026-02-30, month 13, etc.
  return format(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) === s;
}

export function addDays(date: LocalDate, n: number): LocalDate {
  return format(parse(date) + n * DAY_MS);
}

export function daysInclusive(r: DateRange): number {
  return Math.round((parse(r.to) - parse(r.from)) / DAY_MS) + 1;
}

export function mondayOf(date: LocalDate): LocalDate {
  const weekday = new Date(parse(date)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

/** The local wall-clock date of an instant in the given zone. */
export function toLocalDate(instant: Date, timeZone: string): LocalDate {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    instant,
  );
}

/** Milliseconds the zone is ahead of UTC at this instant (e.g. +7h for Ho Chi Minh City). */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const wallAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant at which the given local date starts (00:00) in the zone. */
export function localMidnightUtc(date: LocalDate, timeZone: string): Date {
  const wall = parse(date);
  // First guess uses the offset at wall-time-as-UTC; correct once with the offset at the guess,
  // which matters only around DST changes.
  const guess = wall - zoneOffsetMs(new Date(wall), timeZone);
  return new Date(wall - zoneOffsetMs(new Date(guess), timeZone));
}

export function rangeWindow(r: DateRange, timeZone: string): Window {
  return { start: localMidnightUtc(r.from, timeZone), end: localMidnightUtc(addDays(r.to, 1), timeZone) };
}

/** The same number of days immediately before the range. */
export function previousRange(r: DateRange): DateRange {
  const to = addDays(r.from, -1);
  return { from: addDays(to, -(daysInclusive(r) - 1)), to };
}

export type WeekSpan = { weekStart: LocalDate; weekEnd: LocalDate; partial: boolean };

/** Every Monday–Sunday week that overlaps the range; partial = the range cuts the week. */
export function weeksOverlapping(r: DateRange): WeekSpan[] {
  const weeks: WeekSpan[] = [];
  for (let start = mondayOf(r.from); start <= r.to; start = addDays(start, 7)) {
    const end = addDays(start, 6);
    weeks.push({ weekStart: start, weekEnd: end, partial: start < r.from || end > r.to });
  }
  return weeks;
}

/** club.createdAt / player.joinedClubAt are CSV dates stored as 00:00 UTC. */
export function dateOnlyToLocalDate(d: Date): LocalDate {
  return d.toISOString().slice(0, 10);
}
