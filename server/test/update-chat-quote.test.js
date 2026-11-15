const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes, fakeQuery, pretendConnected } = require('./helpers');
const User = require('../src/models/User');
const CrushProfile = require('../src/models/CrushProfile');
const Entry = require('../src/models/Entry');
const Message = require('../src/models/Message');
const FriendActivity = require('../src/models/FriendActivity');
const chatPush = require('../src/services/chatPush');
const { react } = require('../src/controllers/updateActivityController');
const { sendMessage } = require('../src/controllers/messageController');
const { quoteForUpdate } = require('../src/services/updateQuote');

// DEX-71: friends react to a shared crush's updates, and reply in chat with the update quoted.
const OWNER = '6aab389c4cdfe3aa2ae76a8d';
const FRIEND = '6aa2f82237d736a1196c9e1d';
const STRANGER = '6aa2f82237d736a1196c9e1f';
const SHARED_CRUSH = '6ab000000000000000000001';
const PRIVATE_CRUSH = '6ab000000000000000000002';
const NEW_UPDATE = '6ac000000000000000000001';
const OLD_UPDATE = '6ac000000000000000000002';
const PRIVATE_UPDATE = '6ac000000000000000000003';
const SHARED_AT = new Date('2026-11-01T12:00:00Z');

const crushes = {
  [SHARED_CRUSH]: { _id: SHARED_CRUSH, userId: OWNER, nickname: 'Alex', status: 'Dating', visibility: [FRIEND] },
  [PRIVATE_CRUSH]: { _id: PRIVATE_CRUSH, userId: OWNER, nickname: 'Sam', status: 'Crush', visibility: [] }
};

/** An update document with just enough of Mongoose's shape for the react handler. */
const updateDoc = (id, crushId, timestamp, content = 'We went to the farmers market and he bought me flowers. Then we got tacos and talked for three hours straight.') => ({
  _id: id, crushId, userId: OWNER, type: 'Update', content, timestamp, visibility: [], reactions: [], comments: [],
  saved: false,
  async save() { this.saved = true; return this; },
  toObject() { return { ...this }; }
});

let entries; let undo; let saved;
beforeEach(() => {
  undo = pretendConnected();
  entries = {
    [NEW_UPDATE]: updateDoc(NEW_UPDATE, SHARED_CRUSH, new Date('2026-11-10T12:00:00Z')),
    [OLD_UPDATE]: updateDoc(OLD_UPDATE, SHARED_CRUSH, new Date('2026-10-20T12:00:00Z')),
    [PRIVATE_UPDATE]: updateDoc(PRIVATE_UPDATE, PRIVATE_CRUSH, new Date('2026-11-10T12:00:00Z'))
  };
  saved = {
    userFindById: User.findById, userFind: User.find, crushFindById: CrushProfile.findById,
    entryFindById: Entry.findById, activityFind: FriendActivity.find, messageSave: Message.prototype.save,
    push: chatPush.notifyDirectMessage
  };
  // The owner and friend are friends; the stranger isn't friends with anyone.
  User.findById = (id) => fakeQuery({
    [OWNER]: { _id: OWNER, friends: [FRIEND], username: 'owner' },
    [FRIEND]: { _id: FRIEND, friends: [OWNER], username: 'friend' },
    [STRANGER]: { _id: STRANGER, friends: [], username: 'stranger' }
  }[String(id)] || null);
  User.find = () => fakeQuery([]);
  CrushProfile.findById = (id) => fakeQuery(crushes[String(id)] || null);
  // findById resolves straight to the doc (react calls save on it); .lean() is chained by the quote helper.
  Entry.findById = (id) => fakeQuery(entries[String(id)] || null);
  // The shared crush was shared with the friend on 1 Nov.
  FriendActivity.find = (filter) => fakeQuery(String(filter.counterpart) === FRIEND
    ? [{ crushId: SHARED_CRUSH, createdAt: SHARED_AT }]
    : []);
  Message.prototype.save = async function save() { return this; };
  chatPush.notifyDirectMessage = async () => {};
});
afterEach(() => {
  undo();
  User.findById = saved.userFindById; User.find = saved.userFind; CrushProfile.findById = saved.crushFindById;
  Entry.findById = saved.entryFindById; FriendActivity.find = saved.activityFind; Message.prototype.save = saved.messageSave;
  chatPush.notifyDirectMessage = saved.push;
});

const reactAs = async (userId, entryId, emoji = '😍') => {
  const res = fakeRes();
  await react(fakeReq({ userId, params: { id: entryId }, body: { emoji } }), res);
  return res;
};

test('a friend can react to an update on a crush shared with them', async () => {
  const res = await reactAs(FRIEND, NEW_UPDATE);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(entries[NEW_UPDATE].reactions.map((r) => [String(r.userId), r.emoji]), [[FRIEND, '😍']]);
  assert.ok(entries[NEW_UPDATE].saved);
});

test("a friend can't react to an update posted before the crush was shared with them", async () => {
  const res = await reactAs(FRIEND, OLD_UPDATE);
  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(entries[OLD_UPDATE].reactions.length, 0);
});

test("a friend can't react to an update on a crush that isn't shared with them", async () => {
  const res = await reactAs(FRIEND, PRIVATE_UPDATE);
  assert.strictEqual(res.statusCode, 404);
});

test("someone who isn't the owner's friend can't react", async () => {
  const res = await reactAs(STRANGER, NEW_UPDATE);
  assert.strictEqual(res.statusCode, 404);
});

test('the owner can still react to their own update', async () => {
  const res = await reactAs(OWNER, PRIVATE_UPDATE);
  assert.strictEqual(res.statusCode, 200);
});

test('the quote is built from the update: crush name and a short excerpt', async () => {
  const quote = await quoteForUpdate(FRIEND, NEW_UPDATE);
  assert.strictEqual(String(quote.entryId), NEW_UPDATE);
  assert.strictEqual(String(quote.crushId), SHARED_CRUSH);
  assert.strictEqual(String(quote.ownerId), OWNER);
  assert.strictEqual(quote.crushName, 'Alex');
  assert.ok(quote.excerpt.startsWith('We went to the farmers market'));
  assert.ok(quote.excerpt.length <= 101, 'excerpt is trimmed to about 100 characters');
  assert.ok(quote.excerpt.endsWith('…'));
});

test("there's no quote for an update you can't see", async () => {
  assert.strictEqual(await quoteForUpdate(FRIEND, PRIVATE_UPDATE), null);
  assert.strictEqual(await quoteForUpdate(STRANGER, NEW_UPDATE), null);
});

test('a chat message to the owner keeps the quoted update attached', async () => {
  const res = fakeRes();
  await sendMessage(fakeReq({ userId: FRIEND, body: { recipientId: OWNER, content: 'omg tell me everything', quoteEntryId: NEW_UPDATE } }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.quote.crushName, 'Alex');
  assert.ok(res.body.quote.excerpt.startsWith('We went to the farmers market'));
  assert.strictEqual(String(res.body.relatedEntryId), NEW_UPDATE);
  assert.strictEqual(String(res.body.crushId), SHARED_CRUSH);
});

test("a message can't quote an update you can't see", async () => {
  const res = fakeRes();
  await sendMessage(fakeReq({ userId: FRIEND, body: { recipientId: OWNER, content: 'hi', quoteEntryId: PRIVATE_UPDATE } }), res);
  assert.strictEqual(res.statusCode, 403);
});
