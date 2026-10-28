import { Injectable, inject } from '@angular/core';
import { getApiBaseUrl } from '../config/api-config';
import { Entry, UpdateComment, UpdateReaction } from '../models/entry.model';
import { SecurityService } from './security.service';

export interface SharedEntryOwner {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export type SharedEntry = Entry & {
  owner: SharedEntryOwner;
};

type BackendComment = Omit<UpdateComment, 'createdAt' | 'editedAt'> & { createdAt: string; editedAt?: string };
type BackendReaction = Omit<UpdateReaction, 'at'> & { at?: string };

type BackendEntry = Omit<Entry, 'timestamp' | 'editHistory' | 'editedAt' | 'comments' | 'reactions'> & {
  comments?: BackendComment[];
  reactions?: BackendReaction[];
  timestamp: string;
  owner?: SharedEntryOwner;
  editHistory?: { previousContent: string; editedAt: string }[];
  editedAt?: string;
};

@Injectable({
  providedIn: 'root'
})
export class EntriesApiService {
  private security = inject(SecurityService);
  private apiBase = getApiBaseUrl();

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.apiBase}/entries${path}`, {
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
        const body = await response.json() as { message?: string; msg?: string };
        message = body?.message || body?.msg || message;
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new Error(message);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  private mapEntry(entry: BackendEntry): Entry {
    return {
      ...entry,
      timestamp: new Date(entry.timestamp),
      visibility: Array.isArray(entry.visibility) ? entry.visibility.map(String) : [],
      isBurnAfterReading: Boolean(entry.isBurnAfterReading),
      hasViewed: Boolean(entry.hasViewed),
      isSensitive: Boolean(entry.isSensitive),
      editHistory: Array.isArray(entry.editHistory)
        ? entry.editHistory.map((item) => ({
            previousContent: item.previousContent,
            editedAt: new Date(item.editedAt)
          }))
        : [],
      editedAt: entry.editedAt ? new Date(entry.editedAt) : undefined,
      reactions: Array.isArray(entry.reactions)
        ? entry.reactions.map((reaction) => ({ ...reaction, at: reaction.at ? new Date(reaction.at) : undefined }))
        : [],
      comments: Array.isArray(entry.comments)
        ? entry.comments.map((comment) => ({
            ...comment,
            hearts: Array.isArray(comment.hearts) ? comment.hearts.map(String) : [],
            createdAt: new Date(comment.createdAt),
            editedAt: comment.editedAt ? new Date(comment.editedAt) : undefined
          }))
        : []
    };
  }

  private mapSharedEntry(entry: BackendEntry): SharedEntry {
    return {
      ...this.mapEntry(entry),
      owner: {
        id: String(entry.owner?.id || ''),
        username: String(entry.owner?.username || ''),
        displayName: typeof entry.owner?.displayName === 'string' ? entry.owner.displayName : '',
        avatarUrl: entry.owner?.avatarUrl
      }
    };
  }

  isAuthenticated(): boolean {
    return !!this.security.currentUserId();
  }

  async list(crushId?: string): Promise<Entry[]> {
    const query = crushId ? `?crushId=${encodeURIComponent(crushId)}` : '';
    const entries = await this.request<BackendEntry[]>(query);
    return entries.map((entry) => this.mapEntry(entry));
  }

  async listShared(): Promise<SharedEntry[]> {
    const entries = await this.request<BackendEntry[]>('/shared');
    return entries.map((entry) => this.mapSharedEntry(entry));
  }

  async create(entry: Omit<Entry, 'id'>): Promise<Entry> {
    const saved = await this.request<BackendEntry>('', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
    return this.mapEntry(saved);
  }

  async update(entry: Entry): Promise<Entry> {
    const { id, ...payload } = entry;
    const saved = await this.request<BackendEntry>(`/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return this.mapEntry(saved);
  }

  delete(id: string): Promise<unknown> {
    return this.request(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // ---- Reactions, comments and comment hearts on Updates For Friends (DEX-45) ----

  /** Sets your reaction; sending the same emoji again removes it. Resolves with the updated entry. */
  react(id: string, emoji: string): Promise<Entry> {
    return this.activity(`/${encodeURIComponent(id)}/reactions`, 'POST', { emoji });
  }

  addComment(id: string, content: string): Promise<Entry> {
    return this.activity(`/${encodeURIComponent(id)}/comments`, 'POST', { content });
  }

  editComment(id: string, commentId: string, content: string): Promise<Entry> {
    return this.activity(`/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`, 'PUT', { content });
  }

  deleteComment(id: string, commentId: string): Promise<Entry> {
    return this.activity(`/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`, 'DELETE');
  }

  heartComment(id: string, commentId: string): Promise<Entry> {
    return this.activity(`/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}/heart`, 'POST');
  }

  private async activity(path: string, method: string, body?: unknown): Promise<Entry> {
    const entry = await this.request<BackendEntry>(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
    return this.mapEntry(entry);
  }

  markViewed(id: string): Promise<Entry> {
    return this.request<BackendEntry>(`/${encodeURIComponent(id)}/viewed`, { method: 'POST' })
      .then((entry) => this.mapEntry(entry));
  }
}
