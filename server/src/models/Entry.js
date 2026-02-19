const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  crushId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrushProfile',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Note', 'Date', 'RedFlag', 'SafetyCheck', 'PrivateJournal'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isBurnAfterReading: {
    type: Boolean,
    default: false
  },
  visibility: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isSensitive: {
    type: Boolean,
    default: false
  },
  safetyStatus: {
    type: String,
    enum: ['Draft', 'Sent', 'Safe', 'Urgent']
  },
  safetyContactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Entry', EntrySchema);
