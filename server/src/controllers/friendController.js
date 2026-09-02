const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const mongoose = require('mongoose');

const requireDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: 'Database unavailable. Friend requests need a live connection.' });
    return false;
  }
  return true;
};

const PUBLIC_USER_FIELDS = 'username firstName lastName avatarUrl subscriptionTier friendCategories';

const shapeUser = (user) => {
  if (!user) return null;
  const plain = typeof user.toObject === 'function' ? user.toObject() : user;
  return { ...plain, id: String(plain._id || plain.id) };
};

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
// @desc    Send invite to user via phone or email
// @access  Private
exports.inviteUser = async (req, res) => {
  try {
    const { contact, method } = req.body; // contact can be phone number or email, method is 'sms' or 'email'

    // TODO: Integrate SMS service (Twilio) or Email service
    // For now, we'll just log the invite and return success

    console.log(`Invite sent via ${method} to ${contact}`);

    res.json({
      message: `Invite sent successfully via ${method}`,
      contact,
      method
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
  await Promise.all([
    User.updateOne({ _id: userA }, { $addToSet: { friends: userB } }),
    User.updateOne({ _id: userB }, { $addToSet: { friends: userA } })
  ]);
}
