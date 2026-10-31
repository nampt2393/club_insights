import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { databaseUrl, resolveRepoRoot } from '../lib/db-url';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');

test('resolveRepoRoot uses the module dir when it sits in the repo', () =>
  assert.equal(resolveRepoRoot(path.join(REPO_ROOT, 'lib'), '/elsewhere'), REPO_ROOT));

// Next.js (Turbopack) leaves import.meta.dirname undefined.
test('resolveRepoRoot falls back to cwd when the module dir is undefined', () =>
  assert.equal(resolveRepoRoot(undefined, REPO_ROOT), REPO_ROOT));

// A bundled chunk (e.g. .next/server/...) must not be mistaken for the repo.
test('resolveRepoRoot falls back to cwd when the module dir is not in the repo', () =>
  assert.equal(resolveRepoRoot(path.join(REPO_ROOT, '.next', 'server', 'chunks'), REPO_ROOT), REPO_ROOT));

test('databaseUrl is absolute and points at prisma/dev.db by default', () => {
  delete process.env.DATABASE_URL;
  const url = databaseUrl();
  assert.match(url, /^file:\//);
  assert.ok(url.endsWith('/prisma/dev.db'));
});

test('databaseUrl honours DATABASE_URL', () => {
  process.env.DATABASE_URL = 'file:/tmp/x.db';
  assert.equal(databaseUrl(), 'file:/tmp/x.db');
  delete process.env.DATABASE_URL;
});
