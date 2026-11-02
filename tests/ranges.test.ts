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
      ['thisWeek', { from: '2026-10-05', to: '2026-10-05' }], // today is Monday: the week so far is one day
      ['last1w', { from: '2026-09-28', to: '2026-10-04' }],
      ['last2w', { from: '2026-09-21', to: '2026-10-04' }],
      ['last3w', { from: '2026-09-14', to: '2026-10-04' }],
      ['last4w', { from: '2026-09-07', to: '2026-10-04' }],
      ['last12w', { from: '2026-07-13', to: '2026-10-04' }],
      ['all', { from: '2025-12-01', to: '2026-10-05' }],
    ],
  ));

test('preset labels', () =>
  assert.deepEqual(
    presets('2025-12-01', '2026-10-05').map((p) => p.label),
    ['This week', 'Last week', 'Last 2 weeks', 'Last 3 weeks', 'Last 4 weeks', 'Last 12 weeks', 'All time'],
  ));

test('this week mid-week runs Monday to today', () =>
  assert.deepEqual(presets('2025-12-01', '2026-10-08')[0].range, { from: '2026-10-05', to: '2026-10-08' }));
