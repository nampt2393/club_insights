import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparisonRows } from '../lib/compare';
import type { SummaryResponse } from '../lib/api-types';

type M = SummaryResponse['metrics'];
// club-001, last 4 weeks (anchors from tests/api/service.test.ts)
const metrics: M = {
  activePlayers: { value: 89, previous: 88 },
  sessionsHeld: { value: 20, previous: 20, cancelled: 0 },
  noShows: { value: 15, previous: 14, recordedSessions: 11, previousRecordedSessions: 12 },
};

test('rows come in the order active players, no-shows, sessions held', () =>
  assert.deepEqual(comparisonRows(metrics).map((r) => r.key), ['activePlayers', 'noShows', 'sessionsHeld']));

test('rows carry current, previous, change text and tone', () => {
  const [ap, ns, sh] = comparisonRows(metrics);
  assert.deepEqual(ap, { key: 'activePlayers', label: 'Active players', current: 89, previous: 88, change: '▲ +1', tone: 'good' });
  assert.deepEqual(sh, { key: 'sessionsHeld', label: 'Sessions held', current: 20, previous: 20, change: 'No change', tone: 'neutral' });
  // attendance taken at 11 vs 12 sessions → the count change is not called good or bad
  assert.deepEqual(ns, { key: 'noShows', label: 'No-shows', current: 15, previous: 14, change: '▲ +1', tone: 'neutral' });
});

test('fewer no-shows with the same coverage is good', () => {
  const ns = comparisonRows({ ...metrics, noShows: { ...metrics.noShows, value: 10, recordedSessions: 12 } })[1];
  assert.equal(ns.tone, 'good');
});

test('unknown no-shows stay null, never 0', () => {
  const ns = comparisonRows({ ...metrics, noShows: { ...metrics.noShows, previous: null, previousRecordedSessions: 0 } })[1];
  assert.equal(ns.previous, null);
  assert.equal(ns.change, '—');
  assert.equal(ns.tone, 'neutral');
});
