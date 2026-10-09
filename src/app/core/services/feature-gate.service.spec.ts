import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { AVATAR_BUILDER_PREMIUM, FeatureGateService } from './feature-gate.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionTier } from '../models/user.model';
import { PREMIUM_FEATURES, TIER_GATING_ENABLED, accessAllows } from '../config/premium-features';

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

  it('Safety Check is gated when tiers are on: Free cannot, Premium and Gold can', () => {
    expect(accessAllows(SubscriptionTier.Free, 'safetyCheck', true)).toBe(false);
    expect(accessAllows(SubscriptionTier.Premium, 'safetyCheck', true)).toBe(true);
    expect(accessAllows(SubscriptionTier.Gold, 'safetyCheck', true)).toBe(true);
  });

  it('with tiers switched off everyone gets every feature, except super-admin tools', () => {
    expect(accessAllows(SubscriptionTier.Free, 'safetyCheck', false)).toBe(true);
    expect(accessAllows(SubscriptionTier.Free, 'photoVault', false)).toBe(true);
    expect(accessAllows(SubscriptionTier.Gold, 'manageSuperAdmins', false)).toBe(false);
    expect(accessAllows('SuperAdmin', 'manageSuperAdmins', false)).toBe(true);
  });

  it('the live gate follows the master switch', () => {
    subscription.setTier(SubscriptionTier.Free);
    expect(gate.can('safetyCheck')).toBe(!TIER_GATING_ENABLED);
    expect(subscription.getCrushLimit()).toBe(TIER_GATING_ENABLED ? 3 : Number.POSITIVE_INFINITY);
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
