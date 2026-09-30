import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { accessGuard } from './access.guard';
import { SubscriptionService } from '../services/subscription.service';
import { SubscriptionTier } from '../models/user.model';

describe('accessGuard', () => {
  let subscription: SubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    subscription = TestBed.inject(SubscriptionService);
    // No session: the first refresh resolves immediately.
    void subscription.refreshFromBackend();
  });

  const run = () => TestBed.runInInjectionContext(() => accessGuard('manageSuperAdmins')({} as any, {} as any));

  it('sends Free and Gold users to Settings with the locked feature', async () => {
    subscription.setTier(SubscriptionTier.Gold);
    const result = await run();
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/settings?locked=manageSuperAdmins');
  });

  it('lets a super admin through', async () => {
    (subscription as unknown as { _isSuperAdmin: { set(v: boolean): void } })._isSuperAdmin.set(true);
    expect(await run()).toBe(true);
  });
});
