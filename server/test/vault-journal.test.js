const { test, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes, fakeQuery, pretendConnected } = require('./helpers');
const Entry = require('../src/models/Entry');
const User = require('../src/models/User');
const CrushProfile = require('../src/models/CrushProfile');
const entryController = require('../src/controllers/entryController');

const original = { create: Entry.create, find: Entry.find, userFindById: User.findById, crushFind: CrushProfile.find };
let undoConnected = () => {};
afterEach(() => {
  Entry.create = original.create; Entry.find = original.find;
  User.findById = original.userFindById; CrushProfile.find = original.crushFind;
  undoConnected();
});

const FRIEND = 'aaaaaaaaaaaaaaaaaaaaaaa2';

test('a Vault journal entry is never shared, even if the app asks (DEX-43)', async () => {
  undoConnected = pretendConnected();
  let created = null;
  Entry.create = async (doc) => { created = doc; return { ...doc, _id: 'e1' }; };
  const res = fakeRes();
  await entryController.createEntry(fakeReq({ body: {
    crushId: 'private_vault', type: 'PrivateJournal', content: 'only me', visibility: [FRIEND], taggedCrushId: 'crush123'
  } }), res);
  assert.strictEqual(res.statusCode, 201, JSON.stringify(res.body));
  assert.deepStrictEqual(created.visibility, []);
  assert.strictEqual(created.taggedCrushId, 'crush123');
});

test("friends' shared entries never include anyone's Vault journal", async () => {
  undoConnected = pretendConnected();
  User.findById = () => fakeQuery({ friends: [FRIEND], username: 'me' });
  CrushProfile.find = () => fakeQuery([]);
  const filters = [];
  Entry.find = (filter) => { filters.push(filter); return fakeQuery([]); };
  const res = fakeRes();
  await entryController.getSharedEntries(fakeReq(), res);
  const direct = filters.find((f) => f.visibility);
  assert.ok(direct, 'the direct-share query ran');
  assert.ok(direct.type.$nin.includes('PrivateJournal'));
});
