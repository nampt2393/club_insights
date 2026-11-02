import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiUrl } from '../lib/client/url';
import { deltaTone, formatDelta, formatLocalDate, formatRange, formatSessionTime, formatWeek, weekTickLabel } from '../lib/format';

test('formatDelta up, no percentage', () => assert.deepEqual(formatDelta(89, 88), { text: '▲ +1', direction: 'up' }));
test('formatDelta down, no percentage', () => assert.deepEqual(formatDelta(15, 20), { text: '▼ −5', direction: 'down' }));
test('formatDelta flat', () => assert.deepEqual(formatDelta(20, 20), { text: 'No change', direction: 'flat' }));
test('formatDelta unknown', () => {
  assert.deepEqual(formatDelta(15, null), { text: '—', direction: 'none' });
  assert.deepEqual(formatDelta(null, 15), { text: '—', direction: 'none' });
});
test('formatSessionTime is club-local', () =>
  assert.equal(formatSessionTime('2026-01-04T22:30:00Z', 'Asia/Ho_Chi_Minh'), 'Mon 5 Jan, 05:30'));
test('formatRange same year', () => assert.equal(formatRange({ from: '2026-09-07', to: '2026-10-04' }), '7 Sep – 4 Oct'));
test('formatRange cross year', () => assert.equal(formatRange({ from: '2025-12-01', to: '2026-10-05' }), '1 Dec 2025 – 5 Oct 2026'));
test('formatRange single day', () => assert.equal(formatRange({ from: '2026-09-08', to: '2026-09-08' }), '8 Sep'));
test('formatWeek', () => assert.equal(formatWeek('2026-09-28', '2026-10-04'), 'Mon 28 Sep – Sun 4 Oct'));
test('formatLocalDate', () => assert.equal(formatLocalDate('2026-10-01'), '1 Oct 2026'));
test('apiUrl omits empty', () => assert.equal(apiUrl('/api/clubs/club-001/summary', {}), '/api/clubs/club-001/summary'));
test('apiUrl adds range', () =>
  assert.equal(apiUrl('/api/clubs/club-001/summary', { from: '2026-09-07', to: '2026-10-04' }), '/api/clubs/club-001/summary?from=2026-09-07&to=2026-10-04'));

test('weekTickLabel marks the current week', () => {
  assert.equal(weekTickLabel('2026-10-05', '2026-10-05'), 'This week');
  assert.equal(weekTickLabel('2026-09-28', '2026-10-05'), '28 Sep');
});
test('deltaTone colours only comparable changes', () => {
  assert.equal(deltaTone('down', 'down', true), 'good');
  assert.equal(deltaTone('up', 'down', true), 'bad');
  assert.equal(deltaTone('down', 'down', false), 'neutral');
  assert.equal(deltaTone('flat', 'up', true), 'neutral');
});
