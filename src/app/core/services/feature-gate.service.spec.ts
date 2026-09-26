import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { AVATAR_BUILDER_PREMIUM, FeatureGateService } from './feature-gate.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionTier } from '../models/user.model';

describe('FeatureGateService', () => {
  let gate: FeatureGateService;
  let subscription: SubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    gate = TestBed.inject(FeatureGateService);
    subscription = TestBed.inject(SubscriptionService);
  });

  it('avatar builder is free while the flag is off', () => {
    expect(AVATAR_BUILDER_PREMIUM).toBe(false);
    expect(gate.canUseAvatarBuilder()).toBe(true);
  });

  it('a Free account is not premium, so flipping the flag would gate the builder', () => {
    void subscription.upgrade(SubscriptionTier.Free);
    expect(subscription.isPremium()).toBe(false);
  });
});
