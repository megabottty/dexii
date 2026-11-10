import { Injectable, inject } from '@angular/core';
import { getApiBaseUrl } from '../config/api-config';
import { SecurityService } from './security.service';

export interface SuperAdminSummary {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  /** Set by server configuration; cannot be removed from the app. */
  seeded: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private security = inject(SecurityService);
  private apiBase = `${getApiBaseUrl()}/admin`;

  listSuperAdmins(): Promise<SuperAdminSummary[]> {
    return this.request<SuperAdminSummary[]>('/super-admins');
  }

  addSuperAdmin(username: string): Promise<SuperAdminSummary> {
    return this.request<SuperAdminSummary>('/super-admins', { method: 'POST', body: { username } });
  }

  removeSuperAdmin(username: string): Promise<void> {
    return this.request<void>(`/super-admins/${encodeURIComponent(username)}`, { method: 'DELETE' });
  }

  /** "How our features work" (server/docs/features.md), super admins only. */
  getFeatureDocs(): Promise<{ markdown: string; updatedAt?: string }> {
    return this.request<{ markdown: string; updatedAt?: string }>('/docs/features');
  }

  private async request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const response = await fetch(`${this.apiBase}${path}`, {
      method: init.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...this.security.authHeaders() },
      body: init.body === undefined ? undefined : JSON.stringify(init.body)
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
    return data as T;
  }
}
