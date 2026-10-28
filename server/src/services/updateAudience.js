const mongoose = require('mongoose');
const CrushProfile = require('../models/CrushProfile');
const User = require('../models/User');

/**
 * Who can see a crush's Updates For Friends (DEX-44/45): its owner, and friends of the
 * owner the crush is shared with (by id, or the older username form of the share list).
 */
const findCrush = (crushId) => mongoose.isValidObjectId(crushId)
  ? CrushProfile.findById(crushId).select('userId nickname visibility').lean()
  : null;

const canSeeCrushUpdates = async (userId, crush) => {
  if (!crush) return false;
  const me = String(userId);
  const ownerId = String(crush.userId);
  if (ownerId === me) return true;
  const viewer = await User.findById(me).select('friends username').lean();
  const isFriend = (viewer?.friends || []).map(String).includes(ownerId);
  const visibility = Array.isArray(crush.visibility) ? crush.visibility.map(String) : [];
  return isFriend && (visibility.includes(me) || (!!viewer?.username && visibility.includes(viewer.username)));
};

/** The owner plus everyone (by id) the crush is shared with. */
const audienceIds = (crush) => {
  if (!crush) return [];
  const ids = [String(crush.userId), ...(crush.visibility || []).map(String).filter((v) => mongoose.isValidObjectId(v))];
  return [...new Set(ids)];
};

/** Tells everyone who can see this crush's updates to refetch them. */
const emitEntriesChanged = (io, crush, extra = []) => {
  if (!io || !crush) return;
  for (const id of new Set([...audienceIds(crush), ...extra.map(String)])) {
    try { io.to(id).emit('entriesChanged', { crushId: String(crush._id) }); } catch { /* ignore */ }
  }
};

module.exports = { findCrush, canSeeCrushUpdates, audienceIds, emitEntriesChanged };
