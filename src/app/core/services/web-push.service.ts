import { Injectable, computed, effect, inject, isDevMode, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { getApiBaseUrl, isNativeApp } from '../config/api-config';
import { NotificationsService } from './notifications.service';
import { SecurityService } from './security.service';

/** Per-user: `${DISMISSED_KEY_PREFIX}<userId>` holds the time it was dismissed. */
const DISMISSED_KEY_PREFIX = 'dexii_web_push_prompt_dismissed_';
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

/** One plain-language requirement for notifications, with what to do when it fails. */
export interface WebPushCheck {
  label: string;
  ok: boolean;
  hint?: string;
}

export type WebPushStatus =
  | 'unsupported'      // no service worker / Push API here (or native app, which uses APNs/FCM)
  | 'needs-install'    // iOS Safari: must be added to the Home Screen first
  | 'blocked'          // user denied the permission in the browser
  | 'off'              // supported, not subscribed yet
  | 'on';              // subscribed and registered with the server

/**
 * Browser push notifications via the Angular service worker (Web Push).
 *
 * Works in Chrome/Edge/Firefox on desktop and Android, and on iPhone once
 * Dexii is added to the Home Screen (iOS 16.4+). Enabling must happen from a
 * user tap, so this service exposes `enable()` for a button rather than
 * prompting automatically.
 */
@Injectable({ providedIn: 'root' })
export class WebPushService {
  private swPush = inject(SwPush);
  private security = inject(SecurityService);
  private notifications = inject(NotificationsService);
  private apiBase = `${getApiBaseUrl()}/notifications/web-push`;

  private publicKey: string | null = null;
  private currentEndpoint: string | null = null;
  private syncedForUser: string | null = null;

  readonly permission = signal<NotificationPermission | 'unsupported'>('unsupported');
  readonly subscribed = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  /** When the person last said "Not now" (per account); the prompt comes back after two weeks. */
  private readonly dismissedAt = signal(0);
  readonly dismissed = computed(() => Date.now() - this.dismissedAt() < DISMISS_FOR_MS);

  readonly supported = computed(() => this.permission() !== 'unsupported');
  readonly isIos = signal(false);
  readonly needsInstall = signal(false);
  /** One-line technical summary of what this browser reports, for support. */
  readonly diagnostics = signal('');
  /** Plain-language reason when push is unavailable here. */
  readonly unsupportedReason = signal('');
  /** Requirements that depend only on the browser/device (set once at startup). */
  private readonly deviceChecks = signal<WebPushCheck[]>([]);

  /** Every requirement, in plain words, including the browser permission once it is known. */
  readonly checks = computed<WebPushCheck[]>(() => {
    const permission = this.permission();
    if (permission === 'unsupported') return this.deviceChecks();
    const permissionCheck: WebPushCheck = permission === 'granted'
      ? { label: 'Allowed in your browser', ok: true }
      : permission === 'denied'
        ? { label: 'Allowed in your browser', ok: false, hint: 'Allow notifications for dexii.net in your browser settings, then come back here.' }
        : { label: 'Allowed in your browser', ok: false, hint: 'Tap "Turn on notifications" below and choose Allow.' };
    return [...this.deviceChecks(), permissionCheck];
  });
  /** Only the requirements that are not met right now. */
  readonly failingChecks = computed(() => this.checks().filter((check) => !check.ok));

  readonly status = computed<WebPushStatus>(() => {
    if (this.needsInstall()) return 'needs-install';
    if (!this.supported()) return 'unsupported';
    if (this.permission() === 'denied') return 'blocked';
    return this.subscribed() ? 'on' : 'off';
  });

  /** True when it's worth showing an "enable notifications" nudge. */
  readonly shouldPrompt = computed(() => {
    const status = this.status();
    return !this.dismissed() && (status === 'off' || status === 'needs-install');
  });

  constructor() {
    if (typeof window === 'undefined' || isNativeApp()) return;

    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    this.isIos.set(ios);

    const hasNotification = 'Notification' in window;
    const hasPushManager = 'PushManager' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushApi = hasNotification && hasPushManager && hasServiceWorker;
    const secure = window.isSecureContext;
    this.diagnostics.set(
      `sw:${hasServiceWorker ? 'yes' : 'no'} swEnabled:${this.swPush.isEnabled ? 'yes' : 'no'} ` +
      `notification:${hasNotification ? 'yes' : 'no'} pushManager:${hasPushManager ? 'yes' : 'no'} ` +
      `standalone:${standalone ? 'yes' : 'no'} ios:${ios ? 'yes' : 'no'} secure:${secure ? 'yes' : 'no'}`
    );

    // The service worker is switched off in the dev build (see app.config.ts), so don't
    // blame private browsing for that.
    const workerHint = isDevMode()
      ? 'Notifications are switched off in the development build.'
      : 'Reload the page. Private browsing windows block it.';
    const checks: WebPushCheck[] = [
      { label: 'Secure connection (https)', ok: secure, hint: 'Open Dexii at https://www.dexii.net.' },
      {
        label: 'Browser can show notifications',
        ok: hasNotification && hasPushManager,
        hint: ios && !standalone
          ? 'On iPhone, add Dexii to your Home Screen first (Share menu, then "Add to Home Screen") and open it from there.'
          : 'Use Chrome, Edge, Firefox, or Safari 16.4 or newer.'
      },
      { label: 'Background worker running', ok: hasServiceWorker && this.swPush.isEnabled, hint: workerHint }
    ];
    if (ios) {
      checks.push({
        label: 'Added to Home Screen',
        ok: standalone,
        hint: 'On iPhone, notifications only work once Dexii is on your Home Screen. Use the Share menu, "Add to Home Screen", then open it from there.'
      });
    }
    this.deviceChecks.set(checks);

    if (ios && !standalone && !hasPushApi) {
      this.needsInstall.set(true);
    }
    if (!hasPushApi || !this.swPush.isEnabled) {
      if (ios && standalone && !hasPushApi) {
        this.unsupportedReason.set('This iPhone does not offer web notifications to Home Screen apps. It needs iOS 16.4 or later; check Settings → General → Software Update.');
      } else if (!secure) {
        this.unsupportedReason.set('Notifications need a secure (https) connection.');
      } else if (!this.swPush.isEnabled) {
        this.unsupportedReason.set(isDevMode()
          ? 'Notifications are switched off in the development build.'
          : 'The app\'s background worker is not running in this browser, so it cannot receive notifications. Reload the page; private browsing windows also block it.');
      } else {
        this.unsupportedReason.set('This browser does not support web notifications. Chrome, Edge, Firefox and Safari 16.4+ do.');
      }
      this.readDismissed();
      return;
    }

    this.permission.set(Notification.permission);
    this.readDismissed();

    this.swPush.subscription.subscribe((sub) => {
      this.currentEndpoint = sub?.endpoint ?? null;
      this.subscribed.set(Boolean(sub));
      if (sub) void this.syncSubscription(sub);
    });

    // A tap on the notification is routed by the service worker; here we just
    // keep the in-app badge fresh when a push arrives while Dexii is open.
    this.swPush.messages.subscribe(() => { void this.notifications.loadUnreadCount(); });
    this.swPush.notificationClicks.subscribe(() => { void this.notifications.loadUnreadCount(); });

    this.security.registerBeforeLogout(() => { void this.forgetOnServer(); });

    effect(() => {
      const userId = this.security.currentUserId();
      const ready = Boolean(userId && this.security.isLoggedIn() && !this.security.isLocked());
      if (!ready) {
        this.syncedForUser = null;
        return;
      }
      if (this.syncedForUser !== userId) {
        this.syncedForUser = userId;
        this.readDismissed();
        // Prefetch the key so enable() can subscribe inside the tap gesture.
        void this.loadPublicKey();
      }
    });
  }

  /** Fetches the server key ahead of time so enable() can run inside a tap. */
  prepare(): void {
    void this.loadPublicKey();
  }

  /** Call from a click handler. Prompts for permission and subscribes. */
  async enable(): Promise<boolean> {
    if (this.status() === 'unsupported' || this.status() === 'needs-install') return false;
    this.busy.set(true);
    this.error.set(null);
    try {
      const key = this.publicKey || await this.loadPublicKey();
      if (!key) {
        this.error.set('Notifications are not available right now. Try again in a minute.');
        return false;
      }
      const sub = await this.swPush.requestSubscription({ serverPublicKey: key });
      this.permission.set(Notification.permission);
      const ok = await this.syncSubscription(sub);
      if (!ok) this.error.set('Could not save this device. Please try again.');
      return ok;
    } catch (err) {
      this.permission.set(Notification.permission);
      if (Notification.permission === 'denied') {
        this.error.set('Notifications are blocked for Dexii in your browser settings.');
      } else {
        this.error.set('Could not turn on notifications. Please try again.');
      }
      console.warn('Web push enable failed:', err);
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  async disable(): Promise<void> {
    this.busy.set(true);
    try {
      await this.forgetOnServer();
      await this.swPush.unsubscribe().catch(() => undefined);
      this.subscribed.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  dismissPrompt(): void {
    const now = Date.now();
    this.dismissedAt.set(now);
    const userId = this.security.currentUserId();
    if (!userId) return;
    try { localStorage.setItem(DISMISSED_KEY_PREFIX + userId, String(now)); } catch { /* ignore */ }
  }

  private readDismissed(): void {
    const userId = this.security.currentUserId();
    if (!userId) { this.dismissedAt.set(0); return; }
    try {
      const raw = localStorage.getItem(DISMISSED_KEY_PREFIX + userId);
      this.dismissedAt.set(raw ? Number(raw) || 0 : 0);
    } catch { /* ignore */ }
  }

  private async loadPublicKey(): Promise<string | null> {
    if (this.publicKey) return this.publicKey;
    const headers = this.security.authHeaders();
    if (!headers['x-auth-token']) return null;
    try {
      const res = await fetch(`${this.apiBase}/public-key`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      this.publicKey = typeof data?.publicKey === 'string' ? data.publicKey : null;
      return this.publicKey;
    } catch {
      return null;
    }
  }

  private async syncSubscription(sub: PushSubscription): Promise<boolean> {
    const headers = this.security.authHeaders();
    if (!headers['x-auth-token']) return false;
    try {
      const res = await fetch(`${this.apiBase}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ subscription: sub.toJSON() })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async forgetOnServer(): Promise<void> {
    const endpoint = this.currentEndpoint;
    const auth = this.security.authHeaders();
    if (!endpoint || !auth['x-auth-token']) return;
    const headers = { 'Content-Type': 'application/json', ...auth };
    try {
      await fetch(`${this.apiBase}/subscribe`, { method: 'DELETE', headers, body: JSON.stringify({ endpoint }) });
    } catch {
      // Best effort; stale endpoints are pruned when a send fails.
    }
  }
}
