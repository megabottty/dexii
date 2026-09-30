import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { SubscriptionService } from './subscription.service';
import { SubscriptionTier } from '../models/user.model';

describe('SubscriptionService.refreshFromBackend', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubscriptionService);
    localStorage.setItem('dexii_api_token', 'test-token');
  });

  afterEach(() => {
    localStorage.removeItem('dexii_api_token');
    vi.restoreAllMocks();
  });

  it('reads the tier from the top level of /auth/me', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ subscriptionTier: 'Premium' }), { status: 200 })));
    await service.refreshFromBackend();
    expect(service.tier()).toBe(SubscriptionTier.Premium);
  });

  it('still accepts the older nested shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ user: { subscriptionTier: 'Gold' } }), { status: 200 })));
    await service.refreshFromBackend();
    expect(service.tier()).toBe(SubscriptionTier.Gold);
  });

  it('leaves the tier alone when the request fails', async () => {
    service.setTier(SubscriptionTier.Premium);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await service.refreshFromBackend();
    expect(service.tier()).toBe(SubscriptionTier.Premium);
  });
});
