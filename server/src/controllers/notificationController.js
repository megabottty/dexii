const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const ACTOR_FIELDS = 'username firstName lastName avatarUrl';

const requireDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: 'Database unavailable. Notifications need a live connection.' });
    return false;
  }
  return true;
};

const shapeActor = (actor) => {
  if (!actor) return null;
  if (typeof actor === 'string' || actor instanceof mongoose.Types.ObjectId) {
    return { id: String(actor) };
  }

  return {
    id: String(actor._id || actor.id),
    username: actor.username,
    firstName: actor.firstName,
    lastName: actor.lastName,
    avatarUrl: actor.avatarUrl
  };
};

const shapeNotification = (notification) => ({
  id: String(notification._id || notification.id),
  recipient: String(notification.recipient),
  actor: shapeActor(notification.actor),
  type: notification.type,
  payload: notification.payload || {},
  read: Boolean(notification.read),
  createdAt: notification.createdAt
});

exports.createNotification = async ({ recipient, actor, type, payload = {} }) => {
  if (!recipient || !type || mongoose.connection.readyState !== 1) {
    return null;
  }

  const notification = new Notification({
    recipient,
    actor: actor || undefined,
    type,
    payload,
    read: false
  });

  return notification.save();
};

exports.listNotifications = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('actor', ACTOR_FIELDS)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(notifications.map(shapeNotification));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const count = await Notification.countDocuments({ recipient: req.user.id, read: false });
    res.json({ count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.markRead = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid notification id.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user.id },
      { $set: { read: true } },
      { new: true }
    )
      .populate('actor', ACTOR_FIELDS)
      .lean();

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json(shapeNotification(notification));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.markUnread = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid notification id.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user.id },
      { $set: { read: false } },
      { new: true }
    )
      .populate('actor', ACTOR_FIELDS)
      .lean();

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json(shapeNotification(notification));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.markAllRead = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const result = await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ count: result.modifiedCount || 0 });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
