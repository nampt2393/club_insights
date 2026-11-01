import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFINITIONS } from '../lib/copy';

// The code counts a player who missed one session but played another, so the definition must
// exclude absent *bookings*, not absent players.
test('active players definition excludes absent bookings, not players', () => {
  assert.match(DEFINITIONS.activePlayers, /booking marked absent doesn't count/i);
  assert.doesNotMatch(DEFINITIONS.activePlayers, /players marked absent/i);
});
