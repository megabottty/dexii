const mongoose = require('mongoose');
const CrushProfile = require('../models/CrushProfile');
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
