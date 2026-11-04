const { test } = require('node:test');
const assert = require('node:assert');
require('./helpers');
const { relayChatMessage, relayReaction, relaySafetyAlert } = require('../src/services/socketRelays');

const ME = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const FRIEND = 'aaaaaaaaaaaaaaaaaaaaaaa2';
const STRANGER = 'aaaaaaaaaaaaaaaaaaaaaaa3';
const GROUP = 'bbbbbbbbbbbbbbbbbbbbbbb1';

/** A socket.io stand-in that records every emit as [room, event, payload]. */
const fakeIo = () => {
  const sent = [];
  return { sent, to: (room) => ({ emit: (event, payload) => sent.push([String(room), event, payload]) }) };
};
const models = (messages, groups = {}) => ({
  Message: { findById: (id) => ({ lean: async () => messages[String(id)] || null }) },
  GroupChat: { findById: (id) => ({ select: () => ({ lean: async () => groups[String(id)] || null }) }) }
});
const areFriends = async (a, b) => [a, b].sort().join() === [ME, FRIEND].sort().join();

const saved = {
  ccccccccccccccccccccccc1: { _id: 'ccccccccccccccccccccccc1', sender: ME, recipient: FRIEND, content: 'hi', createdAt: new Date('2026-11-04T06:00:00Z'), reactions: [] },
  ccccccccccccccccccccccc2: { _id: 'ccccccccccccccccccccccc2', sender: FRIEND, recipient: ME, content: 'theirs', createdAt: new Date(), reactions: [] },
  ccccccccccccccccccccccc3: { _id: 'ccccccccccccccccccccccc3', sender: FRIEND, group: GROUP, content: 'group hi', createdAt: new Date(), reactions: [{ user: ME, emoji: '😍' }] }
};
const groups = { [GROUP]: { members: [ME, FRIEND] } };

test('a chat message is relayed from what was saved, not from what the sender claims', async () => {
  const io = fakeIo();
  await relayChatMessage({ io, userId: ME, data: { messageId: 'ccccccccccccccccccccccc1', recipientId: FRIEND, content: 'FAKE', isSafetyAlert: true }, ...models(saved) });
  assert.strictEqual(io.sent.length, 1);
  const [room, event, payload] = io.sent[0];
  assert.strictEqual(room, FRIEND);
  assert.strictEqual(event, 'receiveMessage');
  assert.strictEqual(payload.content, 'hi');
  assert.strictEqual(payload.senderId, ME);
  assert.notStrictEqual(payload.isSafetyAlert, true);
});

test('an unsaved message, or someone else\'s message, is never relayed', async () => {
  const io = fakeIo();
  await relayChatMessage({ io, userId: ME, data: { recipientId: FRIEND, content: 'no id' }, ...models(saved) });
  await relayChatMessage({ io, userId: ME, data: { messageId: 'ccccccccccccccccccccccc2', recipientId: FRIEND }, ...models(saved) });
  await relayChatMessage({ io, userId: STRANGER, data: { messageId: 'ccccccccccccccccccccccc1', recipientId: FRIEND }, ...models(saved) });
  assert.deepStrictEqual(io.sent, []);
});

test('a reaction goes only to the people in that chat, with the saved reactions', async () => {
  const io = fakeIo();
  await relayReaction({ io, userId: ME, data: { message: { _id: 'ccccccccccccccccccccccc3', reactions: [{ user: STRANGER, emoji: '🔥' }] }, memberIds: [STRANGER] }, ...models(saved, groups) });
  assert.deepStrictEqual(io.sent.map(([room]) => room), [FRIEND]);
  assert.deepStrictEqual(io.sent[0][2].reactions, [{ user: ME, emoji: '😍' }]);
});

test('someone outside a chat cannot push reactions into it', async () => {
  const io = fakeIo();
  await relayReaction({ io, userId: STRANGER, data: { message: { _id: 'ccccccccccccccccccccccc3' } }, ...models(saved, groups) });
  await relayReaction({ io, userId: STRANGER, data: { message: { _id: 'ccccccccccccccccccccccc1' }, recipientId: FRIEND }, ...models(saved, groups) });
  assert.deepStrictEqual(io.sent, []);
});

test('a safety alert reaches friends only, with only the safety fields', async () => {
  const io = fakeIo();
  await relaySafetyAlert({ io, userId: ME, areFriends, data: { recipientId: FRIEND, status: 'Urgent', location: 'Park', crushId: 'c1', content: 'injected', senderId: STRANGER } });
  await relaySafetyAlert({ io, userId: STRANGER, areFriends, data: { recipientId: FRIEND, status: 'Urgent' } });
  assert.strictEqual(io.sent.length, 1);
  assert.deepStrictEqual(io.sent[0][2], { senderId: ME, recipientId: FRIEND, status: 'Urgent', location: 'Park', crushId: 'c1' });
});
