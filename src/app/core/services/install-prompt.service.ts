import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'dexii_install_dismissed';

/**
 * Tracks PWA installability.
 *
 * Chromium fires `beforeinstallprompt`, which we capture so the install can be
 * triggered from our own UI. iOS Safari has no such API, so there we detect the
 * platform and show manual "Add to Home Screen" instructions instead.
 */
@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /** True when the browser has offered us an install prompt we can trigger. */
  readonly canInstall = signal(false);
  /** True when already running as an installed app. */
  readonly isInstalled = signal(false);
  readonly isIos = signal(false);
  readonly dismissed = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;

    this.isInstalled.set(this.detectStandalone());
    this.isIos.set(this.detectIos());
    this.dismissed.set(localStorage.getItem(DISMISSED_KEY) === '1');

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
    });
  }

  /** True when we should surface install UI at all. */
  shouldOffer(): boolean {
    if (this.isInstalled()) return false;
    return this.canInstall() || this.isIos();
  }

  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) return 'unavailable';

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.canInstall.set(false);
      return outcome;
    } catch {
      return 'unavailable';
    }
  }

  dismiss(): void {
    this.dismissed.set(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage can be unavailable in private mode; dismissal just won't persist.
    }
  }

  private detectStandalone(): boolean {
    const displayMode = window.matchMedia?.('(display-mode: standalone)')?.matches;
    const iosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
    return Boolean(displayMode || iosStandalone);
  }

  private detectIos(): boolean {
    const ua = window.navigator.userAgent || '';
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    return isIosDevice && isSafari;
  }
}
