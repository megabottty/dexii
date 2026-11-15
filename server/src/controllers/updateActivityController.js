const mongoose = require('mongoose');
const Entry = require('../models/Entry');
const User = require('../models/User');
const CrushProfile = require('../models/CrushProfile');
const Notification = require('../models/Notification');
const { shapeEntry } = require('./entryController');
const { withPeople } = require('../services/updatePeople');
const { createNotification, emitNotificationsChanged } = require('./notificationController');
const { findCrush, emitEntriesChanged, canReactToUpdate } = require('../services/updateAudience');
const { quoteForUpdate } = require('../services/updateQuote');

/** Emojis a friend can react to an update with (DEX-45). */
const REACTION_EMOJIS = ['💗', '😍', '😂', '😬', '🔥', '🥺'];
const COMMENT_MAX = 1000;

const isUpdate = (entry) => ['Update', 'StatusChange', 'FeelsChange'].includes(entry.type)
  || (entry.type === 'Note' && Array.isArray(entry.visibility) && entry.visibility.length > 0);

/**
 * Loads an update the signed-in user may act on, or sends the error response and returns null.
 * By default that's comments and comment hearts, which only the crush's owner can use.
 * With { friendsToo: true } (reactions, DEX-71) friends the crush is shared with can act too,
 * on updates posted after it was shared with them.
 * Anything they can't touch answers "not found", so it doesn't reveal that the update exists.
 */
const loadUpdateFor = async (req, res, { friendsToo = false } = {}) => {
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
  const crush = await findCrush(entry.crushId);
  const isOwner = !!crush && String(crush.userId) === me;
  // Comments stay owner-only. Friends reply in chat instead (DEX-71).
  const allowed = isOwner || (friendsToo && await canReactToUpdate(me, entry, crush));
  if (!allowed) {
    res.status(404).json({ message: 'Update not found.' });
    return null;
  }
  return { entry, crush, isOwner };
};

const respond = async (req, res, entry, crush) => {
  res.json((await withPeople([shapeEntry(entry)]))[0]);
  emitEntriesChanged(req.app.get('io'), crush, [String(entry.userId)]);
};

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

/**
 * POST /entries/:id/reactions { emoji }: sets your reaction, and the same emoji again removes it.
 * The owner and friends the crush is shared with can react (DEX-71). The update's author
 * gets a notification when someone else reacts.
 */
exports.react = async (req, res) => {
  try {
    const emoji = String(req.body?.emoji || '');
    if (!REACTION_EMOJIS.includes(emoji)) return res.status(400).json({ message: 'Unknown reaction.' });
    const found = await loadUpdateFor(req, res, { friendsToo: true });
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
    await respond(req, res, entry, crush);
    if (added) notify(req, { recipient: entry.userId, type: 'update_reaction', entry, crush, extra: { emoji } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /entries/:id/quote: the short "replying to this update" preview a friend sees above
 * the chat box after tapping the chat icon on an update (DEX-71). 404 if they can't see it.
 */
exports.quote = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database unavailable.' });
    const quote = await quoteForUpdate(req.user.id, req.params.id);
    if (!quote) return res.status(404).json({ message: 'Update not found.' });
    res.json(quote);
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
    await respond(req, res, entry, crush);
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
    await respond(req, res, found.entry, found.crush);
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
    await respond(req, res, found.entry, found.crush);
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
    await respond(req, res, found.entry, found.crush);
    if (!hearted) notify(req, { recipient: comment.userId, type: 'comment_heart', entry: found.entry, crush: found.crush, extra: { commentId: String(comment._id), commentPreview: comment.content.slice(0, 80) } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.REACTION_EMOJIS = REACTION_EMOJIS;
