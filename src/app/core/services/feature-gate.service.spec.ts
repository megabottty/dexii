import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { AVATAR_BUILDER_PREMIUM, FeatureGateService } from './feature-gate.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionTier } from '../models/user.model';
import { PREMIUM_FEATURES } from '../config/premium-features';

describe('FeatureGateService', () => {
  let gate: FeatureGateService;
  let subscription: SubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    gate = TestBed.inject(FeatureGateService);
    subscription = TestBed.inject(SubscriptionService);
  });

  it('avatar builder stays free while its registry flag is off', () => {
    expect(AVATAR_BUILDER_PREMIUM).toBe(PREMIUM_FEATURES.avatarBuilder.enabled);
    expect(PREMIUM_FEATURES.avatarBuilder.enabled).toBe(false);
    expect(gate.canUseAvatarBuilder()).toBe(true);
  });

  it('Safety Check is gated: Free cannot, Premium and Gold can', () => {
    subscription.setTier(SubscriptionTier.Free);
    expect(gate.can('safetyCheck')).toBe(false);
    expect(gate.canUseSafetyCheck()).toBe(false);
    subscription.setTier(SubscriptionTier.Premium);
    expect(gate.can('safetyCheck')).toBe(true);
    subscription.setTier(SubscriptionTier.Gold);
    expect(gate.can('safetyCheck')).toBe(true);
  });

  it('reports the tier a feature needs', () => {
    expect(gate.requiredTier('safetyCheck')).toBe(SubscriptionTier.Premium);
  });

  it('setTier ignores junk values', () => {
    subscription.setTier(SubscriptionTier.Gold);
    subscription.setTier('Platinum');
    subscription.setTier(undefined);
    expect(subscription.tier()).toBe(SubscriptionTier.Gold);
  });
});
