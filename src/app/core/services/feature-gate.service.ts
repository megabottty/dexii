import { Injectable, computed, inject } from '@angular/core';
import { SubscriptionService } from './subscription.service';
import { PREMIUM_FEATURES, PremiumFeatureKey, accessAllows } from '../config/premium-features';

/** Kept for existing callers/specs; the source of truth is the registry. */
export const AVATAR_BUILDER_PREMIUM = PREMIUM_FEATURES.avatarBuilder.enabled;

@Injectable({ providedIn: 'root' })
export class FeatureGateService {
  private subscription = inject(SubscriptionService);

  /** True when the current account's access level unlocks the feature (or the gate is off). */
  can(feature: PremiumFeatureKey): boolean {
    return accessAllows(this.subscription.accessLevel(), feature);
  }

  /** The lowest level a gated feature needs, for copy like "Available on Premium". */
  requiredTier(feature: PremiumFeatureKey) {
    return PREMIUM_FEATURES[feature].minTier;
  }

  readonly canUseAvatarBuilder = computed(() => this.can('avatarBuilder'));
  readonly canUseSafetyCheck = computed(() => this.can('safetyCheck'));
  readonly canUsePhotoVault = computed(() => this.can('photoVault'));
  readonly canManageSuperAdmins = computed(() => this.can('manageSuperAdmins'));
}
