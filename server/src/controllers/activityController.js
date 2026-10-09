const mongoose = require('mongoose');
const FriendActivity = require('../models/FriendActivity');
const Message = require('../models/Message');
const User = require('../models/User');

const PAGE = 40;
const ACTOR_FIELDS = 'username firstName lastName avatarUrl';

const requireDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: 'Database unavailable. History needs a live connection.' });
    return false;
  }
  return true;
};

const shapeUser = (user) => user
  ? { id: String(user._id), username: user.username, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl }
  : null;

const shapeEvent = (row, users) => ({
  id: String(row._id),
  type: row.type,
  actor: shapeUser(users.get(String(row.actor))) || { id: String(row.actor) },
  counterpart: row.counterpart ? (shapeUser(users.get(String(row.counterpart))) || { id: String(row.counterpart) }) : null,
  crushId: row.crushId || null,
  entryId: row.entryId || null,
  requestId: row.requestId || null,
  inviteId: row.inviteId || null,
  meta: row.meta || {},
  createdAt: row.createdAt
});

/** Messages per day between the caller and one friend: counts only, never text. */
const chatDays = async (meId, friendId, before, limit) => {
  const match = {
    $or: [
      { sender: new mongoose.Types.ObjectId(meId), recipient: new mongoose.Types.ObjectId(friendId) },
      { sender: new mongoose.Types.ObjectId(friendId), recipient: new mongoose.Types.ObjectId(meId) }
    ],
    isSafetyAlert: { $ne: true },
    crushId: { $in: [null, undefined] },
    relatedEntryId: { $in: [null, undefined] }
  };
  if (before) match.createdAt = { $lt: before };
  const rows = await Message.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, last: { $max: '$createdAt' }, mine: { $sum: { $cond: [{ $eq: ['$sender', new mongoose.Types.ObjectId(meId)] }, 1, 0] } } } },
    { $sort: { last: -1 } },
    { $limit: limit }
  ]);
  return rows.map((r) => ({
    id: `chat:${friendId}:${r._id}`,
    type: 'chat_day',
    actor: null,
    counterpart: { id: String(friendId) },
    meta: { date: r._id, count: r.count, mine: r.mine, theirs: r.count - r.mine },
    createdAt: r.last
  }));
};

const parseBefore = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// @route GET /api/friends/:friendId/activity?before=<iso>&limit=40
exports.listForFriend = async (req, res) => {
  try {
    if (!requireDb(res)) return;
    const { friendId } = req.params;
    if (!mongoose.isValidObjectId(friendId)) return res.status(400).json({ message: 'Invalid friend id.' });
    const before = parseBefore(req.query.before);
    const limit = Math.min(Number(req.query.limit) || PAGE, 100);
    const pair = FriendActivity.pairKey(req.user.id, friendId);
    const query = { pair, visibleTo: req.user.id };
    if (before) query.createdAt = { $lt: before };
    const [rows, chat] = await Promise.all([
      FriendActivity.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      chatDays(req.user.id, friendId, before, limit)
    ]);
    const ids = [...new Set(rows.flatMap((r) => [String(r.actor), r.counterpart ? String(r.counterpart) : null]).filter(Boolean).concat(String(friendId)))];
    const users = new Map((await User.find({ _id: { $in: ids } }).select(ACTOR_FIELDS).lean()).map((u) => [String(u._id), u]));
    const events = [...rows.map((r) => shapeEvent(r, users)), ...chat.map((c) => ({ ...c, counterpart: shapeUser(users.get(String(friendId))) || c.counterpart }))]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
    res.json({ events, nextBefore: events.length === limit ? events[events.length - 1].createdAt : null });
  } catch (err) {
    console.error('List friend activity error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route GET /api/activity?before=<iso>&limit=40   (every friend)
exports.listAll = async (req, res) => {
  try {
    if (!requireDb(res)) return;
    const before = parseBefore(req.query.before);
    const limit = Math.min(Number(req.query.limit) || PAGE, 100);
    const query = { visibleTo: req.user.id };
    if (before) query.createdAt = { $lt: before };
    const rows = await FriendActivity.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    const ids = [...new Set(rows.flatMap((r) => [String(r.actor), r.counterpart ? String(r.counterpart) : null]).filter(Boolean))];
    const users = new Map((await User.find({ _id: { $in: ids } }).select(ACTOR_FIELDS).lean()).map((u) => [String(u._id), u]));
    const events = rows.map((r) => shapeEvent(r, users));
    res.json({ events, nextBefore: events.length === limit ? events[events.length - 1].createdAt : null });
  } catch (err) {
    console.error('List activity error:', err.message);
    res.status(500).send('Server Error');
  }
};
