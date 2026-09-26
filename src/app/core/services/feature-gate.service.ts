import { Injectable, computed, inject } from '@angular/core';
import { SubscriptionService } from './subscription.service';

/**
 * Flip to `true` to put the avatar builder behind Premium/Gold. The picker
 * then shows an upgrade prompt instead of opening the builder. (Server-side
 * enforcement would be a separate step; the server does not check tiers today.)
 */
export const AVATAR_BUILDER_PREMIUM = false;

@Injectable({ providedIn: 'root' })
export class FeatureGateService {
  private subscription = inject(SubscriptionService);

  readonly canUseAvatarBuilder = computed(() => !AVATAR_BUILDER_PREMIUM || this.subscription.isPremium());
}
