#!/usr/bin/env node
/**
 * Tags the private notes copied into the Vault (DEX-42) to the crush they came from (DEX-43),
 * so each shows "About <nickname>" in the journal. Matches each crush's notes to the exact
 * journal entry the copy made. Nothing is shared or deleted. Safe to re-run.
 * Run by hand after deploying:
 *   MONGO_URI=... node src/scripts/tagVaultNotesToCrush.js [--dry-run]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const CrushProfile = require('../models/CrushProfile');
const Entry = require('../models/Entry');
const { privateNotesOf } = require('../utils/crushNotes');

const dryRun = process.argv.includes('--dry-run');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const crushes = await CrushProfile.find({ customNotes: { $nin: [null, ''] } }).select('userId nickname customNotes').lean();
  let tagged = 0;
  for (const crush of crushes) {
    const notes = privateNotesOf(crush.customNotes);
    if (!notes) continue;
    const content = `About ${crush.nickname || 'a crush'}: ${notes}`;
    const filter = { userId: crush.userId, type: 'PrivateJournal', content, taggedCrushId: { $in: [null, ''] } };
    const count = await Entry.countDocuments(filter);
    if (!count) continue;
    tagged += count;
    if (!dryRun) await Entry.updateMany(filter, { $set: { taggedCrushId: String(crush._id) } });
  }
  console.log(`${dryRun ? 'Would tag' : 'Tagged'} ${tagged} Vault entr${tagged === 1 ? 'y' : 'ies'} to their crush.`);
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });
