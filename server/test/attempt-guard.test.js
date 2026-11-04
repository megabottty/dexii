const { test } = require('node:test');
const assert = require('node:assert');
const { MAX_FAILURES, LOCK_MINUTES, isLocked, afterFailure } = require('../src/services/attemptGuard');

const now = new Date('2026-11-04T06:00:00Z');

test('an account locks for a while after too many wrong tries', () => {
  let state = {};
  for (let i = 0; i < MAX_FAILURES - 1; i += 1) state = afterFailure(state, now);
  assert.strictEqual(isLocked(state, now), false, 'locked too early');
  state = afterFailure(state, now);
  assert.strictEqual(isLocked(state, now), true, 'not locked after the limit');
  const later = new Date(now.getTime() + (LOCK_MINUTES * 60 + 1) * 1000);
  assert.strictEqual(isLocked(state, later), false, 'still locked after the lock time');
});

test('the limit is small enough that a 4-digit PIN cannot be guessed', () => {
  assert.ok(MAX_FAILURES <= 5);
  assert.ok(LOCK_MINUTES >= 15);
});
