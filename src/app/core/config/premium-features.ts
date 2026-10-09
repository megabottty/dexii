import { SubscriptionTier } from '../models/user.model';

/**
 * Access ladder, lowest to highest:
 *
 *   Free  <  Premium  <  Gold  <  SuperAdmin
 *
 * Free/Premium/Gold are the paid tiers (Stripe). SuperAdmin is a role, not a
 * plan: it sits above Gold, so a super admin can do everything Gold can plus
 * admin-only things. Every feature below names the LOWEST rung that unlocks it.
 *
 * To gate something new: add an entry to FEATURES (and mirror it in
 * server/src/config/premiumFeatures.js if it has an API), then wrap the UI in
 * `@if (gate.can('key'))` with `<app-upgrade-prompt feature="key">` as the fallback.
 */
export type AccessLevel = SubscriptionTier | 'SuperAdmin';

export const ACCESS_LEVELS: readonly AccessLevel[] = [
  SubscriptionTier.Free,
  SubscriptionTier.Premium,
  SubscriptionTier.Gold,
  'SuperAdmin'
];

export const ACCESS_RANK: Record<AccessLevel, number> = {
  [SubscriptionTier.Free]: 0,
  [SubscriptionTier.Premium]: 1,
  [SubscriptionTier.Gold]: 2,
  SuperAdmin: 3
};

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  [SubscriptionTier.Free]: 'Free',
  [SubscriptionTier.Premium]: 'Premium',
  [SubscriptionTier.Gold]: 'Gold',
  SuperAdmin: 'Super admin'
};

export interface PremiumFeature {
  /** Lowest access level that unlocks the feature. */
  minTier: AccessLevel;
  /** false = not gated yet (everyone gets it). */
  enabled: boolean;
  /** Short name shown in the tier matrix and upgrade prompt. */
  title: string;
  /** Upgrade prompt copy. */
  body: string;
}

export const PREMIUM_FEATURES = {
  safetyCheck: {
    minTier: SubscriptionTier.Premium,
    enabled: true,
    title: 'Stay safe out there',
    body: 'Safety Check shares your date plan with trusted friends, checks in on you halfway, and gives you a one-tap URGENT button. Available on Premium and Gold.'
  },
  photoVault: {
    minTier: SubscriptionTier.Premium,
    enabled: true,
    title: 'Photo Vault',
    body: 'The 18+ Photo Vault is available on Premium and Gold.'
  },
  avatarBuilder: {
    minTier: SubscriptionTier.Premium,
    enabled: false,
    title: 'Custom avatar builder',
    body: 'Build a cartoon lookalike for every crush on Premium and Gold.'
  },
  manageSuperAdmins: {
    minTier: 'SuperAdmin',
    enabled: true,
    title: 'Manage super admins',
    body: 'Only super admins can promote or remove other super admins.'
  }
} as const satisfies Record<string, PremiumFeature>;

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURES;

/** Active-crush allowance per access level. Infinity = unlimited. */
export const CRUSH_LIMITS: Record<AccessLevel, number> = {
  [SubscriptionTier.Free]: 3,
  [SubscriptionTier.Premium]: 8,
  [SubscriptionTier.Gold]: Number.POSITIVE_INFINITY,
  SuperAdmin: Number.POSITIVE_INFINITY
};

export const crushLimitLabel = (limit: number): string =>
  Number.isFinite(limit) ? String(limit) : 'Unlimited';

/**
 * The master switch for plans. While it's `false` (public user testing) everyone
 * gets every feature and unlimited crushes, and the plan screens are hidden.
 * Flip it to `true` to bring the Free / Premium / Gold tiers back. Super-admin
 * tools are never opened up by this switch.
 */
export const TIER_GATING_ENABLED = false;

/** True when `level` is at or above the feature's minimum (or the gate is off). */
export const accessAllows = (level: AccessLevel, feature: PremiumFeatureKey, gatingEnabled: boolean = TIER_GATING_ENABLED): boolean => {
  const entry = PREMIUM_FEATURES[feature];
  if (!entry.enabled) return true;
  if (!gatingEnabled && entry.minTier !== 'SuperAdmin') return true;
  return ACCESS_RANK[level] >= ACCESS_RANK[entry.minTier];
};

/** Kept for existing imports; prefer ACCESS_RANK. */
export const TIER_RANK = ACCESS_RANK;
