const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const User = require('../models/User');
const CrushProfile = require('../models/CrushProfile');

const dataDir = path.join(__dirname, '..', '..', 'data');
const demoFriendsFile = path.join(dataDir, 'demo-friends.json');
const demoCrushesFile = path.join(dataDir, 'demo-crushes.json');

const readJsonFile = async (filePath, fallback) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return fallback;
  }
};

const ensureUser = async (username, userMap, userConfig = {}) => {
  if (!username) return null;
  if (userMap.has(username)) return userMap.get(username);

  let user = await User.findOne({ username });
  if (!user) {
    const hashedPin = await bcrypt.hash('1111', 10);
    user = await User.create({
      username,
      pin: hashedPin,
      email: `${username.toLowerCase()}@dexii.local`,
      avatarUrl: userConfig.avatarUrl,
      subscriptionTier: userConfig.subscriptionTier || 'Free',
      friendCategories: userConfig.friendCategories || ['Close Friends', 'Casual', 'Work']
    });
  } else {
    let dirty = false;
    if (userConfig.avatarUrl && user.avatarUrl !== userConfig.avatarUrl) {
      user.avatarUrl = userConfig.avatarUrl;
      dirty = true;
    }
    if (userConfig.subscriptionTier && user.subscriptionTier !== userConfig.subscriptionTier) {
      user.subscriptionTier = userConfig.subscriptionTier;
      dirty = true;
    }
    if (Array.isArray(userConfig.friendCategories) && userConfig.friendCategories.length > 0) {
      user.friendCategories = userConfig.friendCategories;
      dirty = true;
    }
    if (dirty) {
      await user.save();
    }
  }

  userMap.set(username, user);
  return user;
};

const migrateFriends = async (userMap) => {
  const demoState = await readJsonFile(demoFriendsFile, { users: [], friendships: {} });
  const users = Array.isArray(demoState.users) ? demoState.users : [];
  const friendships = demoState.friendships && typeof demoState.friendships === 'object' ? demoState.friendships : {};

  for (const user of users) {
    await ensureUser(user.username, userMap, user);
  }

  for (const [username, friends] of Object.entries(friendships)) {
    const owner = await ensureUser(username, userMap);
    if (!owner) continue;

    const friendIds = [];
    for (const friendUsername of Array.isArray(friends) ? friends : []) {
      const friend = await ensureUser(friendUsername, userMap);
      if (friend) friendIds.push(friend._id);
    }

    owner.friends = Array.from(new Set(friendIds.map((id) => id.toString()))).map((id) => new mongoose.Types.ObjectId(id));
    await owner.save();
  }

  return users.length;
};

const migrateCrushes = async (userMap) => {
  const demoCrushes = await readJsonFile(demoCrushesFile, []);
  const crushes = Array.isArray(demoCrushes) ? demoCrushes : [];
  let inserted = 0;

  for (const demoCrush of crushes) {
    const ownerUsername = demoCrush.owner || demoCrush.userId;
    const owner = await ensureUser(ownerUsername, userMap);
    if (!owner || !demoCrush.nickname) continue;

    const existing = await CrushProfile.findOne({
      userId: owner._id,
      nickname: demoCrush.nickname,
      fullName: demoCrush.fullName || ''
    });

    if (existing) {
      continue;
    }

    await CrushProfile.create({
      userId: owner._id,
      nickname: demoCrush.nickname,
      fullName: demoCrush.fullName || '',
      avatarUrl: demoCrush.avatarUrl || '',
      bio: demoCrush.bio || '',
      status: demoCrush.status || 'Crush',
      visibility: [],
      sharedEntries: Array.isArray(demoCrush.sharedEntries) ? demoCrush.sharedEntries : [],
      lastInteraction: demoCrush.lastInteraction ? new Date(demoCrush.lastInteraction) : new Date(),
      rating: Number.isFinite(demoCrush.rating) ? demoCrush.rating : 3,
      redFlags: Number.isFinite(demoCrush.redFlags) ? demoCrush.redFlags : 0,
      vibeHistory: Array.isArray(demoCrush.vibeHistory) && demoCrush.vibeHistory.length > 0 ? demoCrush.vibeHistory : [5],
      category: demoCrush.category || '',
      hair: Array.isArray(demoCrush.hair) ? demoCrush.hair : [],
      eyes: Array.isArray(demoCrush.eyes) ? demoCrush.eyes : [],
      build: Array.isArray(demoCrush.build) ? demoCrush.build : [],
      social: demoCrush.social || {},
      relationshipStatus: demoCrush.relationshipStatus || ''
    });

    inserted += 1;
  }

  return { total: crushes.length, inserted };
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI in server/.env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const userMap = new Map();
  const userCount = await migrateFriends(userMap);
  const crushResult = await migrateCrushes(userMap);

  console.log(`Friend users processed: ${userCount}`);
  console.log(`Crushes inserted: ${crushResult.inserted}/${crushResult.total}`);

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error('Migration failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
