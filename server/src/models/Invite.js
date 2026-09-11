const mongoose = require('mongoose');
const crypto = require('crypto');

const INVITE_TTL_DAYS = 30;

const InviteSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contact: {
    type: String,
    required: true,
    trim: true
  },
  method: {
    type: String,
    enum: ['email', 'sms'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending',
    index: true
  },
  message: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  delivery: {
    type: String,
    enum: ['sent', 'handoff', 'debug'],
    default: 'handoff'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: Date,
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, { timestamps: true });

InviteSchema.index(
  { invitedBy: 1, contact: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

InviteSchema.statics.generateToken = function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
};

InviteSchema.statics.defaultExpiry = function defaultExpiry() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
};

InviteSchema.methods.isUsable = function isUsable() {
  return this.status === 'pending' && this.expiresAt instanceof Date && this.expiresAt.getTime() > Date.now();
};

module.exports = mongoose.model('Invite', InviteSchema);
module.exports.INVITE_TTL_DAYS = INVITE_TTL_DAYS;
