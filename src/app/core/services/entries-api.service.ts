import { Injectable, inject } from '@angular/core';
import { getApiBaseUrl } from '../config/api-config';
import { Entry } from '../models/entry.model';
import { SecurityService } from './security.service';

export interface SharedEntryOwner {
  id: string;
  username: string;
  avatarUrl?: string;
}

export type SharedEntry = Entry & {
  owner: SharedEntryOwner;
};

type BackendEntry = Omit<Entry, 'timestamp'> & {
  timestamp: string;
  owner?: SharedEntryOwner;
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
      isSensitive: Boolean(entry.isSensitive)
    };
  }

  private mapSharedEntry(entry: BackendEntry): SharedEntry {
    return {
      ...this.mapEntry(entry),
      owner: {
        id: String(entry.owner?.id || ''),
        username: String(entry.owner?.username || ''),
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

  markViewed(id: string): Promise<Entry> {
    return this.request<BackendEntry>(`/${encodeURIComponent(id)}/viewed`, { method: 'POST' })
      .then((entry) => this.mapEntry(entry));
  }
}
