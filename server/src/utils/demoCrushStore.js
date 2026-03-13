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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  all.push(newCrush);
  await writeAll(all);

  return newCrush;
};

module.exports = {
  getCrushes,
  addCrush
};
