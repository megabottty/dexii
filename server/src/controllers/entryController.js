const mongoose = require('mongoose');
const Entry = require('../models/Entry');
const { recordActivity } = require('../services/activityLog');
const User = require('../models/User');
const CrushProfile = require('../models/CrushProfile');
const Notification = require('../models/Notification');
const { withPeople } = require('../services/updatePeople');
const { findCrush, canSeeCrushUpdates, emitEntriesChanged, shareTimesFor, postedSinceShared } = require('../services/updateAudience');
const { createNotification, emitNotificationsChanged } = require('./notificationController');

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
    displayName: owner.displayName || '',
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

/**
 * An Update's audience is the crush's share list, never its own (DEX-44). Older notes that were
 * shared with someone, or marked Public, count as updates too.
 */
const UPDATE_ENTRY_FILTER = { $or: [{ type: { $in: ['Update', 'StatusChange'] } }, { type: 'Note', 'visibility.0': { $exists: true } }] };
const FEED_TYPES = ['Update', 'StatusChange'];

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

    // Plus updates friends posted on my crushes (DEX-45).
    const myCrushIds = (await CrushProfile.find({ userId: req.user.id }).select('_id').lean()).map((c) => String(c._id));
    const fromFriends = { userId: { $ne: req.user.id }, type: { $in: FEED_TYPES }, crushId: req.query.crushId ? (myCrushIds.includes(String(req.query.crushId)) ? String(req.query.crushId) : '__none__') : { $in: myCrushIds } };

    const entries = await Entry.find({ $or: [filter, fromFriends] })
      .sort({ timestamp: -1 })
      .populate('userId', 'username displayName avatarUrl')
      .lean();
    res.json(await withPeople(entries.map(shapeEntry)));
  } catch (err) {
    handleError(res, err);
  }
};

exports.getSharedEntries = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const user = await User.findById(req.user.id).select('friends username').lean();
    const friendIds = (user?.friends || []).map(String);

    if (friendIds.length === 0) {
      return res.json([]);
    }

    // Updates For Friends: every update on a friend's crush that is shared with me,
    // by id or by the older username form of the share list.
    const audience = [String(req.user.id), ...(user.username ? [user.username] : [])];
    const sharedCrushes = await CrushProfile.find({ userId: { $in: friendIds }, visibility: { $in: audience } }).select('_id').lean();
    const sharedCrushIds = sharedCrushes.map((c) => String(c._id));

    const [direct, updates] = await Promise.all([
      Entry.find({
        userId: { $in: friendIds },
        visibility: String(req.user.id),
        type: { $nin: ['Note', 'Update'] },
        $nor: [{ isBurnAfterReading: true, hasViewed: true }]
      })
        .populate('userId', 'username displayName avatarUrl')
        .lean(),
      sharedCrushIds.length
        // Anyone who can see the crush may have posted: its owner, me, or another friend.
        ? Entry.find({ crushId: { $in: sharedCrushIds }, ...UPDATE_ENTRY_FILTER })
          .populate('userId', 'username displayName avatarUrl')
          .lean()
        : []
    ]);

    // Only updates from the moment each crush was shared with me, not its whole history (DEX-44).
    const shareTimes = await shareTimesFor(req.user.id, sharedCrushIds);
    const entries = [...direct, ...updates.filter((entry) => postedSinceShared(entry, shareTimes))]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(await withPeople(entries.map(shapeEntry)));
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

    if (type === 'StatusChange') {
      return res.status(400).json({ message: 'Status changes are added automatically.' });
    }
    const fields = pickWritableFields(req.body);
    // An update on a friend's crush is allowed when that crush is shared with you (DEX-45).
    let crush = null;
    if (type === 'Update') {
      fields.visibility = [];
      crush = await findCrush(crushId);
      if (crush && !(await canSeeCrushUpdates(req.user.id, crush))) {
        return res.status(403).json({ message: 'You can only post updates on crushes shared with you.' });
      }
    }

    const entry = await Entry.create({
      ...fields,
      userId: req.user.id,
      timestamp: req.body.timestamp || Date.now()
    });

    res.status(201).json(shapeEntry(entry));

    const io = req.app.get('io');
    if (crush) {
      emitEntriesChanged(io, crush);
      if (String(crush.userId) !== String(req.user.id)) {
        void createNotification({
          recipient: String(crush.userId), actor: req.user.id, type: 'update_posted',
          payload: { crushId: String(crush._id), crushNickname: crush.nickname || '', entryId: String(entry._id), preview: String(entry.content || '').slice(0, 80) }
        }).then((saved) => { if (saved) emitNotificationsChanged(io, [String(crush.userId)]); }).catch(() => undefined);
      }
    }
    for (const id of (Array.isArray(entry.visibility) ? entry.visibility.map(String) : []).filter((v) => mongoose.isValidObjectId(v))) {
      void recordActivity({ io, actor: req.user.id, counterpart: id, type: 'entry_shared', crushId: entry.crushId, entryId: entry._id, meta: { preview: String(entry.content || '').slice(0, 80), entryType: entry.type } });
    }
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

    const existing = await Entry.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existing) {
      return res.status(404).json({ message: 'Entry not found.' });
    }
    if (existing.type === 'StatusChange') {
      return res.status(400).json({ message: 'A status change can’t be edited.' });
    }

    const updates = pickWritableFields(req.body);
    delete updates.type;
    if ((updates.type || existing.type) === 'Update') updates.visibility = [];

    // Whenever the content actually changes, automatically archive the prior
    // version into editHistory and stamp editedAt - computed server-side so
    // the history log can't be tampered with or omitted by the client.
    if (Object.prototype.hasOwnProperty.call(updates, 'content') && updates.content !== existing.content) {
      existing.editHistory = existing.editHistory || [];
      existing.editHistory.push({ previousContent: existing.content, editedAt: new Date() });
      existing.editedAt = new Date();
    }

    const before = Array.isArray(existing.visibility) ? existing.visibility.map(String) : [];
    Object.assign(existing, updates);
    await existing.save();

    res.json((await withPeople([shapeEntry(existing)]))[0]);
    if (FEED_TYPES.includes(existing.type)) emitEntriesChanged(req.app.get('io'), await findCrush(existing.crushId));

    if (Array.isArray(updates.visibility)) {
      const after = updates.visibility.map(String);
      const io = req.app.get('io');
      const preview = String(existing.content || '').slice(0, 80);
      for (const id of after.filter((v) => !before.includes(v) && mongoose.isValidObjectId(v))) {
        void recordActivity({ io, actor: req.user.id, counterpart: id, type: 'entry_shared', crushId: existing.crushId, entryId: existing._id, meta: { preview, entryType: existing.type } });
      }
      for (const id of before.filter((v) => !after.includes(v) && mongoose.isValidObjectId(v))) {
        void recordActivity({ io, actor: req.user.id, counterpart: id, type: 'entry_unshared', crushId: existing.crushId, entryId: existing._id, meta: { preview, entryType: existing.type } });
      }
    }
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

    // The author can delete an entry; the crush's owner can also delete updates on it (DEX-45).
    const target = await Entry.findById(req.params.id).select('userId type crushId').lean();
    if (!target) return res.status(404).json({ message: 'Entry not found.' });
    const crush = FEED_TYPES.includes(target.type) ? await findCrush(target.crushId) : null;
    const mayDelete = String(target.userId) === String(req.user.id) || (crush && String(crush.userId) === String(req.user.id));
    if (!mayDelete) return res.status(404).json({ message: 'Entry not found.' });

    const entry = await Entry.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found.' });
    }
    if (crush) emitEntriesChanged(req.app.get('io'), crush, [String(entry.userId)]);

    res.json(shapeEntry(entry));
    // Reactions and comments on it were notifications that now point at nothing (DEX-45).
    void Notification.deleteMany({ type: { $in: ['update_reaction', 'update_comment', 'comment_heart', 'update_posted'] }, 'payload.entryId': String(entry._id) })
      .catch(() => undefined);
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

exports.shapeEntry = shapeEntry;
