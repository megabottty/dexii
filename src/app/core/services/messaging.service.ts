import { Injectable, signal, effect, inject } from '@angular/core';
import { Message } from '../models/message.model';
import { SecurityService } from './security.service';
import { RealtimeService, IncomingSocketMessage } from './realtime.service';
import { getApiBaseUrl } from '../config/api-config';

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
      relatedCrushId: incoming.crushId
    };

    this._messages.update((msgs) => [...msgs, message]);
    this.persistMessages();
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
          crushId: message.relatedCrushId
        })
      });

      if (!response.ok) return;
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
        messageId: saved?._id ? String(saved._id) : message.id,
        timestamp: message.timestamp.toISOString()
      });
    } catch (err) {
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
          readAt: row.isRead ? new Date(row.updatedAt || row.createdAt || Date.now()) : undefined,
          relatedCrushId: row.crushId ? String(row.crushId) : undefined
        }));

      const serverIds = new Set(mapped.map((m) => m.id));
      this._messages.update((msgs) => [...msgs.filter((m) => !serverIds.has(m.id)), ...mapped]);
      this.persistMessages();
    } catch (err) {
      console.warn('Could not load conversation from the server:', err);
    }
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
  }
}
