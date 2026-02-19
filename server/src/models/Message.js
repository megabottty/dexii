const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isSafetyAlert: {
    type: Boolean,
    default: false
  },
  safetyStatus: {
    type: String,
    enum: ['Draft', 'Sent', 'Safe', 'Urgent'],
    default: 'Sent'
  },
  crushId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrushProfile'
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
