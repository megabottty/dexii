import { Injectable, computed, inject, signal } from '@angular/core';
import { SecurityService } from './security.service';
import { getApiBaseUrl } from '../config/api-config';
import { FIRST_LOGIN_TOUR, FIRST_LOGIN_TOUR_KEY } from '../config/walkthrough-tours';

export interface WalkthroughStep {
  title: string;
  body: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WalkthroughService {
  private readonly storagePrefix = 'dexii_walkthrough_';
  private security = inject(SecurityService);
  private apiBase = getApiBaseUrl();
  private firstLoginCheck: Promise<boolean> | null = null;

  private _key = signal<string | null>(null);
  private _steps = signal<WalkthroughStep[]>([]);
  private _index = signal(0);

  public steps = this._steps.asReadonly();
  public index = this._index.asReadonly();
  public isOpen = computed(() => this._key() !== null && this._steps().length > 0);
  public currentStep = computed(() => this._steps()[this._index()] ?? null);
  public stepCount = computed(() => this._steps().length);
  public isFirstStep = computed(() => this._index() === 0);
  public isLastStep = computed(() => this._index() >= this._steps().length - 1);

  private storageKey(key: string): string {
    if (key === 'first_login') {
      return `${this.storagePrefix}${key}`;
    }
    return `${this.storagePrefix}${this.storageOwner()}_${key}`;
  }

  private storageOwner(): string {
    const userId = (
      this.security.currentUserId() ||
      localStorage.getItem('dexii_api_user_id') ||
      ''
    ).trim().toLowerCase();
    if (userId) return `id_${userId}`;

    const username = (
      this.security.currentUser() ||
      localStorage.getItem('dexii_api_username') ||
      ''
    ).trim().toLowerCase();
    return username || 'global';
  }

  /**
   * Auto-opens the welcome tour the very first time an account signs in.
   *
   * The "seen" flag lives on the account (server), with localStorage only as a
   * fast cache, so the tour shows once per user rather than once per browser,
   * PWA install or native app. Resolves to whether the tour opened.
   */
  startFirstLogin(): Promise<boolean> {
    if (this.firstLoginCheck) return this.firstLoginCheck;

    this.firstLoginCheck = (async () => {
      try {
        if (this.hasCompleted(FIRST_LOGIN_TOUR_KEY) || this.isOpen()) return false;

        const seenOnServer = await this.fetchFirstLoginSeen();
        if (seenOnServer === true) {
          this.markSeenLocally(FIRST_LOGIN_TOUR_KEY);
          return false;
        }
        if (seenOnServer === null) {
          // Could not reach the API: don't guess. The next dashboard visit
          // will ask again, and the local cache still prevents repeats here.
          return false;
        }

        const opened = this.start(FIRST_LOGIN_TOUR_KEY, FIRST_LOGIN_TOUR);
        if (opened) void this.persistFirstLoginSeen();
        return opened;
      } finally {
        this.firstLoginCheck = null;
      }
    })();

    return this.firstLoginCheck;
  }

  /** true/false from the server, or null when the request failed. */
  private async fetchFirstLoginSeen(): Promise<boolean | null> {
    const headers = this.security.authHeaders();
    if (!headers['x-auth-token']) return null;
    try {
      const response = await fetch(`${this.apiBase}/auth/me`, { headers });
      if (!response.ok) return null;
      const profile = await response.json();
      return Boolean(profile?.firstLoginTourSeen);
    } catch {
      return null;
    }
  }

  private async persistFirstLoginSeen(): Promise<void> {
    try {
      await fetch(`${this.apiBase}/auth/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.security.authHeaders() },
        body: JSON.stringify({ firstLoginTourSeen: true })
      });
    } catch {
      // Offline: the local cache covers this device, and the server flag is
      // retried the next time the tour would otherwise open elsewhere.
    }
  }

  private markSeenLocally(key: string): void {
    try {
      localStorage.setItem(this.storageKey(key), '1');
    } catch {
      // Storage can be unavailable in private browsing.
    }
  }

  hasCompleted(key: string): boolean {
    try {
      const userKey = this.storageKey(key);
      const isCompleted = localStorage.getItem(userKey) === '1';
      return isCompleted;
    } catch {
      return false;
    }
  }

  /**
   * Opens the walkthrough unless the user has already seen it (or force=true).
   * Returns whether it opened, so callers can chain a follow-up tour without stacking two modals.
   */
  start(key: string, steps: WalkthroughStep[], force: boolean = false): boolean {
    if (!key || steps.length === 0) return false;
    if (!force && this.hasCompleted(key)) return false;
    if (this.isOpen() && !force) return false;

    this._key.set(key);
    this._steps.set(steps);
    this._index.set(0);

    // Record "seen" the moment an automatic (non-forced) tour actually opens,
    // not only when the user explicitly finishes/skips it. Previously, if
    // someone closed the tab, refreshed, or navigated away mid-tour without
    // clicking Skip or stepping through to the end, nothing was ever saved -
    // so the same "first login" tour kept reappearing on every later login.
    // A manually-replayed tour (force=true, e.g. from Help & Tips) is exempt:
    // it's already marked seen from the very first time, so this is a no-op
    // for that path anyway.
    if (!force) {
      try {
        localStorage.setItem(this.storageKey(key), '1');
      } catch {
        // Storage can be unavailable in private browsing; the tour simply reappears later.
      }
    }
    return true;
  }

  next(): void {
    if (this.isLastStep()) {
      this.finish();
      return;
    }
    this._index.update(i => i + 1);
  }

  back(): void {
    if (this.isFirstStep()) return;
    this._index.update(i => i - 1);
  }

  goTo(index: number): void {
    if (index < 0 || index >= this._steps().length) return;
    this._index.set(index);
  }

  /** Dismisses the tour and records it as seen so it does not reappear. */
  finish(): void {
    this.markSeenAndClose();
  }

  skip(): void {
    this.markSeenAndClose();
  }

  private markSeenAndClose(): void {
    const key = this._key();
    if (key) {
      try {
        localStorage.setItem(this.storageKey(key), '1');
      } catch {
        // Storage can be unavailable in private browsing; the tour simply reappears later.
      }
    }
    this._key.set(null);
    this._steps.set([]);
    this._index.set(0);
  }

  /** Clears the seen flag so a tour can be replayed on demand. */
  reset(key: string): void {
    try {
      localStorage.removeItem(this.storageKey(key));
    } catch {
      // Ignore storage failures.
    }
  }
}
