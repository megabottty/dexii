import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { MessagingService } from './messaging.service';
import { AuditService } from './audit.service';
import { CrushProfile, CrushStatus } from '../models/crush-profile.model';
import { Entry } from '../models/entry.model';
import { getApiBaseUrl } from '../config/api-config';
import { ModalService } from './modal.service';
import { SecurityService } from './security.service';
import { EntriesApiService, SharedEntry } from './entries-api.service';
import { ThemeService } from './theme.service';

interface BackendCrush {
  _id: string;
  userId: string;
  nickname: string;
  fullName?: string;
  displayName?: 'nickname' | 'fullName';
  avatarUrl?: string;
  bio?: string;
  status?: string;
  visibility?: string[];
  redFlagReason?: string;
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
  relationshipLabels?: string[];
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
  sortOrder?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly apiBaseUrl = getApiBaseUrl();
  private readonly tokenStorageKey = 'dexii_api_token';
  private readonly usernameStorageKey = 'dexii_api_username';
  private readonly entriesStorageKeyPrefix = 'dexii_entries';
  private readonly entriesMigrationStorageKeyPrefix = 'dexii_entries_migrated';

  private _allCrushes = signal<CrushProfile[]>([]);
  private _entries = signal<Entry[]>([]);
  private _sharedEntries = signal<SharedEntry[]>([]);
  private _activeOwner = signal<string>('');
  private modal = inject(ModalService);
  private messaging = inject(MessagingService);
  private audit = inject(AuditService);
  private security = inject(SecurityService);
  private entriesApi = inject(EntriesApiService);
  private theme = inject(ThemeService);

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

  private getEntriesMigrationStorageKey(owner: string): string {
    const userId = this.security.currentUserId() || owner;
    return `${this.entriesMigrationStorageKeyPrefix}_${userId}`;
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

  private entryFingerprint(entry: Entry): string {
    return JSON.stringify({
      crushId: entry.crushId,
      type: entry.type,
      content: entry.content,
      timestamp: entry.timestamp.toISOString(),
      isBurnAfterReading: Boolean(entry.isBurnAfterReading),
      hasViewed: Boolean(entry.hasViewed),
      visibility: [...(entry.visibility || [])].map(String).sort(),
      isSensitive: Boolean(entry.isSensitive),
      safetyContactId: entry.safetyContactId || '',
      safetyStatus: entry.safetyStatus || '',
      redFlagCount: entry.redFlagCount ?? null
    });
  }

  private mergeLocalOnlyEntries(
    serverEntries: Entry[],
    localEntries: Entry[],
    migratedLocalIds = new Set<string>()
  ): Entry[] {
    const serverIds = new Set(serverEntries.map((entry) => entry.id));
    const serverFingerprints = new Set(serverEntries.map((entry) => this.entryFingerprint(entry)));
    const localOnly = localEntries.filter((entry) =>
      !migratedLocalIds.has(entry.id) &&
      !serverIds.has(entry.id) && !serverFingerprints.has(this.entryFingerprint(entry))
    );

    return [...serverEntries, ...localOnly].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  private async migrateLocalEntries(
    owner: string,
    localEntries: Entry[],
    serverEntries: Entry[]
  ): Promise<{ entries: Entry[]; complete: boolean }> {
    if (!localEntries.length) {
      localStorage.setItem(this.getEntriesMigrationStorageKey(owner), new Date().toISOString());
      return { entries: serverEntries, complete: true };
    }

    const migrationKey = this.getEntriesMigrationStorageKey(owner);
    if (localStorage.getItem(migrationKey)) {
      return { entries: this.mergeLocalOnlyEntries(serverEntries, localEntries), complete: true };
    }

    const mergedEntries = [...serverEntries];
    const migratedLocalIds = new Set<string>();
    let complete = true;

    for (const localEntry of localEntries) {
      const hasServerCounterpart = mergedEntries.some((serverEntry) =>
        serverEntry.id === localEntry.id ||
        this.entryFingerprint(serverEntry) === this.entryFingerprint(localEntry)
      );

      if (hasServerCounterpart) {
        continue;
      }

      try {
        const { id: localId, ...payload } = localEntry;
        const savedEntry = await this.entriesApi.create(payload);
        migratedLocalIds.add(localId);
        mergedEntries.unshift(savedEntry);
      } catch (error) {
        complete = false;
        console.warn('Dexii entry migration failed for a local entry; keeping it local.', error);
      }
    }

    const entries = this.mergeLocalOnlyEntries(mergedEntries, localEntries, migratedLocalIds);
    if (complete) {
      localStorage.setItem(migrationKey, new Date().toISOString());
    }

    return { entries, complete };
  }

  private async hydrateEntriesFromBackend(owner: string, localEntries: Entry[]): Promise<void> {
    if (!this.entriesApi.isAuthenticated()) {
      return;
    }

    try {
      const serverEntries = await this.entriesApi.list();
      const { entries } = await this.migrateLocalEntries(owner, localEntries, serverEntries);
      this._entries.set(entries);
      this.persistEntries();
    } catch (error) {
      console.warn('Dexii entries sync failed, keeping local entries.', error);
    }

    try {
      this._sharedEntries.set(await this.entriesApi.listShared());
    } catch (error) {
      console.warn('Dexii shared entries sync failed.', error);
    }
  }

  private async syncUserData(owner: string): Promise<void> {
    if (!owner) return;
    if (owner === this._activeOwner()) return;

    this._activeOwner.set(owner);
    this._allCrushes.set([]);
    this._sharedEntries.set([]);
    const localEntries = this.readEntriesFromStorage(owner);
    this._entries.set(localEntries);
    await this.hydrateEntriesFromBackend(owner, localEntries);
    await this.hydrateCrushesFromBackend();
    void this.theme.hydrateFromBackend(owner);
  }

  private toCrushStatus(status?: string): CrushStatus {
    if (
      status === CrushStatus.Crush ||
      status === CrushStatus.Crushing ||
      status === CrushStatus.Dating ||
      status === CrushStatus.Exclusive ||
      status === CrushStatus.BrokenUp ||
      status === CrushStatus.Heartbroken ||
      status === CrushStatus.Archived ||
      status === CrushStatus.Friend
    ) {
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
      displayName: crush.displayName || 'nickname',
      avatarUrl: crush.avatarUrl,
      bio: crush.bio,
      status: this.toCrushStatus(crush.status),
      visibility: (crush.visibility || []).map(String),
      sharedEntries: [],
      lastInteraction: crush.lastInteraction ? new Date(crush.lastInteraction) : new Date(),
      rating: crush.rating,
      redFlags: crush.redFlags && crush.redFlags > 0 ? 1 : 0,
      redFlagReason: crush.redFlagReason || '',
      vibeHistory: crush.vibeHistory?.length ? crush.vibeHistory : [5],
      category: crush.category,
      hair: crush.hair || [],
      eyes: crush.eyes || [],
      build: crush.build || [],
      social: crush.social,
      relationshipStatus: crush.relationshipStatus,
      relationshipLabels: crush.relationshipLabels || [],
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
      friends: crush.friends || [],
      sortOrder: crush.sortOrder ?? 0
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
    // Only fall back to the separate demo data store when there was no
    // authenticated request at all (no token / network failure - see
    // authenticatedFetch). Falling back here whenever the authenticated call
    // merely returned a non-ok status (401/404/500) would silently swap a
    // logged-in user onto stale demo data, which is exactly what caused
    // deleted/old crushes to reappear after a transient backend hiccup.
    if (!response) {
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
        redFlagReason: crush.redFlagReason,
        vibeHistory: crush.vibeHistory,
        category: crush.category,
        hair: crush.hair,
        eyes: crush.eyes,
        build: crush.build,
        social: crush.social,
        relationshipStatus: crush.relationshipStatus,
        relationshipLabels: crush.relationshipLabels || [],
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
        friends: crush.friends,
        sortOrder: crush.sortOrder
      };

      let response = await this.authenticatedFetch('/crushes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Only retry against the demo store when there was no authenticated
      // request at all (no token / network failure) - not on a real but
      // failed authenticated response, which should surface as an error
      // instead of silently writing to a different data store.
      if (!response) {
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

  private async persistCrushUpdate(crush: CrushProfile, silent = false): Promise<void> {
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
        redFlagReason: crush.redFlagReason,
        vibeHistory: crush.vibeHistory,
        category: crush.category,
        hair: crush.hair,
        eyes: crush.eyes,
        build: crush.build,
        social: crush.social,
        relationshipStatus: crush.relationshipStatus,
        relationshipLabels: crush.relationshipLabels || [],
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
        friends: crush.friends,
        sortOrder: crush.sortOrder
      };

      let response = await this.authenticatedFetch(`/crushes/${crush.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      // Only retry against the demo store when there was no authenticated
      // request at all (no token / network failure) - see hydrateCrushesFromBackend.
      if (!response) {
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
      if (!silent) {
        this.modal.show('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error persisting crush update:', err);
      this.modal.show('Connection error. Could not update profile.');
    }
  }

  public getEntriesForCrush(crushId: string) {
    return computed(() => this._entries().filter(e => e.crushId === crushId));
  }

  public getSharedEntries() {
    return this._sharedEntries.asReadonly();
  }

  /** Forces a fresh fetch of entries friends have shared with me (e.g. when opening the Feed page). */
  public async refreshSharedEntries(): Promise<void> {
    if (!this.entriesApi.isAuthenticated()) {
      return;
    }
    try {
      this._sharedEntries.set(await this.entriesApi.listShared());
    } catch (error) {
      console.warn('Dexii shared entries refresh failed.', error);
    }
  }

  public addEntry(entry: Omit<Entry, 'id' | 'timestamp'>) {
    const newEntry: Entry = {
      ...entry,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    };
    this._entries.update(prev => [newEntry, ...prev]);
    this.persistEntries();
    void this.persistNewEntry(newEntry);
  }

  /**
   * Edits an existing entry's content in place. The backend automatically
   * archives the prior content into `editHistory` (with a timestamp)
   * whenever the content actually changes, so callers just pass the new text.
   */
  public async updateEntryContent(entryId: string, newContent: string): Promise<void> {
    const trimmed = newContent.trim();
    const entry = this._entries().find((e) => e.id === entryId);
    if (!entry || !trimmed || trimmed === entry.content) return;

    const updatedEntry: Entry = { ...entry, content: trimmed };
    this._entries.update((entries) => entries.map((e) => (e.id === entryId ? updatedEntry : e)));
    this.persistEntries();
    await this.persistEntryUpdate(updatedEntry);
  }

  private async persistNewEntry(entry: Entry): Promise<void> {
    if (!this.entriesApi.isAuthenticated()) {
      return;
    }

    try {
      const { id, ...payload } = entry;
      const savedEntry = await this.entriesApi.create(payload);
      this._entries.update(entries => entries.map((existing) =>
        existing.id === id ? savedEntry : existing
      ));
      this.persistEntries();
    } catch (error) {
      localStorage.removeItem(this.getEntriesMigrationStorageKey(this._activeOwner()));
      console.error('Error persisting new entry:', error);
      const message = error instanceof Error ? error.message : 'Connection error.';
      this.modal.show(`Entry saved locally, but could not sync yet: ${message}`);
    }
  }

  private async persistEntryUpdate(entry: Entry): Promise<void> {
    if (!this.entriesApi.isAuthenticated()) {
      return;
    }

    try {
      const savedEntry = await this.entriesApi.update(entry);
      this._entries.update(entries => entries.map((existing) =>
        existing.id === entry.id ? savedEntry : existing
      ));
      this.persistEntries();
    } catch (error) {
      console.error('Error persisting entry update:', error);
      const message = error instanceof Error ? error.message : 'Connection error.';
      this.modal.show(`Entry updated locally, but sharing could not sync yet: ${message}`);
    }
  }

  public incrementRedFlag(crushId: string) {
    const crush = this._allCrushes().find((item) => item.id === crushId);
    if (!crush) return;

    const updated = { ...crush, redFlags: 1 };
    this._allCrushes.update(crushes => crushes.map(c =>
      c.id === crushId ? updated : c
    ));
    void this.persistCrushUpdate(updated);
  }

  public setRedFlag(crushId: string, reason: string) {
    const crush = this._allCrushes().find((item) => item.id === crushId);
    if (!crush) return;

    const updated = { ...crush, redFlags: 1, redFlagReason: reason.trim() };
    this._allCrushes.update(crushes => crushes.map(c =>
      c.id === crushId ? updated : c
    ));
    void this.persistCrushUpdate(updated);
  }

  public clearRedFlag(crushId: string) {
    const crush = this._allCrushes().find((item) => item.id === crushId);
    if (!crush) return;

    const updated = { ...crush, redFlags: 0, redFlagReason: '' };
    this._allCrushes.update(crushes => crushes.map(c =>
      c.id === crushId ? updated : c
    ));
    void this.persistCrushUpdate(updated);
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
    const existing = this._allCrushes();
    const minSortOrder = existing.length
      ? Math.min(...existing.map((c) => c.sortOrder ?? 0))
      : 0;
    const newCrush: CrushProfile = {
      ...crushData,
      id: localId,
      userId: this.getUserId(),
      lastInteraction: new Date(),
      redFlags: 0,
      redFlagReason: '',
      initialRating: startRating,
      vibeHistory: [startRating],
      sharedEntries: [],
      // New crushes appear first by default; subtract 1 so they always sort
      // above whatever previously had the lowest sortOrder.
      sortOrder: crushData.sortOrder ?? (minSortOrder - 1)
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
    const removedCrush = this._allCrushes().find(c => c.id === crushId);
    const removedEntries = this._entries().filter(e => e.crushId === crushId);

    this._allCrushes.update(crushes => crushes.filter(c => c.id !== crushId));
    this._entries.update(entries => entries.filter(e => e.crushId !== crushId));
    this.persistEntries();

    // A crush that hasn't finished being saved yet still carries its
    // temporary local id (see addCrush/persistNewCrush) rather than a real
    // Mongo ObjectId. Deleting it is a pure local no-op - there's nothing to
    // remove on the backend, and issuing the DELETE would just 404 and
    // (previously) silently fall back to the unrelated demo data store.
    if (!/^[0-9a-fA-F]{24}$/.test(crushId)) {
      return;
    }

    void this.persistCrushDeletion(crushId, removedCrush, removedEntries);
  }

  private async persistCrushDeletion(
    crushId: string,
    removedCrush: CrushProfile | undefined,
    removedEntries: Entry[]
  ): Promise<void> {
    // If the backend delete doesn't actually succeed, restore the crush (and
    // its entries) into local state so the UI doesn't lie about it being
    // gone - previously a failed/expired-token delete would still remove the
    // crush from the on-screen list (optimistic update), leaving the user
    // thinking it was deleted, only for it to silently reappear on the next
    // refresh/login since it was never actually removed from the database.
    const restoreLocalState = () => {
      if (removedCrush) {
        this._allCrushes.update(crushes =>
          crushes.some(c => c.id === crushId) ? crushes : [...crushes, removedCrush]
        );
      }
      if (removedEntries.length) {
        this._entries.update(entries => {
          const existingIds = new Set(entries.map(e => e.id));
          const toRestore = removedEntries.filter(e => !existingIds.has(e.id));
          return toRestore.length ? [...entries, ...toRestore] : entries;
        });
        this.persistEntries();
      }
    };

    try {
      let response = await this.authenticatedFetch(`/crushes/${crushId}`, {
        method: 'DELETE'
      });

      // Only retry against the demo store when there was no authenticated
      // request at all (no token / network failure). Retrying here whenever
      // the real delete merely returned a non-ok status (401/404/500) used
      // to silently delete from the wrong (demo) data store while leaving
      // the crush intact in the real database - which is exactly why a
      // "deleted" crush could reappear after the next refresh/login.
      if (!response) {
        const owner = encodeURIComponent(this.getDemoOwner());
        response = await this.demoFetch(`/crushes/${crushId}?owner=${owner}`, {
          method: 'DELETE'
        });
      }

      if (!response || !response.ok) {
        console.error('Failed to delete crush:', response?.status);
        restoreLocalState();
        this.modal.show('Could not delete profile from the database. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting crush:', err);
      restoreLocalState();
      this.modal.show('Connection error. Could not delete profile.');
    }
  }

  /**
   * Persists a new manual display order for the given crush ids (drag-and-drop
   * reordering on the dashboard). `orderedIds` should list every crush id in
   * its new desired order; each gets a sequential `sortOrder` and the change
   * is saved to the backend (silently, since this is a lightweight reorder).
   */
  public reorderCrushes(orderedIds: string[]): void {
    const orderIndex = new Map(orderedIds.map((id, index) => [id, index]));

    this._allCrushes.update(crushes =>
      crushes.map((c) =>
        orderIndex.has(c.id) ? { ...c, sortOrder: orderIndex.get(c.id)! } : c
      )
    );

    for (const id of orderedIds) {
      const crush = this._allCrushes().find((c) => c.id === id);
      if (crush) {
        void this.persistCrushUpdate(crush, true);
      }
    }
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
      // Silent: a blocking "Profile updated" modal here would cover the
      // sharing-controls UI (e.g. the quick-note input that appears right
      // after sharing a crush), so we skip the success confirmation for
      // this lightweight visibility toggle. Errors are still shown.
      void this.persistCrushUpdate(finalCrush, true);
    }
  }

  public toggleEntryVisibility(entryId: string, friendId: string): void {
    let updatedEntry: Entry | null = null;

    this._entries.update(entries => entries.map(e => {
      if (e.id === entryId) {
        if (e.visibility.includes('public')) {
          updatedEntry = { ...e, visibility: [] };
          return updatedEntry;
        }
        const hasFriend = e.visibility.includes(friendId);
        const newVisibility = hasFriend
          ? e.visibility.filter(id => id !== friendId)
          : [...e.visibility, friendId];
        updatedEntry = { ...e, visibility: newVisibility };
        return updatedEntry;
      }
      return e;
    }));
    this.persistEntries();

    if (updatedEntry) {
      void this.persistEntryUpdate(updatedEntry);
    }
  }
}
