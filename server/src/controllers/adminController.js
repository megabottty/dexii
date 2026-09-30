const User = require('../models/User');
const { isSeededSuperAdmin, seededSuperAdmins } = require('../config/premiumFeatures');

const shape = (user) => ({
  id: String(user._id),
  username: user.username,
  firstName: user.firstName || '',
  lastName: user.lastName || '',
  avatarUrl: user.avatarUrl || '',
  seeded: isSeededSuperAdmin(user)
});

// @route GET /api/admin/super-admins
exports.listSuperAdmins = async (req, res) => {
  try {
    const seeded = seededSuperAdmins();
    const query = seeded.length
      ? { $or: [{ isSuperAdmin: true }, { username: { $in: seeded.map((u) => new RegExp(`^${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } }] }
      : { isSuperAdmin: true };
    const admins = await User.find(query).select('username firstName lastName avatarUrl isSuperAdmin').sort({ username: 1 }).lean();
    res.json(admins.map(shape));
  } catch (err) {
    console.error('List super admins failed:', err.message);
    res.status(500).json({ message: 'Unable to load super admins.' });
  }
};

// @route POST /api/admin/super-admins  { username }
exports.addSuperAdmin = async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim().replace(/^@/, '');
    if (!username) return res.status(400).json({ message: 'Enter a username.' });

    const user = await User.findOneAndUpdate(
      { username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      { $set: { isSuperAdmin: true } },
      { new: true }
    ).select('username firstName lastName avatarUrl isSuperAdmin').lean();
    if (!user) return res.status(404).json({ message: `No Dexii account named @${username}.` });

    res.json(shape(user));
  } catch (err) {
    console.error('Add super admin failed:', err.message);
    res.status(500).json({ message: 'Unable to add super admin.' });
  }
};

// @route DELETE /api/admin/super-admins/:username
exports.removeSuperAdmin = async (req, res) => {
  try {
    const username = String(req.params.username || '').trim().replace(/^@/, '');
    const target = await User.findOne({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
      .select('username isSuperAdmin').lean();
    if (!target) return res.status(404).json({ message: 'User not found.' });
    if (isSeededSuperAdmin(target)) {
      return res.status(400).json({ message: 'That admin is set by the server configuration and cannot be removed here.' });
    }
    if (String(target._id) === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot remove yourself. Ask another super admin.' });
    }
    await User.updateOne({ _id: target._id }, { $set: { isSuperAdmin: false } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Remove super admin failed:', err.message);
    res.status(500).json({ message: 'Unable to remove super admin.' });
  }
};
