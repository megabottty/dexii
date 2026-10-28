const mongoose = require('mongoose');

// 'Update' is an Update For Friends: everyone the crush is shared with sees it (DEX-44).
// 'StatusChange' is added by the server when a crush's status changes, so it shows in the feed (DEX-45).
const ENTRY_TYPES = ['Note', 'Update', 'StatusChange', 'Date', 'RedFlag', 'SafetyCheck', 'PrivateJournal'];
const SAFETY_STATUSES = ['Draft', 'Sent', 'Safe', 'Urgent'];

const EntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  crushId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ENTRY_TYPES,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isBurnAfterReading: {
    type: Boolean,
    default: false
  },
  hasViewed: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: [String],
    default: []
  },
  isSensitive: {
    type: Boolean,
    default: false
  },
  safetyContactId: String,
  safetyStatus: {
    type: String,
    enum: SAFETY_STATUSES
  },
  redFlagCount: Number,
  editHistory: {
    type: [{
      previousContent: { type: String, required: true },
      editedAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  editedAt: Date,
  // Updates For Friends (DEX-45): one emoji reaction per person, and comments friends can heart.
  reactions: {
    type: [{
      _id: false,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      emoji: { type: String, required: true },
      at: { type: Date, default: Date.now }
    }],
    default: []
  },
  comments: {
    type: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      content: { type: String, required: true, maxlength: 1000 },
      createdAt: { type: Date, default: Date.now },
      editedAt: Date,
      hearts: { type: [mongoose.Schema.Types.ObjectId], default: [] }
    }],
    default: []
  }
}, { timestamps: true });

EntrySchema.index({ userId: 1, crushId: 1 });
EntrySchema.index({ visibility: 1 });

EntrySchema.statics.entryTypes = ENTRY_TYPES;

module.exports = mongoose.model('Entry', EntrySchema);
