const mongoose = require('mongoose');
const User = require('../models/User');
const { PREMIUM_FEATURES, effectiveTier, tierAllows } = require('../config/premiumFeatures');

/**
 * Gates a route behind a premium feature. `predicate(req)` (optional) limits
 * the check to matching requests, e.g. only SafetyCheck entries on POST /entries.
 * Responds 402 with { message, feature, minTier } when the account's tier is too low.
 * Demo mode (no database) is never gated.
 */
module.exports = function requireFeature(featureKey, predicate) {
  const feature = PREMIUM_FEATURES[featureKey];
  return async (req, res, next) => {
    try {
      if (!feature || !feature.enabled) return next();
      if (typeof predicate === 'function' && !predicate(req)) return next();
      if (mongoose.connection.readyState !== 1 || req.user?.isDemo) return next();

      const user = await User.findById(req.user.id).select('username subscriptionTier isSuperAdmin').lean();
      if (tierAllows(effectiveTier(user), featureKey)) return next();

      return res.status(402).json({
        message: `This is a ${feature.minTier} feature.`,
        feature: featureKey,
        minTier: feature.minTier
      });
    } catch (err) {
      console.error('requireFeature failed:', err.message);
      return res.status(500).json({ message: 'Server Error' });
    }
  };
};
