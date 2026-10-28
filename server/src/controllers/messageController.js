const mongoose = require('mongoose');
const chatPush = require('../services/chatPush');
const Message = require('../models/Message');
const { isPausedBy, friendsWhoPaused } = require('../services/pauseState');
const { recordActivity } = require('../services/activityLog');
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
      const user = state.users.find(u => u.username === userId);
      const friendnames = state.friendships?.[user?.username] || [];
      return friendnames.includes(otherId);
    } catch (err) {
      // Fail closed: if we can't verify the friendship, don't allow messaging.
      console.warn('areFriends (demo mode) lookup failed, denying by default:', err.message);
      return false;
    }
  }

  try {
    const user = await User.findById(userId).select('friends').lean();
    return (user?.friends || []).some((id) => String(id) === String(otherId));
  } catch {
    return false;
  }
};
exports.areFriends = areFriends;

/** Disappearing messages are never previewed outside the conversation itself. */
const previewSafe = (message) => {
  if (message?.deletedAt) {
    const plain = typeof message.toObject === 'function' ? message.toObject() : { ...message };
    return { ...plain, content: 'Message deleted' };
  }
  if (!message?.isSelfDestruct) return message;
  const plain = typeof message.toObject === 'function' ? message.toObject() : { ...message };
  return { ...plain, content: 'Private message' };
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
/** The sender's own message with its read receipt removed (the reader has paused them). */
const hideReceiptFromSender = (message, senderId) => {
  const plain = typeof message.toObject === 'function' ? message.toObject() : { ...message };
  if (String(plain.sender) !== String(senderId)) return plain;
  return { ...plain, isRead: false, readAt: undefined };
};

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
          latestMessage: previewSafe(message),
          unreadCount: unreadForFriend.length,
          unreadSelfDestructCount: unreadSelfDestruct
        });
      }

      return res.json(summaries);
    }

    const user = await User.findById(userId)
      .select('friends pausedFriends')
      .populate('friends', 'username displayName avatarUrl friendCategories')
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
          displayName: friend.displayName || '',
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
    const pausedMe = await friendsWhoPaused(userId, [...friendIds]);
    const myPaused = new Map((user.pausedFriends || []).map((entry) => [String(entry.user), entry]));

    for (const message of messages) {
      const senderId = String(message.sender);
      const recipientId = String(message.recipient);
      const friendId = senderId === String(userId) ? recipientId : senderId;
      if (!friendIds.has(friendId) || seen.has(friendId)) continue;

      seen.add(friendId);
      const latest = pausedMe.has(friendId) ? hideReceiptFromSender(message, userId) : message;
      summaries.push({
        friend: friendMap.get(friendId) || { id: friendId, username: friendId, friendCategories: [] },
        latestMessage: previewSafe(latest),
        unreadCount: unreadCountByFriend.get(friendId) || 0,
        unreadSelfDestructCount: unreadSelfDestructByFriend.get(friendId) || 0,
        muted: myPaused.get(friendId)?.mutedNotifications !== false && myPaused.has(friendId)
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
      ],
      hiddenFor: { $ne: userId }
    }).sort({ createdAt: 1 });

    // If the friend has paused me, my messages never show as read to me.
    const receiptsHidden = await isPausedBy(friendId, userId);
    res.json(receiptsHidden ? messages.map((m) => hideReceiptFromSender(m, userId)) : messages);
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
    const { recipientId, content, isSafetyAlert, crushId, relatedEntryId, isSelfDestruct, selfDestructDurationMs } = req.body;
    const senderId = req.user.id;
    const KINDS = ['chat', 'crush_share', 'entry_share', 'dating_status', 'safety_alert'];
    const kind = KINDS.includes(req.body.kind) ? req.body.kind : (isSafetyAlert ? 'safety_alert' : 'chat');

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
        relatedEntryId,
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
      kind,
      isSafetyAlert,
      isSelfDestruct: Boolean(isSelfDestruct),
      selfDestructDurationMs: isSelfDestruct && Number.isFinite(duration) && duration >= 1000 ? duration : undefined,
      crushId,
      relatedEntryId
    });

    const message = await newMessage.save();
    res.json(message);

    // Status updates and safety alerts are part of the history between friends.
    if (kind === 'dating_status') {
      void recordActivity({ io: req.app.get('io'), actor: senderId, counterpart: recipientId, type: 'dating_status_shared', crushId, messageId: message._id, meta: { text: String(content || '').slice(0, 160) } });
    } else if (kind === 'safety_alert' || isSafetyAlert) {
      void recordActivity({ io: req.app.get('io'), actor: senderId, counterpart: recipientId, type: 'safety_alert', messageId: message._id, meta: { text: String(content || '').slice(0, 160) } });
    }

    // Wake the recipient's phone; never delays or fails the send.
    setImmediate(() => { void chatPush.notifyDirectMessage(message, senderId); });
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
    const readAt = new Date();
    // Read receipt: the sender's open sessions learn their messages were seen.
    const notifySender = () => {
      const io = req.app.get('io');
      if (!io) return;
      try { io.to(String(friendId)).emit('messagesRead', { readerId: String(userId), readAt: readAt.toISOString() }); } catch { /* ignore */ }
    };

    if (mongoose.connection.readyState !== 1 || req.user.isDemo) {
      const { state, messages } = await getDemoMessages();
      const now = readAt.toISOString();
      let changed = 0;
      for (const m of messages) {
        if (m.sender === friendId && m.recipient === userId && !m.isRead) {
          m.isRead = true;
          m.readAt = now;
          m.updatedAt = now;
          changed++;
        }
      }
      await writeStore(state);
      if (changed) notifySender();
      return res.json({ msg: 'Messages marked as read' });
    }

    const result = await Message.updateMany(
      { sender: friendId, recipient: userId, isRead: false },
      { $set: { isRead: true, readAt } }
    );

    res.json({ msg: 'Messages marked as read' });
    // readAt is still stored (disappearing messages count down from it), but a
    // friend you've paused is not told that you read their messages.
    if (result.modifiedCount && !(await isPausedBy(userId, friendId))) notifySender();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};


// @route   POST /api/messages/:messageId/react
// @desc    Toggle an emoji reaction on a 1:1 or group message. Users can react
//          with multiple emojis; re-tapping the same emoji removes that reaction.
// @access  Private
exports.reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ message: 'emoji is required' });
    }

    if (mongoose.connection.readyState !== 1 || req.user.isDemo) {
      const { state, messages } = await getDemoMessages();
      const message = messages.find((m) => String(m._id) === String(messageId));
      if (!message) return res.status(404).json({ message: 'Message not found' });

      message.reactions = message.reactions || [];
      const existingIdx = message.reactions.findIndex((r) => r.user === userId && r.emoji === emoji);
      if (existingIdx >= 0) {
        message.reactions.splice(existingIdx, 1);
      } else {
        message.reactions.push({ user: userId, emoji });
      }
      await writeStore(state);
      return res.json(message);
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Access check: must be sender/recipient of a 1:1 message, or a member of the group.
    if (message.group) {
      const GroupChat = require('../models/GroupChat');
      const group = await GroupChat.findById(message.group).select('members').lean();
      const isMember = !!group && (group.members || []).some((m) => String(m) === String(userId));
      if (!isMember) return res.status(403).json({ message: 'You are not a member of this group.' });
    } else {
      const isParty = String(message.sender) === String(userId) || String(message.recipient) === String(userId);
      if (!isParty) return res.status(403).json({ message: 'You cannot react to this message.' });
    }

    const existing = message.reactions.some((r) => String(r.user) === String(userId) && r.emoji === emoji);
    if (existing) {
      message.reactions = message.reactions.filter(
        (r) => !(String(r.user) === String(userId) && r.emoji === emoji)
      );
    } else {
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();
    res.json(message);
  } catch (err) {
    console.error('React to message error:', err.message);
    res.status(500).send('Server Error');
  }
};

// ---- Edit and delete messages (1:1 and group), like other chat apps ----

/** The sender can edit a message for this long after sending it. */
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const MESSAGE_MAX = 4000;

/** Loads a message the caller is part of (sender/recipient, or group member), with everyone to tell about changes. */
const loadOwnMessageThread = async (req, res) => {
  if (mongoose.connection.readyState !== 1 || req.user.isDemo) {
    res.status(503).json({ message: 'Editing and deleting need a live connection.' });
    return null;
  }
  if (!mongoose.isValidObjectId(req.params.messageId)) {
    res.status(400).json({ message: 'Invalid message id.' });
    return null;
  }
  const message = await Message.findById(req.params.messageId);
  if (!message) {
    res.status(404).json({ message: 'Message not found' });
    return null;
  }
  const me = String(req.user.id);
  let others = [];
  if (message.group) {
    const GroupChat = require('../models/GroupChat');
    const group = await GroupChat.findById(message.group).select('members').lean();
    const members = (group?.members || []).map(String);
    if (!members.includes(me)) {
      res.status(403).json({ message: 'You are not a member of this group.' });
      return null;
    }
    others = members.filter((id) => id !== me);
  } else {
    const parties = [String(message.sender), String(message.recipient)];
    if (!parties.includes(me)) {
      res.status(403).json({ message: 'This message isn’t in one of your chats.' });
      return null;
    }
    others = parties.filter((id) => id !== me);
  }
  return { message, me, others, isSender: String(message.sender) === me };
};

/** Tells the other open chats to show the edit or deletion. */
const emitMessageChanged = (req, recipients, message) => {
  const io = req.app.get('io');
  if (!io) return;
  const payload = typeof message.toObject === 'function' ? message.toObject() : message;
  for (const id of recipients) {
    try { io.to(String(id)).emit('messageChanged', payload); } catch { /* ignore */ }
  }
};

// @route   PUT /api/messages/:messageId   body: { content }
// @desc    Edit your own message within 15 minutes of sending it
exports.editMessage = async (req, res) => {
  try {
    const content = String(req.body?.content || '').trim().slice(0, MESSAGE_MAX);
    if (!content) return res.status(400).json({ message: 'A message can’t be empty.' });
    const found = await loadOwnMessageThread(req, res);
    if (!found) return;
    const { message, isSender, others } = found;
    if (!isSender) return res.status(403).json({ message: 'You can only edit your own messages.' });
    if (message.deletedAt) return res.status(400).json({ message: 'This message was deleted.' });
    if ((message.kind && message.kind !== 'chat') || message.isSafetyAlert || message.isSelfDestruct) {
      return res.status(400).json({ message: 'This kind of message can’t be edited.' });
    }
    if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
      return res.status(400).json({ message: 'Messages can only be edited for 15 minutes after sending.' });
    }
    if (message.content !== content) {
      message.content = content;
      message.editedAt = new Date();
      await message.save();
    }
    res.json(message);
    emitMessageChanged(req, others, message);
  } catch (err) {
    console.error('Edit message error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   DELETE /api/messages/:messageId?for=everyone|me
// @desc    Delete for everyone (sender only: leaves "Message deleted"), or just hide it for yourself
exports.deleteMessage = async (req, res) => {
  try {
    const scope = req.query.for === 'everyone' ? 'everyone' : 'me';
    const found = await loadOwnMessageThread(req, res);
    if (!found) return;
    const { message, me, isSender, others } = found;

    if (scope === 'everyone') {
      if (!isSender) return res.status(403).json({ message: 'Only the sender can delete a message for everyone.' });
      if (!message.deletedAt) {
        message.deletedAt = new Date();
        message.content = '';
        message.reactions = [];
        await message.save();
      }
      res.json(message);
      emitMessageChanged(req, others, message);
      return;
    }

    if (!message.hiddenFor.map(String).includes(me)) {
      message.hiddenFor.push(me);
      await message.save();
    }
    res.json({ ok: true, id: String(message._id), hiddenForMe: true });
  } catch (err) {
    console.error('Delete message error:', err.message);
    res.status(500).send('Server Error');
  }
};
