// The three dashboard numbers and the rows behind them. Every function builds on isHeld(), so a
// number and its drill-down always agree. Definitions shown to hosts live in lib/copy.ts.

import { rangeWindow, toLocalDate, weeksOverlapping, type DateRange, type LocalDate, type Window } from '../time';
import type { BookingRow, SessionRow } from './types';

/** Held = not cancelled, starts inside the window, and has already started. */
export function isHeld(s: SessionRow, w: Window, now: Date): boolean {
  return s.status === 'scheduled' && s.startsAt >= w.start && s.startsAt < w.end && s.startsAt < now;
}

const activeBookings = (s: SessionRow): BookingRow[] => s.bookings.filter((b) => b.status === 'booked');
/** A player counts as having played unless they were marked absent. */
const played = (b: BookingRow): boolean => b.status === 'booked' && b.attended !== false;
const absent = (b: BookingRow): boolean => b.status === 'booked' && b.attended === false;

export type MetricValues = {
  activePlayers: number;
  sessionsHeld: number;
  cancelledSessions: number;
  noShows: number | null; // null = no session in the window had attendance taken
  recordedSessions: number;
  bookingsAtRecorded: number;
  noShowRate: number | null; // fraction 0–1
};

export function computeMetrics(sessions: SessionRow[], w: Window, now: Date): MetricValues {
  const held = sessions.filter((s) => isHeld(s, w, now));
  const recorded = held.filter((s) => s.attendanceRecorded);
  const players = new Set(held.flatMap((s) => s.bookings.filter(played).map((b) => b.playerId)));
  const bookingsAtRecorded = recorded.reduce((n, s) => n + activeBookings(s).length, 0);
  const noShows = recorded.reduce((n, s) => n + s.bookings.filter(absent).length, 0);
  const known = recorded.length > 0;
  return {
    activePlayers: players.size,
    sessionsHeld: held.length,
    cancelledSessions: sessions.filter((s) => s.status === 'cancelled' && s.startsAt >= w.start && s.startsAt < w.end)
      .length,
    noShows: known ? noShows : null,
    recordedSessions: recorded.length,
    bookingsAtRecorded,
    noShowRate: bookingsAtRecorded > 0 ? noShows / bookingsAtRecorded : null, // no bookings → no rate
  };
}

export type WeekPoint = {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  partial: boolean;
  activePlayers: number;
  sessionsHeld: number;
  noShows: number | null; // null = attendance not taken at any session this week
  recordedSessions: number;
};

export function weeklySeries(sessions: SessionRow[], r: DateRange, timeZone: string, now: Date): WeekPoint[] {
  return weeksOverlapping(r).map((week) => {
    // Clip the week to the range so a partial week only counts days the host asked for.
    const clipped = {
      from: week.weekStart < r.from ? r.from : week.weekStart,
      to: week.weekEnd > r.to ? r.to : week.weekEnd,
    };
    const m = computeMetrics(sessions, rangeWindow(clipped, timeZone), now);
    return { ...week, activePlayers: m.activePlayers, sessionsHeld: m.sessionsHeld, noShows: m.noShows, recordedSessions: m.recordedSessions };
  });
}

export type ActivePlayerRow = { playerId: string; name: string; sessionsPlayed: number; lastPlayed: LocalDate };

export function activePlayerRows(sessions: SessionRow[], w: Window, now: Date, timeZone: string): ActivePlayerRow[] {
  const byPlayer = new Map<string, { name: string; sessionsPlayed: number; last: Date }>();
  for (const s of sessions.filter((s) => isHeld(s, w, now))) {
    for (const b of s.bookings.filter(played)) {
      const row = byPlayer.get(b.playerId) ?? { name: b.playerName, sessionsPlayed: 0, last: s.startsAt };
      row.sessionsPlayed += 1;
      if (s.startsAt > row.last) row.last = s.startsAt;
      byPlayer.set(b.playerId, row);
    }
  }
  return [...byPlayer]
    .map(([playerId, r]) => ({ playerId, name: r.name, sessionsPlayed: r.sessionsPlayed, lastPlayed: toLocalDate(r.last, timeZone) }))
    .sort((x, y) => y.sessionsPlayed - x.sessionsPlayed || x.name.localeCompare(y.name));
}

export type SessionListItem = {
  id: string;
  title: string;
  startsAt: string; // ISO, UTC
  booked: number;
  places: number;
  attendanceRecorded: boolean;
  absent: number | null; // null = attendance not taken
};

const toItem = (s: SessionRow): SessionListItem => ({
  id: s.id,
  title: s.title,
  startsAt: s.startsAt.toISOString(),
  booked: activeBookings(s).length,
  places: s.places,
  attendanceRecorded: s.attendanceRecorded,
  absent: s.attendanceRecorded ? s.bookings.filter(absent).length : null,
});

const newestFirst = (x: SessionRow, y: SessionRow) => y.startsAt.getTime() - x.startsAt.getTime();

export function sessionRows(sessions: SessionRow[], w: Window, now: Date): { held: SessionListItem[]; cancelled: SessionListItem[] } {
  return {
    held: sessions.filter((s) => isHeld(s, w, now)).sort(newestFirst).map(toItem),
    cancelled: sessions
      .filter((s) => s.status === 'cancelled' && s.startsAt >= w.start && s.startsAt < w.end)
      .sort(newestFirst)
      .map(toItem),
  };
}

export type NoShowRow = {
  playerId: string;
  name: string;
  noShows: number;
  recordedBooked: number; // bookings at sessions with attendance taken
  missed: { sessionId: string; title: string; startsAt: string }[];
};

export function noShowRows(sessions: SessionRow[], w: Window, now: Date): NoShowRow[] {
  const byPlayer = new Map<string, NoShowRow>();
  const recorded = sessions.filter((s) => isHeld(s, w, now) && s.attendanceRecorded).sort(newestFirst);
  for (const s of recorded) {
    for (const b of activeBookings(s)) {
      const row = byPlayer.get(b.playerId) ?? { playerId: b.playerId, name: b.playerName, noShows: 0, recordedBooked: 0, missed: [] };
      row.recordedBooked += 1;
      if (absent(b)) {
        row.noShows += 1;
        row.missed.push({ sessionId: s.id, title: s.title, startsAt: s.startsAt.toISOString() });
      }
      byPlayer.set(b.playerId, row);
    }
  }
  return [...byPlayer.values()]
    .filter((r) => r.noShows > 0)
    .sort((x, y) => y.noShows - x.noShows || x.name.localeCompare(y.name));
}
