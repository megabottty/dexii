import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
  type Token
} from '@capacitor/push-notifications';
import { getApiBaseUrl, isNativeApp } from '../config/api-config';
import { NotificationsService } from './notifications.service';
import { SecurityService } from './security.service';

const TOKEN_KEY = 'dexii_push_token';

/**
 * Registers the device for native push (APNs on iOS, FCM on Android) and keeps
 * the server informed of the device token so it can wake the phone when a new
 * in-app notification is created. No-op when running in a normal browser.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private security = inject(SecurityService);
  private notifications = inject(NotificationsService);
  private router = inject(Router);
  private apiBase = `${getApiBaseUrl()}/notifications/push-token`;

  private listeners: PluginListenerHandle[] = [];
  private registeredForUser: string | null = null;

  constructor() {
    if (!isNativeApp()) return;

    // Runs while the auth token is still present, so the server can drop this
    // device's token and the phone stops buzzing for a signed-out account.
    this.security.registerBeforeLogout(() => {
      this.registeredForUser = null;
      void this.unregister();
    });

    effect(() => {
      const userId = this.security.currentUserId();
      const ready = Boolean(userId && this.security.isLoggedIn() && !this.security.isLocked());

      if (ready && this.registeredForUser !== userId) {
        this.registeredForUser = userId;
        void this.register();
      } else if (!userId) {
        this.registeredForUser = null;
      }
    });
  }

  /** Asks for permission (first time only) and registers with APNs/FCM. */
  async register(): Promise<void> {
    try {
      let status = await PushNotifications.checkPermissions();
      if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
        status = await PushNotifications.requestPermissions();
      }
      if (status.receive !== 'granted') return;

      await this.attachListeners();
      await PushNotifications.register();
    } catch (err) {
      console.warn('Push registration failed:', err);
    }
  }

  private async attachListeners(): Promise<void> {
    if (this.listeners.length) return;

    this.listeners.push(
      await PushNotifications.addListener('registration', (token: Token) => {
        void this.saveToken(token.value);
      }),
      await PushNotifications.addListener('registrationError', (err) => {
        console.warn('Push registration error:', err);
      }),
      await PushNotifications.addListener('pushNotificationReceived', (_n: PushNotificationSchema) => {
        // App is in the foreground: refresh the in-app badge right away.
        void this.notifications.loadUnreadCount();
      }),
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const route = action.notification?.data?.['route'];
        void this.notifications.loadUnreadCount();
        if (typeof route === 'string' && route.startsWith('/')) {
          void this.router.navigateByUrl(route);
        } else {
          void this.router.navigateByUrl('/feed');
        }
      })
    );
  }

  private async saveToken(token: string): Promise<void> {
    if (!token) return;
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage unavailable; we'll still send the token to the server.
    }

    try {
      await fetch(this.apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.security.authHeaders() },
        body: JSON.stringify({ token, platform: Capacitor.getPlatform() })
      });
    } catch (err) {
      console.warn('Saving push token failed:', err);
    }
  }

  private async unregister(): Promise<void> {
    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    if (!token) return;

    // Headers are read synchronously here, before the session is cleared.
    const headers = { 'Content-Type': 'application/json', ...this.security.authHeaders() };
    try {
      await fetch(this.apiBase, { method: 'DELETE', headers, body: JSON.stringify({ token }) });
    } catch {
      // Best effort: the server also prunes tokens that providers report as invalid.
    }
  }
}
