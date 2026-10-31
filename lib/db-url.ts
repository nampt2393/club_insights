import path from 'node:path';

// Resolved from this file, not process.cwd(), so every caller hits the same DB.
const REPO_ROOT = path.resolve(import.meta.dirname, '..');

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? `file:${path.join(REPO_ROOT, 'prisma', 'dev.db')}`;
}
