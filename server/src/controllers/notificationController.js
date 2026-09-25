const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const push = require('../services/pushService');

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

const actorDisplayName = (actor) => {
  if (!actor) return 'A friend';
  const fullName = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
  return fullName || actor.username || 'A friend';
};

/** Mirrors the copy the feed shows for each notification type. */
const pushCopy = (type, actor, payload = {}) => {
  const name = actorDisplayName(actor);
  switch (type) {
    case 'friend_request_nudge':
      return { title: 'Friend request nudge', body: `${name} sent you a nudge on their friend request`, route: '/friends' };
    case 'crush_shared':
      return {
        title: 'New crush shared',
        body: `${name} shared a new crush with you`,
        route: payload.crushId ? `/profile/${payload.crushId}` : '/feed'
      };
    case 'invite_accepted':
      return { title: 'Invite accepted', body: `${name} joined Dexii! Finish setting up your friendship profile.`, route: '/friends' };
    case 'friend_request_received':
      return { title: 'Friend request', body: `${name} sent you a friend request`, route: '/friends' };
    case 'friend_request_accepted':
      return { title: 'Friend request accepted', body: `${name} accepted your friend request`, route: '/friends' };
    case 'journal_prompt':
      return { title: 'Journal prompt', body: 'Your journal prompt is ready in the Vault', route: '/vault' };
    default:
      return { title: 'Dexii', body: `${name} sent you an update`, route: '/feed' };
  }
};

/** Fire-and-forget: wakes the recipient's phone(s) about a saved notification. */
const notifyDevices = async (notification) => {
  try {
    if (!(await push.isEnabled())) return;
    const actor = notification.actor
      ? await User.findById(notification.actor).select(ACTOR_FIELDS).lean()
      : null;
    const { title, body, route } = pushCopy(notification.type, actor, notification.payload);
    const badge = await Notification.countDocuments({ recipient: notification.recipient, read: false });
    await push.sendToUser(notification.recipient, {
      title,
      body,
      badge,
      data: { route, notificationId: String(notification._id), type: notification.type }
    });
  } catch (err) {
    console.warn('Push: notifyDevices failed:', err.message);
  }
};

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

  const saved = await notification.save();
  // Don't hold up the request that triggered the notification.
  setImmediate(() => { void notifyDevices(saved); });
  return saved;
};

const VALID_PLATFORMS = new Set(['ios', 'android']);

exports.registerPushToken = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const platform = String(req.body?.platform || '').toLowerCase();
    if (!token || !VALID_PLATFORMS.has(platform)) {
      return res.status(400).json({ message: 'token and platform (ios|android) are required.' });
    }

    // A device token belongs to exactly one account: remove it from anyone else
    // (shared phone, account switch), then upsert onto this user.
    await User.updateMany(
      { _id: { $ne: req.user.id }, 'pushTokens.token': token },
      { $pull: { pushTokens: { token } } }
    );
    await User.updateOne({ _id: req.user.id }, { $pull: { pushTokens: { token } } });
    await User.updateOne(
      { _id: req.user.id },
      { $push: { pushTokens: { token, platform, updatedAt: new Date() } } }
    );

    res.json({ ok: true, pushEnabled: await push.isEnabled() });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ---- Web Push (browsers and the installed PWA) ----

exports.getWebPushPublicKey = async (req, res) => {
  try {
    const publicKey = await push.getVapidPublicKey();
    if (!publicKey) {
      return res.status(503).json({ message: 'Web Push is not available right now.' });
    }
    res.json({ publicKey });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

const isValidSubscription = (sub) => Boolean(
  sub && typeof sub.endpoint === 'string' && /^https:\/\//.test(sub.endpoint) &&
  sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string'
);

exports.subscribeWebPush = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const sub = req.body?.subscription || req.body;
    if (!isValidSubscription(sub)) {
      return res.status(400).json({ message: 'A valid push subscription is required.' });
    }

    const entry = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
      updatedAt: new Date()
    };

    // A browser subscription belongs to exactly one account.
    await User.updateMany(
      { _id: { $ne: req.user.id }, 'webPushSubscriptions.endpoint': entry.endpoint },
      { $pull: { webPushSubscriptions: { endpoint: entry.endpoint } } }
    );
    await User.updateOne({ _id: req.user.id }, { $pull: { webPushSubscriptions: { endpoint: entry.endpoint } } });
    await User.updateOne({ _id: req.user.id }, { $push: { webPushSubscriptions: entry } });

    res.json({ ok: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.unsubscribeWebPush = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
    if (!endpoint) {
      return res.status(400).json({ message: 'endpoint is required.' });
    }

    await User.updateOne({ _id: req.user.id }, { $pull: { webPushSubscriptions: { endpoint } } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.removePushToken = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ message: 'token is required.' });
    }

    await User.updateOne({ _id: req.user.id }, { $pull: { pushTokens: { token } } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
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

exports.createJournalPrompt = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const notification = await exports.createNotification({
      recipient: req.user.id,
      type: 'journal_prompt',
      payload: { route: '/vault' }
    });

    if (!notification) {
      return res.status(503).json({ message: 'Unable to create journal prompt notification.' });
    }
    res.status(201).json(shapeNotification(notification));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
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
