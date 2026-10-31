import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseUrl } from '../lib/db-url';

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
