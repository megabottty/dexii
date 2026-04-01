const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  pin: {
    type: String, // Hashed PIN
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true
  },
  bio: {
    type: String,
    default: ''
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subscriptionTier: {
    type: String,
    enum: ['Free', 'Premium', 'Gold'],
    default: 'Free'
  },
  isVerified18: {
    type: Boolean,
    default: false
  },
  avatarUrl: String,
  friendCategories: {
    type: [String],
    default: ["Close Friends", "Casual", "Work"]
  },
  verificationCode: String,
  verificationCodeExpires: Date,
  isEmailVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
