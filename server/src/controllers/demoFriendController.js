const {
  searchUsers,
  getFriends,
  createRequest,
  getIncomingRequests,
  respondToRequest,
  removeFriend
} = require('../utils/demoFriendStore');

const normalize = (value, fallback = 'dexii_demo_user') => {
  if (!value || typeof value !== 'string') return fallback;
  const clean = value.trim();
  return clean || fallback;
};

exports.search = async (req, res) => {
  try {
    const owner = normalize(req.query.owner);
    const query = typeof req.query.query === 'string' ? req.query.query : '';
    const users = await searchUsers(owner, query);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const username = normalize(req.query.username);
    const friends = await getFriends(username);
    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.request = async (req, res) => {
  try {
    const from = normalize(req.body.from);
    const to = normalize(req.body.to, '');
    if (!to) {
      return res.status(400).json({ message: 'Missing target username' });
    }

    const result = await createRequest(from, to);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.incoming = async (req, res) => {
  try {
    const username = normalize(req.query.username);
    const requests = await getIncomingRequests(username);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.respond = async (req, res) => {
  try {
    const username = normalize(req.body.username);
    const action = req.body.action === 'accept' ? 'accept' : 'decline';
    const request = await respondToRequest(username, req.params.requestId, action);
    res.json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const username = normalize(req.body.username || req.query.username);
    const friend = normalize(req.params.friendUsername, '');
    if (!friend) {
      return res.status(400).json({ message: 'Missing friend username' });
    }

    await removeFriend(username, friend);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
