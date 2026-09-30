const mongoose = require('mongoose');
const User = require('../models/User');
const { isSuperAdminUser } = require('../config/premiumFeatures');

/** Only super admins (env-seeded or promoted) may pass. */
module.exports = async function requireSuperAdmin(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database unavailable.' });
    }
    const me = await User.findById(req.user.id).select('username isSuperAdmin').lean();
    if (!isSuperAdminUser(me)) {
      return res.status(403).json({ message: 'Super admin access required.' });
    }
    req.superAdmin = me;
    next();
  } catch (err) {
    console.error('requireSuperAdmin failed:', err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
