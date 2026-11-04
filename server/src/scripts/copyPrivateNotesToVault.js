#!/usr/bin/env node
/**
 * Copies each crush's private notes into its owner's Vault journal (DEX-42), as one entry
 * starting "About <nickname>:". The notes stay on the crush too; nothing is deleted.
 * Safe to re-run: a crush whose note is already in the journal is skipped.
 * Run by hand after deploying:
 *   MONGO_URI=... node src/scripts/copyPrivateNotesToVault.js [--dry-run]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const CrushProfile = require('../models/CrushProfile');
const Entry = require('../models/Entry');
const { privateNotesOf } = require('../utils/crushNotes');

const dryRun = process.argv.includes('--dry-run');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const crushes = await CrushProfile.find({ customNotes: { $nin: [null, ''] } }).select('userId nickname customNotes createdAt').lean();
  let copied = 0;
  for (const crush of crushes) {
    const notes = privateNotesOf(crush.customNotes);
    if (!notes) continue;
    const content = `About ${crush.nickname || 'a crush'}: ${notes}`;
    const exists = await Entry.exists({ userId: crush.userId, type: 'PrivateJournal', content });
    if (exists) continue;
    copied += 1;
    if (!dryRun) {
      await Entry.create({ userId: crush.userId, crushId: 'private_vault', type: 'PrivateJournal', content, visibility: [], isSensitive: false, timestamp: crush.createdAt || new Date() });
    }
  }
  console.log(`${dryRun ? 'Would copy' : 'Copied'} private notes from ${copied} crush(es) into the Vault.`);
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });
