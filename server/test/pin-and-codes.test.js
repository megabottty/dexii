const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { fakeReq, fakeRes, fakeQuery, pretendConnected } = require('./helpers');
const User = require('../src/models/User');
const auth = require('../src/controllers/authController');
const { MAX_FAILURES } = require('../src/services/attemptGuard');

const ID = '6aa2f82237d736a1196c9e1d';
let undo; let saved; let account; let updates;

beforeEach(() => {
  undo = pretendConnected();
  saved = { findById: User.findById, findOne: User.findOne, updateOne: User.updateOne };
  account = { _id: ID, username: 'megan', email: 'megan@example.com', pin: bcrypt.hashSync('1234', 4), securityAttempts: {},
    passwordResetCode: '123456', passwordResetCodeExpires: Date.now() + 600000, save: async () => {} };
  updates = [];
  User.findById = (id) => fakeQuery(String(id) === ID ? account : null);
  User.findOne = (filter) => {
    const text = JSON.stringify(filter);
    return fakeQuery(text.includes('megan') ? account : null);
  };
  // Persist what the handler writes, so the next try sees it.
  User.updateOne = (filter, update) => {
    updates.push(update);
    if (update.$set) for (const [key, value] of Object.entries(update.$set)) setPath(account, key, value);
    if (update.$unset) for (const key of Object.keys(update.$unset)) setPath(account, key, undefined);
    return fakeQuery({ acknowledged: true });
  };
});
afterEach(() => { undo(); Object.assign(User, saved); });

function setPath(obj, path, value) {
  const keys = path.split('.');
  let target = obj;
  for (const key of keys.slice(0, -1)) target = target[key] = target[key] || {};
  target[keys[keys.length - 1]] = value;
}

const tryPin = async (pin, username = 'megan') => {
  const res = fakeRes();
  await auth.verifyPin({ ...fakeReq(), user: undefined, body: { pin, username } }, res);
  return res;
};

test('an unknown account gets the same answer as a wrong PIN', async () => {
  const res = await tryPin('1111', 'nobody-here');
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.message, 'Incorrect PIN');
});

test('after too many wrong PINs, even the right PIN is refused for a while', async () => {
  for (let i = 0; i < MAX_FAILURES; i += 1) assert.strictEqual((await tryPin('0000')).statusCode, 400);
  const res = await tryPin('1234');
  assert.strictEqual(res.statusCode, 429);
  assert.match(res.body.message, /Too many tries/);
});

test('the right PIN works and clears earlier wrong tries', async () => {
  await tryPin('0000');
  const res = await tryPin('1234');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(updates.some((u) => u.$unset && 'securityAttempts.pin' in u.$unset), 'wrong tries not cleared');
});

test('after too many wrong reset codes, even the right code is refused', async () => {
  const reset = async (code) => {
    const res = fakeRes();
    await auth.resetPassword(fakeReq({ body: { usernameOrEmail: 'megan', code, password: 'new-password-1' } }), res);
    return res;
  };
  for (let i = 0; i < MAX_FAILURES; i += 1) assert.strictEqual((await reset('000000')).statusCode, 400);
  const res = await reset('123456');
  assert.strictEqual(res.statusCode, 429);
});

test('after too many wrong email codes, even the right code is refused', async () => {
  account.verificationCode = '654321';
  account.verificationCodeExpires = Date.now() + 600000;
  const verify = async (code) => {
    const res = fakeRes();
    await auth.verifyEmail(fakeReq({ body: { username: 'megan', code } }), res);
    return res;
  };
  for (let i = 0; i < MAX_FAILURES; i += 1) assert.strictEqual((await verify('000000')).statusCode, 400);
  assert.strictEqual((await verify('654321')).statusCode, 429);
});
