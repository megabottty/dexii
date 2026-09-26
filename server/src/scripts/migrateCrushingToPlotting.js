#!/usr/bin/env node
/**
 * Renames the crush status "Crushing" to "Plotting" on existing records.
 * The server also runs this on boot; this script exists for manual re-runs.
 *   MONGO_URI=... node src/scripts/migrateCrushingToPlotting.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const CrushProfile = require('../models/CrushProfile');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await CrushProfile.updateMany({ status: 'Crushing' }, { $set: { status: 'Plotting' } });
  console.log(`Updated ${result.modifiedCount} crush(es).`);
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });
