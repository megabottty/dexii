/**
 * Premium feature registry (server mirror of src/app/core/config/premium-features.ts).
 * Keep keys, minTier and enabled in step with the client file.
 *
 * PREMIUM_OVERRIDE_USERNAMES (env, comma-separated) lists accounts that are
 * treated as Gold regardless of billing, e.g. the founder's own account.
 */
const TIER_RANK = { Free: 0, Premium: 1, Gold: 2 };

const PREMIUM_FEATURES = {
  safetyCheck: { minTier: 'Premium', enabled: true },
  photoVault: { minTier: 'Premium', enabled: true },
  avatarBuilder: { minTier: 'Premium', enabled: false }
};

const overrideUsernames = () => String(process.env.PREMIUM_OVERRIDE_USERNAMES || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** The tier a user effectively has, honouring the override list. */
const effectiveTier = (user) => {
  if (!user) return 'Free';
  const username = String(user.username || '').toLowerCase();
  if (username && overrideUsernames().includes(username)) return 'Gold';
  return TIER_RANK[user.subscriptionTier] !== undefined ? user.subscriptionTier : 'Free';
};

const tierAllows = (tier, featureKey) => {
  const feature = PREMIUM_FEATURES[featureKey];
  if (!feature || !feature.enabled) return true;
  return (TIER_RANK[tier] || 0) >= (TIER_RANK[feature.minTier] || 0);
};

module.exports = { TIER_RANK, PREMIUM_FEATURES, effectiveTier, tierAllows };
