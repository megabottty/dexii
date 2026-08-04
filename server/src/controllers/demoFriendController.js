const {
  searchUsers,
  getFriends,
  createRequest,
  getIncomingRequests,
  getOutgoingRequests,
  nudgeRequest,
  respondToRequest,
  removeFriend,
  readStore,
  ensureUser
} = require('../utils/demoFriendStore');
const sendEmail = require('../utils/sendEmail');

const normalize = (value, fallback = 'dexii_demo_user') => {
  if (!value || typeof value !== 'string') return fallback;
  const clean = value.trim();
  return clean || fallback;
};

const normalizeInviteMethod = (value) => {
  const method = normalize(value, '').toLowerCase();
  return ['email', 'sms', 'whatsapp', 'copy', 'share'].includes(method) ? method : 'copy';
};

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const normalizePhone = (value) => {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (hasPlus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : '';
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : '';
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

    const friendshipProfile = req.body.friendshipProfile && typeof req.body.friendshipProfile === 'object'
      ? req.body.friendshipProfile
      : undefined;
    const invite = req.body.invite && typeof req.body.invite === 'object'
      ? req.body.invite
      : undefined;

    const result = await createRequest(from, to, { friendshipProfile, invite });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.invite = async (req, res) => {
  try {
    const from = normalize(req.body.from);
    const toUsername = normalize(req.body.toUsername, '');
    const method = normalizeInviteMethod(req.body.method);
    const message = normalize(req.body.message, '');
    const contactInput = normalize(req.body.contact, '');

    if (!toUsername) {
      return res.status(400).json({ ok: false, message: 'Missing target username' });
    }

    const state = await readStore();
    const target = ensureUser(state, toUsername);
    const savedEmail = normalizeEmail(target?.email || '');
    const savedPhone = normalizePhone(target?.phoneE164 || '');
    const contact = method === 'email'
      ? normalizeEmail(contactInput) || savedEmail
      : method === 'sms' || method === 'whatsapp'
      ? normalizePhone(contactInput) || savedPhone
      : contactInput;

    if (method === 'email') {
      if (!contact || !contact.includes('@')) {
        return res.status(400).json({ ok: false, message: 'Email invite requires a valid email address.' });
      }

      const subject = `Dexii invite from ${from}`;
      const html = `<p>${message.replace(/\n/g, '<br>')}</p>`;
      const result = await sendEmail({
        email: contact,
        subject,
        message,
        html
      });
      return res.json({
        ok: true,
        method,
        delivery: result?.debug ? 'debug' : 'sent',
        message: result?.debug
          ? 'Email invite generated in debug mode.'
          : 'Email invite sent.'
      });
    }

    if (method === 'sms') {
      if (!contact) {
        return res.status(400).json({ ok: false, message: 'SMS invite requires a phone number.' });
      }
      return res.json({
        ok: true,
        method,
        delivery: 'handoff',
        contact,
        launchUrl: `sms:${encodeURIComponent(contact)}?body=${encodeURIComponent(message)}`
      });
    }

    if (method === 'whatsapp') {
      const digits = String(contact || '').replace(/\D/g, '');
      const launchUrl = digits
        ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      return res.json({
        ok: true,
        method,
        delivery: 'handoff',
        contact,
        launchUrl
      });
    }

    return res.json({
      ok: true,
      method,
      delivery: 'copy',
      message
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Unable to send invite.' });
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

exports.outgoing = async (req, res) => {
  try {
    const username = normalize(req.query.username);
    const requests = await getOutgoingRequests(username);
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

exports.nudge = async (req, res) => {
  try {
    const username = normalize(req.body.username || req.query.username);
    const request = await nudgeRequest(username, req.params.requestId);
    res.json({
      ok: true,
      message: `Nudge sent to ${request.to}`,
      request
    });
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
