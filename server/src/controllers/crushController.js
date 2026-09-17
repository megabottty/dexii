const mongoose = require('mongoose');
const CrushProfile = require('../models/CrushProfile');
const Entry = require('../models/Entry');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

const resolveNewVisibilityRecipients = async (ownerId, previousVisibility, nextVisibility) => {
  const previousSet = new Set((previousVisibility || []).map((value) => String(value)));
  const targets = [...new Set((nextVisibility || [])
    .map((value) => String(value))
    .filter((value) => value && value !== 'public' && !previousSet.has(value)))];

  if (targets.length === 0) return [];

  const owner = await User.findById(ownerId)
    .populate('friends', 'username')
    .select('friends')
    .lean();

  const resolvedRecipients = new Set();
  for (const friend of owner?.friends || []) {
    const friendId = String(friend._id || friend.id);
    const username = typeof friend.username === 'string' ? friend.username : '';
    if (targets.includes(friendId) || (username && targets.includes(username))) {
      resolvedRecipients.add(friendId);
    }
  }

  return [...resolvedRecipients];
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
    const newCrush = new CrushProfile({
      ...req.body,
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

    if (Array.isArray(req.body.visibility)) {
      newRecipients = await resolveNewVisibilityRecipients(req.user.id, previousVisibility, req.body.visibility);
    }

    crush = await CrushProfile.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });

    if (newRecipients.length > 0) {
      try {
        await Promise.allSettled(newRecipients.map((recipient) => createNotification({
          recipient,
          actor: req.user.id,
          type: 'crush_shared',
          payload: {
            crushId: String(crush._id),
            crushNickname: crush.nickname
          }
        })));
      } catch (notificationErr) {
        console.error('Crush share notification failed:', notificationErr.message);
      }
    }

    res.json(crush);
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
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
