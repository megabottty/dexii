const mongoose = require('mongoose');

const ENTRY_TYPES = ['Note', 'Date', 'RedFlag', 'SafetyCheck', 'PrivateJournal'];
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
  redFlagCount: Number
}, { timestamps: true });

EntrySchema.index({ userId: 1, crushId: 1 });
EntrySchema.index({ visibility: 1 });

EntrySchema.statics.entryTypes = ENTRY_TYPES;

module.exports = mongoose.model('Entry', EntrySchema);
