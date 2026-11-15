const mongoose = require('mongoose');
const Entry = require('../models/Entry');
const { findCrush, canReactToUpdate } = require('./updateAudience');

/** How much of an update's text goes into a chat quote. */
const EXCERPT_MAX = 100;

/** True for the entry types that show in a crush's Updates For Friends feed. */
const isUpdate = (entry) => entry.type === 'Update' || entry.type === 'StatusChange'
  || (entry.type === 'Note' && Array.isArray(entry.visibility) && entry.visibility.length > 0);

/** The first ~100 characters of an update, cut at a word and ending in "…" when it was longer. */
const excerptOf = (entry) => {
  const text = entry.type === 'StatusChange'
    ? `Status changed to ${entry.content}`
    : String(entry.content || '').replace(/\s+/g, ' ').trim();
  if (text.length <= EXCERPT_MAX) return text;
  const cut = text.slice(0, EXCERPT_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

/**
 * Builds the "replying to this update" quote shown above a chat message (DEX-71).
 * Returns null when the person can't see that update, so nobody can quote, or learn
 * about, an update they weren't shown. Built on the server so the client can't fake it.
 *
 * @returns {Promise<{entryId, crushId, ownerId, crushName, excerpt} | null>}
 */
const quoteForUpdate = async (userId, entryId) => {
  if (!mongoose.isValidObjectId(entryId)) return null;
  const entry = await Entry.findById(entryId).lean();
  if (!entry || !isUpdate(entry)) return null;
  const crush = await findCrush(entry.crushId);
  if (!(await canReactToUpdate(userId, entry, crush))) return null;
  return {
    entryId: entry._id,
    crushId: crush._id,
    ownerId: crush.userId,
    crushName: crush.nickname || 'their crush',
    excerpt: excerptOf(entry)
  };
};

module.exports = { quoteForUpdate, excerptOf };
