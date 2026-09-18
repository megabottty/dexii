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
  bio: String,
  status: {
    type: String,
    enum: ['Crush', 'Crushing', 'Dating', 'Exclusive', 'Archived', 'Friend'],
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
  grade: String,
  occupation: String,
  family: String,
  memorableMoments: String,
  friends: [String],
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('CrushProfile', CrushProfileSchema);
