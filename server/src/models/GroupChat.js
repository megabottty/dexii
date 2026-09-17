const mongoose = require('mongoose');

const GroupChatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  avatarUrl: String,
  // Tracks the last time each member opened the group so we can compute
  // per-member unread counts without a separate read-receipt collection.
  lastReadBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastReadAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('GroupChat', GroupChatSchema);
