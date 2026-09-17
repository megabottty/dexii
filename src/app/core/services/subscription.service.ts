import { Injectable, signal } from '@angular/core';
import { SubscriptionTier } from '../models/user.model';
import { getApiBaseUrl } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly apiBase = getApiBaseUrl();
  private _tier = signal<SubscriptionTier>(SubscriptionTier.Free);
  public tier = this._tier.asReadonly();
  private readonly crushLimits: Record<SubscriptionTier, number> = {
    [SubscriptionTier.Free]: 5,
    [SubscriptionTier.Premium]: 25,
    [SubscriptionTier.Gold]: 100
  };

  async upgrade(tier: SubscriptionTier): Promise<void> {
    if (tier === SubscriptionTier.Free) {
      this._tier.set(tier);
      return;
    }

    const token = localStorage.getItem('dexii_api_token');
    if (!token) {
      throw new Error('Please sign in before choosing a paid plan.');
    }

    const response = await fetch(`${this.apiBase}/billing/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ tier })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.url !== 'string') {
      throw new Error(data.message || 'Paid plans are not available yet.');
    }

    window.location.assign(data.url);
  }

  async refreshFromBackend(): Promise<void> {
    const token = localStorage.getItem('dexii_api_token');
    if (!token) return;

    const response = await fetch(`${this.apiBase}/auth/me`, {
      headers: { 'x-auth-token': token }
    });
    if (!response.ok) return;
    const data = await response.json();
    const tier = data?.user?.subscriptionTier;
    if (tier === SubscriptionTier.Free || tier === SubscriptionTier.Premium || tier === SubscriptionTier.Gold) {
      this._tier.set(tier);
    }
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
