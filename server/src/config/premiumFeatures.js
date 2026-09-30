/**
 * Premium feature registry (server mirror of src/app/core/config/premium-features.ts).
 * Keep keys, minTier and enabled in step with the client file.
 *
 * Super admins (User.isSuperAdmin, or usernames listed in the SUPER_ADMIN_USERNAMES
 * env var, which seeds the very first admin) are treated as Gold regardless of
 * billing and may promote other accounts. PREMIUM_OVERRIDE_USERNAMES is accepted
 * as an alias of SUPER_ADMIN_USERNAMES.
 */
const TIER_RANK = { Free: 0, Premium: 1, Gold: 2 };

const PREMIUM_FEATURES = {
  safetyCheck: { minTier: 'Premium', enabled: true },
  photoVault: { minTier: 'Premium', enabled: true },
  avatarBuilder: { minTier: 'Premium', enabled: false }
};

const seededSuperAdmins = () => `${process.env.SUPER_ADMIN_USERNAMES || ''},${process.env.PREMIUM_OVERRIDE_USERNAMES || ''}`
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** True for accounts seeded by env or promoted in the database. */
const isSuperAdminUser = (user) => {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const username = String(user.username || '').toLowerCase();
  return Boolean(username) && seededSuperAdmins().includes(username);
};

/** Whether this admin comes from the env seed list (cannot be removed in-app). */
const isSeededSuperAdmin = (user) => Boolean(user) && seededSuperAdmins().includes(String(user.username || '').toLowerCase());

/** The tier a user effectively has: super admins are always Gold. */
const effectiveTier = (user) => {
  if (!user) return 'Free';
  if (isSuperAdminUser(user)) return 'Gold';
  return TIER_RANK[user.subscriptionTier] !== undefined ? user.subscriptionTier : 'Free';
};

const tierAllows = (tier, featureKey) => {
  const feature = PREMIUM_FEATURES[featureKey];
  if (!feature || !feature.enabled) return true;
  return (TIER_RANK[tier] || 0) >= (TIER_RANK[feature.minTier] || 0);
};

module.exports = { TIER_RANK, PREMIUM_FEATURES, effectiveTier, tierAllows, isSuperAdminUser, isSeededSuperAdmin, seededSuperAdmins };
