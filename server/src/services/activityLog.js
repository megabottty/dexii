/**
 * Writes the history between friends. Fire-and-forget: callers never await
 * delivery, and nothing here can fail the request that triggered it.
 */
const mongoose = require('mongoose');
const FriendActivity = require('../models/FriendActivity');

const isId = (value) => mongoose.isValidObjectId(value);

/**
 * recordActivity({ io, actor, counterpart, type, crushId, entryId, requestId, inviteId,
 *                  messageId, meta, visibleTo, createdAt, source })
 * `visibleTo` defaults to both people. Returns the saved row or null.
 */
async function recordActivity({ io, actor, counterpart, type, crushId, entryId, requestId, inviteId, messageId, meta, visibleTo, createdAt, source } = {}) {
  try {
    if (mongoose.connection.readyState !== 1 || !actor || !type) return null;
    if (!isId(actor) || (counterpart && !isId(counterpart))) return null;
    const people = (visibleTo || [actor, counterpart]).filter(Boolean).map(String);
    const row = {
      actor,
      counterpart: counterpart || undefined,
      pair: counterpart ? FriendActivity.pairKey(actor, counterpart) : `solo:${actor}`,
      type,
      crushId: crushId ? String(crushId) : undefined,
      entryId: entryId ? String(entryId) : undefined,
      requestId: requestId ? String(requestId) : undefined,
      inviteId: inviteId ? String(inviteId) : undefined,
      messageId: messageId ? String(messageId) : undefined,
      meta: meta || {},
      visibleTo: [...new Set(people)],
      createdAt: createdAt || new Date()
    };
    if (source) row.source = source;
    const saved = source
      ? await FriendActivity.findOneAndUpdate({ source }, { $setOnInsert: row }, { upsert: true, new: true })
      : await FriendActivity.create(row);
    if (io) {
      for (const id of row.visibleTo) {
        try { io.to(String(id)).emit('activityChanged', { type, pair: row.pair }); } catch { /* ignore */ }
      }
    }
    return saved;
  } catch (err) {
    if (err?.code !== 11000) console.warn('Recording activity failed:', err.message);
    return null;
  }
}

module.exports = { recordActivity };
