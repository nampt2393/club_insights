import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveRange } from '../../lib/api/params';

const C = '2025-12-01';
const T = '2026-10-05';
const FORMAT = 'from and to must both be given, as YYYY-MM-DD';

test('resolveRange defaults when both missing', () =>
  assert.deepEqual(resolveRange({}, C, T), {
    ok: true,
    info: { range: { from: '2026-09-07', to: '2026-10-04' }, previousRange: { from: '2026-08-10', to: '2026-09-06' }, previousClipped: false },
  }));

test('resolveRange rejects bad date', () =>
  assert.deepEqual(resolveRange({ from: '2026-13-40', to: '2026-10-01' }, C, T), { ok: false, error: FORMAT }));

test('resolveRange rejects only one given', () =>
  assert.deepEqual(resolveRange({ from: '2026-09-01', to: null }, C, T), { ok: false, error: FORMAT }));

test('resolveRange rejects from > to', () =>
  assert.deepEqual(resolveRange({ from: '2026-10-04', to: '2026-09-01' }, C, T), { ok: false, error: 'from must be on or before to' }));

test('resolveRange rejects to after today', () =>
  assert.deepEqual(resolveRange({ from: '2026-10-01', to: '2026-10-06' }, C, T), {
    ok: false,
    error: 'to cannot be after today (2026-10-05)',
  }));

test('range ending today is allowed', () => assert.equal(resolveRange({ from: '2026-09-28', to: '2026-10-05' }, C, T).ok, true));

test('previous range before creation is null', () => {
  const r = resolveRange({ from: '2025-12-01', to: '2026-10-05' }, C, T);
  assert.ok(r.ok);
  assert.equal(r.info.previousRange, null);
  assert.equal(r.info.previousClipped, false);
});

test('previous range partly before creation is clipped', () => {
  const r = resolveRange({ from: '2025-12-10', to: '2025-12-20' }, C, T);
  assert.ok(r.ok);
  assert.deepEqual(r.info.previousRange, { from: '2025-12-01', to: '2025-12-09' });
  assert.equal(r.info.previousClipped, true);
});
