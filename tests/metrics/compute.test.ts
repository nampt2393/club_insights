import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOW } from '../../lib/clock';
import {
  activePlayerRows,
  computeMetrics,
  isHeld,
  noShowRows,
  sessionRows,
  weeklySeries,
} from '../../lib/metrics/compute';
import type { BookingRow, SessionRow } from '../../lib/metrics/types';
import { rangeWindow } from '../../lib/time';

const TZ = 'Asia/Ho_Chi_Minh';
const RANGE = { from: '2026-09-28', to: '2026-10-04' };
const w = rangeWindow(RANGE, TZ);

const booking = (id: string, playerId: string, attended: boolean | null, status: BookingRow['status'] = 'booked'): BookingRow => ({
  id,
  playerId,
  playerName: `${playerId} name`,
  status,
  attended,
});

const session = (id: string, startsAt: string, over: Partial<SessionRow> = {}): SessionRow => ({
  id,
  title: id.toUpperCase(),
  startsAt: new Date(startsAt),
  places: 12,
  status: 'scheduled',
  attendanceRecorded: false,
  bookings: [],
  ...over,
});

// (a) recorded: P1 attended, P2 absent, P3 cancelled booking
const a = session('a', '2026-09-29T12:00:00Z', {
  attendanceRecorded: true,
  bookings: [booking('b1', 'P1', true), booking('b2', 'P2', false), booking('b3', 'P3', null, 'cancelled')],
});
// (b) unrecorded: P1, P4 unknown
const b = session('b', '2026-10-01T12:00:00Z', { bookings: [booking('b4', 'P1', null), booking('b5', 'P4', null)] });
// (c) cancelled session
const c = session('c', '2026-10-02T12:00:00Z', { status: 'cancelled' });
// (d) scheduled, in range, but after NOW is impossible here; use a session in a range ending today
const rows = [a, b, c];

test('computeMetrics on fixture', () =>
  assert.deepEqual(computeMetrics(rows, w, NOW), {
    activePlayers: 2, // P1, P4; P2 absent; P3 cancelled booking
    sessionsHeld: 2,
    cancelledSessions: 1,
    noShows: 1,
    recordedSessions: 1,
  }));

test('noShows is null when nothing recorded', () => {
  const m = computeMetrics([b], w, NOW);
  assert.equal(m.noShows, null);
  assert.equal(m.recordedSessions, 0);
  assert.equal(m.sessionsHeld, 1);
});

test('future session is not held', () => {
  const later = session('d', '2026-10-05T12:00:00Z', { bookings: [booking('b6', 'P9', null)] });
  const today = rangeWindow({ from: '2026-10-05', to: '2026-10-05' }, TZ);
  assert.equal(isHeld(later, today, NOW), false);
  assert.equal(computeMetrics([later], today, NOW).sessionsHeld, 0);
});

test('session outside the window is not held', () =>
  assert.equal(isHeld(session('x', '2026-10-04T17:00:00Z'), w, NOW), false)); // = Mon 5 Oct 00:00 local

test('weeklySeries counts distinct players per week, clipped to range', () => {
  const prev = session('p', '2026-09-22T12:00:00Z', { bookings: [booking('b7', 'P1', null)] });
  const outside = session('o', '2026-09-20T12:00:00Z', { bookings: [booking('b8', 'P8', null)] }); // Sun 20 Sep, before range
  const series = weeklySeries([prev, outside, a, b, c], { from: '2026-09-21', to: '2026-10-04' }, TZ, NOW);
  assert.deepEqual(series, [
    // 21 Sep: attendance never taken → no-shows unknown (null), not 0
    { weekStart: '2026-09-21', weekEnd: '2026-09-27', partial: false, activePlayers: 1, sessionsHeld: 1, noShows: null, recordedSessions: 0 },
    { weekStart: '2026-09-28', weekEnd: '2026-10-04', partial: false, activePlayers: 2, sessionsHeld: 2, noShows: 1, recordedSessions: 1 },
  ]);
});

test('weeklySeries ignores the part of a partial week outside the range', () => {
  const series = weeklySeries([a, b], { from: '2026-09-30', to: '2026-10-04' }, TZ, NOW);
  assert.deepEqual(series, [
    // session a (29 Sep, the only recorded one) falls outside the clipped week → unknown
    { weekStart: '2026-09-28', weekEnd: '2026-10-04', partial: true, activePlayers: 2, sessionsHeld: 1, noShows: null, recordedSessions: 0 },
  ]);
});

test('sessionRows lists cancelled separately, absent null when unrecorded', () =>
  assert.deepEqual(sessionRows(rows, w, NOW), {
    held: [
      { id: 'b', title: 'B', startsAt: '2026-10-01T12:00:00.000Z', booked: 2, places: 12, attendanceRecorded: false, absent: null },
      { id: 'a', title: 'A', startsAt: '2026-09-29T12:00:00.000Z', booked: 2, places: 12, attendanceRecorded: true, absent: 1 },
    ],
    cancelled: [
      { id: 'c', title: 'C', startsAt: '2026-10-02T12:00:00.000Z', booked: 0, places: 12, attendanceRecorded: false, absent: null },
    ],
  }));

test('noShowRows has missed sessions', () =>
  assert.deepEqual(noShowRows(rows, w, NOW), [
    {
      playerId: 'P2',
      name: 'P2 name',
      noShows: 1,
      recordedBooked: 1,
      missed: [{ sessionId: 'a', title: 'A', startsAt: '2026-09-29T12:00:00.000Z' }],
    },
  ]));

test('activePlayerRows excludes absent players', () =>
  assert.deepEqual(activePlayerRows(rows, w, NOW, TZ), [
    { playerId: 'P1', name: 'P1 name', sessionsPlayed: 2, lastPlayed: '2026-10-01' },
    { playerId: 'P4', name: 'P4 name', sessionsPlayed: 1, lastPlayed: '2026-10-01' },
  ]));
