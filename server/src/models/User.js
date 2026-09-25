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
  passwordHash: {
    type: String,
    default: ''
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
  stripeCustomerId: {
    type: String,
    default: null
  },
  stripeSubscriptionId: {
    type: String,
    default: null
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
  profileSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // One-time onboarding flags, kept on the account so they follow the user
  // across browsers, the PWA and the native apps.
  onboarding: {
    firstLoginTourSeenAt: { type: Date, default: null }
  },
  // Native app devices (Capacitor). One entry per device; APNs token for iOS,
  // FCM registration token for Android.
  pushTokens: {
    type: [{
      token: { type: String, required: true },
      platform: { type: String, enum: ['ios', 'android'], required: true },
      updatedAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  verificationCode: String,
  verificationCodeExpires: Date,
  passwordResetCode: String,
  passwordResetCodeExpires: Date,
  pendingInviteToken: String,
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // Lets a user's chosen theme follow them across browsers/devices instead
  // of only being remembered in one browser's localStorage.
  themePreference: {
    mode: {
      type: String,
      default: null
    },
    customColors: {
      bg: String,
      primary: String,
      accent: String
    }
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

module.exports = mongoose.model('User', UserSchema);
