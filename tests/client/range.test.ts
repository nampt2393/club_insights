import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestedRange } from '../../lib/client/range';

// The API requires ?from&to, so the client picks the default range itself.
test('no range in the URL → last 4 complete weeks', () =>
  assert.deepEqual(requestedRange(null, null, '2025-12-01', '2026-10-05'), { from: '2026-09-07', to: '2026-10-04' }));

test('no range in the URL, new club → creation to today', () =>
  assert.deepEqual(requestedRange(null, null, '2026-10-01', '2026-10-05'), { from: '2026-10-01', to: '2026-10-05' }));

test('range in the URL is sent as is', () =>
  assert.deepEqual(requestedRange('2026-09-28', '2026-10-04', '2025-12-01', '2026-10-05'), { from: '2026-09-28', to: '2026-10-04' }));

// Half a range isn't filled in: the API's 400 tells the host what's wrong with the link.
test('half a range is sent as is', () =>
  assert.deepEqual(requestedRange('2026-09-28', null, '2025-12-01', '2026-10-05'), { from: '2026-09-28', to: undefined }));
