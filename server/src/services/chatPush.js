/**
 * Push notifications for chat messages (1:1 and group). Fire-and-forget:
 * callers should not await delivery or let failures affect the request.
 *
 * Respects the recipient's "Notify me about new chat messages" setting
 * (profileSettings.notifyChatMessages, default on). Disappearing messages and
 * safety alerts never include the message text in the push.
 */
const User = require('../models/User');
const push = require('./pushService');

const PREVIEW_LIMIT = 120;

const displayName = (user) => {
  if (!user) return 'A friend';
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.username || 'A friend';
};

const preview = (message) => {
  if (message.isSafetyAlert) return 'sent you a safety alert';
  if (message.isSelfDestruct) return '🔒 Private message';
  const text = String(message.content || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'sent you a message';
  return text.length > PREVIEW_LIMIT ? `${text.slice(0, PREVIEW_LIMIT - 1)}…` : text;
};

const wantsChatPush = (user) => user?.profileSettings?.notifyChatMessages !== false;

async function notifyDirectMessage(message, senderId) {
  try {
    if (!(await push.isEnabled())) return;
    const [sender, recipient] = await Promise.all([
      User.findById(senderId).select('username firstName lastName').lean(),
      User.findById(message.recipient).select('profileSettings').lean()
    ]);
    if (!recipient || !wantsChatPush(recipient)) return;

    const name = displayName(sender);
    const route = `/chat?friendId=${encodeURIComponent(String(senderId))}&friendName=${encodeURIComponent(name)}`;
    await push.sendToUser(String(message.recipient), {
      title: name,
      body: preview(message),
      data: { route, type: 'chat_message', senderId: String(senderId) }
    });
  } catch (err) {
    console.warn('Push: chat message push failed:', err.message);
  }
}

async function notifyGroupMessage(group, message, senderId) {
  try {
    if (!(await push.isEnabled())) return;
    const memberIds = (group.members || []).map(String).filter((id) => id !== String(senderId));
    if (!memberIds.length) return;

    const [sender, members] = await Promise.all([
      User.findById(senderId).select('username firstName lastName').lean(),
      User.find({ _id: { $in: memberIds } }).select('profileSettings').lean()
    ]);
    const name = displayName(sender);
    const title = group.name ? `${name} in ${group.name}` : name;
    const body = preview(message);
    const route = `/groups/${encodeURIComponent(String(group._id))}`;

    await Promise.all(members.filter(wantsChatPush).map((member) => push.sendToUser(String(member._id), {
      title,
      body,
      data: { route, type: 'group_message', groupId: String(group._id), senderId: String(senderId) }
    })));
  } catch (err) {
    console.warn('Push: group message push failed:', err.message);
  }
}

module.exports = { notifyDirectMessage, notifyGroupMessage };
