#!/usr/bin/env node
/**
 * One-time backfill of the friend history from what already exists: friend
 * requests, invites, surviving "shared a crush" notifications, share/status/
 * safety chat messages, crush views and paused friends. Safe to re-run: every
 * row carries a `source` key and is only inserted once.
 *
 *   MONGO_URI=... node src/scripts/backfillFriendActivity.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const FriendRequest = require('../models/FriendRequest');
const Invite = require('../models/Invite');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const CrushProfile = require('../models/CrushProfile');
const User = require('../models/User');
const { recordActivity } = require('../services/activityLog');

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGO_URI');
  await mongoose.connect(uri);
  let count = 0;
  const add = async (row) => { if (await recordActivity(row)) count++; };

  for (const r of await FriendRequest.find().lean()) {
    await add({ actor: r.from, counterpart: r.to, type: 'request_sent', requestId: r._id, createdAt: r.createdAt, source: `req:${r._id}:sent` });
    if (r.status === 'accepted') await add({ actor: r.to, counterpart: r.from, type: 'request_accepted', requestId: r._id, createdAt: r.respondedAt || r.updatedAt, source: `req:${r._id}:accepted` });
    if (r.status === 'declined') await add({ actor: r.to, counterpart: r.from, type: 'request_declined', requestId: r._id, createdAt: r.respondedAt || r.updatedAt, visibleTo: [r.to], source: `req:${r._id}:declined` });
    if (r.status === 'cancelled') await add({ actor: r.from, counterpart: r.to, type: 'request_cancelled', requestId: r._id, createdAt: r.respondedAt || r.updatedAt, visibleTo: [r.from], source: `req:${r._id}:cancelled` });
    if (r.lastNudgedAt) await add({ actor: r.from, counterpart: r.to, type: 'request_nudged', requestId: r._id, createdAt: r.lastNudgedAt, meta: { nudgeCount: r.nudgeCount || 1 }, source: `req:${r._id}:nudge` });
  }

  for (const i of await Invite.find().lean()) {
    await add({ actor: i.invitedBy, type: 'invite_sent', inviteId: i._id, visibleTo: [i.invitedBy], createdAt: i.sentAt || i.createdAt, meta: { contact: i.contact, method: i.method }, source: `inv:${i._id}:sent` });
    if (i.status === 'accepted' && i.acceptedBy) await add({ actor: i.acceptedBy, counterpart: i.invitedBy, type: 'invite_accepted', inviteId: i._id, createdAt: i.acceptedAt || i.updatedAt, meta: { contact: i.contact, method: i.method }, source: `inv:${i._id}:accepted` });
    if (i.status === 'cancelled') await add({ actor: i.invitedBy, type: 'invite_cancelled', inviteId: i._id, visibleTo: [i.invitedBy], createdAt: i.updatedAt, meta: { contact: i.contact, method: i.method }, source: `inv:${i._id}:cancelled` });
  }

  for (const n of await Notification.find({ type: 'crush_shared' }).lean()) {
    if (!n.actor) continue;
    await add({ actor: n.actor, counterpart: n.recipient, type: 'crush_shared', crushId: n.payload?.crushId, createdAt: n.createdAt, meta: { nickname: n.payload?.crushNickname }, source: `notif:${n._id}` });
  }

  const crushes = new Map((await CrushProfile.find().select('nickname userId viewedBy').lean()).map((c) => [String(c._id), c]));
  const msgs = await Message.find({ $or: [{ crushId: { $exists: true, $ne: null } }, { relatedEntryId: { $exists: true, $ne: null } }, { isSafetyAlert: true }] }).lean();
  for (const m of msgs) {
    if (!m.recipient) continue;
    const text = String(m.content || '');
    const nickname = m.crushId ? crushes.get(String(m.crushId))?.nickname : undefined;
    let type = null; let meta = {};
    if (m.isSafetyAlert) { type = 'safety_alert'; meta = { text: text.slice(0, 160) }; }
    else if (/^Dating status update for /i.test(text)) { type = 'dating_status_shared'; meta = { text: text.slice(0, 160) }; }
    else if (m.relatedEntryId || /^Shared (a specific entry|note about)/i.test(text)) { type = 'entry_shared'; meta = { preview: text.replace(/^[^:]*:\s*/, '').slice(0, 80) }; }
    else if (/^Shared a crush/i.test(text)) { type = 'crush_shared'; meta = { nickname }; }
    if (!type) continue;
    await add({ actor: m.sender, counterpart: m.recipient, type, crushId: m.crushId, entryId: m.relatedEntryId, messageId: m._id, createdAt: m.createdAt, meta: { nickname, ...meta }, source: `msg:${m._id}` });
  }

  for (const c of crushes.values()) {
    for (const v of c.viewedBy || []) {
      const day = new Date(v.at).toISOString().slice(0, 10);
      await add({ actor: v.user, counterpart: c.userId, type: 'crush_viewed', crushId: c._id, createdAt: v.at, meta: { nickname: c.nickname }, source: `view:${c._id}:${v.user}:${day}` });
    }
  }

  for (const u of await User.find({ 'pausedFriends.0': { $exists: true } }).select('pausedFriends').lean()) {
    for (const p of u.pausedFriends) {
      await add({ actor: u._id, counterpart: p.user, type: 'friend_paused', visibleTo: [u._id], createdAt: p.pausedAt, meta: { muted: p.mutedNotifications !== false }, source: `pause:${u._id}:${p.user}:${new Date(p.pausedAt || 0).getTime()}` });
    }
  }

  console.log(`Backfill done: ${count} new history rows.`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
