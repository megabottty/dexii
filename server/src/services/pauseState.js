/**
 * "Pause friendship": a friend you've set aside for now. Sharing and chat keep
 * working, but while muted you get no notifications from them, and they never
 * get read receipts or "seen" marks from you. Stored on the user who paused.
 */
const mongoose = require('mongoose');
const User = require('../models/User');

const dbReady = () => mongoose.connection.readyState === 1;

/** Has `userId` paused `otherId`? */
async function isPausedBy(userId, otherId) {
  if (!dbReady() || !userId || !otherId) return false;
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(otherId)) return false;
  return Boolean(await User.exists({ _id: userId, 'pausedFriends.user': otherId }));
}

/** Has `recipientId` paused `actorId` with notifications muted? */
async function hasMuted(recipientId, actorId) {
  if (!dbReady() || !recipientId || !actorId) return false;
  if (!mongoose.isValidObjectId(recipientId) || !mongoose.isValidObjectId(actorId)) return false;
  return Boolean(await User.exists({
    _id: recipientId,
    pausedFriends: { $elemMatch: { user: actorId, mutedNotifications: true } }
  }));
}

/** Of `friendIds`, which ones have paused `userId`? Returns a Set of id strings. */
async function friendsWhoPaused(userId, friendIds) {
  const ids = (friendIds || []).filter((id) => mongoose.isValidObjectId(id));
  if (!dbReady() || !userId || !ids.length || !mongoose.isValidObjectId(userId)) return new Set();
  const rows = await User.find({ _id: { $in: ids }, 'pausedFriends.user': userId }).select('_id').lean();
  return new Set(rows.map((row) => String(row._id)));
}

module.exports = { isPausedBy, hasMuted, friendsWhoPaused };
