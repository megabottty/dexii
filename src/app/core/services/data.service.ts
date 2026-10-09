import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { MessagingService } from './messaging.service';
import { CrushProfile, CrushStatus } from '../models/crush-profile.model';
import { AvatarConfig } from '../models/avatar-config.model';
import { Entry } from '../models/entry.model';
import { getApiBaseUrl } from '../config/api-config';
import { ModalService } from './modal.service';
import { SecurityService } from './security.service';
import { EntriesApiService, SharedEntry } from './entries-api.service';
import { ThemeService } from './theme.service';
import { RealtimeService } from './realtime.service';
import { CrushField, pickCrushPayload } from './crush-payload';
import { CrushPhoto, mapCrushPhotos } from '../models/crush-profile.model';


interface BackendCrush {
  _id: string;
  userId: string;
  nickname: string;
  fullName?: string;
  displayName?: 'nickname' | 'fullName';
  avatarUrl?: string;
  avatarConfig?: AvatarConfig;
  bio?: string;
  status?: string;
  visibility?: string[];
  redFlagReason?: string;
  lastInteraction?: string;
  rating?: number;
  initialRating?: number;
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
  dateOfBirth?: string;
  age?: number;
  howWeMet?: string;
  whenWeMet?: string;
  schoolOrWork?: string;
  grade?: string;
  occupation?: string;
  family?: string;
  memorableMoments?: string;
  friends?: string[];
  sortOrder?: number;
  viewedBy?: Array<{ user: string; at: string }>;
  photos?: Array<{ id?: string; _id?: string; url?: string; width?: number; height?: number; bytes?: number; addedAt?: string; audience?: 'shared' | 'friends'; friendIds?: string[] }>;
  photoCount?: number;
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
  private _isLoading = signal(false);
  private _hasLoaded = signal(false);
  public isLoading = this._isLoading.asReadonly();
  public hasLoaded = this._hasLoaded.asReadonly();
  private _entries = signal<Entry[]>([]);
  private _sharedEntries = signal<SharedEntry[]>([]);
  private _activeOwner = signal<string>('');
  private modal = inject(ModalService);
  private messaging = inject(MessagingService);
  private security = inject(SecurityService);
  private entriesApi = inject(EntriesApiService);
  private theme = inject(ThemeService);
  private realtime = inject(RealtimeService);
  /** When the crush list was last fetched, so focus refreshes stay cheap. */
  private lastCrushFetchAt = 0;
  /** Saves in flight; a refresh waits for them so it can't revert an optimistic edit. */
  private pendingCrushSaves = 0;

  constructor() {
    effect(() => {
      const owner = this.security.currentUser() || localStorage.getItem(this.usernameStorageKey) || 'dexii_demo_user';
      if (!owner || owner === this._activeOwner()) return;
      void this.syncUserData(owner);
    }, { allowSignalWrites: true });

    // Another tab or device saved one of our crushes: pick it up right away.
    this.realtime.onCrushesChanged(() => { void this.refreshCrushes({ force: true }); });
    // A friend opened a crush we shared: show "Seen" without a refetch.
    this.realtime.onCrushViewed(({ crushId, viewerId, at }) => {
      this._allCrushes.update((crushes) => crushes.map((crush) => {
        if (crush.id !== crushId) return crush;
        const others = (crush.viewedBy || []).filter((view) => view.userId !== viewerId);
        return { ...crush, viewedBy: [...others, { userId: viewerId, at: new Date(at) }] };
      }));
    });
    // Coming back to the app after a while: make sure we're not editing stale data.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.security.isLoggedIn() && !this.security.isLocked()) {
          void this.refreshCrushes();
        }
      });
    }
  }

  /**
   * Re-fetches the crush list from the server. Skipped when it was fetched in the
   * last 30 seconds (unless forced) or while a save is still in flight.
   */
  public async refreshCrushes({ force = false }: { force?: boolean } = {}): Promise<void> {
    if (!this._hasLoaded() || this.pendingCrushSaves > 0) return;
    if (!force && Date.now() - this.lastCrushFetchAt < 30_000) return;
    await this.hydrateCrushesFromBackend();
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

    this._isLoading.set(true);
    this._hasLoaded.set(false);
    this._activeOwner.set(owner);
    this._allCrushes.set([]);
    this._sharedEntries.set([]);
    const localEntries = this.readEntriesFromStorage(owner);
    this._entries.set(localEntries);
    try {
      await this.hydrateEntriesFromBackend(owner, localEntries);
      await this.hydrateCrushesFromBackend();
      void this.theme.hydrateFromBackend(owner);
    } finally {
      this._isLoading.set(false);
      this._hasLoaded.set(true);
    }
  }

  private toCrushStatus(status?: string): CrushStatus {
    // Legacy value: "Crushing" was renamed to "Plotting".
    if (status === 'Crushing') return CrushStatus.Plotting;
    if (
      status === CrushStatus.Crush ||
      status === CrushStatus.Plotting ||
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
      avatarConfig: crush.avatarConfig,
      bio: crush.bio,
      status: this.toCrushStatus(crush.status),
      visibility: (crush.visibility || []).map(String),
      sharedEntries: [],
      lastInteraction: crush.lastInteraction ? new Date(crush.lastInteraction) : new Date(),
      rating: crush.rating,
      initialRating: crush.initialRating,
      redFlags: crush.redFlags && crush.redFlags > 0 ? 1 : 0,
      redFlagReason: crush.redFlagReason || '',
      vibeHistory: crush.vibeHistory?.length ? crush.vibeHistory : [5],
      category: crush.category,
      hair: crush.hair || [],
      eyes: crush.eyes || [],
      build: crush.build || [],
      social: crush.social,
      relationshipStatus: crush.relationshipStatus,
      relationshipLabels: Array.isArray(crush.relationshipLabels) ? crush.relationshipLabels : [],
      heartbreakSong: crush.heartbreakSong,
      heartbreakRecovery: crush.heartbreakRecovery,
      pronouns: crush.pronouns as any,
      customNotes: crush.customNotes,
      location: crush.location,
      dateOfBirth: crush.dateOfBirth,
      age: crush.age,
      howWeMet: crush.howWeMet,
      whenWeMet: crush.whenWeMet,
      schoolOrWork: (crush.schoolOrWork || undefined) as CrushProfile['schoolOrWork'],
      grade: crush.grade,
      occupation: crush.occupation,
      family: crush.family,
      memorableMoments: crush.memorableMoments,
      friends: crush.friends || [],
      sortOrder: crush.sortOrder ?? 0,
      viewedBy: Array.isArray(crush.viewedBy)
        ? crush.viewedBy.map((view) => ({ userId: String(view.user), at: new Date(view.at) }))
        : [],
      photos: mapCrushPhotos(crush.photos),
      photoCount: typeof crush.photoCount === 'number' ? crush.photoCount : (Array.isArray(crush.photos) ? crush.photos.length : 0)
    };
  }

  /** Photos (with image data) of a crush you own or that a friend shared with you. */
  public async loadCrushPhotos(crushId: string): Promise<CrushPhoto[]> {
    const response = await this.authenticatedFetch(`/crushes/${crushId}/photos`);
    if (!response || !response.ok) return [];
    const photos = mapCrushPhotos(await response.json());
    this.patchCrushPhotos(crushId, photos);
    return photos;
  }

  public async addCrushPhoto(crushId: string, photo: { url: string; width?: number; height?: number }, audience: 'shared' | 'friends' = 'shared', friendIds: string[] = []): Promise<CrushPhoto | null> {
    const response = await this.authenticatedFetch(`/crushes/${crushId}/photos`, {
      method: 'POST',
      body: JSON.stringify({ ...photo, audience, friendIds })
    });
    if (!response || !response.ok) {
      const body = await response?.json().catch(() => ({}));
      this.modal.show(body?.message || 'Could not add that photo right now.');
      return null;
    }
    const saved = mapCrushPhotos([await response.json()])[0];
    const current = this._allCrushes().find((c) => c.id === crushId)?.photos || [];
    this.patchCrushPhotos(crushId, [...current, saved]);
    return saved;
  }

  public async removeCrushPhoto(crushId: string, photoId: string): Promise<boolean> {
    const response = await this.authenticatedFetch(`/crushes/${crushId}/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
    if (!response || !response.ok) { this.modal.show('Could not remove that photo right now.'); return false; }
    const current = this._allCrushes().find((c) => c.id === crushId)?.photos || [];
    this.patchCrushPhotos(crushId, current.filter((p) => p.id !== photoId));
    return true;
  }

  public async reorderCrushPhotos(crushId: string, ids: string[]): Promise<void> {
    const current = this._allCrushes().find((c) => c.id === crushId)?.photos || [];
    const byId = new Map(current.map((p) => [p.id, p]));
    this.patchCrushPhotos(crushId, [...ids.map((id) => byId.get(id)).filter((p): p is CrushPhoto => Boolean(p)), ...current.filter((p) => !ids.includes(p.id))]);
    await this.authenticatedFetch(`/crushes/${crushId}/photos/order`, { method: 'PUT', body: JSON.stringify({ ids }) });
  }

  /** One photo's audience, or every photo's when `photoId` is omitted. */
  public async setCrushPhotoAudience(crushId: string, photoId: string | null, audience: 'shared' | 'friends', friendIds: string[] = []): Promise<boolean> {
    const path = photoId ? `/crushes/${crushId}/photos/${encodeURIComponent(photoId)}/audience` : `/crushes/${crushId}/photos/audience`;
    const response = await this.authenticatedFetch(path, { method: 'PUT', body: JSON.stringify({ audience, friendIds }) });
    if (!response || !response.ok) { this.modal.show('Could not update who can see that photo.'); return false; }
    const current = this._allCrushes().find((c) => c.id === crushId)?.photos || [];
    this.patchCrushPhotos(crushId, current.map((p) => (!photoId || p.id === photoId) ? { ...p, audience, friendIds: audience === 'friends' ? friendIds : [] } : p));
    return true;
  }

  private patchCrushPhotos(crushId: string, photos: CrushPhoto[]): void {
    this._allCrushes.update((crushes) => crushes.map((c) => c.id === crushId ? { ...c, photos, photoCount: photos.length } : c));
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
    this.lastCrushFetchAt = Date.now();
  }

  private async persistNewCrush(localId: string, crush: CrushProfile, shareWith: string[] = []): Promise<void> {
    try {
      const payload = {
        nickname: crush.nickname,
        fullName: crush.fullName,
        displayName: crush.displayName,
        avatarUrl: crush.avatarUrl,
        avatarConfig: crush.avatarConfig,
        bio: crush.bio,
        status: crush.status,
        visibility: crush.visibility,
        lastInteraction: crush.lastInteraction,
        rating: crush.rating,
        initialRating: crush.initialRating,
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
        dateOfBirth: crush.dateOfBirth,
        age: crush.age,
        howWeMet: crush.howWeMet,
        whenWeMet: crush.whenWeMet,
        schoolOrWork: crush.schoolOrWork ?? '',
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
      // Sharing needs the server id, so it happens once the crush exists there.
      if (shareWith.length) void this.shareCrushWith(mapped.id, shareWith);
      this.modal.show(shareWith.length
        ? `Profile Secured in the Rolodex and shared with ${shareWith.length} friend${shareWith.length === 1 ? '' : 's'}.`
        : 'Profile Secured in the Rolodex.');
    } catch (err) {
      console.error('Error persisting new crush:', err);
      this.modal.show('Connection error. Could not save profile.');
    }
  }

  /**
   * Saves a crush. `fields` names what this action changed; only those fields are
   * sent, so an action can never overwrite data it didn't touch (sharing, photo,
   * edits made on another device). The edit form passes CRUSH_FORM_FIELDS.
   */
  public updateCrush(crush: CrushProfile, options: { fields: readonly CrushField[]; silent?: boolean }): void {
    this._allCrushes.update(crushes => crushes.map(c =>
      c.id === crush.id ? crush : c
    ));
    void this.persistCrushUpdate(crush.id, pickCrushPayload(crush, options.fields), options.silent ?? true);
  }

  private async persistCrushUpdate(crushId: string, payload: Record<string, unknown>, silent = true): Promise<void> {
    this.pendingCrushSaves++;
    try {
      let response = await this.authenticatedFetch(`/crushes/${crushId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      // Only retry against the demo store when there was no authenticated
      // request at all (no token / network failure) - see hydrateCrushesFromBackend.
      if (!response) {
        response = await this.demoFetch(`/crushes/${crushId}`, {
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

      this.applySavedCrush(crushId, await response.json() as BackendCrush);
      if (!silent) {
        this.modal.show('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error persisting crush update:', err);
      this.modal.show('Connection error. Could not update profile.');
    } finally {
      this.pendingCrushSaves--;
    }
  }

  /** Replaces the local copy with what the server saved (the server copy is the truth). */
  private applySavedCrush(crushId: string, saved: BackendCrush): void {
    const mapped = this.mapBackendCrush(saved);
    this._allCrushes.update(crushes =>
      crushes.map((existing) => existing.id === crushId ? mapped : existing)
    );
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
    void this.persistCrushUpdate(crushId, pickCrushPayload(updated, ['redFlags', 'redFlagReason']));
  }

  public setRedFlag(crushId: string, reason: string) {
    const crush = this._allCrushes().find((item) => item.id === crushId);
    if (!crush) return;

    const updated = { ...crush, redFlags: 1, redFlagReason: reason.trim() };
    this._allCrushes.update(crushes => crushes.map(c =>
      c.id === crushId ? updated : c
    ));
    void this.persistCrushUpdate(crushId, pickCrushPayload(updated, ['redFlags', 'redFlagReason']));
  }

  public clearRedFlag(crushId: string) {
    const crush = this._allCrushes().find((item) => item.id === crushId);
    if (!crush) return;

    const updated = { ...crush, redFlags: 0, redFlagReason: '' };
    this._allCrushes.update(crushes => crushes.map(c =>
      c.id === crushId ? updated : c
    ));
    void this.persistCrushUpdate(crushId, pickCrushPayload(updated, ['redFlags', 'redFlagReason']));
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

  public addCrush(
    crush: Omit<CrushProfile, 'id' | 'userId' | 'lastInteraction' | 'vibeHistory' | 'redFlags' | 'sharedEntries'> & { initialRating?: number },
    options: { shareWith?: string[] } = {}
  ): CrushProfile {
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
    void this.persistNewCrush(localId, newCrush, options.shareWith || []);
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
    const previous = new Map(this._allCrushes().map((c) => [c.id, c.sortOrder]));

    this._allCrushes.update(crushes =>
      crushes.map((c) =>
        orderIndex.has(c.id) ? { ...c, sortOrder: orderIndex.get(c.id)! } : c
      )
    );

    // Only the crushes whose position changed, and only their position.
    for (const id of orderedIds) {
      const crush = this._allCrushes().find((c) => c.id === id);
      if (crush && previous.get(id) !== crush.sortOrder) {
        void this.persistCrushUpdate(id, pickCrushPayload(crush, ['sortOrder']));
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

  /** Shares or unshares one crush with one friend (the Sharing page toggle). */
  public toggleCrushVisibility(crushId: string, friendId: string): void {
    const crush = this._allCrushes().find((c) => c.id === crushId);
    if (!crush) return;
    if (this.isCrushSharedWith(crush, friendId)) {
      void this.unshareCrushWith(crushId, friendId);
    } else {
      void this.shareCrushWith(crushId, [friendId]);
    }
  }

  /**
   * Shares a crush with more friends. The server adds to the sharing list instead
   * of replacing it, so friends shared from another device are never dropped.
   */
  public async shareCrushWith(crushId: string, friendIds: string[]): Promise<void> {
    const crush = this._allCrushes().find((c) => c.id === crushId);
    if (!crush) return;
    const added = [...new Set(friendIds)].filter((id) => id && !this.isCrushSharedWith(crush, id));
    if (added.length === 0) return;

    const me = this.getUserId();
    this._allCrushes.update(crushes => crushes.map(c =>
      c.id === crushId ? { ...c, visibility: [...c.visibility, ...added] } : c
    ));

    const ok = await this.persistSharingChange(crushId, () => this.authenticatedFetch(`/crushes/${crushId}/share`, {
      method: 'POST',
      body: JSON.stringify({ friendIds: added })
    }));
    // One chat bubble per friend, only once the share really happened.
    if (ok) {
      for (const friendId of added) {
        this.messaging.sendMessage({ senderId: me, receiverId: friendId, content: `Shared a crush: ${crush.nickname}`, relatedCrushId: crushId, kind: 'crush_share' });
      }
    }
  }

  /** Stops sharing a crush with one friend. */
  public async unshareCrushWith(crushId: string, friendId: string): Promise<void> {
    const crush = this._allCrushes().find((c) => c.id === crushId);
    if (!crush || !this.isCrushSharedWith(crush, friendId)) return;

    const me = this.getUserId();
    this._allCrushes.update(crushes => crushes.map(c => {
      if (c.id !== crushId) return c;
      return {
        ...c,
        visibility: c.visibility.filter(id => !(
          id === friendId ||
          (this.isMe(friendId) && (id === 'me' || id === me)) ||
          id.toLowerCase().replace(/\s+/g, '_') === friendId.toLowerCase().replace(/\s+/g, '_')
        ))
      };
    }));

    await this.persistSharingChange(crushId, () => this.authenticatedFetch(
      `/crushes/${crushId}/share/${encodeURIComponent(friendId)}`,
      { method: 'DELETE' }
    ));
  }

  /**
   * Runs a share/unshare request. With no backend session (demo mode) it falls back
   * to saving the full sharing list, which is fine on a single device. Errors are
   * shown; success is silent so the sharing UI isn't covered by a modal.
   */
  private async persistSharingChange(crushId: string, send: () => Promise<Response | null>): Promise<boolean> {
    this.pendingCrushSaves++;
    try {
      let response = await send();
      if (!response) {
        const crush = this._allCrushes().find((c) => c.id === crushId);
        if (!crush) return false;
        response = await this.demoFetch(`/crushes/${crushId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pickCrushPayload(crush, ['visibility']), owner: this.getDemoOwner() })
        });
      }
      if (!response || !response.ok) {
        console.error('Failed to update sharing:', response?.status);
        this.modal.show('Could not update sharing right now. Please try again.');
        return false;
      }
      this.applySavedCrush(crushId, await response.json() as BackendCrush);
      return true;
    } catch (err) {
      console.error('Error updating sharing:', err);
      this.modal.show('Connection error. Could not update sharing.');
      return false;
    } finally {
      this.pendingCrushSaves--;
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
