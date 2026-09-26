import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

/**
 * Keeps installed/PWA users on the latest deploy.
 *
 * The Angular service worker downloads a new version in the background but
 * keeps serving the old one until the next full load, so a home-screen app
 * that is never fully closed can lag behind for days. Here we:
 *   - check for a new version whenever the app comes back to the foreground,
 *   - and once one is ready, apply it at the next quiet moment (a route
 *     change, or when the app returns to the foreground) with a reload.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private updates = inject(SwUpdate);
  private router = inject(Router);
  private updateReady = false;

  /** Short commit of the bundle currently running (stamped by scripts/postbuild-index.js). */
  readonly build: string = (typeof window !== 'undefined' && (window as unknown as { __DEXII_BUILD__?: string }).__DEXII_BUILD__) || 'dev';
  readonly checking = signal(false);
  readonly lastCheck = signal<'idle' | 'updating' | 'current' | 'unavailable'>('idle');

  constructor() {
    if (!this.updates.isEnabled) return;

    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => { this.updateReady = true; });

    // Unrecoverable state (e.g. cached files evicted): reload to a clean version.
    this.updates.unrecoverable.subscribe(() => document.location.reload());

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.applyIfReady());

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        if (this.updateReady) {
          this.applyIfReady();
        } else {
          void this.updates.checkForUpdate().catch(() => undefined);
        }
      });
    }
  }

  /** Manual "Check for updates": fetch, and if a new version exists apply it right away. */
  async checkNow(): Promise<void> {
    if (!this.updates.isEnabled) {
      this.lastCheck.set('unavailable');
      return;
    }
    this.checking.set(true);
    try {
      const found = await this.updates.checkForUpdate();
      if (found || this.updateReady) {
        this.lastCheck.set('updating');
        await this.updates.activateUpdate();
        document.location.reload();
      } else {
        this.lastCheck.set('current');
      }
    } catch {
      this.lastCheck.set('unavailable');
    } finally {
      this.checking.set(false);
    }
  }

  private applyIfReady(): void {
    if (!this.updateReady) return;
    this.updateReady = false;
    void this.updates.activateUpdate()
      .then(() => document.location.reload())
      .catch(() => { this.updateReady = true; });
  }
}
