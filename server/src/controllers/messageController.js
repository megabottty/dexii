const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { readStore, writeStore, ensureUser } = require('../utils/demoFriendStore');

// Demo messages storage helper
const getDemoMessages = async () => {
  const state = await readStore();
  if (!Array.isArray(state.messages)) {
    state.messages = [];
  }
  return { state, messages: state.messages };
};

// Messaging is limited to mutual friends so the app cannot be used to DM strangers.
const areFriends = async (userId, otherId) => {
  if (!otherId || String(userId) === String(otherId)) return false;

  if (mongoose.connection.readyState !== 1) {
    try {
      const state = await readStore();
      const user = state.users.find(u => u.username === userId || u.id === userId);
      const friendnames = state.friendships?.[user?.username] || [];
      return friendnames.includes(otherId);
    } catch {
      return true;
    }
  }

  try {
    const user = await User.findById(userId).select('friends').lean();
    return (user?.friends || []).some((id) => String(id) === String(otherId));
  } catch {
    return false;
  }
};

async function deleteExpiredMessages(expirableMessages) {
  if (!expirableMessages || expirableMessages.length === 0) return;
  const now = Date.now();
  const expiredIds = expirableMessages
    .filter((message) => {
      const duration = Number.isFinite(message.selfDestructDurationMs)
        ? message.selfDestructDurationMs
        : 8000;
      const readTime = message.readAt ? new Date(message.readAt).getTime() : 0;
      return readTime > 0 && (readTime + duration <= now);
    })
    .map((message) => message._id);

  if (expiredIds.length > 0) {
    await Message.deleteMany({ _id: { $in: expiredIds } });
  }
}

async function deleteExpiredSelfDestructMessagesForUser(userId) {
  if (mongoose.connection.readyState !== 1) return;
  try {
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
  } catch (err) {
    console.warn('Error deleting expired self-destruct messages for user:', err.message);
  }
}

async function deleteExpiredSelfDestructMessages(userId, friendId) {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const expirableMessages = await Message.find({
      isSelfDestruct: true,
      isRead: true,
      readAt: { $exists: true, $ne: null },
      $or: [
        { sender: userId, recipient: friendId },
        { sender: friendId, recipient: userId }
      ]
    }).select('_id readAt selfDestructDurationMs');

    await deleteExpiredMessages(expirableMessages);
  } catch (err) {
    console.warn('Error deleting expired self-destruct messages between pair:', err.message);
  }
}

// @route   GET /api/messages/conversations
// @desc    Get started conversations for the logged-in user
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Support demo mode
    if (mongoose.connection.readyState !== 1 || req.user.isDemo) {
      const { state, messages } = await getDemoMessages();
      const user = ensureUser(state, userId);
      const friends = state.users.filter(u => (state.friendships?.[user.username] || []).includes(u.username));
      const friendMap = new Map(
        friends.map((friend) => [
          friend.username,
          {
            id: friend.username,
            username: friend.username,
            avatarUrl: friend.avatarUrl,
            friendCategories: friend.friendCategories || []
          }
        ])
      );

      const userMessages = messages.filter(
        m => m.sender === userId || m.recipient === userId
      ).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const seen = new Set();
      const summaries = [];

      for (const message of userMessages) {
        const friendId = message.sender === userId ? message.recipient : message.sender;
        if (seen.has(friendId)) continue;
        seen.add(friendId);

        const unreadForFriend = messages.filter(
          m => m.sender === friendId && m.recipient === userId && !m.isRead
        );
        const unreadSelfDestruct = unreadForFriend.filter(m => m.isSelfDestruct).length;

        summaries.push({
          friend: friendMap.get(friendId) || { id: friendId, username: friendId, friendCategories: [] },
          latestMessage: message,
          unreadCount: unreadForFriend.length,
          unreadSelfDestructCount: unreadSelfDestruct
        });
      }

      return res.json(summaries);
    }

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

    const userObjId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : user._id;

    const unreadCounts = await Message.aggregate([
      { $match: { recipient: userObjId, isRead: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    const unreadCountByFriend = new Map(unreadCounts.map((row) => [String(row._id), row.count]));

    const unreadSelfDestructCounts = await Message.aggregate([
      { $match: { recipient: userObjId, isRead: false, isSelfDestruct: true } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    const unreadSelfDestructByFriend = new Map(unreadSelfDestructCounts.map((row) => [String(row._id), row.count]));

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
        unreadCount: unreadCountByFriend.get(friendId) || 0,
        unreadSelfDestructCount: unreadSelfDestructByFriend.get(friendId) || 0
      });
    }

    res.json(summaries);
  } catch (err) {
    console.error('Get conversations error:', err.message);
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

    if (mongoose.connection.readyState !== 1 || req.user.isDemo) {
      const { messages } = await getDemoMessages();
      const convo = messages.filter(
        m => (m.sender === userId && m.recipient === friendId) ||
             (m.sender === friendId && m.recipient === userId)
      ).sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      return res.json(convo);
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

    if (mongoose.connection.readyState !== 1 || req.user.isDemo) {
      const { state, messages } = await getDemoMessages();
      const message = {
        _id: `demo_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender: senderId,
        recipient: recipientId,
        content,
        isSafetyAlert: Boolean(isSafetyAlert),
        isSelfDestruct: Boolean(isSelfDestruct),
        selfDestructDurationMs: isSelfDestruct && Number.isFinite(duration) && duration >= 1000 ? duration : undefined,
        crushId,
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      messages.push(message);
      await writeStore(state);
      return res.json(message);
    }

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

    if (mongoose.connection.readyState !== 1 || req.user.isDemo) {
      const { state, messages } = await getDemoMessages();
      const now = new Date().toISOString();
      for (const m of messages) {
        if (m.sender === friendId && m.recipient === userId && !m.isRead) {
          m.isRead = true;
          m.readAt = now;
          m.updatedAt = now;
        }
      }
      await writeStore(state);
      return res.json({ msg: 'Messages marked as read' });
    }

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

