#!/usr/bin/env node
/**
 * Read-only tally of the themes beta pricing test (DEX-66).
 *
 * Themes are free during beta. The first time someone picks one, the app asks
 * "Would you pay $1.99 for this theme?" and saves their first answer on the user.
 * This prints how many people changed theme and how they answered.
 *
 * Usage (from server/):  node scripts/theme-interest.js
 * Reads MONGO_URI from server/.env. It never writes.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const DEFAULT_THEMES = new Set([null, undefined, '', 'pearl']);

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const users = await User.find({}).select('themePreference themeInterest').lean();
    const changedTheme = users.filter((u) => !DEFAULT_THEMES.has(u.themePreference?.mode)).length;
    const answers = users.map((u) => u.themeInterest).filter((t) => t && t.answer);

    const byAnswer = { yes: 0, maybe: 0, no: 0 };
    const byTheme = {};
    for (const a of answers) {
      byAnswer[a.answer] = (byAnswer[a.answer] || 0) + 1;
      byTheme[a.theme || '(unknown)'] = byTheme[a.theme || '(unknown)'] || { yes: 0, maybe: 0, no: 0 };
      byTheme[a.theme || '(unknown)'][a.answer] += 1;
    }
    const pct = (n) => (answers.length ? `${Math.round((n / answers.length) * 100)}%` : '-');

    console.log(`Users: ${users.length}`);
    console.log(`Using a theme other than the default: ${changedTheme}`);
    console.log(`Answered "Would you pay $1.99?": ${answers.length}`);
    console.log(`  Yes   ${byAnswer.yes} (${pct(byAnswer.yes)})`);
    console.log(`  Maybe ${byAnswer.maybe} (${pct(byAnswer.maybe)})`);
    console.log(`  No    ${byAnswer.no} (${pct(byAnswer.no)})`);
    if (answers.length) {
      console.log('By theme picked when asked:');
      for (const [theme, c] of Object.entries(byTheme).sort((a, b) => (b[1].yes + b[1].maybe + b[1].no) - (a[1].yes + a[1].maybe + a[1].no))) {
        console.log(`  ${theme.padEnd(12)} yes ${c.yes}  maybe ${c.maybe}  no ${c.no}`);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
