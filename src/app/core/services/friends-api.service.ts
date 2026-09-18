import { Injectable, inject } from '@angular/core';
import { getApiBaseUrl } from '../config/api-config';
import { CrushProfile, CrushStatus } from '../models/crush-profile.model';
import { SecurityService } from './security.service';

export type FriendRelationship = 'none' | 'friends' | 'request_sent' | 'request_received';

export interface FriendSearchResult {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  email?: string;
  phoneE164?: string;
  subscriptionTier?: string;
  relationship: FriendRelationship;
}

export interface FriendSummary {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  friendCategories?: string[];
}

interface BackendCrushProfile {
  _id: string;
  userId: string;
  nickname: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  status?: string;
  visibility?: string[];
  sharedEntries?: string[];
  lastInteraction?: string;
  rating?: number;
  redFlags?: number;
  redFlagReason?: string;
  vibeHistory?: number[];
  category?: string;
  hair?: string[];
  eyes?: string[];
  build?: string[];
  social?: CrushProfile['social'];
  relationshipStatus?: string;
  heartbreakSong?: string;
  heartbreakRecovery?: string;
  pronouns?: CrushProfile['pronouns'];
  customNotes?: string;
  location?: string;
  age?: number;
  howWeMet?: string;
  whenWeMet?: string;
  grade?: string;
  occupation?: string;
  family?: string;
  memorableMoments?: string;
  friends?: string[];
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
  inviterName: string;
  invitedEmail?: string;
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

  private async request<T>(path: string, init: RequestInit = {}, resource: 'friends' | 'crushes' = 'friends'): Promise<T> {
    const response = await fetch(`${this.apiBase}/${resource}${path}`, {
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

  private toCrushStatus(status?: string): CrushStatus {
    switch (status) {
      case CrushStatus.Crush:
      case CrushStatus.Crushing:
      case CrushStatus.Dating:
      case CrushStatus.Exclusive:
      case CrushStatus.BrokenUp:
      case CrushStatus.Heartbroken:
      case CrushStatus.Archived:
      case CrushStatus.Friend:
        return status;
      default:
        return CrushStatus.Crush;
    }
  }

  private mapCrush(crush: BackendCrushProfile): CrushProfile {
    return {
      id: crush._id,
      userId: crush.userId,
      nickname: crush.nickname,
      fullName: crush.fullName,
      avatarUrl: crush.avatarUrl,
      bio: crush.bio,
      status: this.toCrushStatus(crush.status),
      visibility: Array.isArray(crush.visibility) ? crush.visibility.map(String) : [],
      sharedEntries: Array.isArray(crush.sharedEntries) ? crush.sharedEntries.map(String) : [],
      lastInteraction: crush.lastInteraction ? new Date(crush.lastInteraction) : new Date(),
      rating: crush.rating,
      redFlags: typeof crush.redFlags === 'number' ? crush.redFlags : 0,
      redFlagReason: crush.redFlagReason,
      vibeHistory: Array.isArray(crush.vibeHistory) && crush.vibeHistory.length ? crush.vibeHistory : [5],
      category: crush.category,
      hair: crush.hair || [],
      eyes: crush.eyes || [],
      build: crush.build || [],
      social: crush.social,
      relationshipStatus: crush.relationshipStatus,
      heartbreakSong: crush.heartbreakSong,
      heartbreakRecovery: crush.heartbreakRecovery,
      pronouns: crush.pronouns,
      customNotes: crush.customNotes,
      location: crush.location,
      age: crush.age,
      howWeMet: crush.howWeMet,
      whenWeMet: crush.whenWeMet,
      grade: crush.grade,
      occupation: crush.occupation,
      family: crush.family,
      memorableMoments: crush.memorableMoments,
      friends: crush.friends || []
    };
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

  async getFriendSharedCrushes(friendId: string): Promise<CrushProfile[]> {
    const crushes = await this.request<BackendCrushProfile[]>(
      `/friend/${encodeURIComponent(friendId)}`,
      {},
      'crushes'
    );
    return Array.isArray(crushes) ? crushes.map((crush) => this.mapCrush(crush)) : [];
  }

  /**
   * Fetches a single crush that belongs to a friend and has been shared with the
   * current user (e.g. via a "friend shared a new crush" notification deep-link).
   * Returns null if the crush doesn't exist, isn't shared with the caller, or the
   * caller isn't friends with its owner.
   */
  async getSharedCrush(crushId: string): Promise<{ crush: CrushProfile; ownerName: string | null } | null> {
    try {
      const result = await this.request<{ crush: BackendCrushProfile; owner: { id: string; username: string; firstName?: string; lastName?: string } | null }>(
        `/shared/${encodeURIComponent(crushId)}`,
        {},
        'crushes'
      );
      if (!result?.crush) return null;
      const ownerName = result.owner
        ? ([result.owner.firstName, result.owner.lastName].filter(Boolean).join(' ') || result.owner.username || null)
        : null;
      return { crush: this.mapCrush(result.crush), ownerName };
    } catch {
      return null;
    }
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
