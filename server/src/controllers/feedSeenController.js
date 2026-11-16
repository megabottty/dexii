const mongoose = require('mongoose');
const User = require('../models/User');

/** Sends a 503 and returns false when the database isn't connected. */
const requireDb = (res) => {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({ message: 'Database unavailable.' });
  return false;
};

/**
 * GET /api/entries/feed-seen: when you last looked at The Tea's Feed, or null if never.
 * Feed rows newer than this show bold as unread (DEX-45 follow-up to DEX-68).
 * Saved on the account, so reading on your phone clears them on your computer too.
 */
exports.getFeedSeen = async (req, res) => {
  try {
    if (!requireDb(res)) return;
    const user = await User.findById(req.user.id).select('feedSeenAt').lean();
    res.json({ feedSeenAt: user?.feedSeenAt || null });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /api/entries/feed-seen { seenAt }: you've seen the Feed up to `seenAt` (the newest row
 * shown). It only ever moves forward, so a device that's behind can't make old rows bold again.
 * A time in the future is capped at now, and a missing or broken one means now.
 */
exports.markFeedSeen = async (req, res) => {
  try {
    if (!requireDb(res)) return;
    const now = new Date();
    const asked = new Date(req.body?.seenAt);
    const seenAt = Number.isNaN(asked.getTime()) || asked > now ? now : asked;
    // Only applies when it's later than what's stored (or nothing is stored yet).
    await User.updateOne(
      { _id: req.user.id, $or: [{ feedSeenAt: null }, { feedSeenAt: { $lt: seenAt } }] },
      { $set: { feedSeenAt: seenAt } }
    );
    const user = await User.findById(req.user.id).select('feedSeenAt').lean();
    res.json({ feedSeenAt: user?.feedSeenAt || seenAt });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
