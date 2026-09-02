const mongoose = require('mongoose');
const Entry = require('../models/Entry');
const User = require('../models/User');

const requireDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: 'Database unavailable. Entries need a live connection.' });
    return false;
  }
  return true;
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const shapeOwner = (owner) => {
  if (!owner) return null;
  return {
    id: String(owner._id || owner.id),
    username: owner.username,
    avatarUrl: owner.avatarUrl
  };
};

const shapeEntry = (entry) => {
  const plain = typeof entry.toObject === 'function' ? entry.toObject() : entry;
  const shaped = {
    ...plain,
    id: String(plain._id || plain.id)
  };

  if (plain.userId && typeof plain.userId === 'object' && !plain.userId._bsontype) {
    shaped.owner = shapeOwner(plain.userId);
    shaped.userId = String(plain.userId._id || plain.userId.id);
  } else if (plain.userId) {
    shaped.userId = String(plain.userId);
  }

  return shaped;
};

const writableFields = [
  'crushId',
  'type',
  'content',
  'timestamp',
  'isBurnAfterReading',
  'hasViewed',
  'visibility',
  'isSensitive',
  'safetyContactId',
  'safetyStatus',
  'redFlagCount'
];

const pickWritableFields = (body) => writableFields.reduce((updates, field) => {
  if (Object.prototype.hasOwnProperty.call(body, field)) {
    updates[field] = body[field];
  }
  return updates;
}, {});

const handleError = (res, err) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  console.error(err.message);
  return res.status(500).json({ message: 'Server error' });
};

exports.getEntries = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const filter = { userId: req.user.id };
    if (req.query.crushId) filter.crushId = req.query.crushId;

    const entries = await Entry.find(filter).sort({ timestamp: -1 }).lean();
    res.json(entries.map(shapeEntry));
  } catch (err) {
    handleError(res, err);
  }
};

exports.getSharedEntries = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const user = await User.findById(req.user.id).select('friends').lean();
    const friendIds = (user?.friends || []).map(String);

    if (friendIds.length === 0) {
      return res.json([]);
    }

    const entries = await Entry.find({
      userId: { $in: friendIds },
      visibility: String(req.user.id),
      $nor: [{ isBurnAfterReading: true, hasViewed: true }]
    })
      .sort({ timestamp: -1 })
      .populate('userId', 'username avatarUrl')
      .lean();

    res.json(entries.map(shapeEntry));
  } catch (err) {
    handleError(res, err);
  }
};

exports.createEntry = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const { crushId, type, content } = req.body;
    if (!crushId || !type || !content) {
      return res.status(400).json({ message: 'crushId, type and content are required.' });
    }
    if (!Entry.entryTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid entry type.' });
    }

    const entry = await Entry.create({
      ...pickWritableFields(req.body),
      userId: req.user.id,
      timestamp: req.body.timestamp || Date.now()
    });

    res.status(201).json(shapeEntry(entry));
  } catch (err) {
    handleError(res, err);
  }
};

exports.updateEntry = async (req, res) => {
  try {
    if (!requireDb(res)) return;
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid entry id.' });
    }

    const entry = await Entry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: pickWritableFields(req.body) },
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found.' });
    }

    res.json(shapeEntry(entry));
  } catch (err) {
    handleError(res, err);
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    if (!requireDb(res)) return;
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid entry id.' });
    }

    const entry = await Entry.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found.' });
    }

    res.json(shapeEntry(entry));
  } catch (err) {
    handleError(res, err);
  }
};

exports.markViewed = async (req, res) => {
  try {
    if (!requireDb(res)) return;
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid entry id.' });
    }

    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found.' });
    }

    const isOwner = String(entry.userId) === String(req.user.id);
    const isRecipient = (entry.visibility || []).some((id) => String(id) === String(req.user.id));
    if (!isOwner && !isRecipient) {
      return res.status(404).json({ message: 'Entry not found.' });
    }

    entry.hasViewed = true;
    await entry.save();

    res.json(shapeEntry(entry));
  } catch (err) {
    handleError(res, err);
  }
};
