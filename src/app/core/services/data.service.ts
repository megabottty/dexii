import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { MessagingService } from './messaging.service';
import { AuditService } from './audit.service';
import { CrushProfile, CrushStatus } from '../models/crush-profile.model';
import { Entry } from '../models/entry.model';
import { getApiBaseUrl } from '../config/api-config';
import { ModalService } from './modal.service';
import { SecurityService } from './security.service';

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
  heartbreakSong?: string;
  heartbreakRecovery?: string;
  pronouns?: string;
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

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly apiBaseUrl = getApiBaseUrl();
  private readonly tokenStorageKey = 'dexii_api_token';
  private readonly usernameStorageKey = 'dexii_api_username';
  private readonly entriesStorageKeyPrefix = 'dexii_entries';

  private _allCrushes = signal<CrushProfile[]>([]);
  private _entries = signal<Entry[]>([]);
  private _activeOwner = signal<string>('');
  private modal = inject(ModalService);
  private messaging = inject(MessagingService);
  private audit = inject(AuditService);
  private security = inject(SecurityService);

  constructor() {
    effect(() => {
      const owner = this.security.currentUser() || localStorage.getItem(this.usernameStorageKey) || 'dexii_demo_user';
      if (!owner || owner === this._activeOwner()) return;
      void this.syncUserData(owner);
    }, { allowSignalWrites: true });
  }

  private persistEntries(): void {
    const owner = this._activeOwner();
    const serialized = this._entries().map((entry) => ({
      ...entry,
      timestamp: entry.timestamp.toISOString()
    }));
    localStorage.setItem(this.getEntriesStorageKey(owner), JSON.stringify(serialized));
  }

  private getEntriesStorageKey(owner: string): string {
    return `${this.entriesStorageKeyPrefix}_${owner}`;
  }

  private readEntriesFromStorage(owner: string): Entry[] {
    try {
      const raw = localStorage.getItem(this.getEntriesStorageKey(owner));
      if (!raw) return [];

      const parsed = JSON.parse(raw) as Array<{
        id: string;
        crushId: string;
        type: Entry['type'];
        content: string;
        timestamp: string;
        isBurnAfterReading?: boolean;
        hasViewed?: boolean;
        visibility?: string[];
        isSensitive?: boolean;
        safetyContactId?: string;
        safetyStatus?: Entry['safetyStatus'];
        redFlagCount?: number;
      }>;

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((entry) =>
          typeof entry.id === 'string' &&
          typeof entry.crushId === 'string' &&
          typeof entry.type === 'string' &&
          typeof entry.content === 'string' &&
          typeof entry.timestamp === 'string'
        )
        .map((entry) => ({
          id: entry.id,
          crushId: entry.crushId,
          type: entry.type,
          content: entry.content,
          timestamp: new Date(entry.timestamp),
          isBurnAfterReading: Boolean(entry.isBurnAfterReading),
          hasViewed: Boolean(entry.hasViewed),
          visibility: Array.isArray(entry.visibility) ? entry.visibility.map(String) : [],
          isSensitive: Boolean(entry.isSensitive),
          safetyContactId: entry.safetyContactId,
          safetyStatus: entry.safetyStatus,
          redFlagCount: entry.redFlagCount
        }));
    } catch {
      return [];
    }
  }

  private async syncUserData(owner: string): Promise<void> {
    if (!owner) return;
    if (owner === this._activeOwner()) return;

    this._activeOwner.set(owner);
    this._allCrushes.set([]);
    this._entries.set(this.readEntriesFromStorage(owner));
    await this.hydrateCrushesFromBackend();
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
      relationshipStatus: crush.relationshipStatus,
      heartbreakSong: crush.heartbreakSong,
      heartbreakRecovery: crush.heartbreakRecovery,
      pronouns: crush.pronouns as any,
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

  private getDemoCredentials() {
    const username = localStorage.getItem(this.usernameStorageKey) || 'dexii_demo_user';
    const pin = localStorage.getItem('dexii_pin') || '1111';
    const email = localStorage.getItem('dexii_profile_email') || `${username}@dexii.local`;
    const bio = localStorage.getItem('dexii_profile_bio') || '';

    localStorage.setItem(this.usernameStorageKey, username);

    return {
      username,
      pin,
      email,
      bio
    };
  }

  private getDemoOwner(): string {
    return this._activeOwner() || localStorage.getItem(this.usernameStorageKey) || 'dexii_demo_user';
  }

  private async ensureAuthToken(): Promise<string | null> {
    const existingToken = localStorage.getItem(this.tokenStorageKey);
    if (existingToken) {
      return existingToken;
    }

    const credentials = this.getDemoCredentials();

    // Auto-register/login for demo users is disabled by default.
    // To enable automated demo registration, set localStorage 'dexii_enable_demo_auto_register' = 'true'.
    const allowAutoRegister = localStorage.getItem('dexii_enable_demo_auto_register') === 'true';
    if (!allowAutoRegister) {
      return null;
    }

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

    if (!response || !response.ok) {
      this._allCrushes.set([]);
      return;
    }

    const crushes = await response.json() as BackendCrush[];
    if (!Array.isArray(crushes)) {
      this._allCrushes.set([]);
      return;
    }

    this._allCrushes.set(crushes.map((crush) => this.mapBackendCrush(crush)));
  }

  private async persistNewCrush(localId: string, crush: CrushProfile): Promise<void> {
    try {
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
        relationshipStatus: crush.relationshipStatus,
        heartbreakSong: crush.heartbreakSong,
        heartbreakRecovery: crush.heartbreakRecovery,
        customNotes: crush.customNotes,
        location: crush.location,
        age: crush.age,
        howWeMet: crush.howWeMet,
        whenWeMet: crush.whenWeMet,
        grade: crush.grade,
        occupation: crush.occupation,
        family: crush.family,
        memorableMoments: crush.memorableMoments,
        friends: crush.friends
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
        const errorMsg = response?.status === 413
          ? 'Image too large. Please use a smaller profile picture.'
          : 'Failed to save crush to database.';
        this.modal.show(errorMsg);
        return;
      }

      const savedCrush = await response.json() as BackendCrush;
      const mapped = this.mapBackendCrush(savedCrush);

      this._allCrushes.update(crushes =>
        crushes.map((existing) => existing.id === localId ? mapped : existing)
      );
      this.modal.show('Profile Secured in the Rolodex.');
    } catch (err) {
      console.error('Error persisting new crush:', err);
      this.modal.show('Connection error. Could not save profile.');
    }
  }

  public updateCrush(crush: CrushProfile): void {
    this._allCrushes.update(crushes => crushes.map(c =>
      c.id === crush.id ? crush : c
    ));
    void this.persistCrushUpdate(crush);
  }

  private async persistCrushUpdate(crush: CrushProfile): Promise<void> {
    try {
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
        friends: crush.friends
      };

      let response = await this.authenticatedFetch(`/crushes/${crush.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (!response || !response.ok) {
        response = await this.demoFetch(`/crushes/${crush.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            owner: this.getDemoOwner()
          })
        });
      }

      if (!response || !response.ok) {
        const errorData = await response?.json().catch(() => ({}));
        console.error('Failed to update crush:', response?.status, errorData);
        const errorMsg = response?.status === 413
          ? 'Image too large. Please use a smaller profile picture.'
          : 'Failed to update profile in database.';
        this.modal.show(errorMsg);
        return;
      }

      const savedCrush = await response.json() as BackendCrush;
      const mapped = this.mapBackendCrush(savedCrush);

      this._allCrushes.update(crushes =>
        crushes.map((existing) => existing.id === crush.id ? mapped : existing)
      );
      this.modal.show('Profile updated successfully!');
    } catch (err) {
      console.error('Error persisting crush update:', err);
      this.modal.show('Connection error. Could not update profile.');
    }
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
    this.persistEntries();
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

  public addCrush(crush: Omit<CrushProfile, 'id' | 'userId' | 'lastInteraction' | 'vibeHistory' | 'redFlags' | 'sharedEntries'> & { initialRating?: number }): CrushProfile {
    const localId = Math.random().toString(36).substring(7);
    const { initialRating: passedInitial, ...crushData } = crush as any;
    const startRating = passedInitial ?? crush.rating ?? 3;
    const newCrush: CrushProfile = {
      ...crushData,
      id: localId,
      userId: this.getUserId(),
      lastInteraction: new Date(),
      redFlags: 0,
      initialRating: startRating,
      vibeHistory: [startRating],
      sharedEntries: []
    };

    this._allCrushes.update(prev => [newCrush, ...prev]);
    void this.persistNewCrush(localId, newCrush);
    return newCrush;
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

  public deleteCrush(crushId: string): void {
    this._allCrushes.update(crushes => crushes.filter(c => c.id !== crushId));
  }

  setViewer(friendId: string | null): void {
    this._currentViewerFriendId.set(friendId);
  }

  setCrushes(crushes: CrushProfile[]): void {
    this._allCrushes.set(crushes);
  }

  public getAllCrushes() {
    return this._allCrushes;
  }

  public getUserId(): string {
    return localStorage.getItem(this.usernameStorageKey) || 'dexii_demo_user';
  }

  public isMe(id: string): boolean {
    if (!id) return false;
    const me = this.getUserId();
    const normalizedId = id.toLowerCase().replace(/\s+/g, '_');
    const normalizedMe = me.toLowerCase().replace(/\s+/g, '_');

    // Core check
    if (id === 'me' || id === me || normalizedId === normalizedMe) return true;

    // Heuristic for demo environments: if both contain 'demo', they are likely the same user
    // This handles cases like 'dexii_demo_user' vs 'demo_user' or other variants that might appear
    if (id.includes('demo') && me.includes('demo')) return true;

    return false;
  }

  public isCrushSharedWith(crush: any, friendId: string): boolean {
    if (!crush || !friendId) return false;
    const me = this.getUserId();
    return (crush.visibility || []).some((id: string) =>
      id === friendId ||
      (this.isMe(friendId) && (id === 'me' || id === me)) ||
      id.toLowerCase().replace(/\s+/g, '_') === friendId.toLowerCase().replace(/\s+/g, '_')
    );
  }

  public toggleCrushVisibility(crushId: string, friendId: string): void {
    let justShared = false;
    let sharedCrush: any = null;
    const me = this.getUserId();

    this._allCrushes.update(crushes => crushes.map(c => {
      if (c.id === crushId) {
        sharedCrush = c;
        const hasFriend = this.isCrushSharedWith(c, friendId);
        justShared = !hasFriend;
        const newVisibility = hasFriend
          ? c.visibility.filter(id => !(
              id === friendId ||
              (this.isMe(friendId) && (id === 'me' || id === me)) ||
              id.toLowerCase().replace(/\s+/g, '_') === friendId.toLowerCase().replace(/\s+/g, '_')
            ))
          : [...c.visibility, friendId];

        return { ...c, visibility: newVisibility };
      }
      return c;
    }));

    if (justShared && sharedCrush) {
      this.audit.logEvent(me, friendId, `Shared a crush: ${sharedCrush.nickname}`, crushId);
    } else if (!justShared) {
       // Optional: Log an unshare message or just let it be.
       // The user requested an "unshare toggle", we have it now via visibility filter.
    }

    // Persist change if backend exists
    const finalCrush = this._allCrushes().find(c => c.id === crushId);
    if (finalCrush) {
      void this.persistCrushUpdate(finalCrush);
    }
  }

  public toggleEntryVisibility(entryId: string, friendId: string): void {
    this._entries.update(entries => entries.map(e => {
      if (e.id === entryId) {
        if (e.visibility.includes('public')) {
          return { ...e, visibility: [] };
        }
        const hasFriend = e.visibility.includes(friendId);
        const newVisibility = hasFriend
          ? e.visibility.filter(id => id !== friendId)
          : [...e.visibility, friendId];
        return { ...e, visibility: newVisibility };
      }
      return e;
    }));
    this.persistEntries();
  }
}
