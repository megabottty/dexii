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
  avatarUrl: String,
  bio: String,
  status: {
    type: String,
    enum: ['Crush', 'Dating', 'Exclusive', 'Archived'],
    default: 'Crush'
  },
  visibility: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
    default: 0
  },
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
  relationshipStatus: String
}, { timestamps: true });

module.exports = mongoose.model('CrushProfile', CrushProfileSchema);
