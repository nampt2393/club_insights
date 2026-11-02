import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparisonRows, noShowsComparisonNote } from '../lib/compare';
import type { SummaryResponse } from '../lib/api-types';

type M = SummaryResponse['metrics'];
const def = 'd';
// club-001, last 4 weeks (anchors from tests/api/service.test.ts)
const metrics: M = {
  activePlayers: { value: 89, previous: 88, definition: def },
  sessionsHeld: { value: 20, previous: 20, definition: def, cancelled: 0 },
  noShows: {
    value: 15, previous: 14, definition: def,
    recordedSessions: 11, totalSessions: 20, rate: 15 / 151,
    previousRecordedSessions: 12, previousTotalSessions: 20, previousRate: 14 / 160,
  },
};

test('rows come in the order active players, no-shows, sessions held', () =>
  assert.deepEqual(comparisonRows(metrics).map((r) => r.key), ['activePlayers', 'noShows', 'sessionsHeld']));

test('rows carry current, previous, change text and tone', () => {
  const [ap, ns, sh] = comparisonRows(metrics);
  assert.deepEqual(ap, { key: 'activePlayers', label: 'Active players', current: 89, previous: 88, change: '▲ +1 (1%)', tone: 'good' });
  assert.deepEqual(sh, { key: 'sessionsHeld', label: 'Sessions held', current: 20, previous: 20, change: 'No change', tone: 'neutral' });
  // attendance taken at 11 vs 12 sessions → the count change is not called good or bad
  assert.deepEqual(ns, { key: 'noShows', label: 'No-shows', current: 15, previous: 14, change: '▲ +1 (7%)', tone: 'neutral' });
});

test('fewer no-shows with the same coverage is good', () => {
  const ns = comparisonRows({ ...metrics, noShows: { ...metrics.noShows, value: 10, recordedSessions: 12 } })[1];
  assert.equal(ns.tone, 'good');
});

test('unknown no-shows stay null, never 0', () => {
  const ns = comparisonRows({ ...metrics, noShows: { ...metrics.noShows, previous: null, previousRecordedSessions: 0, previousRate: null } })[1];
  assert.equal(ns.previous, null);
  assert.equal(ns.change, '—');
  assert.equal(ns.tone, 'neutral');
});

test('note explains different coverage and points to the rate', () =>
  assert.equal(
    noShowsComparisonNote(metrics.noShows),
    "No-shows aren't like-for-like: attendance was taken at 11 of 20 sessions this period and 12 of 20 before. No-show rate: 10% now, 9% before.",
  ));

test('no note when coverage is the same', () =>
  assert.equal(noShowsComparisonNote({ ...metrics.noShows, previousRecordedSessions: 11 }), null));
