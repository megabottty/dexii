import { SubscriptionTier } from '../models/user.model';

/**
 * Premium feature registry. One entry per gated feature: which tier unlocks it,
 * whether the gate is switched on, and the copy the upgrade prompt shows.
 * The server mirrors keys/minTier/enabled in server/src/config/premiumFeatures.js.
 *
 * To put a new feature behind Premium: add an entry here (and on the server if
 * it has an API), then wrap its UI in `@if (gate.can('key'))` with
 * `<app-upgrade-prompt feature="key">` as the fallback.
 */
export interface PremiumFeature {
  minTier: SubscriptionTier;
  enabled: boolean;
  title: string;
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
    title: 'Premium Vault feature',
    body: 'The 18+ Photo Vault is available on Premium and Gold.'
  },
  avatarBuilder: {
    minTier: SubscriptionTier.Premium,
    enabled: false,
    title: 'Custom avatars are a Premium feature',
    body: 'Build a cartoon lookalike for every crush on Premium and Gold.'
  }
} as const satisfies Record<string, PremiumFeature>;

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURES;

export const TIER_RANK: Record<SubscriptionTier, number> = {
  [SubscriptionTier.Free]: 0,
  [SubscriptionTier.Premium]: 1,
  [SubscriptionTier.Gold]: 2
};
