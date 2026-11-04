const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes, fakeQuery, pretendConnected } = require('./helpers');
const User = require('../src/models/User');
const FriendRequest = require('../src/models/FriendRequest');
const Invite = require('../src/models/Invite');
const { searchUsers } = require('../src/controllers/friendController');

const ME = '6aa2f82237d736a1196c9e1d';
const BLOCKED = '6aa35987a3d810029177b705';
const stranger = { _id: '6aab389c4cdfe3aa2ae76a8d', username: 'fox', displayName: 'Fox', email: 'fox@example.com', phoneE164: '+15555550100', avatarUrl: '' };

let undo; let saved; let filters;
beforeEach(() => {
  undo = pretendConnected();
  saved = { find: User.find, findById: User.findById, frFind: FriendRequest.find, inviteFindOne: Invite.findOne };
  filters = [];
  User.find = (filter) => { filters.push(filter); return fakeQuery([{ ...stranger }]); };
  User.findById = () => fakeQuery({ _id: ME, friends: [], blockedUsers: [BLOCKED] });
  FriendRequest.find = () => fakeQuery([]);
  Invite.findOne = () => fakeQuery(null);
});
afterEach(() => {
  undo();
  User.find = saved.find; User.findById = saved.findById; FriendRequest.find = saved.frFind; Invite.findOne = saved.inviteFindOne;
});

const search = async (query) => {
  const res = fakeRes();
  await searchUsers(fakeReq({ userId: ME, query: { query } }), res);
  assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
  return res.body;
};

test('searching by name never returns anyone\'s email or phone number', async () => {
  const [result] = await search('fo');
  assert.strictEqual(result.username, 'fox');
  assert.strictEqual(result.email, undefined);
  assert.strictEqual(result.phoneE164, undefined);
});

test('searching by an exact email shows only the email you typed, not their phone', async () => {
  const [result] = await search('fox@example.com');
  assert.strictEqual(result.email, 'fox@example.com');
  assert.strictEqual(result.phoneE164, undefined);
});

test('searching by an exact phone shows only that phone, not their email', async () => {
  const [result] = await search('+1 555 555 0100');
  assert.strictEqual(result.phoneE164, '+15555550100');
  assert.strictEqual(result.email, undefined);
});

test('people you blocked, and people who blocked you, are left out of the search', async () => {
  await search('fo');
  const filter = filters[filters.length - 1];
  const excluded = (filter._id?.$nin || []).map(String);
  assert.ok(excluded.includes(BLOCKED), 'blocked user not excluded');
  assert.ok(excluded.includes(ME), 'searcher not excluded');
  assert.deepStrictEqual(filter.blockedUsers, { $ne: ME });
});
