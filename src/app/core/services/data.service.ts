import { Injectable, signal, computed } from '@angular/core';
import { CrushProfile, CrushStatus } from '../models/crush-profile.model';
import { Entry } from '../models/entry.model';
import { getApiBaseUrl } from '../config/api-config';

interface BackendCrush {
  _id: string;
  userId: string;
  nickname: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  status?: string;
  visibility?: string[];
  lastInteraction?: string;
  rating?: number;
  redFlags?: number;
  vibeHistory?: number[];
  category?: string;
  hair?: string[];
  eyes?: string[];
  build?: string[];
  social?: {
    snapchat?: string;
    whatsapp?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  relationshipStatus?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly apiBaseUrl = getApiBaseUrl();
  private readonly tokenStorageKey = 'dexii_api_token';
  private readonly usernameStorageKey = 'dexii_api_username';

  private _allCrushes = signal<CrushProfile[]>([
    {
      id: '1',
      userId: 'me',
      nickname: 'Coffee Shop Cutie',
      fullName: 'Alex Rivera',
      status: CrushStatus.Crush,
      bio: 'Loves oat milk lattes and indie rock. Has a great smile.',
      avatarUrl: 'https://i.pravatar.cc/150?u=alex',
      visibility: [],
      sharedEntries: [],
      lastInteraction: new Date(),
      rating: 4,
      redFlags: 0,
      vibeHistory: [5, 6, 8, 7, 9]
    },
    {
      id: '2',
      userId: 'me',
      nickname: 'Gym Buddy',
      fullName: 'Jordan Smith',
      status: CrushStatus.Dating,
      bio: 'Very consistent, slightly obsessed with protein powder.',
      avatarUrl: 'https://i.pravatar.cc/150?u=jordan',
      visibility: [],
      sharedEntries: [],
      lastInteraction: new Date(Date.now() - 86400000),
      rating: 5,
      redFlags: 1,
      vibeHistory: [8, 9, 9, 10, 10]
    },
    {
      id: '3',
      userId: 'me',
      nickname: 'The Ghost',
      fullName: 'Casey Moore',
      status: CrushStatus.Archived,
      bio: 'Last seen 3 weeks ago. Left me on read.',
      avatarUrl: 'https://i.pravatar.cc/150?u=casey',
      visibility: [],
      sharedEntries: [],
      lastInteraction: new Date(Date.now() - 2592000000),
      rating: 1,
      redFlags: 4,
      vibeHistory: [7, 5, 3, 2, 1]
    }
  ]);

  private _entries = signal<Entry[]>([
    {
      id: 'e1',
      crushId: '1',
      type: 'Note',
      content: 'He remembered my name today!',
      timestamp: new Date(),
      isBurnAfterReading: false,
      visibility: [],
      isSensitive: false
    },
    {
      id: 'e2',
      crushId: '2',
      type: 'SafetyCheck',
      content: 'Safety check active for date at Blue Velvet.',
      timestamp: new Date(),
      visibility: [],
      isSensitive: true,
      safetyContactId: 'friend_99',
      safetyStatus: 'Safe'
    }
  ]);

  constructor() {
    void this.hydrateCrushesFromBackend();
  }

  private toCrushStatus(status?: string): CrushStatus {
    if (status === CrushStatus.Crush || status === CrushStatus.Dating || status === CrushStatus.Exclusive || status === CrushStatus.Archived) {
      return status;
    }
    return CrushStatus.Crush;
  }

  private mapBackendCrush(crush: BackendCrush): CrushProfile {
    return {
      id: crush._id,
      userId: crush.userId,
      nickname: crush.nickname,
      fullName: crush.fullName,
      avatarUrl: crush.avatarUrl,
      bio: crush.bio,
      status: this.toCrushStatus(crush.status),
      visibility: (crush.visibility || []).map(String),
      sharedEntries: [],
      lastInteraction: crush.lastInteraction ? new Date(crush.lastInteraction) : new Date(),
      rating: crush.rating,
      redFlags: crush.redFlags ?? 0,
      vibeHistory: crush.vibeHistory?.length ? crush.vibeHistory : [5],
      category: crush.category,
      hair: crush.hair || [],
      eyes: crush.eyes || [],
      build: crush.build || [],
      social: crush.social,
      relationshipStatus: crush.relationshipStatus
    };
  }

  private getDemoCredentials() {
    const username = localStorage.getItem(this.usernameStorageKey) || 'dexii_demo_user';
    const pin = localStorage.getItem('dexii_pin') || '1111';

    localStorage.setItem(this.usernameStorageKey, username);

    return {
      username,
      pin,
      email: `${username}@dexii.local`
    };
  }

  private getDemoOwner(): string {
    return localStorage.getItem(this.usernameStorageKey) || 'dexii_demo_user';
  }

  private async ensureAuthToken(): Promise<string | null> {
    const existingToken = localStorage.getItem(this.tokenStorageKey);
    if (existingToken) {
      return existingToken;
    }

    const credentials = this.getDemoCredentials();

    try {
      const registerRes = await fetch(`${this.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (registerRes.ok) {
        const data = await registerRes.json() as { token?: string };
        if (data.token) {
          localStorage.setItem(this.tokenStorageKey, data.token);
          return data.token;
        }
      }
    } catch (error) {
      console.warn('Dexii backend register failed, falling back to local state.', error);
      return null;
    }

    try {
      const loginRes = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: credentials.username, pin: credentials.pin })
      });

      if (!loginRes.ok) {
        return null;
      }

      const data = await loginRes.json() as { token?: string };
      if (data.token) {
        localStorage.setItem(this.tokenStorageKey, data.token);
        return data.token;
      }

      return null;
    } catch (error) {
      console.warn('Dexii backend login failed, falling back to local state.', error);
      return null;
    }
  }

  private async authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
    const token = await this.ensureAuthToken();
    if (!token) {
      return null;
    }

    const headers: Record<string, string> = {
      'x-auth-token': token
    };

    if (init.body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      return await fetch(`${this.apiBaseUrl}${path}`, {
        ...init,
        headers: {
          ...headers,
          ...(init.headers as Record<string, string> || {})
        }
      });
    } catch (error) {
      console.warn('Dexii backend request failed, using local state only.', error);
      return null;
    }
  }

  private async demoFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
    try {
      return await fetch(`${this.apiBaseUrl}/demo${path}`, init);
    } catch (error) {
      console.warn('Dexii demo backend request failed, using local state only.', error);
      return null;
    }
  }

  private async hydrateCrushesFromBackend(): Promise<void> {
    let response = await this.authenticatedFetch('/crushes');
    if (!response || !response.ok) {
      const owner = encodeURIComponent(this.getDemoOwner());
      response = await this.demoFetch(`/crushes?owner=${owner}`);
    }

    if (!response || !response.ok) return;

    const crushes = await response.json() as BackendCrush[];
    if (!Array.isArray(crushes) || crushes.length === 0) {
      return;
    }

    this._allCrushes.set(crushes.map((crush) => this.mapBackendCrush(crush)));
  }

  private async persistNewCrush(localId: string, crush: CrushProfile): Promise<void> {
    const payload = {
      nickname: crush.nickname,
      fullName: crush.fullName,
      avatarUrl: crush.avatarUrl,
      bio: crush.bio,
      status: crush.status,
      visibility: crush.visibility,
      lastInteraction: crush.lastInteraction,
      rating: crush.rating,
      redFlags: crush.redFlags,
      vibeHistory: crush.vibeHistory,
      category: crush.category,
      hair: crush.hair,
      eyes: crush.eyes,
      build: crush.build,
      social: crush.social,
      relationshipStatus: crush.relationshipStatus
    };

    let response = await this.authenticatedFetch('/crushes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response || !response.ok) {
      response = await this.demoFetch('/crushes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          owner: this.getDemoOwner()
        })
      });
    }

    if (!response || !response.ok) {
      return;
    }

    const savedCrush = await response.json() as BackendCrush;
    const mapped = this.mapBackendCrush(savedCrush);

    this._allCrushes.update(crushes =>
      crushes.map((existing) => existing.id === localId ? mapped : existing)
    );
  }

  public getEntriesForCrush(crushId: string) {
    return computed(() => this._entries().filter(e => e.crushId === crushId));
  }

  public addEntry(entry: Omit<Entry, 'id' | 'timestamp'>) {
    const newEntry: Entry = {
      ...entry,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    };
    this._entries.update(prev => [newEntry, ...prev]);
  }

  public incrementRedFlag(crushId: string) {
    this._allCrushes.update(crushes => crushes.map(c =>
      c.id === crushId ? { ...c, redFlags: c.redFlags + 1 } : c
    ));
  }

  public updateVibe(crushId: string, score: number) {
    this._allCrushes.update(crushes => crushes.map(c => {
      if (c.id === crushId) {
        const history = [...(c.vibeHistory || [])];
        if (history.length >= 7) history.shift();
        history.push(score);
        return { ...c, vibeHistory: history };
      }
      return c;
    }));
  }

  public addCrush(crush: Omit<CrushProfile, 'id' | 'userId' | 'lastInteraction' | 'vibeHistory' | 'redFlags' | 'sharedEntries'>) {
    const localId = Math.random().toString(36).substring(7);
    const newCrush: CrushProfile = {
      ...crush,
      id: localId,
      userId: 'me',
      lastInteraction: new Date(),
      redFlags: 0,
      vibeHistory: [5],
      sharedEntries: []
    };

    this._allCrushes.update(prev => [newCrush, ...prev]);
    void this.persistNewCrush(localId, newCrush);
  }

  private _currentViewerFriendId = signal<string | null>(null);

  public visibleCrushes = computed(() => {
    const friendId = this._currentViewerFriendId();
    const crushes = this._allCrushes();

    if (!friendId) return crushes;

    return crushes.filter(crush =>
      crush.visibility.includes(friendId)
    );
  });

  setViewer(friendId: string | null): void {
    this._currentViewerFriendId.set(friendId);
  }

  setCrushes(crushes: CrushProfile[]): void {
    this._allCrushes.set(crushes);
  }

  public getAllCrushes() {
    return this._allCrushes;
  }

  public toggleCrushVisibility(crushId: string, friendId: string): void {
    this._allCrushes.update(crushes => crushes.map(c => {
      if (c.id === crushId) {
        const hasFriend = c.visibility.includes(friendId);
        const newVisibility = hasFriend
          ? c.visibility.filter(id => id !== friendId)
          : [...c.visibility, friendId];
        return { ...c, visibility: newVisibility };
      }
      return c;
    }));
  }

  public toggleEntryVisibility(entryId: string, friendId: string): void {
    this._entries.update(entries => entries.map(e => {
      if (e.id === entryId) {
        const hasFriend = e.visibility.includes(friendId);
        const newVisibility = hasFriend
          ? e.visibility.filter(id => id !== friendId)
          : [...e.visibility, friendId];
        return { ...e, visibility: newVisibility };
      }
      return e;
    }));
  }
}
