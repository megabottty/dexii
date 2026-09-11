const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Invite = require('../models/Invite');
const InviteQuota = require('../models/InviteQuota');
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');
const sendSms = require('../utils/sendSms');
const { buildInviteEmail } = require('../utils/inviteEmail');

const INVITE_DAILY_LIMIT = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Prefers a real name, falling back to the username. */
const buildDisplayName = (user) => {
  if (!user) return 'A friend';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.username || 'A friend';
};

/** Public origin for invite links, honoring proxies and an explicit override. */
const buildInviteUrl = (req, token) => {
  const configured = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  if (configured) return `${configured}/signup-profile?invite=${token}`;

  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  return `${proto}://${host}/signup-profile?invite=${token}`;
};

/** SMS bodies must stay short, so the personal note is trimmed hard. */
const buildInviteSmsBody = ({ inviterName, inviteUrl, personalMessage }) => {
  const note = personalMessage ? `"${personalMessage.slice(0, 120)}" ` : '';
  return `${inviterName} invited you to Dexii. ${note}Join here: ${inviteUrl}`;
};

const requireDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: 'Database unavailable. Friend requests need a live connection.' });
    return false;
  }
  return true;
};

const PUBLIC_USER_FIELDS = 'username firstName lastName avatarUrl subscriptionTier friendCategories';
const PUBLIC_INVITER_FIELDS = 'username firstName lastName';

const shapeUser = (user) => {
  if (!user) return null;
  const plain = typeof user.toObject === 'function' ? user.toObject() : user;
  return { ...plain, id: String(plain._id || plain.id) };
};

const dayKeyUtc = (date = new Date()) => date.toISOString().slice(0, 10);
const inviteQuotaId = (inviterId, dayKey) => `${String(inviterId)}:${dayKey}`;
const quotaExpiry = (date = new Date()) => new Date(date.getTime() + 32 * 24 * 60 * 60 * 1000);

async function reserveInviteQuota(inviterId, now = new Date()) {
  const dayKey = dayKeyUtc(now);
  const quota = await InviteQuota.findOneAndUpdate(
    { _id: inviteQuotaId(inviterId, dayKey) },
    {
      $inc: { count: 1 },
      $setOnInsert: { invitedBy: inviterId, dayKey, expiresAt: quotaExpiry(now) }
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();

  if ((quota?.count || 0) <= INVITE_DAILY_LIMIT) return true;
  await releaseInviteQuota(inviterId, dayKey);
  return false;
}

async function releaseInviteQuota(inviterId, dayKey = dayKeyUtc()) {
  try {
    await InviteQuota.updateOne(
      { _id: inviteQuotaId(inviterId, dayKey), count: { $gt: 0 } },
      { $inc: { count: -1 } }
    );
  } catch (err) {
    console.error('Invite quota release failed:', err.message);
  }
}

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const normalizePhoneE164 = (value) => {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (hasPlus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : '';
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : '';
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @route   GET /api/friends
// @desc    Get user's friends
// @access  Private
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username avatarUrl friendCategories');
    res.json((user?.friends || []).map(shapeUser));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   DELETE /api/friends/:friendId
// @desc    Remove a friend
// @access  Private
exports.removeFriend = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const user = await User.findById(req.user.id);
    const friendId = req.params.friendId;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: 'Invalid friend id.' });
    }
    if (String(friendId) === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot remove yourself as a friend.' });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const friend = await User.findById(friendId).select('friends');
    const userHasFriend = user.friends.some((id) => String(id) === String(friendId));
    const friendHasUser = friend?.friends?.some((id) => String(id) === String(user._id));

    if (!friend || !userHasFriend || !friendHasUser) {
      return res.status(404).json({ message: 'Friendship not found.' });
    }

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    await user.save();

    // Friendship is mutual, so drop the reverse edge too rather than leaving
    // the other user with a one-sided connection.
    await Promise.all([
      User.updateOne({ _id: friendId }, { $pull: { friends: user._id } }),
      FriendRequest.deleteMany({
        $or: [
          { from: user._id, to: friendId },
          { from: friendId, to: user._id }
        ]
      })
    ]);

    res.json(user.friends);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/friends/search?query=...
// @desc    Search users by name, username, email, or phone
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const query = (req.query.query || req.query.username || '').trim();
    if (!query) return res.json([]);

    // If DB not connected, fallback to demo store search
    if (mongoose.connection.readyState !== 1) {
      const demoStore = require('../utils/demoFriendStore');
      const owner = req.user.id || req.user.username || 'dexii_demo_user';
      const results = await demoStore.searchUsers(owner, query);
      return res.json(results.slice(0, 50));
    }

    const normalizedEmail = normalizeEmail(query);
    const normalizedPhone = normalizePhoneE164(query);
    const safe = escapeRegex(query);
    const rx = new RegExp(safe, 'i');

    const baseFilter = { _id: { $ne: req.user.id } };
    let users = [];

    // Try exact email/phone lookup first
    if (normalizedEmail && normalizedEmail.includes('@')) {
      users = await User.find({ ...baseFilter, email: normalizedEmail })
        .select('username firstName lastName avatarUrl subscriptionTier friendCategories')
        .limit(50)
        .lean();
    } else if (normalizedPhone) {
      users = await User.find({ ...baseFilter, phoneE164: normalizedPhone })
        .select('username firstName lastName avatarUrl subscriptionTier friendCategories')
        .limit(50)
        .lean();
    }

    // If exact lookup returned no results, fall back to regex search on username/name fields
    if (users.length === 0) {
      users = await User.find({
        ...baseFilter,
        $or: [
          { username: rx },
          { firstName: rx },
          { lastName: rx },
          { searchName: rx }
        ]
      })
        .select('username firstName lastName avatarUrl subscriptionTier friendCategories')
        .limit(50)
        .lean();
    }

    // Annotate each result so the UI can render the right action (add / pending / friends)
    // instead of offering to re-send a request that already exists.
    const me = await User.findById(req.user.id).select('friends').lean();
    const friendIds = new Set((me?.friends || []).map(String));

    const ids = users.map((user) => user._id);
    const relatedRequests = await FriendRequest.find({
      status: 'pending',
      $or: [
        { from: req.user.id, to: { $in: ids } },
        { from: { $in: ids }, to: req.user.id }
      ]
    }).lean();

    const outgoing = new Set(
      relatedRequests.filter((r) => String(r.from) === String(req.user.id)).map((r) => String(r.to))
    );
    const incoming = new Set(
      relatedRequests.filter((r) => String(r.to) === String(req.user.id)).map((r) => String(r.from))
    );

    res.json(users.map((user) => {
      const id = String(user._id || user.id || user.username);
      let relationship = 'none';
      if (friendIds.has(id)) relationship = 'friends';
      else if (outgoing.has(id)) relationship = 'request_sent';
      else if (incoming.has(id)) relationship = 'request_received';

      return { ...user, id, relationship };
    }));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/friends/invite
// @desc    Invite someone who is not on Dexii yet, via email or SMS
// @access  Private
exports.inviteUser = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const method = String(req.body.method || '').trim().toLowerCase();
    const rawContact = String(req.body.contact || '').trim();
    const personalMessage = String(req.body.message || '').trim().slice(0, 500);

    if (method !== 'email' && method !== 'sms') {
      return res.status(400).json({ message: 'Invite method must be email or sms.' });
    }
    if (!rawContact) {
      return res.status(400).json({ message: 'Enter an email address or phone number to invite.' });
    }

    const contact = method === 'email' ? normalizeEmail(rawContact) : normalizePhoneE164(rawContact);
    if (!contact) {
      return res.status(400).json({
        message: method === 'email' ? 'That email address looks invalid.' : 'That phone number looks invalid.'
      });
    }
    if (method === 'email' && !EMAIL_PATTERN.test(contact)) {
      return res.status(400).json({ message: 'That email address looks invalid.' });
    }

    const inviter = await User.findById(req.user.id).select('username firstName lastName email phoneE164');
    if (!inviter) {
      return res.status(404).json({ message: 'Your account could not be found.' });
    }

    // Don't let people invite themselves.
    if (contact === normalizeEmail(inviter.email || '') || contact === normalizePhoneE164(inviter.phoneE164 || '')) {
      return res.status(400).json({ message: 'That is your own contact info.' });
    }

    // If they already have an account, a friend request is the right action instead.
    const existingUser = await User.findOne(
      method === 'email' ? { email: contact } : { phoneE164: contact }
    ).select(PUBLIC_USER_FIELDS);

    if (existingUser) {
      return res.status(409).json({
        message: `${existingUser.username} is already on Dexii. Send them a friend request instead.`,
        alreadyRegistered: true,
        user: shapeUser(existingUser)
      });
    }

    const now = new Date();
    const quotaDayKey = dayKeyUtc(now);
    const reservedQuota = await reserveInviteQuota(inviter._id, now);
    if (!reservedQuota) {
      return res.status(429).json({
        message: `You have hit the limit of ${INVITE_DAILY_LIMIT} invites per day. Try again tomorrow.`
      });
    }

    // Reuse a live invite for the same contact so repeat sends don't pile up tokens.
    await Invite.updateMany(
      { invitedBy: inviter._id, contact, status: 'pending', expiresAt: { $lte: now } },
      { $set: { status: 'expired' } }
    );

    let invite = await Invite.findOne({
      invitedBy: inviter._id,
      contact,
      status: 'pending',
      expiresAt: { $gt: now }
    });

    let createdInvite = false;
    if (invite) {
      invite.method = method;
      invite.message = personalMessage;
      invite.sentAt = now;
    } else {
      invite = new Invite({
        token: Invite.generateToken(),
        invitedBy: inviter._id,
        contact,
        method,
        message: personalMessage,
        expiresAt: Invite.defaultExpiry()
      });

      try {
        await invite.save();
        createdInvite = true;
      } catch (err) {
        if (err?.code === 11000) {
          await releaseInviteQuota(inviter._id, quotaDayKey);
          return res.status(409).json({ message: 'An invite to that contact is already pending.' });
        }
        throw err;
      }
    }

    const inviterName = buildDisplayName(inviter);
    const inviteUrl = buildInviteUrl(req, invite.token);

    let delivery = 'handoff';
    let smsUrl;

    if (method === 'email') {
      const { subject, message, html } = buildInviteEmail({
        inviterName,
        inviteUrl,
        personalMessage
      });

      try {
        const result = await sendEmail({ email: contact, subject, message, html });
        delivery = result?.debug ? 'debug' : 'sent';
      } catch (err) {
        console.error('Invite email failed:', err.message);
        if (createdInvite) {
          await Invite.deleteOne({ _id: invite._id, status: 'pending' });
        }
        await releaseInviteQuota(inviter._id, quotaDayKey);
        return res.status(502).json({ message: 'We could not send that invite email. Please try again.' });
      }
    } else {
      try {
        const smsBody = buildInviteSmsBody({ inviterName, inviteUrl, personalMessage });
        const result = await sendSms({ phone: contact, message: smsBody });
        delivery = result.delivery;
        smsUrl = result.smsUrl;
      } catch (err) {
        console.error('Invite SMS failed:', err.message);
        if (createdInvite) {
          await Invite.deleteOne({ _id: invite._id, status: 'pending' });
        }
        await releaseInviteQuota(inviter._id, quotaDayKey);
        return res.status(502).json({ message: 'We could not prepare that invite text. Please try again.' });
      }
    }

    invite.delivery = delivery;
    await invite.save();

    res.json({
      status: 'ok',
      delivery,
      smsUrl,
      inviteUrl,
      contact,
      method,
      message: delivery === 'sent'
        ? `Invite sent to ${contact}.`
        : delivery === 'debug'
        ? `Invite created for ${contact}. Email delivery is not configured on this server.`
        : 'Invite ready to send from your messaging app.'
    });
  } catch (err) {
    console.error('Invite error:', err.message);
    res.status(500).json({ message: 'Server error while creating that invite.' });
  }
};

// @route   GET /api/friends/invite/:token
// @desc    Look up who sent an invite so signup can show it
// @access  Public
exports.getInvite = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Invites need a live database connection.' });
    }

    const invite = await Invite.findOne({ token: String(req.params.token || '') })
      .populate('invitedBy', PUBLIC_INVITER_FIELDS);

    if (!invite) {
      return res.status(404).json({ message: 'That invite link is not valid.' });
    }
    if (!invite.isUsable()) {
      return res.status(410).json({
        message: invite.status === 'accepted'
          ? 'That invite has already been used.'
          : 'That invite link has expired.',
        status: invite.status
      });
    }

    res.json({
      token: invite.token,
      method: invite.method,
      message: invite.message,
      inviterName: buildDisplayName(invite.invitedBy),
      expiresAt: invite.expiresAt
    });
  } catch (err) {
    console.error('Invite lookup error:', err.message);
    res.status(500).json({ message: 'Server error while loading that invite.' });
  }
};

/**
 * Marks an invite accepted and links the new user to whoever invited them.
 * Safe to call with a missing/invalid token - it simply does nothing.
 */
exports.acceptInviteForUser = async function acceptInviteForUser(token, newUserId) {
  if (!token || !newUserId) return null;
  if (mongoose.connection.readyState !== 1) return null;

  try {
    const now = new Date();
    const invite = await Invite.findOneAndUpdate(
      {
        token: String(token),
        status: 'pending',
        expiresAt: { $gt: now },
        invitedBy: { $ne: newUserId }
      },
      {
        $set: {
          status: 'accepted',
          acceptedAt: now,
          acceptedBy: newUserId
        }
      },
      { returnDocument: 'after' }
    );
    if (!invite) return null;
    if (String(invite.invitedBy) === String(newUserId)) {
      await Invite.findOneAndUpdate(
        { _id: invite._id, status: 'accepted', acceptedBy: newUserId },
        { $set: { status: 'pending' }, $unset: { acceptedAt: '', acceptedBy: '' } }
      );
      return null;
    }

    try {
      await linkFriends(invite.invitedBy, newUserId);
    } catch (err) {
      console.error(
        `Invite ${invite._id} was claimed but friendship linking failed for inviter ${invite.invitedBy} and user ${newUserId}:`,
        err.message
      );
      try {
        await Invite.findOneAndUpdate(
          { _id: invite._id, status: 'accepted', acceptedBy: newUserId },
          { $set: { status: 'pending' }, $unset: { acceptedAt: '', acceptedBy: '' } }
        );
      } catch (releaseErr) {
        console.error(`Invite ${invite._id} claim release failed:`, releaseErr.message);
      }
      return null;
    }

    return invite;
  } catch (err) {
    console.error('Could not accept invite:', err.message);
    return null;
  }
};

// @route   POST /api/friends/requests
// @desc    Send a friend request
// @access  Private
exports.sendFriendRequest = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const toUserId = req.body.toUserId || req.body.to;
    const message = (req.body.message || '').trim();

    if (!toUserId || !mongoose.isValidObjectId(toUserId)) {
      return res.status(400).json({ message: 'A valid recipient is required.' });
    }
    if (String(toUserId) === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot send yourself a friend request.' });
    }

    const recipient = await User.findById(toUserId).select('_id username');
    if (!recipient) {
      return res.status(404).json({ message: 'That user no longer exists.' });
    }

    const me = await User.findById(req.user.id).select('friends blockedUsers');
    if (me.friends.some((id) => String(id) === String(toUserId))) {
      return res.status(400).json({ message: 'You are already friends.' });
    }

    // If they already asked us, accept instead of creating a duplicate facing request.
    const reverse = await FriendRequest.findOne({ from: toUserId, to: req.user.id, status: 'pending' });
    if (reverse) {
      reverse.status = 'accepted';
      reverse.respondedAt = new Date();
      await reverse.save();
      await linkFriends(req.user.id, toUserId);
      return res.json({ status: 'accepted', message: 'You are now friends.', request: reverse });
    }

    const existing = await FriendRequest.findOne({ from: req.user.id, to: toUserId, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'A request to this user is already pending.' });
    }

    const request = await FriendRequest.create({ from: req.user.id, to: toUserId, message });
    res.status(201).json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/friends/requests
// @desc    Incoming pending requests
// @access  Private
exports.getIncomingRequests = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const requests = await FriendRequest.find({ to: req.user.id, status: 'pending' })
      .populate('from', PUBLIC_USER_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests.map((r) => ({ ...r, id: String(r._id), from: shapeUser(r.from) })));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/friends/requests/sent
// @desc    Outgoing pending requests
// @access  Private
exports.getOutgoingRequests = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const requests = await FriendRequest.find({ from: req.user.id, status: 'pending' })
      .populate('to', PUBLIC_USER_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests.map((r) => ({ ...r, id: String(r._id), to: shapeUser(r.to) })));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/friends/requests/:requestId/respond
// @desc    Accept or decline an incoming request
// @access  Private
exports.respondToRequest = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const { requestId } = req.params;
    const action = (req.body.action || req.body.response || '').toLowerCase();

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: "Action must be 'accept' or 'decline'." });
    }
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ message: 'Invalid request id.' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }
    // Only the recipient may respond, otherwise a sender could self-accept.
    if (String(request.to) !== String(req.user.id)) {
      return res.status(403).json({ message: 'This request was not sent to you.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request was already handled.' });
    }

    request.status = action === 'accept' ? 'accepted' : 'declined';
    request.respondedAt = new Date();
    await request.save();

    if (action === 'accept') {
      await linkFriends(request.from, request.to);
    }

    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   DELETE /api/friends/requests/:requestId
// @desc    Cancel an outgoing request
// @access  Private
exports.cancelRequest = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const { requestId } = req.params;
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ message: 'Invalid request id.' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }
    if (String(request.from) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only cancel requests you sent.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request was already handled.' });
    }

    request.status = 'cancelled';
    request.respondedAt = new Date();
    await request.save();

    res.json({ message: 'Request cancelled.', id: String(request._id) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/friends/requests/:requestId/nudge
// @desc    Nudge a pending outgoing request
// @access  Private
exports.nudgeRequest = async (req, res) => {
  try {
    if (!requireDb(res)) return;

    const { requestId } = req.params;
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ message: 'Invalid request id.' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }
    if (String(request.from) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only nudge requests you sent.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request was already handled.' });
    }

    request.nudgeCount = (request.nudgeCount || 0) + 1;
    request.lastNudgedAt = new Date();
    await request.save();

    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Adds both sides of the friendship. $addToSet keeps repeat accepts idempotent.
async function linkFriends(userA, userB) {
  const ensureLinked = async () => {
    await Promise.all([
      User.updateOne({ _id: userA }, { $addToSet: { friends: userB } }),
      User.updateOne({ _id: userB }, { $addToSet: { friends: userA } })
    ]);
  };

  const hasMutualEdges = async () => {
    const [a, b] = await Promise.all([
      User.findById(userA).select('friends').lean(),
      User.findById(userB).select('friends').lean()
    ]);
    return Boolean(
      a &&
      b &&
      (a.friends || []).some((id) => String(id) === String(userB)) &&
      (b.friends || []).some((id) => String(id) === String(userA))
    );
  };

  await ensureLinked();
  if (await hasMutualEdges()) return;

  await ensureLinked();
  if (!(await hasMutualEdges())) {
    throw new Error('Friendship link verification failed.');
  }
}
