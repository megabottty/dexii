/**
 * Premium feature registry (server mirror of src/app/core/config/premium-features.ts).
 * Keep keys, minTier and enabled in step with the client file.
 *
 * Super admins (User.isSuperAdmin, or usernames listed in the SUPER_ADMIN_USERNAMES
 * env var, which seeds the very first admin) are treated as Gold regardless of
 * billing and may promote other accounts. PREMIUM_OVERRIDE_USERNAMES is accepted
 * as an alias of SUPER_ADMIN_USERNAMES.
 */
// Access ladder: Free < Premium < Gold < SuperAdmin (a role, not a plan).
const TIER_RANK = { Free: 0, Premium: 1, Gold: 2, SuperAdmin: 3 };

const PREMIUM_FEATURES = {
  safetyCheck: { minTier: 'Premium', enabled: true },
  photoVault: { minTier: 'Premium', enabled: true },
  avatarBuilder: { minTier: 'Premium', enabled: false },
  manageSuperAdmins: { minTier: 'SuperAdmin', enabled: true }
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

/** The paid tier reported to clients: super admins read as Gold (the top plan). */
const effectiveTier = (user) => {
  if (!user) return 'Free';
  if (isSuperAdminUser(user)) return 'Gold';
  return TIER_RANK[user.subscriptionTier] !== undefined && user.subscriptionTier !== 'SuperAdmin' ? user.subscriptionTier : 'Free';
};

/** Rung on the ladder used for gating: SuperAdmin sits above Gold. */
const effectiveAccess = (user) => (isSuperAdminUser(user) ? 'SuperAdmin' : effectiveTier(user));

/**
 * Plans are parked for public testing: everything is open unless
 * TIER_GATING_ENABLED=true is set in the environment. Super-admin tools are
 * guarded separately (requireSuperAdmin) and are never opened by this switch.
 */
const TIER_GATING_ENABLED = process.env.TIER_GATING_ENABLED === 'true';

const tierAllows = (level, featureKey) => {
  const feature = PREMIUM_FEATURES[featureKey];
  if (!feature || !feature.enabled) return true;
  if (!TIER_GATING_ENABLED && feature.minTier !== 'SuperAdmin') return true;
  return (TIER_RANK[level] || 0) >= (TIER_RANK[feature.minTier] || 0);
};

module.exports = { TIER_RANK, TIER_GATING_ENABLED, PREMIUM_FEATURES, effectiveTier, effectiveAccess, tierAllows, isSuperAdminUser, isSeededSuperAdmin, seededSuperAdmins };
