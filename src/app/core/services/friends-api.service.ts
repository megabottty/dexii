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

export interface InviteResponse {
  status: string;
  /** 'sent' = delivered by the server, 'handoff' = client must open the SMS app, 'debug' = no provider configured. */
  delivery: 'sent' | 'handoff' | 'debug';
  smsUrl?: string;
  inviteUrl: string;
  contact: string;
  method: 'email' | 'sms';
  message: string;
  alreadyRegistered?: boolean;
  user?: FriendSummary;
}

export interface InviteLookup {
  token: string;
  method: 'email' | 'sms';
  message?: string;
  invitedBy?: FriendSummary;
  inviterName: string;
  expiresAt?: string;
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
      let body: any = null;
      try {
        body = await response.json();
        message = body?.message || body?.msg || message;
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      const error = new Error(message) as Error & { status?: number; body?: any; alreadyRegistered?: boolean; user?: FriendSummary };
      error.status = response.status;
      error.body = body;
      if (body?.alreadyRegistered) {
        error.alreadyRegistered = true;
        error.user = body.user;
      }
      throw error;
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

  invite(contact: string, method: 'email' | 'sms', message = ''): Promise<InviteResponse> {
    return this.request<InviteResponse>('/invite', {
      method: 'POST',
      body: JSON.stringify({ contact, method, message })
    });
  }

  /** Public lookup so signup can show who invited you. */
  async lookupInvite(token: string): Promise<InviteLookup | null> {
    try {
      const response = await fetch(`${this.apiBase}/friends/invite/${encodeURIComponent(token)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}
