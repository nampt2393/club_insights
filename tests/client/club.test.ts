import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickClub } from '../../lib/client/club';

const clubs = [
  { id: 'club-001', name: 'A', timeZone: 'Asia/Ho_Chi_Minh', createdAt: '2025-12-01' },
  { id: 'club-002', name: 'B', timeZone: 'Asia/Ho_Chi_Minh', createdAt: '2026-10-01' },
];

test('pickClub defaults to the first club when none requested', () => assert.deepEqual(pickClub(clubs, null), { club: clubs[0] }));
test('pickClub finds the requested club', () => assert.deepEqual(pickClub(clubs, 'club-002'), { club: clubs[1] }));
test('pickClub reports an unknown club instead of substituting', () =>
  assert.deepEqual(pickClub(clubs, 'club-999'), { notFound: 'club-999' }));
