const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Exactly one of recipient/group is set, enforced in the controllers:
  // 1:1 messages use recipient, group messages use group.
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat'
  },
  content: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isSafetyAlert: {
    type: Boolean,
    default: false
  },
  isSelfDestruct: {
    type: Boolean,
    default: false
  },
  selfDestructDurationMs: {
    type: Number,
    min: 1000
  },
  safetyStatus: {
    type: String,
    enum: ['Draft', 'Sent', 'Safe', 'Urgent'],
    default: 'Sent'
  },
  crushId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrushProfile'
  },
  relatedEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entry'
  },
  // One reaction per user per message; re-tapping the same emoji removes it,
  // tapping a different emoji replaces it.
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
