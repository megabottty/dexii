const { test, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes, fakeQuery, pretendConnected } = require('./helpers');
const User = require('../src/models/User');
const authController = require('../src/controllers/authController');

const originalUpdate = User.findByIdAndUpdate;
let undoConnected = () => {};
afterEach(() => { User.findByIdAndUpdate = originalUpdate; undoConnected(); });

test('saving a first and last name from the app sets them on the user (DEX-53)', async () => {
  undoConnected = pretendConnected();
  let update = null;
  User.findByIdAndUpdate = (id, change) => { update = change.$set; return fakeQuery({ profileSettings: {}, firstName: 'Michelle', lastName: 'Grange' }); };
  const res = fakeRes();
  await authController.updateProfileSettings(fakeReq({ body: { firstName: '  Michelle ', lastName: ' Grange' } }), res);
  assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
  assert.strictEqual(update.firstName, 'Michelle');
  assert.strictEqual(update.lastName, 'Grange');
});

test('a first name cannot be saved blank', async () => {
  undoConnected = pretendConnected();
  const res = fakeRes();
  await authController.updateProfileSettings(fakeReq({ body: { firstName: '   ' } }), res);
  assert.strictEqual(res.statusCode, 400);
});
