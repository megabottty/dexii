const mongoose = require('mongoose');

const InviteQuotaSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  dayKey: {
    type: String,
    required: true,
    index: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('InviteQuota', InviteQuotaSchema);
