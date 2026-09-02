const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending',
    index: true
  },
  message: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  nudgeCount: {
    type: Number,
    default: 0
  },
  lastNudgedAt: Date,
  respondedAt: Date
}, { timestamps: true });

// Only one live request may exist per direction; resolved ones are kept for history.
FriendRequestSchema.index(
  { from: 1, to: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('FriendRequest', FriendRequestSchema);
