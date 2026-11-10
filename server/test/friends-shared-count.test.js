const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes, fakeQuery, pretendConnected } = require('./helpers');
const User = require('../src/models/User');
const CrushProfile = require('../src/models/CrushProfile');
const { getFriends } = require('../src/controllers/friendController');

// DEX-52: each friend on the Inner Circle shows how many crushes they share with me.
const ME = '6aa2f82237d736a1196c9e1d';
const MICHELLE = '6aab389c4cdfe3aa2ae76a8d';
const SAM = '6aa35987a3d810029177b705';
const crushes = [
  { userId: MICHELLE, visibility: [ME], status: 'Dating' },
  { userId: MICHELLE, visibility: ['me'], status: 'Crush' }, // older username form of the share list
  { userId: MICHELLE, visibility: [ME], status: 'Archived' },
  { userId: MICHELLE, visibility: [], status: 'Crush' },
  { userId: SAM, visibility: [SAM], status: 'Crush' }
];

let undo; let saved; let crushFilter;
beforeEach(() => {
  undo = pretendConnected();
  saved = { findById: User.findById, crushFind: CrushProfile.find };
  User.findById = () => fakeQuery({
    _id: ME, username: 'me', pausedFriends: [], friendshipProfiles: [],
    friends: [{ _id: MICHELLE, username: 'mgrange' }, { _id: SAM, username: 'sam' }]
  });
  CrushProfile.find = (filter) => {
    crushFilter = filter;
    const audience = filter.visibility.$in.map(String);
    const owners = filter.userId.$in.map(String);
    return fakeQuery(crushes.filter((c) => owners.includes(c.userId)
      && c.visibility.some((v) => audience.includes(String(v)))
      && c.status !== filter.status.$ne));
  };
});
afterEach(() => {
  undo();
  User.findById = saved.findById; CrushProfile.find = saved.crushFind;
});

test('each friend comes with how many crushes they share with me, not counting archived ones', async () => {
  const res = fakeRes();
  await getFriends(fakeReq({ userId: ME }), res);
  assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
  const byName = Object.fromEntries(res.body.map((f) => [f.username, f.sharedCrushCount]));
  assert.deepStrictEqual(byName, { mgrange: 2, sam: 0 });
  assert.deepStrictEqual(crushFilter.status, { $ne: 'Archived' });
});
