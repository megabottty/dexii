const User = require('../models/User');

/** The few fields a reaction or comment shows about a person. */
const shapePerson = (user) => user ? {
  id: String(user._id),
  username: user.username,
  displayName: user.displayName || '',
  avatarUrl: user.avatarUrl
} : null;

/**
 * Fills in who reacted, commented and hearted on shaped entries (DEX-45), with one
 * user lookup for the whole list. Entries without reactions or comments are untouched.
 */
const withPeople = async (shapedEntries) => {
  const ids = new Set();
  for (const entry of shapedEntries) {
    for (const r of entry.reactions || []) ids.add(String(r.userId));
    for (const c of entry.comments || []) ids.add(String(c.userId));
  }
  const users = ids.size
    ? await User.find({ _id: { $in: [...ids] } }).select('username displayName avatarUrl').lean()
    : [];
  const byId = new Map(users.map((u) => [String(u._id), shapePerson(u)]));

  return shapedEntries.map((entry) => ({
    ...entry,
    reactions: (entry.reactions || []).map((r) => ({
      userId: String(r.userId),
      emoji: r.emoji,
      at: r.at,
      user: byId.get(String(r.userId)) || null
    })),
    comments: (entry.comments || []).map((c) => ({
      id: String(c._id || c.id),
      userId: String(c.userId),
      content: c.content,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
      hearts: (c.hearts || []).map(String),
      user: byId.get(String(c.userId)) || null
    }))
  }));
};

module.exports = { withPeople, shapePerson };
