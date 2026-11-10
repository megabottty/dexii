const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes, fakeQuery, pretendConnected } = require('./helpers');
const User = require('../src/models/User');
const { saveThemeInterest } = require('../src/controllers/authController');

// DEX-66: themes are free during beta; the first time someone picks one we ask
// whether they'd pay $1.99, and keep their first answer.
const ME = '6aa2f82237d736a1196c9e1d';

let undo; let saved; let stored; let calls;
beforeEach(() => {
  undo = pretendConnected();
  saved = { findOneAndUpdate: User.findOneAndUpdate, findById: User.findById };
  stored = null;
  calls = [];
  // Behaves like Mongo: only writes when no answer is stored yet.
  User.findOneAndUpdate = (filter, update) => {
    calls.push({ filter, update });
    if (stored) return fakeQuery(null);
    stored = update.$set.themeInterest;
    return fakeQuery({ _id: ME, themeInterest: stored });
  };
  User.findById = () => fakeQuery({ _id: ME, themeInterest: stored });
});
afterEach(() => {
  undo();
  User.findOneAndUpdate = saved.findOneAndUpdate; User.findById = saved.findById;
});

const answer = async (body) => {
  const res = fakeRes();
  await saveThemeInterest(fakeReq({ userId: ME, body }), res);
  return res;
};

test('saves the answer with the theme and the price asked', async () => {
  const res = await answer({ answer: 'yes', theme: 'gothic', price: 1.99 });
  assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
  assert.strictEqual(stored.answer, 'yes');
  assert.strictEqual(stored.theme, 'gothic');
  assert.strictEqual(stored.price, 1.99);
  assert.ok(stored.answeredAt instanceof Date);
  assert.deepStrictEqual(calls[0].filter['themeInterest.answer'], { $exists: false });
});

test('rejects an answer that is not yes, maybe or no', async () => {
  const res = await answer({ answer: 'definitely', theme: 'gothic', price: 1.99 });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(stored, null);
});

test('keeps the first answer; a second one does not overwrite it', async () => {
  await answer({ answer: 'maybe', theme: 'pearl', price: 1.99 });
  const res = await answer({ answer: 'no', theme: 'onyx', price: 1.99 });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(stored.answer, 'maybe');
  assert.strictEqual(res.body.themeInterest.answer, 'maybe');
});
