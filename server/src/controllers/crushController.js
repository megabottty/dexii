const mongoose = require('mongoose');
const CrushProfile = require('../models/CrushProfile');
const Entry = require('../models/Entry');
const User = require('../models/User');
const { createNotification, retractCrushShares, emitToUser } = require('./notificationController');

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

/** True when the crush's visibility list names this friend (by id or legacy username). */
const visibilityIncludes = (crush, friendId, username) => {
  const visibility = Array.isArray(crush.visibility) ? crush.visibility.map(String) : [];
  return visibility.includes(String(friendId)) || (username && visibility.includes(username));
};

const notifyCrushShared = async (ownerId, crush, recipients) => {
  if (!recipients.length) return;
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
    const crushes = await CrushProfile.find({ userId: req.user.id });
    res.json(crushes);
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

    const crushes = await CrushProfile.find({ userId: friendId });
    const shared = crushes.filter((crush) => {
      const visibility = Array.isArray(crush.visibility) ? crush.visibility.map(String) : [];
      return visibility.includes(myId) || (myUsername && visibility.includes(myUsername));
    });

    res.json(shared);
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
      return res.json({ crush, owner: null });
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

    res.json({
      crush,
      owner: owner
        ? { id: String(owner._id), username: owner.username, firstName: owner.firstName, lastName: owner.lastName }
        : null
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Create a new crush profile
// @route   POST /api/crushes
exports.createCrush = async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.status === 'Crushing') body.status = 'Plotting';
    const newCrush = new CrushProfile({
      ...body,
      userId: req.user.id
    });

    const crush = await newCrush.save();
    res.status(201).json(crush);
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

    await notifyCrushShared(req.user.id, crush, newRecipients);

    res.json(crush);

    const io = req.app.get('io');
    emitToUser(io, req.user.id, 'crushesChanged', { crushId: String(crush._id) });
    // Unshared with someone: take back their "shared a crush" notification.
    if (removedRecipients.length > 0) {
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

    await notifyCrushShared(req.user.id, updated, added);
    res.json(updated);
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
    res.json(updated);

    const io = req.app.get('io');
    emitToUser(io, req.user.id, 'crushesChanged', { crushId: String(updated._id) });
    if (friend) {
      setImmediate(() => { void retractCrushShares({ io, crushId: updated._id, recipients: [String(friend._id)] }); });
    }
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

    await CrushProfile.findByIdAndDelete(req.params.id);
    await Entry.deleteMany({ crushId: req.params.id });

    res.json({ message: 'Crush deleted', id: req.params.id });

    // The crush is gone: nobody should still hold a notification pointing at it.
    setImmediate(() => { void retractCrushShares({ io: req.app.get('io'), crushId: req.params.id }); });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
