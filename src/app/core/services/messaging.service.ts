import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { Message } from '../models/message.model';
import { SecurityService } from './security.service';
import { RealtimeService, IncomingSocketMessage } from './realtime.service';
import { getApiBaseUrl } from '../config/api-config';

export interface ChatSummary {
  friend: {
    id: string;
    username: string;
    avatarUrl?: string;
    friendCategories?: string[];
  };
  latestMessage: Message;
  unreadCount: number;
  unreadSelfDestructCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private readonly storageKeyPrefix = 'dexii_messages';
  private security = inject(SecurityService);
  private realtime = inject(RealtimeService);
  private apiBase = getApiBaseUrl();
  private _messages = signal<Message[]>([]);
  public messages = this._messages.asReadonly();
  private activeOwner = '';
  private selfDestructTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private realtimeBound = false;
  private _lastSyncError = signal<string | null>(null);
  public lastSyncError = this._lastSyncError.asReadonly();
  private _latestIncomingMessage = signal<Message | null>(null);
  public latestIncomingMessage = this._latestIncomingMessage.asReadonly();
  private _conversationSummaries = signal<ChatSummary[]>([]);
  public conversationSummaries = this._conversationSummaries.asReadonly();
  public totalUnreadCount = computed(() =>
    this._conversationSummaries().reduce((total, chat) => total + chat.unreadCount, 0)
  );
  public unreadSelfDestructCount = computed(() => {
    const local = this.getUnreadSelfDestructForCurrentUser().length;
    const server = this._conversationSummaries().reduce((total, chat) => total + (chat.unreadSelfDestructCount || 0), 0);
    return Math.max(local, server);
  });
  public unreadTeaCount = computed(() => {
    const localCount = this.getAllUnreadForCurrentUser().length;
    const serverCount = this.totalUnreadCount();
    return Math.max(localCount, serverCount);
  });

  constructor() {
    effect(() => {
      const owner = this.security.currentUser() || localStorage.getItem('dexii_api_username') || 'dexii_demo_user';
      if (!owner || owner === this.activeOwner) return;
      this.selfDestructTimers.forEach((timer) => clearTimeout(timer));
      this.selfDestructTimers.clear();
      this.activeOwner = owner;
      this._messages.set(this.readMessages(owner));
      this.scheduleReadSelfDestructTimers();
    }, { allowSignalWrites: true });

    // Connect the socket once a real backend identity exists.
    effect(() => {
      const userId = this.security.currentUserId();
      if (!userId) return;
      this.realtime.connect(userId);
      this.bindRealtime();
    });
  }

  /** Registers the inbound message listener exactly once. */
  private bindRealtime(): void {
    if (this.realtimeBound) return;
    this.realtimeBound = true;

    this.realtime.onMessage((incoming) => this.ingestRealtimeMessage(incoming));
  }

  private ingestRealtimeMessage(incoming: IncomingSocketMessage): void {
    if (!incoming?.content) return;

    const id = incoming.messageId || `rt_${Math.random().toString(36).substring(2)}`;
    if (this._messages().some((m) => m.id === id)) return;

    const message: Message = {
      id,
      senderId: String(incoming.senderId),
      receiverId: String(incoming.recipientId),
      content: incoming.content,
      timestamp: incoming.timestamp ? new Date(incoming.timestamp) : new Date(),
      relatedCrushId: incoming.crushId,
      isSelfDestruct: Boolean(incoming.isSelfDestruct),
      selfDestructDurationMs: incoming.selfDestructDurationMs
    };

    this._messages.update((msgs) => [...msgs, message]);
    this.persistMessages();
    this._latestIncomingMessage.set(message);
    this._conversationSummaries.set(this.localConversationSummaries());
    void this.loadConversationSummaries();
  }

  private getStorageKey(owner: string): string {
    return `${this.storageKeyPrefix}_${owner}`;
  }

  private readMessages(owner: string): Message[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(owner));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<{
        id: string;
        senderId: string;
        receiverId: string;
        content: string;
        timestamp: string;
        readAt?: string;
        relatedCrushId?: string;
        relatedEntryId?: string;
        isSelfDestruct?: boolean;
        selfDestructDurationMs?: number;
      }>;

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((msg) =>
          typeof msg.id === 'string' &&
          typeof msg.senderId === 'string' &&
          typeof msg.receiverId === 'string' &&
          typeof msg.content === 'string' &&
          typeof msg.timestamp === 'string'
        )
        .map((msg) => ({
          id: msg.id,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          readAt: msg.readAt ? new Date(msg.readAt) : undefined,
          relatedCrushId: msg.relatedCrushId,
          relatedEntryId: msg.relatedEntryId,
          isSelfDestruct: Boolean(msg.isSelfDestruct),
          selfDestructDurationMs: Number.isFinite(msg.selfDestructDurationMs) ? msg.selfDestructDurationMs : undefined
        }));
    } catch {
      return [];
    }
  }

  private clearSelfDestructTimer(messageId: string): void {
    const timer = this.selfDestructTimers.get(messageId);
    if (timer) {
      clearTimeout(timer);
      this.selfDestructTimers.delete(messageId);
    }
  }

  private removeMessage(messageId: string): void {
    this._messages.update((msgs) => msgs.filter((m) => m.id !== messageId));
    this.persistMessages();
    this.clearSelfDestructTimer(messageId);
  }

  private scheduleSelfDestruct(message: Message): void {
    if (!message.isSelfDestruct || !message.readAt) return;

    const durationMs = Number.isFinite(message.selfDestructDurationMs) && (message.selfDestructDurationMs || 0) > 0
      ? (message.selfDestructDurationMs as number)
      : 8000;

    const elapsed = Date.now() - message.readAt.getTime();
    const remaining = Math.max(0, durationMs - elapsed);

    this.clearSelfDestructTimer(message.id);
    if (remaining === 0) {
      this.removeMessage(message.id);
      return;
    }

    const timer = setTimeout(() => {
      this.removeMessage(message.id);
    }, remaining);

    this.selfDestructTimers.set(message.id, timer);
  }

  private scheduleReadSelfDestructTimers(): void {
    this._messages()
      .filter((message) => message.isSelfDestruct && message.readAt)
      .forEach((message) => this.scheduleSelfDestruct(message));
  }

  private persistMessages(): void {
    const owner = this.activeOwner || this.security.currentUser() || localStorage.getItem('dexii_api_username') || 'dexii_demo_user';
    const serialized = this._messages().map((msg) => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
      readAt: msg.readAt ? msg.readAt.toISOString() : undefined
    }));
    localStorage.setItem(this.getStorageKey(owner), JSON.stringify(serialized));
  }

  sendMessage(message: Omit<Message, 'id' | 'timestamp'>): void {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substring(2),
      timestamp: new Date()
    };
    this._messages.update(msgs => [...msgs, newMessage]);
    this.persistMessages();
    void this.pushToServer(newMessage);
  }

  /**
   * Mirrors a sent message to the backend and notifies the recipient in real time.
   * Failures are non-fatal: the message is already stored locally.
   */
  private async pushToServer(message: Message): Promise<void> {
    const senderId = this.security.currentUserId();
    if (!senderId || !message.receiverId) return;
    this._lastSyncError.set(null);

    try {
      const response = await fetch(`${this.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.security.authHeaders()
        },
        body: JSON.stringify({
          recipientId: message.receiverId,
          content: message.content,
          crushId: message.relatedCrushId,
          isSelfDestruct: message.isSelfDestruct,
          selfDestructDurationMs: message.selfDestructDurationMs
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || errorBody?.msg || `Message sync failed (${response.status})`);
      }
      const saved = await response.json();

      // Re-key the local copy to the server id so it dedupes against echoes.
      if (saved?._id) {
        const serverId = String(saved._id);
        this._messages.update(msgs => msgs.map(m => (m.id === message.id ? { ...m, id: serverId } : m)));
        this.persistMessages();
      }

      this.realtime.emitMessage({
        senderId,
        recipientId: message.receiverId,
        content: message.content,
        crushId: message.relatedCrushId,
        isSelfDestruct: message.isSelfDestruct,
        selfDestructDurationMs: message.selfDestructDurationMs,
        messageId: saved?._id ? String(saved._id) : message.id,
        timestamp: message.timestamp.toISOString()
      });
      void this.loadConversationSummaries();
    } catch (err) {
      this._lastSyncError.set(err instanceof Error ? err.message : 'Message could not be synced to the server.');
      console.warn('Message could not be synced to the server:', err);
    }
  }

  /** Loads a conversation from the backend and merges it into local state. */
  async loadConversation(friendId: string): Promise<void> {
    const selfId = this.security.currentUserId();
    if (!selfId || !friendId) return;

    try {
      const response = await fetch(`${this.apiBase}/messages/${friendId}`, {
        headers: this.security.authHeaders()
      });
      if (!response.ok) return;

      const rows = await response.json();
      if (!Array.isArray(rows)) return;

      const mapped: Message[] = rows
        .filter((row) => row && row.content)
        .map((row) => ({
          id: String(row._id),
          senderId: String(row.sender),
          receiverId: String(row.recipient),
          content: row.content,
          timestamp: row.createdAt ? new Date(row.createdAt) : new Date(),
          readAt: row.readAt ? new Date(row.readAt) : row.isRead ? new Date(row.updatedAt || row.createdAt || Date.now()) : undefined,
          relatedCrushId: row.crushId ? String(row.crushId) : undefined,
          isSelfDestruct: Boolean(row.isSelfDestruct),
          selfDestructDurationMs: Number.isFinite(row.selfDestructDurationMs) ? row.selfDestructDurationMs : undefined
        }));

      const serverIds = new Set(mapped.map((m) => m.id));
      this._messages.update((msgs) => [...msgs.filter((m) => !serverIds.has(m.id)), ...mapped]);
      this.persistMessages();
      void this.loadConversationSummaries();
    } catch (err) {
      console.warn('Could not load conversation from the server:', err);
    }
  }

  async loadConversationSummaries(): Promise<void> {
    const selfId = this.security.currentUserId();
    if (!selfId) {
      this._conversationSummaries.set(this.localConversationSummaries());
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/messages/conversations`, {
        headers: this.security.authHeaders()
      });
      if (!response.ok) {
        this._conversationSummaries.set(this.localConversationSummaries());
        return;
      }

      const rows = await response.json();
      if (!Array.isArray(rows)) {
        this._conversationSummaries.set(this.localConversationSummaries());
        return;
      }

      this._conversationSummaries.set(rows
        .filter((row) => row?.friend?.id && row?.latestMessage?.content)
        .map((row) => ({
          friend: {
            id: String(row.friend.id),
            username: String(row.friend.username || row.friend.id),
            avatarUrl: row.friend.avatarUrl,
            friendCategories: Array.isArray(row.friend.friendCategories) ? row.friend.friendCategories : []
          },
          latestMessage: this.mapServerMessage(row.latestMessage),
          unreadCount: Number.isFinite(row.unreadCount) ? row.unreadCount : 0,
          unreadSelfDestructCount: Number.isFinite(row.unreadSelfDestructCount) ? row.unreadSelfDestructCount : 0
        })));
    } catch (err) {
      console.warn('Could not load chat list from the server:', err);
      this._conversationSummaries.set(this.localConversationSummaries());
    }
  }

  private mapServerMessage(row: any): Message {
    return {
      id: String(row._id),
      senderId: String(row.sender),
      receiverId: String(row.recipient),
      content: row.content,
      timestamp: row.createdAt ? new Date(row.createdAt) : new Date(),
      readAt: row.readAt ? new Date(row.readAt) : row.isRead ? new Date(row.updatedAt || row.createdAt || Date.now()) : undefined,
      relatedCrushId: row.crushId ? String(row.crushId) : undefined,
      isSelfDestruct: Boolean(row.isSelfDestruct),
      selfDestructDurationMs: Number.isFinite(row.selfDestructDurationMs) ? row.selfDestructDurationMs : undefined
    };
  }

  private localConversationSummaries(): ChatSummary[] {
    const selfId = this.security.currentUserId() || 'me';
    const latestByFriend = new Map<string, Message>();
    const unreadByFriend = new Map<string, number>();
    const unreadSelfDestructByFriend = new Map<string, number>();

    for (const message of this._messages()) {
      const friendId = message.senderId === selfId ? message.receiverId : message.receiverId === selfId ? message.senderId : '';
      if (!friendId) continue;

      const current = latestByFriend.get(friendId);
      if (!current || message.timestamp.getTime() > current.timestamp.getTime()) {
        latestByFriend.set(friendId, message);
      }
      if (message.receiverId === selfId && !message.readAt) {
        unreadByFriend.set(friendId, (unreadByFriend.get(friendId) || 0) + 1);
        if (message.isSelfDestruct) {
          unreadSelfDestructByFriend.set(friendId, (unreadSelfDestructByFriend.get(friendId) || 0) + 1);
        }
      }
    }

    return Array.from(latestByFriend.entries())
      .map(([friendId, latestMessage]) => ({
        friend: { id: friendId, username: friendId },
        latestMessage,
        unreadCount: unreadByFriend.get(friendId) || 0,
        unreadSelfDestructCount: unreadSelfDestructByFriend.get(friendId) || 0
      }))
      .sort((a, b) => b.latestMessage.timestamp.getTime() - a.latestMessage.timestamp.getTime());
  }

  markAsRead(messageId: string): void {
    this._messages.update(msgs => msgs.map(m => {
      if (m.id !== messageId) return m;
      const updated = m.readAt ? m : { ...m, readAt: new Date() };
      if (updated.isSelfDestruct) {
        queueMicrotask(() => this.scheduleSelfDestruct(updated));
      }
      return updated;
    }));
    this.persistMessages();
  }

  getAllUnreadForCurrentUser(): Message[] {
    const currentId = this.security.currentUserId() || '';
    const currentUsername = this.security.currentUser() || '';
    const ids = new Set([currentId, currentUsername, 'me'].filter(Boolean));

    return this._messages()
      .filter((m) => ids.has(m.receiverId) && !m.readAt)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getUnreadSelfDestructForCurrentUser(): Message[] {
    return this.getAllUnreadForCurrentUser().filter((m) => m.isSelfDestruct);
  }

  getLatestUnreadForCurrentUser(): Message | null {
    const unread = this.getAllUnreadForCurrentUser();
    return unread.length > 0 ? unread[0] : null;
  }

  markAllUnreadForCurrentUserAsRead(): void {
    const currentId = this.security.currentUserId() || '';
    const currentUsername = this.security.currentUser() || '';
    const ids = new Set([currentId, currentUsername, 'me'].filter(Boolean));

    const updatedMessages: Message[] = [];
    this._messages.update(msgs =>
      msgs.map(m => {
        if (ids.has(m.receiverId) && !m.readAt) {
          const updated = { ...m, readAt: new Date() };
          updatedMessages.push(updated);
          return updated;
        }
        return m;
      })
    );
    this.persistMessages();
    updatedMessages.filter((m) => m.isSelfDestruct).forEach((m) => this.scheduleSelfDestruct(m));
  }

  getConversation(userId1: string, userId2: string): Message[] {
    return this._messages().filter(m =>
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getUnreadForUser(userId: string): Message[] {
    return this._messages()
      .filter(m => m.receiverId === userId && !m.readAt)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getLatestUnreadForUser(userId: string): Message | null {
    const unread = this.getUnreadForUser(userId);
    return unread.length > 0 ? unread[0] : null;
  }

  markUnreadForUserAsRead(userId: string): void {
    const updatedMessages: Message[] = [];
    this._messages.update(msgs =>
      msgs.map(m => {
        if (m.receiverId === userId && !m.readAt) {
          const updated = { ...m, readAt: new Date() };
          updatedMessages.push(updated);
          return updated;
        }
        return m;
      })
    );
    this.persistMessages();
    updatedMessages.filter((m) => m.isSelfDestruct).forEach((m) => this.scheduleSelfDestruct(m));
  }

  markConversationAsRead(userId: string, friendId: string): void {
    const updatedMessages: Message[] = [];
    this._messages.update(msgs =>
      msgs.map(m => {
        if (m.senderId === friendId && m.receiverId === userId && !m.readAt) {
          const updated = { ...m, readAt: new Date() };
          updatedMessages.push(updated);
          return updated;
        }
        return m;
      })
    );
    this.persistMessages();
    updatedMessages.filter((m) => m.isSelfDestruct).forEach((m) => this.scheduleSelfDestruct(m));
    if (updatedMessages.length > 0) {
      void this.markServerConversationAsRead(friendId);
    }
  }

  private async markServerConversationAsRead(friendId: string): Promise<void> {
    const selfId = this.security.currentUserId();
    if (!selfId || !friendId) return;

    try {
      const response = await fetch(`${this.apiBase}/messages/read/${friendId}`, {
        method: 'PUT',
        headers: this.security.authHeaders()
      });
      if (!response.ok) {
        throw new Error(`Read-state sync failed (${response.status})`);
      }
    } catch (err) {
      console.warn('Could not sync read status to the server:', err);
    }
  }
}
