import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureGateService } from '../services/feature-gate.service';
import { SubscriptionService } from '../services/subscription.service';
import { PremiumFeatureKey } from '../config/premium-features';

/**
 * Route guard for screens that belong to a rung of the access ladder.
 *
 *   { path: 'admin', canActivate: [lockGuard, accessGuard('manageSuperAdmins')] }
 *
 * Waits for the account's tier to load, then either allows the route or sends
 * the user to Settings with `?locked=<feature>` so it can explain what unlocks it.
 */
export const accessGuard = (feature: PremiumFeatureKey): CanActivateFn => async () => {
  const subscription = inject(SubscriptionService);
  const gate = inject(FeatureGateService);
  const router = inject(Router);

  await Promise.race([subscription.ready(), new Promise((resolve) => setTimeout(resolve, 4000))]);
  if (gate.can(feature)) return true;
  return router.createUrlTree(['/settings'], { queryParams: { locked: feature } });
};
