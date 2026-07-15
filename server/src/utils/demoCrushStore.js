const fs = require('fs/promises');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFile = path.join(dataDir, 'demo-crushes.json');

const ensureStore = async () => {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify([], null, 2), 'utf8');
  }
};

const readAll = async () => {
  await ensureStore();
  const raw = await fs.readFile(dataFile, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = async (records) => {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(records, null, 2), 'utf8');
};

const getCrushes = async (username) => {
  const all = await readAll();
  return all.filter((item) => item.owner === username);
};

const addCrush = async (username, crushPayload) => {
  const all = await readAll();

  const newCrush = {
    _id: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    owner: username,
    userId: username,
    nickname: crushPayload.nickname,
    fullName: crushPayload.fullName || '',
    avatarUrl: crushPayload.avatarUrl || '',
    bio: crushPayload.bio || '',
    status: crushPayload.status || 'Crush',
    visibility: Array.isArray(crushPayload.visibility) ? crushPayload.visibility : [],
    sharedEntries: Array.isArray(crushPayload.sharedEntries) ? crushPayload.sharedEntries : [],
    lastInteraction: crushPayload.lastInteraction || new Date().toISOString(),
    rating: Number.isFinite(crushPayload.rating) ? crushPayload.rating : 3,
    redFlags: Number.isFinite(crushPayload.redFlags) ? crushPayload.redFlags : 0,
    vibeHistory: Array.isArray(crushPayload.vibeHistory) && crushPayload.vibeHistory.length > 0
      ? crushPayload.vibeHistory
      : [5],
    category: crushPayload.category || '',
    hair: Array.isArray(crushPayload.hair) ? crushPayload.hair : [],
    eyes: Array.isArray(crushPayload.eyes) ? crushPayload.eyes : [],
    build: Array.isArray(crushPayload.build) ? crushPayload.build : [],
    social: crushPayload.social || {},
    relationshipStatus: crushPayload.relationshipStatus || '',
    heartbreakSong: crushPayload.heartbreakSong || '',
    heartbreakRecovery: crushPayload.heartbreakRecovery || '',
    pronouns: crushPayload.pronouns || 'they',
    customNotes: crushPayload.customNotes || '',
    location: crushPayload.location || '',
    age: Number.isFinite(crushPayload.age) ? crushPayload.age : null,
    howWeMet: crushPayload.howWeMet || '',
    whenWeMet: crushPayload.whenWeMet || '',
    grade: crushPayload.grade || '',
    occupation: crushPayload.occupation || '',
    family: crushPayload.family || '',
    memorableMoments: crushPayload.memorableMoments || '',
    friends: Array.isArray(crushPayload.friends) ? crushPayload.friends : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  all.push(newCrush);
  await writeAll(all);

  return newCrush;
};

const updateCrush = async (username, id, crushPayload) => {
  const all = await readAll();
  const index = all.findIndex((item) => item._id === id && item.owner === username);

  if (index === -1) return null;

  const existing = all[index];
  const updated = {
    ...existing,
    nickname: crushPayload.nickname || existing.nickname,
    fullName: crushPayload.fullName !== undefined ? crushPayload.fullName : existing.fullName,
    avatarUrl: crushPayload.avatarUrl !== undefined ? crushPayload.avatarUrl : existing.avatarUrl,
    bio: crushPayload.bio !== undefined ? crushPayload.bio : existing.bio,
    status: crushPayload.status || existing.status,
    visibility: Array.isArray(crushPayload.visibility) ? crushPayload.visibility : existing.visibility,
    sharedEntries: Array.isArray(crushPayload.sharedEntries) ? crushPayload.sharedEntries : existing.sharedEntries,
    lastInteraction: crushPayload.lastInteraction || existing.lastInteraction,
    rating: Number.isFinite(crushPayload.rating) ? crushPayload.rating : existing.rating,
    redFlags: Number.isFinite(crushPayload.redFlags) ? crushPayload.redFlags : existing.redFlags,
    vibeHistory: Array.isArray(crushPayload.vibeHistory) ? crushPayload.vibeHistory : existing.vibeHistory,
    category: crushPayload.category !== undefined ? crushPayload.category : existing.category,
    hair: Array.isArray(crushPayload.hair) ? crushPayload.hair : existing.hair,
    eyes: Array.isArray(crushPayload.eyes) ? crushPayload.eyes : existing.eyes,
    build: Array.isArray(crushPayload.build) ? crushPayload.build : existing.build,
    social: crushPayload.social || existing.social,
    relationshipStatus: crushPayload.relationshipStatus !== undefined ? crushPayload.relationshipStatus : existing.relationshipStatus,
    heartbreakSong: crushPayload.heartbreakSong !== undefined ? crushPayload.heartbreakSong : existing.heartbreakSong,
    heartbreakRecovery: crushPayload.heartbreakRecovery !== undefined ? crushPayload.heartbreakRecovery : existing.heartbreakRecovery,
    pronouns: crushPayload.pronouns || existing.pronouns,
    customNotes: crushPayload.customNotes !== undefined ? crushPayload.customNotes : existing.customNotes,
    location: crushPayload.location !== undefined ? crushPayload.location : existing.location,
    age: Number.isFinite(crushPayload.age) ? crushPayload.age : (crushPayload.age === null ? null : existing.age),
    howWeMet: crushPayload.howWeMet !== undefined ? crushPayload.howWeMet : existing.howWeMet,
    whenWeMet: crushPayload.whenWeMet !== undefined ? crushPayload.whenWeMet : existing.whenWeMet,
    grade: crushPayload.grade !== undefined ? crushPayload.grade : existing.grade,
    occupation: crushPayload.occupation !== undefined ? crushPayload.occupation : existing.occupation,
    family: crushPayload.family !== undefined ? crushPayload.family : existing.family,
    memorableMoments: crushPayload.memorableMoments !== undefined ? crushPayload.memorableMoments : existing.memorableMoments,
    friends: Array.isArray(crushPayload.friends) ? crushPayload.friends : existing.friends,
    updatedAt: new Date().toISOString()
  };

  all[index] = updated;
  await writeAll(all);

  return updated;
};

module.exports = {
  getCrushes,
  addCrush,
  updateCrush
};
