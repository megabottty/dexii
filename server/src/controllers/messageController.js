const Message = require('../models/Message');
const User = require('../models/User');

// Messaging is limited to mutual friends so the app cannot be used to DM strangers.
const areFriends = async (userId, otherId) => {
  if (!otherId || String(userId) === String(otherId)) return false;
  try {
    const user = await User.findById(userId).select('friends').lean();
    return (user?.friends || []).some((id) => String(id) === String(otherId));
  } catch {
    return false;
  }
};

// @route   GET /api/messages/conversations
// @desc    Get started conversations for the logged-in user
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select('friends')
      .populate('friends', 'username avatarUrl friendCategories')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await deleteExpiredSelfDestructMessagesForUser(userId);

    const friends = user.friends || [];
    const friendIds = new Set(friends.map((friend) => String(friend._id || friend.id || friend)));
    const friendMap = new Map(
      friends.map((friend) => {
        const id = String(friend._id || friend.id || friend);
        return [id, {
          id,
          username: friend.username || id,
          avatarUrl: friend.avatarUrl,
          friendCategories: friend.friendCategories || []
        }];
      })
    );

    const unreadCounts = await Message.aggregate([
      { $match: { recipient: user._id, isRead: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    const unreadCountByFriend = new Map(unreadCounts.map((row) => [String(row._id), row.count]));

    const messages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const seen = new Set();
    const summaries = [];

    for (const message of messages) {
      const senderId = String(message.sender);
      const recipientId = String(message.recipient);
      const friendId = senderId === String(userId) ? recipientId : senderId;
      if (!friendIds.has(friendId) || seen.has(friendId)) continue;

      seen.add(friendId);
      summaries.push({
        friend: friendMap.get(friendId) || { id: friendId, username: friendId, friendCategories: [] },
        latestMessage: message,
        unreadCount: unreadCountByFriend.get(friendId) || 0
      });
    }

    res.json(summaries);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/messages/:friendId
// @desc    Get messages between logged-in user and a friend
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const friendId = req.params.friendId;
    const userId = req.user.id;

    if (!(await areFriends(userId, friendId))) {
      return res.status(403).json({ message: 'You can only read conversations with your friends.' });
    }

    await deleteExpiredSelfDestructMessages(userId, friendId);

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: friendId },
        { sender: friendId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content, isSafetyAlert, crushId, isSelfDestruct, selfDestructDurationMs } = req.body;
    const senderId = req.user.id;

    if (!recipientId) {
      return res.status(400).json({ message: 'recipientId is required' });
    }

    if (!(await areFriends(senderId, recipientId))) {
      return res.status(403).json({ message: 'You can only message people you are friends with.' });
    }

    const duration = Number(selfDestructDurationMs);
    const newMessage = new Message({
      sender: senderId,
      recipient: recipientId,
      content,
      isSafetyAlert,
      isSelfDestruct: Boolean(isSelfDestruct),
      selfDestructDurationMs: isSelfDestruct && Number.isFinite(duration) && duration >= 1000 ? duration : undefined,
      crushId
    });

    const message = await newMessage.save();
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT /api/messages/read/:friendId
// @desc    Mark messages as read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const friendId = req.params.friendId;
    const userId = req.user.id;

    await Message.updateMany(
      { sender: friendId, recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ msg: 'Messages marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

async function deleteExpiredSelfDestructMessages(userId, friendId) {
  const expirableMessages = await Message.find({
    isSelfDestruct: true,
    isRead: true,
    readAt: { $exists: true, $ne: null },
    $or: [
      { sender: userId, recipient: friendId },
      { sender: friendId, recipient: userId }
    ]
  }).select('_id readAt selfDestructDurationMs');

  const now = Date.now();
  const expiredIds = expirableMessages
    .filter((message) => {
      const duration = Number.isFinite(message.selfDestructDurationMs)
        ? message.selfDestructDurationMs
        : 8000;
      return message.readAt.getTime() + duration <= now;
    })
    .map((message) => message._id);

  if (expiredIds.length > 0) {
    await Message.deleteMany({ _id: { $in: expiredIds } });
  }

  async function deleteExpiredSelfDestructMessagesForUser(userId) {
    const expirableMessages = await Message.find({
      isSelfDestruct: true,
      isRead: true,
      readAt: { $exists: true, $ne: null },
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    }).select('_id readAt selfDestructDurationMs');

    await deleteExpiredMessages(expirableMessages);
  }

  async function deleteExpiredMessages(expirableMessages) {
    const now = Date.now();
    const expiredIds = expirableMessages
      .filter((message) => {
        const duration = Number.isFinite(message.selfDestructDurationMs)
          ? message.selfDestructDurationMs
          : 8000;
        return message.readAt.getTime() + duration <= now;
      })
      .map((message) => message._id);

    if (expiredIds.length > 0) {
      await Message.deleteMany({ _id: { $in: expiredIds } });
    }
  }
}
