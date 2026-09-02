import { Injectable, computed, signal } from '@angular/core';

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
    return `${this.storagePrefix}${key}`;
  }

  hasCompleted(key: string): boolean {
    try {
      return localStorage.getItem(this.storageKey(key)) === '1';
    } catch {
      return false;
    }
  }

  /**
   * Opens the walkthrough unless the user has already seen it. Returns whether it opened,
   * so callers can chain a follow-up tour without stacking two modals.
   */
  start(key: string, steps: WalkthroughStep[]): boolean {
    if (!key || steps.length === 0) return false;
    if (this.hasCompleted(key)) return false;
    if (this.isOpen()) return false;

    this._key.set(key);
    this._steps.set(steps);
    this._index.set(0);
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
