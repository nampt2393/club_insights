import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { NextRequest } from 'next/server';
import { setupSeededDb } from '../helpers/seeded-db';

// Route handlers use the lib/server/db singleton, which reads DATABASE_URL when first imported —
// so point it at a seeded temp DB before importing them.
let cleanup: () => Promise<void>;
let routes: {
  summary: typeof import('../../app/api/clubs/[clubId]/summary/route');
  weekly: typeof import('../../app/api/clubs/[clubId]/weekly/route');
  players: typeof import('../../app/api/clubs/[clubId]/players/route');
  sessions: typeof import('../../app/api/clubs/[clubId]/sessions/route');
  noShows: typeof import('../../app/api/clubs/[clubId]/no-shows/route');
};

before(async () => {
  const s = await setupSeededDb();
  cleanup = s.cleanup;
  process.env.DATABASE_URL = s.url;
  routes = {
    summary: await import('../../app/api/clubs/[clubId]/summary/route'),
    weekly: await import('../../app/api/clubs/[clubId]/weekly/route'),
    players: await import('../../app/api/clubs/[clubId]/players/route'),
    sessions: await import('../../app/api/clubs/[clubId]/sessions/route'),
    noShows: await import('../../app/api/clubs/[clubId]/no-shows/route'),
  };
});
after(async () => {
  const { prisma } = await import('@/lib/server/db');
  await prisma.$disconnect();
  await cleanup();
});

const req = (path: string) => new NextRequest(`http://localhost${path}`);
const ctx = (clubId: string) => ({ params: Promise.resolve({ clubId }) });

// /api/clubs calls connection(), which only works inside a real Next request; its body is
// listClubs(), covered in service.test.ts, and `pnpm build` must list the route as dynamic (ƒ).

test('GET summary 200 json', async () => {
  const res = await routes.summary.GET(req('/api/clubs/club-001/summary?from=2026-09-07&to=2026-10-04'), ctx('club-001'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.equal((await res.json()).metrics.sessionsHeld.value, 20);
});

test('GET summary 400', async () => {
  const res = await routes.summary.GET(req('/api/clubs/club-001/summary?from=2026-10-04&to=2026-09-01'), ctx('club-001'));
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'from must be on or before to' });
});

test('GET without from/to → 400', async () => {
  const res = await routes.players.GET(req('/api/clubs/club-001/players'), ctx('club-001'));
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'from and to must both be given, as YYYY-MM-DD' });
});

test('unknown club → 404', async () => {
  const res = await routes.weekly.GET(req('/api/clubs/nope/weekly'), ctx('nope'));
  assert.equal(res.status, 404);
});

test('drill-down routes return their rows', async () => {
  const q = '?from=2026-09-07&to=2026-10-04';
  assert.equal((await (await routes.weekly.GET(req(`/x${q}`), ctx('club-001'))).json()).weeks.length, 4);
  assert.equal((await (await routes.players.GET(req(`/x${q}`), ctx('club-001'))).json()).players.length, 89);
  assert.equal((await (await routes.sessions.GET(req(`/x${q}`), ctx('club-001'))).json()).held.length, 20);
  assert.equal((await (await routes.noShows.GET(req(`/x${q}`), ctx('club-001'))).json()).players[0].playerId, 'p046');
});
