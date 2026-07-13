import { Injectable, signal } from '@angular/core';
import { SubscriptionTier } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private _tier = signal<SubscriptionTier>(SubscriptionTier.Free);
  public tier = this._tier.asReadonly();
  private readonly crushLimits: Record<SubscriptionTier, number> = {
    [SubscriptionTier.Free]: 5,
    [SubscriptionTier.Premium]: 25,
    [SubscriptionTier.Gold]: 100
  };

  upgrade(tier: SubscriptionTier): void {
    // In a real app, integrate Stripe or App Store logic
    this._tier.set(tier);
    console.log(`User upgraded to ${tier}`);
  }

  isPremium(): boolean {
    return this._tier() !== SubscriptionTier.Free;
  }

  getCrushLimit(): number {
    return this.crushLimits[this._tier()];
  }

  checkLimit(currentCount: number, limit?: number): boolean {
    const max = typeof limit === 'number' ? limit : this.getCrushLimit();
    return currentCount < max;
  }
}
