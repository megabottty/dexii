const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes, fakeQuery, pretendConnected } = require('./helpers');
const User = require('../src/models/User');
const { getFeedSeen, markFeedSeen } = require('../src/controllers/feedSeenController');

// DEX-45 follow-up: The Tea's Feed remembers, per account, when you last looked, so new rows show bold.
const ME = '6aa2f82237d736a1196c9e1d';
let undo; let saved; let stored; let updates;
beforeEach(() => {
  undo = pretendConnected();
  stored = null;
  updates = [];
  saved = { findById: User.findById, updateOne: User.updateOne };
  User.findById = () => fakeQuery({ _id: ME, feedSeenAt: stored });
  // Applies the "only move forward" filter the handler sends, like Mongo would.
  User.updateOne = async (filter, update) => {
    updates.push({ filter, update });
    const next = update.$set.feedSeenAt;
    if (!stored || stored < next) stored = next;
    return { acknowledged: true };
  };
});
afterEach(() => { undo(); User.findById = saved.findById; User.updateOne = saved.updateOne; });

test('a new account has never seen the Feed', async () => {
  const res = fakeRes();
  await getFeedSeen(fakeReq({ userId: ME }), res);
  assert.deepStrictEqual(res.body, { feedSeenAt: null });
});

test('marking the Feed seen saves that time and returns it', async () => {
  const seenAt = '2026-11-15T10:00:00.000Z';
  const res = fakeRes();
  await markFeedSeen(fakeReq({ userId: ME, body: { seenAt } }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(new Date(res.body.feedSeenAt).toISOString(), seenAt);
  // The update only applies when it moves the time forward.
  assert.ok(JSON.stringify(updates[0].filter).includes('$lt'));
});

test('an older time never moves it backwards (two devices, one behind)', async () => {
  stored = new Date('2026-11-15T12:00:00Z');
  const res = fakeRes();
  await markFeedSeen(fakeReq({ userId: ME, body: { seenAt: '2026-11-14T12:00:00Z' } }), res);
  assert.strictEqual(new Date(res.body.feedSeenAt).toISOString(), '2026-11-15T12:00:00.000Z');
});

test('a time in the future is capped at now', async () => {
  const before = Date.now();
  const res = fakeRes();
  await markFeedSeen(fakeReq({ userId: ME, body: { seenAt: '2099-01-01T00:00:00Z' } }), res);
  assert.ok(new Date(res.body.feedSeenAt).getTime() <= Date.now());
  assert.ok(new Date(res.body.feedSeenAt).getTime() >= before - 1000);
});

test('a missing or broken time means now', async () => {
  const res = fakeRes();
  await markFeedSeen(fakeReq({ userId: ME, body: { seenAt: 'not a date' } }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Math.abs(new Date(res.body.feedSeenAt).getTime() - Date.now()) < 5000);
});
