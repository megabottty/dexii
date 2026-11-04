/**
 * Live socket relays. The browser only says *which* saved message to announce; everything
 * that goes out is read back from the database, and only to the people in that chat.
 */
const mongoose = require('mongoose');

const isId = (value) => mongoose.isValidObjectId(String(value || ''));
const same = (a, b) => String(a) === String(b);

/** "sendMessage": a 1:1 message the sender already saved over REST. */
const relayChatMessage = async ({ io, userId, data, Message }) => {
  if (!isId(data?.messageId)) return;
  const message = await Message.findById(data.messageId).lean();
  if (!message || !message.recipient || !same(message.sender, userId) || message.deletedAt) return;
  io.to(String(message.recipient)).emit('receiveMessage', {
    senderId: String(message.sender),
    recipientId: String(message.recipient),
    content: message.content,
    isSafetyAlert: !!message.isSafetyAlert,
    crushId: message.crushId ? String(message.crushId) : undefined,
    relatedEntryId: message.relatedEntryId ? String(message.relatedEntryId) : undefined,
    isSelfDestruct: !!message.isSelfDestruct,
    selfDestructDurationMs: message.selfDestructDurationMs,
    messageId: String(message._id),
    timestamp: new Date(message.createdAt || Date.now()).toISOString()
  });
};

/** "messageReaction": tells the other people in a chat about a saved reaction change. */
const relayReaction = async ({ io, userId, data, Message, GroupChat }) => {
  const id = data?.message?._id || data?.message?.id;
  if (!isId(id)) return;
  const message = await Message.findById(id).lean();
  if (!message) return;

  let people = [];
  if (message.group) {
    const group = await GroupChat.findById(message.group).select('members').lean();
    people = (group?.members || []).map(String);
  } else {
    people = [message.sender, message.recipient].filter(Boolean).map(String);
  }
  if (!people.includes(String(userId))) return;

  const payload = { _id: String(message._id), reactions: (message.reactions || []).map((r) => ({ user: String(r.user), emoji: r.emoji })) };
  for (const person of people) {
    if (!same(person, userId)) io.to(person).emit('messageReactionUpdated', payload);
  }
};

/** "safetyAlert": a friend's live safety status, with nothing but the safety fields. */
const relaySafetyAlert = async ({ io, userId, data, areFriends }) => {
  const recipientId = data?.recipientId;
  if (!recipientId || !(await areFriends(userId, recipientId))) return;
  const payload = { senderId: String(userId), recipientId: String(recipientId) };
  for (const field of ['status', 'location', 'crushId']) {
    if (typeof data[field] === 'string' && data[field]) payload[field] = data[field].slice(0, 300);
  }
  io.to(String(recipientId)).emit('safetyUpdate', payload);
};

module.exports = { relayChatMessage, relayReaction, relaySafetyAlert };
