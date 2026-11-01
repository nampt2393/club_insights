import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOW, todayLocal } from '../lib/clock';
import {
  addDays,
  dateOnlyToLocalDate,
  daysInclusive,
  isLocalDate,
  localMidnightUtc,
  mondayOf,
  previousRange,
  rangeWindow,
  toLocalDate,
  weeksOverlapping,
} from '../lib/time';

const TZ = 'Asia/Ho_Chi_Minh';

test('NOW is Mon 5 Oct 2026 09:00 in Ho Chi Minh City', () =>
  assert.equal(NOW.toISOString(), '2026-10-05T02:00:00.000Z'));

test('todayLocal is 5 Oct', () => assert.equal(todayLocal(TZ), '2026-10-05'));

test('22:30Z Sunday is Monday locally', () =>
  assert.equal(toLocalDate(new Date('2026-01-04T22:30:00Z'), TZ), '2026-01-05'));

test('16:59Z is still the same local day', () =>
  assert.equal(toLocalDate(new Date('2026-10-04T16:59:59Z'), TZ), '2026-10-04'));

test('localMidnightUtc', () =>
  assert.equal(localMidnightUtc('2026-09-07', TZ).toISOString(), '2026-09-06T17:00:00.000Z'));

test('localMidnightUtc handles a DST zone', () => {
  // New York switched to EDT (UTC-4) on 8 Mar 2026.
  assert.equal(localMidnightUtc('2026-03-07', 'America/New_York').toISOString(), '2026-03-07T05:00:00.000Z');
  assert.equal(localMidnightUtc('2026-03-09', 'America/New_York').toISOString(), '2026-03-09T04:00:00.000Z');
});

test('rangeWindow end is exclusive next local midnight', () =>
  assert.deepEqual(rangeWindow({ from: '2026-09-07', to: '2026-10-04' }, TZ), {
    start: new Date('2026-09-06T17:00:00Z'),
    end: new Date('2026-10-04T17:00:00Z'),
  }));

test('mondayOf', () => {
  assert.equal(mondayOf('2026-10-04'), '2026-09-28');
  assert.equal(mondayOf('2026-09-28'), '2026-09-28');
});

test('previousRange of 28 days', () =>
  assert.deepEqual(previousRange({ from: '2026-09-07', to: '2026-10-04' }), { from: '2026-08-10', to: '2026-09-06' }));

test('previousRange of one day', () =>
  assert.deepEqual(previousRange({ from: '2026-09-08', to: '2026-09-08' }), { from: '2026-09-07', to: '2026-09-07' }));

test('weeksOverlapping flags partial weeks', () =>
  assert.deepEqual(weeksOverlapping({ from: '2026-09-30', to: '2026-10-05' }), [
    { weekStart: '2026-09-28', weekEnd: '2026-10-04', partial: true },
    { weekStart: '2026-10-05', weekEnd: '2026-10-11', partial: true },
  ]));

test('weeksOverlapping full weeks', () =>
  assert.deepEqual(
    weeksOverlapping({ from: '2026-09-21', to: '2026-10-04' }).map((w) => w.partial),
    [false, false],
  ));

test('isLocalDate', () => {
  assert.ok(isLocalDate('2026-02-28'));
  assert.ok(!isLocalDate('2026-02-30'));
  assert.ok(!isLocalDate('2026-9-1'));
  assert.ok(!isLocalDate('2026-13-40'));
});

test('addDays crosses month', () => assert.equal(addDays('2026-09-28', 7), '2026-10-05'));

test('daysInclusive', () => assert.equal(daysInclusive({ from: '2026-09-07', to: '2026-10-04' }), 28));

test('dateOnlyToLocalDate', () => assert.equal(dateOnlyToLocalDate(new Date('2026-10-01T00:00:00Z')), '2026-10-01'));
