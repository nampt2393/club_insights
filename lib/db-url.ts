import { existsSync } from 'node:fs';
import path from 'node:path';

// Prefer this file's location so the seed CLI hits the same DB from any cwd. Under
// Next.js import.meta.dirname is undefined (or a bundle dir), and cwd is the repo root.
export function resolveRepoRoot(moduleDir: string | undefined, cwd: string): string {
  if (moduleDir) {
    const candidate = path.resolve(moduleDir, '..');
    if (existsSync(path.join(candidate, 'prisma', 'schema.prisma'))) return candidate;
  }
  return cwd;
}

const REPO_ROOT = resolveRepoRoot(import.meta.dirname, process.cwd());

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? `file:${path.join(REPO_ROOT, 'prisma', 'dev.db')}`;
}
