const mongoose = require('mongoose');

/**
 * One line in the history between two friends: who did what, to whom, when.
 * `visibleTo` lists who may see the line (both people for most events; only the
 * actor for pausing/muting). `pair` is the two ids sorted and joined with ':'
 * so a friend's timeline is one indexed query.
 */
const ACTIVITY_TYPES = [
  'crush_shared', 'crush_unshared', 'crush_deleted', 'crush_viewed',
  'entry_shared', 'entry_unshared',
  'dating_status_shared', 'safety_alert',
  'request_sent', 'request_accepted', 'request_declined', 'request_cancelled', 'request_nudged',
  'invite_sent', 'invite_cancelled', 'invite_accepted', 'friends_linked',
  'friend_paused', 'friend_resumed', 'friend_removed'
];

const FriendActivitySchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  counterpart: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pair: { type: String, index: true },
  type: { type: String, enum: ACTIVITY_TYPES, required: true },
  crushId: { type: String },
  entryId: { type: String },
  requestId: { type: String },
  inviteId: { type: String },
  messageId: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  visibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  /** Where a backfilled row came from (e.g. "msg:<id>"), so re-running the backfill is safe. */
  source: { type: String },
  createdAt: { type: Date, default: Date.now }
});

FriendActivitySchema.index({ pair: 1, createdAt: -1 });
FriendActivitySchema.index({ visibleTo: 1, createdAt: -1 });
FriendActivitySchema.index({ source: 1 }, { unique: true, sparse: true });

FriendActivitySchema.statics.pairKey = (a, b) => [String(a), String(b)].sort().join(':');
FriendActivitySchema.statics.ACTIVITY_TYPES = ACTIVITY_TYPES;

module.exports = mongoose.model('FriendActivity', FriendActivitySchema);
