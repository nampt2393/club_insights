import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import type { PrismaClient } from '../../app/generated/prisma/client';
import { createPrismaClient } from '../../lib/prisma';
import { seed } from '../../prisma/seed/seed';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'seed-test-'));
const url = `file:${path.join(tmpDir, 'test.db')}`;
const FULL = { clubs: 2, players: 260, sessions: 195, bookings: 1893 };
let prisma: PrismaClient;

before(() => {
  execSync('pnpm prisma migrate deploy', { cwd: REPO_ROOT, env: { ...process.env, DATABASE_URL: url }, stdio: 'ignore' });
  prisma = createPrismaClient(url);
});

after(async () => {
  await prisma.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
});

test('loads exact counts', async () => {
  assert.deepEqual(await seed(prisma, DATA_DIR), FULL);
});

test('attended tri-state preserved', async () => {
  assert.equal(await prisma.booking.count({ where: { attended: true } }), 913);
  assert.equal(await prisma.booking.count({ where: { attended: false } }), 86);
  assert.equal(await prisma.booking.count({ where: { attended: null } }), 894);
  assert.equal(await prisma.booking.count({ where: { cancelledAt: { not: null } } }), 160);
});

test('club-002 exists and is empty', async () => {
  const c = await prisma.club.findUniqueOrThrow({
    where: { id: 'club-002' },
    include: { _count: { select: { players: true, sessions: true } } },
  });
  assert.deepEqual(c._count, { players: 0, sessions: 0 });
  assert.equal(c.createdAt.toISOString(), '2026-10-01T00:00:00.000Z');
});

test('pre-join booking kept as-is', async () => {
  const b = await prisma.booking.findUniqueOrThrow({ where: { id: 'b00021' }, include: { player: true } });
  assert.equal(b.bookedAt.toISOString(), '2026-01-05T05:24:03.000Z');
  assert.ok(b.bookedAt < b.player.joinedClubAt);
});

test('diacritics round-trip', async () =>
  assert.equal((await prisma.player.findUniqueOrThrow({ where: { id: 'p001' } })).name, 'Trần Hữu Tú'));

test('seed is idempotent', async () => {
  assert.deepEqual(await seed(prisma, DATA_DIR), FULL);
});

test('failed seed rolls back', async () => {
  const badDir = path.join(tmpDir, 'bad-data');
  cpSync(DATA_DIR, badDir, { recursive: true });
  // Passes the mappers but violates the session foreign key, so it fails inside the transaction.
  // CRLF to match the source files; a bare \n would leak into `attended` and fail parsing instead.
  appendFileSync(path.join(badDir, 'bookings.csv'), 'b99999,s9999,p001,2026-01-02T18:52:45Z,booked,,\r\n');
  // Must be the FK error from inside the transaction, not a parse error before it.
  await assert.rejects(seed(prisma, badDir), /Foreign key/i);
  assert.equal(await prisma.booking.count(), 1893);
  assert.equal(await prisma.club.count(), 2);
});
