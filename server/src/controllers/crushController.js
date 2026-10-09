const mongoose = require('mongoose');
const CrushProfile = require('../models/CrushProfile');
const Entry = require('../models/Entry');
const User = require('../models/User');
const { createNotification, retractCrushShares, emitToUser } = require('./notificationController');
const { isPausedBy } = require('../services/pauseState');
const { recordActivity } = require('../services/activityLog');

/**
 * Fields a client may change through PUT /crushes/:id. Ownership, sharing and
 * read receipts are managed by their own endpoints, never by a plain update.
 */
const UPDATABLE_CRUSH_FIELDS = [
  'nickname', 'fullName', 'displayName', 'avatarUrl', 'avatarConfig', 'bio', 'status',
  'lastInteraction', 'rating', 'initialRating', 'redFlags', 'redFlagReason', 'vibeHistory',
  'category', 'hair', 'eyes', 'build', 'social', 'relationshipStatus', 'relationshipLabels',
  'heartbreakSong', 'heartbreakRecovery', 'pronouns', 'customNotes', 'location', 'dateOfBirth',
  'age', 'howWeMet', 'whenWeMet', 'schoolOrWork', 'grade', 'occupation', 'family',
  'memorableMoments', 'friends', 'sortOrder'
];

const MAX_PHOTOS = 8;
const MAX_PHOTO_CHARS = 560_000; // ~400KB of JPEG once base64-encoded
const PHOTO_DATA_URI = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** A photo without its (large) data; what lists and the crush itself carry. */
const photoMeta = (photo) => ({
  id: String(photo._id),
  width: photo.width,
  height: photo.height,
  bytes: photo.bytes,
  addedAt: photo.addedAt,
  audience: photo.audience || 'shared',
  friendIds: photo.friendIds || []
});

/** Can this viewer see this photo? Owner: always. Friend: the crush must be shared and the photo must allow them. */
const photoVisibleTo = (photo, viewerId) =>
  (photo.audience || 'shared') === 'shared' || (photo.friendIds || []).map(String).includes(String(viewerId));

/** The crush as sent over the wire: photo data stripped, counts added. `viewerId` null = owner. */
const shapeCrushForWire = (crush, viewerId = null) => {
  const plain = typeof crush.toObject === 'function' ? crush.toObject() : { ...crush };
  const photos = Array.isArray(plain.photos) ? plain.photos : [];
  const visible = viewerId ? photos.filter((p) => photoVisibleTo(p, viewerId)) : photos;
  plain.photos = visible.map(photoMeta);
  plain.photoCount = visible.length;
  if (viewerId) delete plain.viewedBy;
  return plain;
};

/** True when the crush's visibility list names this friend (by id or legacy username). */
const visibilityIncludes = (crush, friendId, username) => {
  const visibility = Array.isArray(crush.visibility) ? crush.visibility.map(String) : [];
  return visibility.includes(String(friendId)) || (username && visibility.includes(username));
};

const notifyCrushShared = async (ownerId, crush, recipients, io) => {
  if (!recipients.length) return;
  for (const recipient of recipients) {
    void recordActivity({ io, actor: ownerId, counterpart: recipient, type: 'crush_shared', crushId: crush._id, meta: { nickname: crush.nickname } });
  }
  try {
    await Promise.allSettled(recipients.map((recipient) => createNotification({
      recipient,
      actor: ownerId,
      type: 'crush_shared',
      payload: { crushId: String(crush._id), crushNickname: crush.nickname }
    })));
  } catch (notificationErr) {
    console.error('Crush share notification failed:', notificationErr.message);
  }
};

/** Maps visibility entries (user ids or usernames) to the owner's friends' user ids. */
const resolveVisibilityUserIds = async (ownerId, values) => {
  const targets = [...new Set((values || []).map((value) => String(value)).filter((value) => value && value !== 'public'))];
  if (targets.length === 0) return [];

  const owner = await User.findById(ownerId)
    .populate('friends', 'username')
    .select('friends')
    .lean();

  const resolved = new Set();
  for (const friend of owner?.friends || []) {
    const friendId = String(friend._id || friend.id);
    const username = typeof friend.username === 'string' ? friend.username : '';
    if (targets.includes(friendId) || (username && targets.includes(username))) {
      resolved.add(friendId);
    }
  }
  return [...resolved];
};

const resolveNewVisibilityRecipients = async (ownerId, previousVisibility, nextVisibility) => {
  const previousSet = new Set((previousVisibility || []).map((value) => String(value)));
  const added = (nextVisibility || []).map((value) => String(value)).filter((value) => !previousSet.has(value));
  return resolveVisibilityUserIds(ownerId, added);
};

/** Friends who were in the old visibility list but not the new one. */
const resolveRemovedVisibilityRecipients = async (ownerId, previousVisibility, nextVisibility) => {
  const nextSet = new Set((nextVisibility || []).map((value) => String(value)));
  const removed = (previousVisibility || []).map((value) => String(value)).filter((value) => !nextSet.has(value));
  return resolveVisibilityUserIds(ownerId, removed);
};

// @desc    Get all crush profiles for a user
// @route   GET /api/crushes
exports.getCrushes = async (req, res) => {
  try {
    const crushes = await CrushProfile.find({ userId: req.user.id }).lean();
    res.json(crushes.map((crush) => shapeCrushForWire(crush)));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get a friend's crush profiles that they've shared with the requesting user
// @route   GET /api/crushes/friend/:friendId
exports.getFriendSharedCrushes = async (req, res) => {
  try {
    const { friendId } = req.params;
    if (!mongoose.isValidObjectId(friendId)) {
      return res.status(400).json({ message: 'Invalid friend id.' });
    }

    const me = await User.findById(req.user.id).select('friends username').lean();
    if (!me) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isFriend = (me.friends || []).some((id) => String(id) === String(friendId));
    if (!isFriend) {
      return res.status(403).json({ message: 'You can only view crushes shared by your friends.' });
    }

    const myId = String(req.user.id);
    const myUsername = typeof me.username === 'string' ? me.username : '';

    const crushes = await CrushProfile.find({ userId: friendId }).select('-viewedBy').lean();
    const shared = crushes.filter((crush) => {
      const visibility = Array.isArray(crush.visibility) ? crush.visibility.map(String) : [];
      return visibility.includes(myId) || (myUsername && visibility.includes(myUsername));
    });

    res.json(shared.map((crush) => shapeCrushForWire(crush, myId)));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get a single crush profile that a friend has shared with the requesting user
//          (used by notification deep-links / friend "Boys" list clicks, since the
//          viewer's own crush list won't contain a friend's crush)
// @route   GET /api/crushes/shared/:crushId
exports.getSharedCrushById = async (req, res) => {
  try {
    const { crushId } = req.params;
    if (!mongoose.isValidObjectId(crushId)) {
      return res.status(404).json({ message: 'Crush not found' });
    }

    const crush = await CrushProfile.findById(crushId);
    if (!crush) {
      return res.status(404).json({ message: 'Crush not found' });
    }

    const myId = String(req.user.id);

    // If the requester actually owns this crush, just return it as-is.
    if (String(crush.userId) === myId) {
      return res.json({ crush: shapeCrushForWire(crush), owner: null });
    }

    const me = await User.findById(req.user.id).select('friends username').lean();
    if (!me) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isFriend = (me.friends || []).some((id) => String(id) === String(crush.userId));
    if (!isFriend) {
      return res.status(403).json({ message: 'You are not friends with this user.' });
    }

    const myUsername = typeof me.username === 'string' ? me.username : '';
    const visibility = Array.isArray(crush.visibility) ? crush.visibility.map(String) : [];
    const isShared = visibility.includes(myId) || (myUsername && visibility.includes(myUsername));
    if (!isShared) {
      return res.status(403).json({ message: 'This crush has not been shared with you.' });
    }

    const owner = await User.findById(crush.userId).select('username firstName lastName').lean();

    const plain = shapeCrushForWire(crush, myId);
    res.json({
      crush: plain,
      owner: owner
        ? { id: String(owner._id), username: owner.username, firstName: owner.firstName, lastName: owner.lastName }
        : null
    });

    // "Seen": remember that this friend opened the crush and tell the owner. A viewer
    // who has paused the owner leaves no trace, the same as chat read receipts.
    setImmediate(() => { void recordCrushViewed(req.app.get('io'), crush, myId); });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const recordCrushViewed = async (io, crush, viewerId) => {
  try {
    const ownerId = String(crush.userId);
    if (await isPausedBy(viewerId, ownerId)) return;
    const at = new Date();
    const updated = await CrushProfile.updateOne(
      { _id: crush._id, 'viewedBy.user': viewerId },
      { $set: { 'viewedBy.$.at': at } }
    );
    if (!updated.matchedCount) {
      await CrushProfile.updateOne({ _id: crush._id }, { $push: { viewedBy: { user: viewerId, at } } });
    }
    emitToUser(io, ownerId, 'crushViewed', { crushId: String(crush._id), viewerId: String(viewerId), at: at.toISOString() });
    // One history line per viewer per crush per day keeps "opened it" readable.
    void recordActivity({
      io, actor: viewerId, counterpart: ownerId, type: 'crush_viewed', crushId: crush._id,
      meta: { nickname: crush.nickname }, source: `view:${crush._id}:${viewerId}:${at.toISOString().slice(0, 10)}`
    });
  } catch (err) {
    console.warn('Recording crush view failed:', err.message);
  }
};

// @desc    Create a new crush profile
// @route   POST /api/crushes
exports.createCrush = async (req, res) => {
  try {
    const body = {};
    for (const field of [...UPDATABLE_CRUSH_FIELDS, 'visibility']) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) body[field] = req.body[field];
    }
    if (body.status === 'Crushing') body.status = 'Plotting';
    const newCrush = new CrushProfile({
      ...body,
      userId: req.user.id
    });

    const crush = await newCrush.save();
    res.status(201).json(shapeCrushForWire(crush));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update a crush profile
// @route   PUT /api/crushes/:id
exports.updateCrush = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Crush not found' });
    }

    let crush = await CrushProfile.findById(req.params.id);
    if (!crush) return res.status(404).json({ message: 'Crush not found' });

    // Check ownership
    if (crush.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const previousVisibility = Array.isArray(crush.visibility) ? crush.visibility.map(String) : [];
    let newRecipients = [];
    let removedRecipients = [];

    if (Array.isArray(req.body.visibility)) {
      [newRecipients, removedRecipients] = await Promise.all([
        resolveNewVisibilityRecipients(req.user.id, previousVisibility, req.body.visibility),
        resolveRemovedVisibilityRecipients(req.user.id, previousVisibility, req.body.visibility)
      ]);
    }

    // Clients send only the fields they changed (a red flag, a reorder, the edit
    // form…), so a stale device can no longer overwrite everything else.
    const updatePayload = {};
    for (const field of UPDATABLE_CRUSH_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) updatePayload[field] = req.body[field];
    }
    if (Object.prototype.hasOwnProperty.call(updatePayload, 'relationshipLabels') && !Array.isArray(updatePayload.relationshipLabels)) {
      updatePayload.relationshipLabels = [];
    }
    // Replacing the whole sharing list is still allowed (demo fallback and older
    // clients); new clients use POST/DELETE /crushes/:id/share instead.
    if (Array.isArray(req.body.visibility)) updatePayload.visibility = req.body.visibility;
    // "Crushing" was renamed to "Plotting"; accept the old name from stale clients.
    if (updatePayload.status === 'Crushing') updatePayload.status = 'Plotting';
    if (Object.keys(updatePayload).length > 0) {
      crush = await CrushProfile.findByIdAndUpdate(
        req.params.id,
        { $set: updatePayload },
        { new: true, runValidators: true }
      );
    }

    const io = req.app.get('io');
    await notifyCrushShared(req.user.id, crush, newRecipients, io);

    res.json(shapeCrushForWire(crush));

    emitToUser(io, req.user.id, 'crushesChanged', { crushId: String(crush._id) });
    // Unshared with someone: take back their "shared a crush" notification.
    if (removedRecipients.length > 0) {
      for (const recipient of removedRecipients) {
        void recordActivity({ io, actor: req.user.id, counterpart: recipient, type: 'crush_unshared', crushId: crush._id, meta: { nickname: crush.nickname } });
      }
      setImmediate(() => { void retractCrushShares({ io, crushId: crush._id, recipients: removedRecipients }); });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Share a crush with more friends (adds to the sharing list; never removes)
// @route   POST /api/crushes/:id/share   body: { friendIds: string[] }
exports.shareCrush = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Crush not found' });
    }
    const crush = await CrushProfile.findById(req.params.id);
    if (!crush) return res.status(404).json({ message: 'Crush not found' });
    if (crush.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const requested = Array.isArray(req.body.friendIds) ? req.body.friendIds : [];
    const friendIds = await resolveVisibilityUserIds(req.user.id, requested);
    const added = friendIds.filter((id) => !visibilityIncludes(crush, id));

    const updated = added.length
      ? await CrushProfile.findByIdAndUpdate(req.params.id, { $addToSet: { visibility: { $each: added } } }, { new: true })
      : crush;

    await notifyCrushShared(req.user.id, updated, added, req.app.get('io'));
    res.json(shapeCrushForWire(updated));
    if (added.length) emitToUser(req.app.get('io'), req.user.id, 'crushesChanged', { crushId: String(updated._id) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Stop sharing a crush with one friend
// @route   DELETE /api/crushes/:id/share/:friendId
exports.unshareCrush = async (req, res) => {
  try {
    const { id, friendId } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Crush not found' });
    }
    const crush = await CrushProfile.findById(id);
    if (!crush) return res.status(404).json({ message: 'Crush not found' });
    if (crush.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Older entries may hold the friend's username instead of their id.
    const friend = mongoose.isValidObjectId(friendId) ? await User.findById(friendId).select('username').lean() : null;
    const values = [String(friendId)];
    if (friend?.username) values.push(friend.username);

    const updated = await CrushProfile.findByIdAndUpdate(id, { $pull: { visibility: { $in: values } } }, { new: true });
    res.json(shapeCrushForWire(updated));

    const io = req.app.get('io');
    emitToUser(io, req.user.id, 'crushesChanged', { crushId: String(updated._id) });
    if (friend) {
      void recordActivity({ io, actor: req.user.id, counterpart: friend._id, type: 'crush_unshared', crushId: updated._id, meta: { nickname: updated.nickname } });
      setImmediate(() => { void retractCrushShares({ io, crushId: updated._id, recipients: [String(friend._id)] }); });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/** Loads a crush and checks the caller may see it: owner, or a friend it is shared with. */
const loadCrushForViewer = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ message: 'Crush not found' }); return null; }
  const crush = await CrushProfile.findById(req.params.id);
  if (!crush) { res.status(404).json({ message: 'Crush not found' }); return null; }
  const myId = String(req.user.id);
  if (String(crush.userId) === myId) return { crush, owner: true, myId };
  const me = await User.findById(req.user.id).select('friends username').lean();
  const isFriend = (me?.friends || []).some((id) => String(id) === String(crush.userId));
  if (!isFriend || !visibilityIncludes(crush, myId, me?.username)) {
    res.status(403).json({ message: 'This crush has not been shared with you.' });
    return null;
  }
  return { crush, owner: false, myId };
};

const loadOwnCrush = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ message: 'Crush not found' }); return null; }
  const crush = await CrushProfile.findById(req.params.id);
  if (!crush) { res.status(404).json({ message: 'Crush not found' }); return null; }
  if (crush.userId.toString() !== req.user.id) { res.status(401).json({ message: 'User not authorized' }); return null; }
  return crush;
};

const photoWithUrl = (photo) => ({ ...photoMeta(photo), url: photo.url });

// @route   GET /api/crushes/:id/photos  (owner: all; a friend: only the photos they may see)
exports.getCrushPhotos = async (req, res) => {
  try {
    const found = await loadCrushForViewer(req, res);
    if (!found) return;
    const { crush, owner, myId } = found;
    const photos = (crush.photos || []).filter((p) => owner || photoVisibleTo(p, myId));
    res.json(photos.map(photoWithUrl));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route   POST /api/crushes/:id/photos   body: { url, audience?, friendIds? }
exports.addCrushPhoto = async (req, res) => {
  try {
    const crush = await loadOwnCrush(req, res);
    if (!crush) return;
    const url = String(req.body.url || '');
    if (!PHOTO_DATA_URI.test(url)) return res.status(400).json({ message: 'Photos must be a JPEG, PNG or WebP image.' });
    if (url.length > MAX_PHOTO_CHARS) return res.status(413).json({ message: 'That photo is too large. Please pick a smaller one.' });
    if ((crush.photos || []).length >= MAX_PHOTOS) return res.status(400).json({ message: `You can keep up to ${MAX_PHOTOS} photos per crush.` });
    const audience = req.body.audience === 'friends' ? 'friends' : 'shared';
    const friendIds = audience === 'friends' && Array.isArray(req.body.friendIds) ? req.body.friendIds.map(String) : [];
    crush.photos.push({
      url,
      width: Number(req.body.width) || undefined,
      height: Number(req.body.height) || undefined,
      bytes: Math.round(url.length * 0.75),
      audience,
      friendIds
    });
    await crush.save();
    const photo = crush.photos[crush.photos.length - 1];
    res.status(201).json(photoWithUrl(photo));
    emitToUser(req.app.get('io'), req.user.id, 'crushesChanged', { crushId: String(crush._id) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route   DELETE /api/crushes/:id/photos/:photoId
exports.removeCrushPhoto = async (req, res) => {
  try {
    const crush = await loadOwnCrush(req, res);
    if (!crush) return;
    const before = crush.photos.length;
    crush.photos = crush.photos.filter((p) => String(p._id) !== String(req.params.photoId));
    if (crush.photos.length === before) return res.status(404).json({ message: 'Photo not found' });
    await crush.save();
    res.json({ ok: true, photos: crush.photos.map(photoMeta) });
    emitToUser(req.app.get('io'), req.user.id, 'crushesChanged', { crushId: String(crush._id) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route   POST /api/crushes/:id/photos/delete   body: { ids: string[] }
// @desc    Remove several photos at once (owner only)
exports.removeCrushPhotos = async (req, res) => {
  try {
    const crush = await loadOwnCrush(req, res);
    if (!crush) return;
    const ids = new Set(Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []);
    if (ids.size === 0) return res.status(400).json({ message: 'No photos selected' });
    const before = crush.photos.length;
    crush.photos = crush.photos.filter((p) => !ids.has(String(p._id)));
    if (crush.photos.length === before) return res.status(404).json({ message: 'Photos not found' });
    await crush.save();
    res.json({ ok: true, photos: crush.photos.map(photoMeta) });
    emitToUser(req.app.get('io'), req.user.id, 'crushesChanged', { crushId: String(crush._id) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route   PUT /api/crushes/:id/photos/order   body: { ids: string[] }
exports.reorderCrushPhotos = async (req, res) => {
  try {
    const crush = await loadOwnCrush(req, res);
    if (!crush) return;
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    const byId = new Map(crush.photos.map((p) => [String(p._id), p]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
    for (const p of crush.photos) if (!ids.includes(String(p._id))) ordered.push(p);
    crush.photos = ordered;
    await crush.save();
    res.json({ ok: true, photos: crush.photos.map(photoMeta) });
    emitToUser(req.app.get('io'), req.user.id, 'crushesChanged', { crushId: String(crush._id) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route   PUT /api/crushes/:id/photos/audience            body: { audience: 'shared' }      (every photo)
// @route   PUT /api/crushes/:id/photos/:photoId/audience   body: { audience, friendIds? }   (one photo)
exports.setCrushPhotoAudience = async (req, res) => {
  try {
    const crush = await loadOwnCrush(req, res);
    if (!crush) return;
    const audience = req.body.audience === 'friends' ? 'friends' : 'shared';
    const friendIds = audience === 'friends' && Array.isArray(req.body.friendIds) ? req.body.friendIds.map(String) : [];
    const targets = req.params.photoId
      ? crush.photos.filter((p) => String(p._id) === String(req.params.photoId))
      : crush.photos;
    if (req.params.photoId && targets.length === 0) return res.status(404).json({ message: 'Photo not found' });
    for (const p of targets) { p.audience = audience; p.friendIds = friendIds; }
    await crush.save();
    res.json({ ok: true, photos: crush.photos.map(photoMeta) });
    emitToUser(req.app.get('io'), req.user.id, 'crushesChanged', { crushId: String(crush._id) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Delete a crush profile (and its associated journal entries)
// @route   DELETE /api/crushes/:id
exports.deleteCrush = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Crush not found' });
    }

    const crush = await CrushProfile.findById(req.params.id);
    if (!crush) return res.status(404).json({ message: 'Crush not found' });

    // Check ownership
    if (crush.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const sharedWith = await resolveVisibilityUserIds(req.user.id, crush.visibility);
    await CrushProfile.findByIdAndDelete(req.params.id);
    await Entry.deleteMany({ crushId: req.params.id });

    res.json({ message: 'Crush deleted', id: req.params.id });

    // The crush is gone: nobody should still hold a notification pointing at it.
    const io = req.app.get('io');
    for (const recipient of sharedWith) {
      void recordActivity({ io, actor: req.user.id, counterpart: recipient, type: 'crush_deleted', crushId: req.params.id, meta: { nickname: crush.nickname } });
    }
    setImmediate(() => { void retractCrushShares({ io, crushId: req.params.id }); });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
