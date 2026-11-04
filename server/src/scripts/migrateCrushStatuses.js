#!/usr/bin/env node
/**
 * Moves crushes off retired statuses (DEX-50): Crushing and Plotting become Crush,
 * Heartbroken becomes Broken Up, Friend becomes Friends. Run by hand after deploying:
 *   MONGO_URI=... node src/scripts/migrateCrushStatuses.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const CrushProfile = require('../models/CrushProfile');
const { LEGACY_STATUSES } = require('../utils/crushStatus');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  for (const [from, to] of Object.entries(LEGACY_STATUSES)) {
    const result = await CrushProfile.updateMany({ status: from }, { $set: { status: to } });
    console.log(`${from} → ${to}: ${result.modifiedCount} crush(es).`);
  }
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });
