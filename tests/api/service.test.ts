import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { PrismaClient } from '../../app/generated/prisma/client';
import { getNoShows, getPlayers, getSessions, getSummary, getWeekly, listClubs } from '../../lib/api/service';
import type {
  NoShowsResponse,
  PlayersResponse,
  SessionsResponse,
  SummaryResponse,
  WeeklyResponse,
} from '../../lib/api-types';
import { DEFINITIONS } from '../../lib/copy';
import { setupSeededDb } from '../helpers/seeded-db';

// Anchor values were computed independently from data/*.csv.
let db: PrismaClient;
let cleanup: () => Promise<void>;

before(async () => ({ db, cleanup } = await setupSeededDb()));
after(() => cleanup());

test('summary club-001 default range', async () => {
  const r = await getSummary(db, 'club-001', {});
  assert.equal(r.status, 200);
  const b = r.body as SummaryResponse;
  assert.deepEqual(b.range, { from: '2026-09-07', to: '2026-10-04' });
  assert.deepEqual(b.previousRange, { from: '2026-08-10', to: '2026-09-06' });
  assert.equal(b.metrics.activePlayers.value, 89);
  assert.equal(b.metrics.activePlayers.previous, 88);
  assert.equal(b.metrics.sessionsHeld.value, 20);
  assert.equal(b.metrics.sessionsHeld.previous, 20);
  assert.equal(b.metrics.sessionsHeld.cancelled, 0);
  assert.equal(b.metrics.noShows.value, 15);
  assert.equal(b.metrics.noShows.previous, 14);
  assert.equal(b.metrics.noShows.recordedSessions, 11);
  assert.equal(b.metrics.noShows.totalSessions, 20);
  assert.equal(b.metrics.noShows.previousRecordedSessions, 12);
  assert.equal(b.metrics.noShows.previousTotalSessions, 20);
  assert.equal(b.metrics.noShows.rate, 15 / 151);
  assert.equal(b.metrics.noShows.previousRate, 14 / 152);
  assert.equal(b.hasData, true);
  assert.ok(!('now' in b));
  assert.equal(b.club.name, 'Saigon Smash Pickleball');
  assert.equal(b.metrics.activePlayers.definition, DEFINITIONS.activePlayers);
});

test('summary all-time totals', async () => {
  const b = (await getSummary(db, 'club-001', { from: '2025-12-01', to: '2026-10-05' })).body as SummaryResponse;
  assert.equal(b.metrics.activePlayers.value, 209);
  assert.equal(b.metrics.sessionsHeld.value, 186);
  assert.equal(b.metrics.sessionsHeld.cancelled, 9);
  assert.equal(b.metrics.noShows.value, 86);
  assert.equal(b.metrics.noShows.recordedSessions, 104);
  assert.equal(b.previousRange, null);
  assert.equal(b.metrics.activePlayers.previous, null);
  assert.equal(b.metrics.noShows.previousRecordedSessions, null);
});

test('weekly last week', async () => {
  const b = (await getWeekly(db, 'club-001', {})).body as WeeklyResponse;
  assert.equal(b.weeks.length, 4);
  assert.deepEqual(b.weeks[3], { weekStart: '2026-09-28', weekEnd: '2026-10-04', partial: false, activePlayers: 44, sessionsHeld: 5, noShows: 2, recordedSessions: 2 });
  assert.equal(b.weeks[2].activePlayers, 45);
  // per-week no-shows (from the CSV: 2, 5, 6, 2) add up to the card's 15
  assert.deepEqual(b.weeks.map((w) => w.noShows), [2, 5, 6, 2]);
});

test('players drill-down count matches card', async () => {
  const b = (await getPlayers(db, 'club-001', {})).body as PlayersResponse;
  assert.equal(b.players.length, 89);
});

// Drill-downs carry only the range they cover: no comparison period, no definition (summary has it).
test('drill-down responses carry range only', async () => {
  const range = { from: '2026-09-07', to: '2026-10-04' };
  for (const get of [getPlayers, getSessions, getNoShows]) {
    const b = (await get(db, 'club-001', {})).body as unknown as Record<string, unknown>;
    assert.deepEqual(b.range, range);
    for (const k of ['previousRange', 'previousClipped', 'definition']) assert.ok(!(k in b), `${get.name} returns ${k}`);
  }
});

test('sessions drill-down count matches card', async () => {
  const b = (await getSessions(db, 'club-001', {})).body as SessionsResponse;
  assert.equal(b.held.length, 20);
  assert.equal(b.cancelled.length, 0);
});

test('no-shows top player', async () => {
  const b = (await getNoShows(db, 'club-001', {})).body as NoShowsResponse;
  assert.equal(b.players[0].playerId, 'p046');
  assert.equal(b.players[0].noShows, 2);
  assert.equal(b.players.reduce((n, p) => n + p.noShows, 0), 15);
  assert.equal(b.recordedSessions, 11);
  assert.equal(b.totalSessions, 20);
});

test('new club', async () => {
  const b = (await getSummary(db, 'club-002', {})).body as SummaryResponse;
  assert.equal(b.hasData, false);
  assert.deepEqual(b.range, { from: '2026-10-01', to: '2026-10-05' });
  assert.equal(b.previousRange, null);
  assert.equal(b.metrics.sessionsHeld.value, 0);
  assert.equal(b.metrics.activePlayers.value, 0);
  assert.equal(b.metrics.noShows.value, null);
});

test('unknown club → 404', async () => {
  const r = await getSummary(db, 'nope', {});
  assert.equal(r.status, 404);
  assert.deepEqual(r.body, { error: 'Club not found: nope' });
});

test('bad range → 400', async () => {
  const r = await getWeekly(db, 'club-001', { from: '2026-10-04', to: '2026-09-01' });
  assert.equal(r.status, 400);
  assert.deepEqual(r.body, { error: 'from must be on or before to' });
});

test('listClubs', async () => {
  const b = await listClubs(db);
  assert.equal(b.clubs.length, 2);
  assert.deepEqual(b.clubs[1], { id: 'club-002', name: 'Thảo Điền Tennis Club', timeZone: 'Asia/Ho_Chi_Minh', createdAt: '2026-10-01' });
  assert.ok(!('now' in b));
});
