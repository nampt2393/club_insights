import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { readCsv } from '../../prisma/seed/csv';
import {
  parseBool,
  parseDateOnly,
  parseOptionalBool,
  parseUtc,
  toBooking,
  toClub,
  toPlayer,
  toSession,
} from '../../prisma/seed/map';

const sessionRow = {
  session_id: 's0001',
  club_id: 'club-001',
  title: 'Early Bird Monday',
  starts_at: '2026-01-04T22:30:00Z',
  duration_minutes: '90',
  places: '12',
  status: 'scheduled',
  attendance_recorded: 'true',
};

test('parseDateOnly is midnight UTC', () =>
  assert.equal(parseDateOnly('2025-12-01').toISOString(), '2025-12-01T00:00:00.000Z'));

test('parseOptionalBool keeps blank as null', () => assert.equal(parseOptionalBool(''), null));

test('throws on TRUE', () => assert.throws(() => parseBool('TRUE'), /TRUE/));

test('throws on unknown status', () =>
  assert.throws(() => toSession({ ...sessionRow, status: 'postponed' }), /postponed/));

test('throws on malformed timestamp', () => assert.throws(() => parseUtc('2026-01-04 22:30')));

test('throws on malformed date-only', () => assert.throws(() => parseDateOnly('2025-13-45')));

test('toClub maps first row', () =>
  assert.deepEqual(
    toClub({ club_id: 'club-001', name: 'Saigon Smash Pickleball', time_zone: 'Asia/Ho_Chi_Minh', created_at: '2025-12-01' }),
    { id: 'club-001', name: 'Saigon Smash Pickleball', timeZone: 'Asia/Ho_Chi_Minh', createdAt: new Date('2025-12-01T00:00:00Z') },
  ));

test('toPlayer maps first row', () =>
  assert.deepEqual(
    toPlayer({ player_id: 'p001', club_id: 'club-001', name: 'Trần Hữu Tú', joined_club_at: '2025-12-03' }),
    { id: 'p001', clubId: 'club-001', name: 'Trần Hữu Tú', joinedClubAt: new Date('2025-12-03T00:00:00Z') },
  ));

test('toSession maps first row', () =>
  assert.deepEqual(toSession(sessionRow), {
    id: 's0001',
    clubId: 'club-001',
    title: 'Early Bird Monday',
    startsAt: new Date('2026-01-04T22:30:00Z'),
    durationMinutes: 90,
    places: 12,
    status: 'scheduled',
    attendanceRecorded: true,
  }));

test('toBooking maps cancelled booking', () =>
  assert.deepEqual(
    toBooking({
      booking_id: 'b00001',
      session_id: 's0001',
      player_id: 'p180',
      booked_at: '2026-01-02T18:52:45Z',
      status: 'cancelled',
      cancelled_at: '2026-01-04T04:28:46Z',
      attended: '',
    }),
    {
      id: 'b00001',
      sessionId: 's0001',
      playerId: 'p180',
      bookedAt: new Date('2026-01-02T18:52:45Z'),
      status: 'cancelled',
      cancelledAt: new Date('2026-01-04T04:28:46Z'),
      attended: null,
    },
  ));

test('readCsv strips BOM and keeps diacritics', () => {
  const tmp = path.join(mkdtempSync(path.join(os.tmpdir(), 'csv-')), 'players.csv');
  writeFileSync(tmp, '﻿player_id,name\np001,Trần Hữu Tú\n', 'utf8');
  assert.deepEqual(readCsv(tmp), [{ player_id: 'p001', name: 'Trần Hữu Tú' }]);
});
