import { Injectable, inject } from '@angular/core';
import { getApiBaseUrl } from '../config/api-config';
import { SecurityService } from './security.service';
import { Message } from '../models/message.model';

export interface GroupMember {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface GroupChat {
  id: string;
  name: string;
  avatarUrl?: string;
  members: GroupMember[];
}

export interface GroupChatSummary {
  group: GroupChat;
  latestMessage: any | null;
  unreadCount: number;
}

export interface GroupMessage extends Message {
  senderUsername?: string;
  senderAvatarUrl?: string;
  groupId: string;
}

@Injectable({
  providedIn: 'root'
})
export class GroupChatApiService {
  private security = inject(SecurityService);
  private apiBase = getApiBaseUrl();

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.security.authHeaders()
    };
  }

  private mapGroup(raw: any): GroupChat {
    return {
      id: String(raw._id || raw.id),
      name: raw.name,
      avatarUrl: raw.avatarUrl,
      members: Array.isArray(raw.members)
        ? raw.members.map((m: any) => ({
            id: String(m._id || m.id),
            username: m.username,
            avatarUrl: m.avatarUrl
          }))
        : []
    };
  }

  private mapMessage(row: any): GroupMessage {
    const senderId = typeof row.sender === 'object' ? row.sender._id : row.sender;
    return {
      id: String(row._id),
      senderId: String(senderId),
      receiverId: '',
      groupId: String(row.group),
      content: row.content,
      timestamp: row.createdAt ? new Date(row.createdAt) : new Date(),
      relatedCrushId: row.crushId ? String(row.crushId) : undefined,
      senderUsername: typeof row.sender === 'object' ? row.sender.username : undefined,
      senderAvatarUrl: typeof row.sender === 'object' ? row.sender.avatarUrl : undefined,
      reactions: Array.isArray(row.reactions)
        ? row.reactions.map((r: any) => ({ user: String(r.user), emoji: r.emoji }))
        : undefined
    };
  }

  async createGroup(name: string, memberIds: string[]): Promise<GroupChat> {
    const response = await fetch(`${this.apiBase}/groups`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ name, memberIds })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message || 'Could not create the group chat.');
    }
    return this.mapGroup(await response.json());
  }

  async listGroups(): Promise<GroupChatSummary[]> {
    const response = await fetch(`${this.apiBase}/groups`, { headers: this.security.authHeaders() });
    if (!response.ok) return [];
    const rows = await response.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      group: this.mapGroup(row.group),
      latestMessage: row.latestMessage,
      unreadCount: Number.isFinite(row.unreadCount) ? row.unreadCount : 0
    }));
  }

  async getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    const response = await fetch(`${this.apiBase}/groups/${groupId}/messages`, {
      headers: this.security.authHeaders()
    });
    if (!response.ok) return [];
    const rows = await response.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => this.mapMessage(row));
  }

  async sendGroupMessage(groupId: string, content: string, crushId?: string): Promise<GroupMessage> {
    const response = await fetch(`${this.apiBase}/groups/${groupId}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ content, crushId })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message || 'Could not send the message.');
    }
    return this.mapMessage(await response.json());
  }

  async markGroupRead(groupId: string): Promise<void> {
    await fetch(`${this.apiBase}/groups/${groupId}/read`, {
      method: 'PUT',
      headers: this.security.authHeaders()
    });
  }

  async addMember(groupId: string, memberId: string): Promise<GroupChat> {
    const response = await fetch(`${this.apiBase}/groups/${groupId}/members`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ memberId })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message || 'Could not add that friend to the group.');
    }
    return this.mapGroup(await response.json());
  }

  async leaveGroup(groupId: string): Promise<void> {
    await fetch(`${this.apiBase}/groups/${groupId}/members/me`, {
      method: 'DELETE',
      headers: this.security.authHeaders()
    });
  }

  /** Shared reaction endpoint (works for both 1:1 and group messages). */
  async reactToMessage(messageId: string, emoji: string): Promise<GroupMessage | null> {
    const response = await fetch(`${this.apiBase}/messages/${messageId}/react`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ emoji })
    });
    if (!response.ok) return null;
    return this.mapMessage(await response.json());
  }

  mapIncomingMessage(row: any): GroupMessage {
    return this.mapMessage(row);
  }
}
