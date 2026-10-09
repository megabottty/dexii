const mongoose = require('mongoose');

const CrushProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nickname: {
    type: String,
    required: true
  },
  fullName: String,
  displayName: {
    type: String,
    enum: ['nickname', 'fullName'],
    default: 'nickname'
  },
  avatarUrl: String,
  // Options used by the in-app avatar builder (see client AvatarConfig).
  avatarConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined
  },
  bio: String,
  status: {
    type: String,
    enum: ['Crush', 'Plotting', 'Dating', 'Exclusive', 'Broken Up', 'Heartbroken', 'Archived', 'Friend'],
    default: 'Crush'
  },
  visibility: {
    type: [String],
    default: []
  },
  sharedEntries: [{
    type: String
  }],
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  // First-impression vibe, set when the crush is created; never overwritten by vibe logs.
  initialRating: {
    type: Number,
    min: 1,
    max: 5
  },
  redFlags: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  redFlagReason: String,
  vibeHistory: {
    type: [Number],
    default: [5]
  },
  // Compatibility Check: the owner's read (0-100), why, and anything giving them pause.
  compatibility: {
    score: { type: Number, min: 0, max: 100, default: null },
    factors: { type: [String], default: [] },
    note: { type: String, default: '', maxlength: 600 },
    pause: { type: String, default: '', maxlength: 300 },
    updatedAt: { type: Date, default: null }
  },
  // Every time the owner's score or note changed (newest last, capped at 50).
  compatibilityHistory: {
    type: [{
      score: { type: Number, min: 0, max: 100 },
      factors: { type: [String], default: [] },
      note: { type: String, default: '' },
      at: { type: Date, default: Date.now }
    }],
    default: []
  },
  // Friends' reads on a crush shared with them: one entry per friend.
  friendCompatibility: {
    type: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      username: { type: String, default: '' },
      avatarUrl: { type: String, default: '' },
      score: { type: Number, min: 0, max: 100, required: true },
      note: { type: String, default: '', maxlength: 300 },
      at: { type: Date, default: Date.now }
    }],
    default: []
  },
  category: String,
  hair: [String],
  eyes: [String],
  build: [String],
  social: {
    snapchat: String,
    whatsapp: String,
    twitter: String,
    facebook: String,
    instagram: String
  },
  relationshipStatus: String,
  relationshipLabels: {
    type: [String],
    default: []
  },
  heartbreakSong: String,
  heartbreakRecovery: String,
  pronouns: {
    type: String,
    enum: ['he', 'she', 'they', 'custom'],
    default: 'they'
  },
  customNotes: {
    type: String,
    default: ''
  },
  location: String,
  dateOfBirth: Date,
  age: Number,
  howWeMet: String,
  whenWeMet: String,
  schoolOrWork: {
    type: String,
    enum: ['school', 'working', 'both', 'neither', ''],
    default: ''
  },
  grade: String,
  occupation: String,
  family: String,
  memorableMoments: String,
  friends: [String],
  sortOrder: {
    type: Number,
    default: 0
  },
  // Friends who have opened this shared crush, with the latest time. Owner-only.
  viewedBy: {
    type: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      at: { type: Date, required: true }
    }],
    default: []
  },
  // Up to 8 photos. `audience: 'shared'` = every friend the crush is shared with;
  // 'friends' = only the listed friendIds (and only if the crush is shared with them).
  photos: {
    type: [{
      url: { type: String, required: true },
      width: Number,
      height: Number,
      bytes: Number,
      addedAt: { type: Date, default: Date.now },
      audience: { type: String, enum: ['shared', 'friends'], default: 'shared' },
      friendIds: { type: [String], default: [] }
    }],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('CrushProfile', CrushProfileSchema);
