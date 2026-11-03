import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PrismaClient } from '@/generated/prisma/client';
import { createPrismaClient } from '@/lib/server/prisma';
import { seed } from '../../prisma/seed/seed';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

/** A throwaway SQLite DB, migrated and loaded from data/*.csv. */
export async function setupSeededDb(): Promise<{ url: string; db: PrismaClient; cleanup(): Promise<void> }> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'club-insights-test-'));
  const url = `file:${path.join(dir, 'test.db')}`;
  execSync('pnpm prisma migrate deploy', { cwd: REPO_ROOT, env: { ...process.env, DATABASE_URL: url }, stdio: 'ignore' });
  const db = createPrismaClient(url);
  await seed(db, path.join(REPO_ROOT, 'data'));
  return {
    url,
    db,
    async cleanup() {
      await db.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
