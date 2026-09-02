import { Injectable, inject } from '@angular/core';
import { getApiBaseUrl } from '../config/api-config';
import { SecurityService } from './security.service';

export type FriendRelationship = 'none' | 'friends' | 'request_sent' | 'request_received';

export interface FriendSearchResult {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  subscriptionTier?: string;
  relationship: FriendRelationship;
}

export interface FriendSummary {
  id: string;
  username: string;
  avatarUrl?: string;
  friendCategories?: string[];
}

export interface FriendRequestSummary {
  id: string;
  status: string;
  message?: string;
  createdAt?: string;
  nudgeCount?: number;
  from?: FriendSummary;
  to?: FriendSummary;
}

/**
 * Client for the real, Mongo-backed friends API (`/api/friends/*`).
 * Replaces the demo JSON-file store used previously.
 */
@Injectable({
  providedIn: 'root'
})
export class FriendsApiService {
  private security = inject(SecurityService);
  private apiBase = getApiBaseUrl();

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.apiBase}/friends${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...this.security.authHeaders(),
        ...(init.headers || {})
      }
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json();
        message = body?.message || body?.msg || message;
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new Error(message);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  isAuthenticated(): boolean {
    return !!this.security.currentUserId();
  }

  listFriends(): Promise<FriendSummary[]> {
    return this.request<FriendSummary[]>('');
  }

  search(query: string): Promise<FriendSearchResult[]> {
    return this.request<FriendSearchResult[]>(`/search?query=${encodeURIComponent(query)}`);
  }

  incomingRequests(): Promise<FriendRequestSummary[]> {
    return this.request<FriendRequestSummary[]>('/requests');
  }

  outgoingRequests(): Promise<FriendRequestSummary[]> {
    return this.request<FriendRequestSummary[]>('/requests/sent');
  }

  sendRequest(toUserId: string, message = ''): Promise<FriendRequestSummary> {
    return this.request<FriendRequestSummary>('/requests', {
      method: 'POST',
      body: JSON.stringify({ toUserId, message })
    });
  }

  respondToRequest(requestId: string, action: 'accept' | 'decline'): Promise<FriendRequestSummary> {
    return this.request<FriendRequestSummary>(`/requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  }

  cancelRequest(requestId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/requests/${requestId}`, { method: 'DELETE' });
  }

  nudgeRequest(requestId: string): Promise<FriendRequestSummary> {
    return this.request<FriendRequestSummary>(`/requests/${requestId}/nudge`, { method: 'POST' });
  }

  removeFriend(friendId: string): Promise<unknown> {
    return this.request(`/${friendId}`, { method: 'DELETE' });
  }

  invite(contact: string, method: 'email' | 'sms'): Promise<{ message: string }> {
    return this.request<{ message: string }>('/invite', {
      method: 'POST',
      body: JSON.stringify({ contact, method })
    });
  }
}
