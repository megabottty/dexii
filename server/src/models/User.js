const mongoose = require('mongoose');

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return undefined;
  const email = value.trim().toLowerCase();
  return email || undefined;
};

const normalizePhoneE164 = (value) => {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return undefined;

  if (hasPlus) {
    if (digits.length < 8 || digits.length > 15) return undefined;
    return `+${digits}`;
  }

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return undefined;
};

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
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
  phoneE164: {
    type: String,
    unique: true,
    sparse: true
  },
  searchName: {
    type: String,
    index: true,
    default: ''
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

UserSchema.pre('validate', function normalizeForSearch() {
  this.username = (this.username || '').trim();
  this.firstName = (this.firstName || '').trim();
  this.lastName = (this.lastName || '').trim();
  this.email = normalizeEmail(this.email);

  const normalizedPhone = normalizePhoneE164(this.phoneE164);
  if (this.phoneE164 && !normalizedPhone) {
    this.invalidate('phoneE164', 'Invalid phone number format.');
  }
  this.phoneE164 = normalizedPhone;

  const parts = [this.firstName, this.lastName].filter(Boolean);
  this.searchName = (parts.join(' ') || this.username).trim().toLowerCase();
});

UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phoneE164: 1 }, { unique: true, sparse: true });
UserSchema.index({ searchName: 1 });

module.exports = mongoose.model('User', UserSchema);
