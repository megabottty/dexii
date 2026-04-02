const fs = require('fs/promises');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFile = path.join(dataDir, 'demo-friends.json');

const defaultUsers = [
  { username: 'dexii_demo_user', avatarUrl: 'https://i.pravatar.cc/150?u=dexii_demo_user', subscriptionTier: 'Premium', friendCategories: ['Close Friends'] },
  { username: 'Sarah Best', avatarUrl: 'https://i.pravatar.cc/150?u=sarah', subscriptionTier: 'Free', friendCategories: ['Close Friends'] },
  { username: 'Tea_Spiller_Mark', avatarUrl: 'https://i.pravatar.cc/150?u=mark', subscriptionTier: 'Premium', friendCategories: ['Casual'] },
  { username: 'Work_Bri', avatarUrl: 'https://i.pravatar.cc/150?u=bri', subscriptionTier: 'Free', friendCategories: ['Work'] },
  { username: 'Club_Ari', avatarUrl: 'https://i.pravatar.cc/150?u=ari', subscriptionTier: 'Gold', friendCategories: ['Casual'] }
];

const initialState = {
  users: defaultUsers,
  friendships: {},
  requests: []
};

const ensureStore = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(initialState, null, 2), 'utf8');
  }
};

const seedDefaultFriendshipIfEmpty = (state) => {
  // No automatic seeding of friends for new users
  return;
};

const readStore = async () => {
  await ensureStore();
  const raw = await fs.readFile(dataFile, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    const state = {
      users: Array.isArray(parsed.users) ? parsed.users : [...defaultUsers],
      friendships: parsed.friendships && typeof parsed.friendships === 'object' ? parsed.friendships : {},
      requests: Array.isArray(parsed.requests) ? parsed.requests : []
    };
    seedDefaultFriendshipIfEmpty(state);
    return state;
  } catch {
    const state = { ...initialState, users: [...defaultUsers], friendships: {}, requests: [] };
    seedDefaultFriendshipIfEmpty(state);
    return state;
  }
};

const writeStore = async (state) => {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(state, null, 2), 'utf8');
};

const ensureUser = (state, username) => {
  const clean = (username || '').trim();
  if (!clean) return null;

  const existing = state.users.find((u) => u.username === clean);
  if (existing) return existing;

  const created = {
    username: clean,
    avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(clean)}`,
    subscriptionTier: 'Free',
    friendCategories: ['Close Friends', 'Casual', 'Work']
  };
  state.users.push(created);
  return created;
};

const getFriendnames = (state, username) => {
  return Array.isArray(state.friendships[username]) ? state.friendships[username] : [];
};

const setFriendnames = (state, username, list) => {
  state.friendships[username] = Array.from(new Set(list));
};

const searchUsers = async (owner, query) => {
  const state = await readStore();
  const ownerUser = ensureUser(state, owner);
  if (!ownerUser) return [];

  const q = (query || '').trim().toLowerCase();
  const friendSet = new Set(getFriendnames(state, ownerUser.username));

  await writeStore(state);

  return state.users
    .filter((u) => u.username !== ownerUser.username)
    .filter((u) => !q || u.username.toLowerCase().includes(q))
    .map((u) => ({
      ...u,
      isFriend: friendSet.has(u.username),
      hasPendingRequest:
        state.requests.some((r) => r.from === ownerUser.username && r.to === u.username && r.status === 'pending') ||
        state.requests.some((r) => r.from === u.username && r.to === ownerUser.username && r.status === 'pending')
    }));
};

const getFriends = async (username) => {
  const state = await readStore();
  const user = ensureUser(state, username);
  if (!user) return [];

  const friendnames = getFriendnames(state, user.username);
  await writeStore(state);

  return state.users
    .filter((u) => friendnames.includes(u.username))
    .map((u) => ({
      id: u.username,
      username: u.username,
      avatarUrl: u.avatarUrl,
      friendCategories: u.friendCategories || ['Close Friends'],
      subscriptionTier: u.subscriptionTier || 'Free'
    }));
};

const createRequest = async (from, to) => {
  const state = await readStore();
  const fromUser = ensureUser(state, from);
  const toUser = ensureUser(state, to);

  if (!fromUser || !toUser || fromUser.username === toUser.username) {
    throw new Error('Invalid request users');
  }

  const alreadyFriends = getFriendnames(state, fromUser.username).includes(toUser.username);
  if (alreadyFriends) {
    await writeStore(state);
    return { status: 'already_friends' };
  }

  const existingPending = state.requests.find(
    (r) =>
      r.status === 'pending' &&
      ((r.from === fromUser.username && r.to === toUser.username) ||
        (r.from === toUser.username && r.to === fromUser.username))
  );

  if (existingPending) {
    await writeStore(state);
    return { status: 'already_pending', request: existingPending };
  }

  const request = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from: fromUser.username,
    to: toUser.username,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  state.requests.push(request);
  await writeStore(state);

  return { status: 'created', request };
};

const getIncomingRequests = async (username) => {
  const state = await readStore();
  const user = ensureUser(state, username);
  if (!user) return [];

  const incoming = state.requests.filter((r) => r.to === user.username && r.status === 'pending');
  await writeStore(state);

  return incoming;
};

const respondToRequest = async (username, requestId, action) => {
  const state = await readStore();
  const user = ensureUser(state, username);
  if (!user) throw new Error('Invalid user');

  const request = state.requests.find((r) => r.id === requestId);
  if (!request || request.to !== user.username || request.status !== 'pending') {
    throw new Error('Request not found');
  }

  if (action === 'accept') {
    const fromFriends = getFriendnames(state, request.from);
    const toFriends = getFriendnames(state, request.to);
    setFriendnames(state, request.from, [...fromFriends, request.to]);
    setFriendnames(state, request.to, [...toFriends, request.from]);
    request.status = 'accepted';
    request.respondedAt = new Date().toISOString();
  } else {
    request.status = 'declined';
    request.respondedAt = new Date().toISOString();
  }

  await writeStore(state);
  return request;
};

const removeFriend = async (username, friendUsername) => {
  const state = await readStore();
  ensureUser(state, username);
  ensureUser(state, friendUsername);

  const a = getFriendnames(state, username).filter((name) => name !== friendUsername);
  const b = getFriendnames(state, friendUsername).filter((name) => name !== username);
  setFriendnames(state, username, a);
  setFriendnames(state, friendUsername, b);

  await writeStore(state);
};

module.exports = {
  searchUsers,
  getFriends,
  createRequest,
  getIncomingRequests,
  respondToRequest,
  removeFriend,
  ensureUser,
  readStore
};
