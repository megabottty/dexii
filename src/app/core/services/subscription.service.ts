import { Injectable, signal } from '@angular/core';
import { SubscriptionTier } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private _tier = signal<SubscriptionTier>(SubscriptionTier.Free);
  public tier = this._tier.asReadonly();

  upgrade(tier: SubscriptionTier): void {
    // In a real app, integrate Stripe or App Store logic
    this._tier.set(tier);
    console.log(`User upgraded to ${tier}`);
  }

  isPremium(): boolean {
    return this._tier() !== SubscriptionTier.Free;
  }

  checkLimit(currentCount: number, limit: number): boolean {
    if (this.isPremium()) return true;
    return currentCount < limit;
  }
}
