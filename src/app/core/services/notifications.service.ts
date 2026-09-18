import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApiBaseUrl } from '../config/api-config';
import { SecurityService } from './security.service';

export type NotificationType =
  | 'friend_request_nudge'
  | 'crush_shared'
  | 'invite_accepted'
  | 'friend_request_received'
  | 'friend_request_accepted'
  | string;

export interface NotificationActor {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface AppNotification {
  id: string;
  recipient: string;
  actor: NotificationActor | null;
  type: NotificationType;
  payload: {
    friendRequestId?: string;
    crushId?: string;
    crushNickname?: string;
    [key: string]: unknown;
  };
  read: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private http = inject(HttpClient, { optional: true });
  private security = inject(SecurityService);
  private apiBase = `${getApiBaseUrl()}/notifications`;
  private unreadCountPoller: ReturnType<typeof setInterval> | null = null;

  private _unreadCount = signal(0);
  public unreadCount = this._unreadCount.asReadonly();
  private _notifications = signal<AppNotification[]>([]);
  public notifications = this._notifications.asReadonly();

  constructor() {
    effect(() => {
      const userId = this.security.currentUserId();
      const isLoggedIn = this.security.isLoggedIn();
      const isLocked = this.security.isLocked();

      if (!userId || !isLoggedIn || isLocked) {
        this._unreadCount.set(0);
        this._notifications.set([]);
        return;
      }

      void this.loadUnreadCount();
    }, { allowSignalWrites: true });

    this.unreadCountPoller = setInterval(() => {
      void this.loadUnreadCount();
    }, 15000);
  }

  async loadUnreadCount(): Promise<number> {
    if (!this.canRequest()) {
      this._unreadCount.set(0);
      return 0;
    }

    try {
      const response = await this.request<{ count: number }>('/unread-count');
      const count = Number(response?.count || 0);
      this._unreadCount.set(count);
      return count;
    } catch {
      this._unreadCount.set(0);
      return 0;
    }
  }

  async loadNotifications(): Promise<AppNotification[]> {
    if (!this.canRequest()) {
      this._notifications.set([]);
      return [];
    }

    try {
      const notifications = await this.request<AppNotification[]>('');
      this._notifications.set(Array.isArray(notifications) ? notifications : []);
      return this._notifications();
    } catch {
      this._notifications.set([]);
      return [];
    }
  }

  async markRead(id: string): Promise<void> {
    if (!id || !this.canRequest()) return;

    const wasUnread = this._notifications().some((notification) => notification.id === id && !notification.read);
    await this.request<AppNotification>(`/${encodeURIComponent(id)}/read`, { method: 'PUT' });
    this._notifications.update((notifications) => notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    ));
    if (wasUnread) {
      this._unreadCount.update((count) => Math.max(0, count - 1));
    }
  }

  async markUnread(id: string): Promise<void> {
    if (!id || !this.canRequest()) return;

    const wasRead = this._notifications().some((notification) => notification.id === id && notification.read);
    await this.request<AppNotification>(`/${encodeURIComponent(id)}/unread`, { method: 'PUT' });
    this._notifications.update((notifications) => notifications.map((notification) =>
      notification.id === id ? { ...notification, read: false } : notification
    ));
    if (wasRead) {
      this._unreadCount.update((count) => count + 1);
    }
    await this.loadUnreadCount();
  }

  async markAllRead(): Promise<void> {
    if (!this.canRequest()) return;

    await this.request<{ count: number }>('/read-all', { method: 'PUT' });
    this._notifications.update((notifications) => notifications.map((notification) => ({ ...notification, read: true })));
    this._unreadCount.set(0);
  }

  private canRequest(): boolean {
    return Boolean(this.security.currentUserId() && this.security.isLoggedIn() && !this.security.isLocked());
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.security.authHeaders()
    };
  }

  private async request<T>(path: string, init: { method?: 'GET' | 'PUT'; body?: unknown } = {}): Promise<T> {
    const method = init.method || 'GET';
    const url = `${this.apiBase}${path}`;

    if (this.http) {
      if (method === 'PUT') {
        return firstValueFrom(this.http.put<T>(url, init.body ?? {}, { headers: this.buildHeaders() }));
      }
      return firstValueFrom(this.http.get<T>(url, { headers: this.buildHeaders() }));
    }

    const response = await fetch(url, {
      method,
      headers: this.buildHeaders(),
      body: method === 'GET' ? undefined : JSON.stringify(init.body ?? {})
    });

    if (!response.ok) {
      throw new Error(`Notifications request failed (${response.status})`);
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}
