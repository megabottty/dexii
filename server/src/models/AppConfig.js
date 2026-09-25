const mongoose = require('mongoose');

/**
 * Tiny key/value store for server-generated secrets and settings that must
 * survive restarts but don't need to be hand-configured (e.g. VAPID keys).
 */
const AppConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

module.exports = mongoose.model('AppConfig', AppConfigSchema);
