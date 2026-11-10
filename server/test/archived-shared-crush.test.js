const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes, fakeQuery, pretendConnected } = require('./helpers');
const User = require('../src/models/User');
const CrushProfile = require('../src/models/CrushProfile');
const Entry = require('../src/models/Entry');
const FriendActivity = require('../src/models/FriendActivity');
const { getFriendSharedCrushes, getSharedCrushById } = require('../src/controllers/crushController');
const { getSharedEntries } = require('../src/controllers/entryController');
const { canSeeCrushUpdates } = require('../src/services/updateAudience');

// DEX-61: when a friend archives a crush they shared with me, it disappears for me.
const ME = '6aa2f82237d736a1196c9e1d';
const FRIEND = '6aab389c4cdfe3aa2ae76a8d';
const ACTIVE_ID = '6ab000000000000000000001';
const ARCHIVED_ID = '6ab000000000000000000002';
const active = { _id: ACTIVE_ID, userId: FRIEND, nickname: 'Alex', status: 'Dating', visibility: [ME] };
const archived = { _id: ARCHIVED_ID, userId: FRIEND, nickname: 'Costco Twerp', status: 'Archived', visibility: [ME] };
const crushes = [active, archived];

// Applies the parts of a Mongo filter these handlers use, so the test checks the
// query itself and not just what the stub happens to return.
const matches = (crush, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  const value = crush[key];
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if ('$ne' in cond) return value !== cond.$ne;
    if ('$in' in cond) {
      const wanted = cond.$in.map(String);
      return Array.isArray(value) ? value.map(String).some((v) => wanted.includes(v)) : wanted.includes(String(value));
    }
    return true;
  }
  return String(value) === String(cond);
});

let undo; let saved;
beforeEach(() => {
  undo = pretendConnected();
  saved = {
    userFindById: User.findById, userFind: User.find, crushFind: CrushProfile.find, crushFindById: CrushProfile.findById,
    entryFind: Entry.find, activityFind: FriendActivity.find
  };
  User.findById = (id) => fakeQuery(String(id) === ME
    ? { _id: ME, friends: [FRIEND], username: 'me' }
    : { _id: FRIEND, friends: [ME], username: 'megabot', displayName: 'Megabot' });
  User.find = () => fakeQuery([]);
  CrushProfile.find = (filter) => fakeQuery(crushes.filter((c) => matches(c, filter)).map((c) => ({ ...c })));
  CrushProfile.findById = (id) => fakeQuery(crushes.find((c) => c._id === String(id)) || null);
  Entry.find = (filter) => fakeQuery(filter.crushId
    ? filter.crushId.$in.map((crushId) => ({ _id: `e-${crushId}`, crushId, userId: FRIEND, type: 'Update', content: 'news', timestamp: new Date() }))
    : []);
  FriendActivity.find = () => fakeQuery([]);
});
afterEach(() => {
  undo();
  User.findById = saved.userFindById; User.find = saved.userFind; CrushProfile.find = saved.crushFind; CrushProfile.findById = saved.crushFindById;
  Entry.find = saved.entryFind; FriendActivity.find = saved.activityFind;
});

test("a friend's archived crush is not in the crushes they share with me", async () => {
  const res = fakeRes();
  await getFriendSharedCrushes(fakeReq({ userId: ME, params: { friendId: FRIEND } }), res);
  assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
  const ids = res.body.map((c) => String(c._id || c.id));
  assert.deepStrictEqual(ids, [ACTIVE_ID]);
});

test("opening a friend's archived crush from a link says it isn't there", async () => {
  const res = fakeRes();
  await getSharedCrushById(fakeReq({ userId: ME, params: { crushId: ARCHIVED_ID } }), res);
  assert.strictEqual(res.statusCode, 404);
});

test('the owner can still open their own archived crush', async () => {
  const res = fakeRes();
  await getSharedCrushById(fakeReq({ userId: FRIEND, params: { crushId: ARCHIVED_ID } }), res);
  assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
});

test("updates on a friend's archived crush don't reach me", async () => {
  const res = fakeRes();
  await getSharedEntries(fakeReq({ userId: ME }), res);
  assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
  const crushIds = res.body.map((e) => String(e.crushId));
  assert.ok(crushIds.includes(ACTIVE_ID), 'active crush update missing');
  assert.ok(!crushIds.includes(ARCHIVED_ID), 'archived crush update leaked');
});

test("a friend can't see or react to updates on an archived crush, but the owner can", async () => {
  assert.strictEqual(await canSeeCrushUpdates(ME, archived), false);
  assert.strictEqual(await canSeeCrushUpdates(ME, active), true);
  assert.strictEqual(await canSeeCrushUpdates(FRIEND, archived), true);
});
