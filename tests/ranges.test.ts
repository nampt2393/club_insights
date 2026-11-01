import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultRange, presets } from '../lib/ranges';

test('default range = last 4 complete weeks', () =>
  assert.deepEqual(defaultRange('2025-12-01', '2026-10-05'), { from: '2026-09-07', to: '2026-10-04' }));

test('default range for new club starts at creation', () =>
  assert.deepEqual(defaultRange('2026-10-01', '2026-10-05'), { from: '2026-10-01', to: '2026-10-05' }));

test('presets', () =>
  assert.deepEqual(
    presets('2025-12-01', '2026-10-05').map((p) => [p.id, p.range]),
    [
      ['last4w', { from: '2026-09-07', to: '2026-10-04' }],
      ['last12w', { from: '2026-07-13', to: '2026-10-04' }],
      ['thisMonth', { from: '2026-10-01', to: '2026-10-05' }],
      ['lastMonth', { from: '2026-09-01', to: '2026-09-30' }],
      ['all', { from: '2025-12-01', to: '2026-10-05' }],
    ],
  ));
