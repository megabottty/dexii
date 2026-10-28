const mongoose = require('mongoose');
const Entry = require('../models/Entry');
const User = require('../models/User');
const CrushProfile = require('../models/CrushProfile');
const Notification = require('../models/Notification');
const { shapeEntry } = require('./entryController');
const { withPeople } = require('../services/updatePeople');
const { createNotification, emitNotificationsChanged } = require('./notificationController');

/** Emojis a friend can react to an update with (DEX-45). */
const REACTION_EMOJIS = ['💗', '😍', '😂', '😬', '🔥', '🥺'];
const COMMENT_MAX = 1000;

const isUpdate = (entry) => entry.type === 'Update'
  || (entry.type === 'Note' && Array.isArray(entry.visibility) && entry.visibility.length > 0);

/**
 * Loads an update the signed-in user may react to and comment on: their own, or a friend's
 * update on a crush that friend shares with them. Sends the error response and returns null otherwise.
 */
const loadUpdateFor = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: 'Database unavailable.' });
    return null;
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid update id.' });
    return null;
  }
  const entry = await Entry.findById(req.params.id);
  if (!entry || !isUpdate(entry)) {
    res.status(404).json({ message: 'Update not found.' });
    return null;
  }
  const me = String(req.user.id);
  const ownerId = String(entry.userId);
  if (ownerId === me) return { entry, isOwner: true, crush: await findCrush(entry) };

  const [viewer, crush] = await Promise.all([
    User.findById(me).select('friends username').lean(),
    findCrush(entry)
  ]);
  const isFriend = (viewer?.friends || []).map(String).includes(ownerId);
  const visibility = Array.isArray(crush?.visibility) ? crush.visibility.map(String) : [];
  const sharedWithMe = visibility.includes(me) || (viewer?.username && visibility.includes(viewer.username));
  if (!isFriend || !crush || !sharedWithMe) {
    res.status(403).json({ message: 'You can only react to updates on crushes shared with you.' });
    return null;
  }
  return { entry, isOwner: false, crush };
};

const findCrush = (entry) => mongoose.isValidObjectId(entry.crushId)
  ? CrushProfile.findOne({ _id: entry.crushId, userId: entry.userId }).select('nickname visibility').lean()
  : null;

const respond = async (res, entry) => res.json((await withPeople([shapeEntry(entry)]))[0]);

/** Fire-and-forget notification to someone else about activity on an update. */
const notify = (req, { recipient, type, entry, crush, extra = {} }) => {
  if (!recipient || String(recipient) === String(req.user.id)) return;
  const io = req.app.get('io');
  void createNotification({
    recipient: String(recipient),
    actor: req.user.id,
    type,
    payload: {
      crushId: String(entry.crushId),
      crushNickname: crush?.nickname || '',
      entryId: String(entry._id),
      preview: String(entry.content || '').slice(0, 80),
      ...extra
    }
  }).then((saved) => { if (saved) emitNotificationsChanged(io, [recipient]); })
    .catch((err) => console.error('Update activity notification failed:', err.message));
};

/** POST /entries/:id/reactions { emoji }: sets your reaction; the same emoji again removes it. */
exports.react = async (req, res) => {
  try {
    const emoji = String(req.body?.emoji || '');
    if (!REACTION_EMOJIS.includes(emoji)) return res.status(400).json({ message: 'Unknown reaction.' });
    const found = await loadUpdateFor(req, res);
    if (!found) return;
    const { entry, crush } = found;
    const me = String(req.user.id);
    const existing = entry.reactions.find((r) => String(r.userId) === me);
    let added = false;
    if (existing && existing.emoji === emoji) {
      entry.reactions = entry.reactions.filter((r) => String(r.userId) !== me);
    } else if (existing) {
      existing.emoji = emoji;
      existing.at = new Date();
      added = true;
    } else {
      entry.reactions.push({ userId: me, emoji, at: new Date() });
      added = true;
    }
    await entry.save();
    await respond(res, entry);
    if (added) notify(req, { recipient: entry.userId, type: 'update_reaction', entry, crush, extra: { emoji } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const cleanComment = (value) => String(value || '').trim().slice(0, COMMENT_MAX);

/** POST /entries/:id/comments { content } */
exports.addComment = async (req, res) => {
  try {
    const content = cleanComment(req.body?.content);
    if (!content) return res.status(400).json({ message: 'Write a comment first.' });
    const found = await loadUpdateFor(req, res);
    if (!found) return;
    const { entry, crush } = found;
    entry.comments.push({ userId: req.user.id, content, createdAt: new Date(), hearts: [] });
    await entry.save();
    const comment = entry.comments[entry.comments.length - 1];
    await respond(res, entry);
    notify(req, { recipient: entry.userId, type: 'update_comment', entry, crush, extra: { commentId: String(comment._id), commentPreview: content.slice(0, 80) } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const findComment = (entry, req, res) => {
  const comment = entry.comments.id(req.params.commentId);
  if (!comment) res.status(404).json({ message: 'Comment not found.' });
  return comment;
};

/** PUT /entries/:id/comments/:commentId { content }: only the person who wrote it. */
exports.editComment = async (req, res) => {
  try {
    const content = cleanComment(req.body?.content);
    if (!content) return res.status(400).json({ message: 'A comment can’t be empty.' });
    const found = await loadUpdateFor(req, res);
    if (!found) return;
    const comment = findComment(found.entry, req, res);
    if (!comment) return;
    if (String(comment.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Only the person who wrote a comment can edit it.' });
    if (comment.content !== content) {
      comment.content = content;
      comment.editedAt = new Date();
      await found.entry.save();
    }
    await respond(res, found.entry);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/** DELETE /entries/:id/comments/:commentId: the person who wrote it, or the person whose update it is on. */
exports.deleteComment = async (req, res) => {
  try {
    const found = await loadUpdateFor(req, res);
    if (!found) return;
    const comment = findComment(found.entry, req, res);
    if (!comment) return;
    if (String(comment.userId) !== String(req.user.id) && !found.isOwner) {
      return res.status(403).json({ message: 'Only the writer or the person who posted the update can delete this comment.' });
    }
    const commentId = String(comment._id);
    found.entry.comments.pull(comment._id);
    await found.entry.save();
    await respond(res, found.entry);
    // Its notifications point at nothing now.
    void Notification.deleteMany({ 'payload.commentId': commentId })
      .then(() => emitNotificationsChanged(req.app.get('io'), [String(found.entry.userId), String(comment.userId)]))
      .catch(() => undefined);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/** POST /entries/:id/comments/:commentId/heart: toggles your heart on a comment. */
exports.heartComment = async (req, res) => {
  try {
    const found = await loadUpdateFor(req, res);
    if (!found) return;
    const comment = findComment(found.entry, req, res);
    if (!comment) return;
    const me = String(req.user.id);
    const hearted = comment.hearts.map(String).includes(me);
    comment.hearts = hearted ? comment.hearts.filter((id) => String(id) !== me) : [...comment.hearts, me];
    await found.entry.save();
    await respond(res, found.entry);
    if (!hearted) notify(req, { recipient: comment.userId, type: 'comment_heart', entry: found.entry, crush: found.crush, extra: { commentId: String(comment._id), commentPreview: comment.content.slice(0, 80) } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.REACTION_EMOJIS = REACTION_EMOJIS;
