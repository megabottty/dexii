const GroupChat = require('../models/GroupChat');
const Message = require('../models/Message');
const { areFriends } = require('./messageController');

// @route   POST /api/groups
// @desc    Create a group chat. All invited members must be mutual friends of the creator.
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const creatorId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'A group name is required.' });
    }

    const uniqueMemberIds = [...new Set((memberIds || []).map(String))].filter(
      (id) => id !== String(creatorId)
    );

    if (uniqueMemberIds.length < 1) {
      return res.status(400).json({ message: 'Pick at least one friend to add to the group.' });
    }

    for (const memberId of uniqueMemberIds) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await areFriends(creatorId, memberId))) {
        return res.status(403).json({ message: 'You can only add mutual friends to a group.' });
      }
    }

    const group = new GroupChat({
      name: name.trim(),
      members: [creatorId, ...uniqueMemberIds],
      createdBy: creatorId,
      lastReadBy: [{ user: creatorId, lastReadAt: new Date() }]
    });

    await group.save();
    const populated = await GroupChat.findById(group._id).populate('members', 'username avatarUrl').lean();
    res.json(populated);
  } catch (err) {
    console.error('Create group error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/groups
// @desc    List the caller's group chats, each with the latest message + unread count.
// @access  Private
exports.listGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await GroupChat.find({ members: userId })
      .populate('members', 'username avatarUrl')
      .sort({ updatedAt: -1 })
      .lean();

    const groupIds = groups.map((g) => g._id);
    const latestMessages = await Message.find({ group: { $in: groupIds } })
      .sort({ createdAt: -1 })
      .lean();

    const latestByGroup = new Map();
    for (const message of latestMessages) {
      const key = String(message.group);
      if (!latestByGroup.has(key)) latestByGroup.set(key, message);
    }

    const summaries = groups.map((group) => {
      const myReadEntry = (group.lastReadBy || []).find((r) => String(r.user) === String(userId));
      const lastReadAt = myReadEntry ? new Date(myReadEntry.lastReadAt) : new Date(0);
      const unreadCount = latestMessages.filter(
        (m) => String(m.group) === String(group._id) &&
          String(m.sender) !== String(userId) &&
          new Date(m.createdAt) > lastReadAt
      ).length;

      return {
        group: {
          id: String(group._id),
          name: group.name,
          avatarUrl: group.avatarUrl,
          members: (group.members || []).map((m) => ({
            id: String(m._id),
            username: m.username,
            avatarUrl: m.avatarUrl
          }))
        },
        latestMessage: latestByGroup.get(String(group._id)) || null,
        unreadCount
      };
    });

    res.json(summaries);
  } catch (err) {
    console.error('List groups error:', err.message);
    res.status(500).send('Server Error');
  }
};

const assertMembership = async (groupId, userId) => {
  const group = await GroupChat.findById(groupId);
  if (!group) return null;
  const isMember = group.members.some((m) => String(m) === String(userId));
  return isMember ? group : null;
};

// @route   GET /api/groups/:groupId/messages
// @access  Private
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await assertMembership(groupId, req.user.id);
    if (!group) return res.status(403).json({ message: 'You are not a member of this group.' });

    const messages = await Message.find({ group: groupId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatarUrl')
      .lean();

    res.json(messages);
  } catch (err) {
    console.error('Get group messages error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/groups/:groupId/messages
// @access  Private
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, crushId } = req.body;
    const senderId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'content is required' });
    }

    const group = await assertMembership(groupId, senderId);
    if (!group) return res.status(403).json({ message: 'You are not a member of this group.' });

    const message = new Message({
      sender: senderId,
      group: groupId,
      content,
      crushId
    });
    await message.save();
    await message.populate('sender', 'username avatarUrl');

    group.updatedAt = new Date();
    await group.save();

    const io = req.app.get('io');
    if (io) {
      for (const memberId of group.members) {
        if (String(memberId) === String(senderId)) continue;
        io.to(String(memberId)).emit('receiveGroupMessage', message);
      }
    }

    res.json(message);
  } catch (err) {
    console.error('Send group message error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT /api/groups/:groupId/read
// @access  Private
exports.markGroupRead = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await assertMembership(groupId, userId);
    if (!group) return res.status(403).json({ message: 'You are not a member of this group.' });

    const existing = group.lastReadBy.find((r) => String(r.user) === String(userId));
    if (existing) {
      existing.lastReadAt = new Date();
    } else {
      group.lastReadBy.push({ user: userId, lastReadAt: new Date() });
    }
    await group.save();
    res.json({ msg: 'Group marked as read' });
  } catch (err) {
    console.error('Mark group read error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/groups/:groupId/members
// @desc    Add a mutual friend of the caller to an existing group.
// @access  Private
exports.addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const userId = req.user.id;

    const group = await assertMembership(groupId, userId);
    if (!group) return res.status(403).json({ message: 'You are not a member of this group.' });

    if (!(await areFriends(userId, memberId))) {
      return res.status(403).json({ message: 'You can only add mutual friends to a group.' });
    }

    if (!group.members.some((m) => String(m) === String(memberId))) {
      group.members.push(memberId);
      group.lastReadBy.push({ user: memberId, lastReadAt: new Date(0) });
      await group.save();
    }

    const populated = await GroupChat.findById(group._id).populate('members', 'username avatarUrl').lean();
    res.json(populated);
  } catch (err) {
    console.error('Add group member error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   DELETE /api/groups/:groupId/members/me
// @desc    Leave a group chat.
// @access  Private
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await GroupChat.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });

    group.members = group.members.filter((m) => String(m) !== String(userId));
    group.lastReadBy = group.lastReadBy.filter((r) => String(r.user) !== String(userId));
    await group.save();

    res.json({ msg: 'Left group' });
  } catch (err) {
    console.error('Leave group error:', err.message);
    res.status(500).send('Server Error');
  }
};
