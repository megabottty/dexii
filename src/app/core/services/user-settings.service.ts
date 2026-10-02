import { Injectable, effect, inject, signal } from '@angular/core';
import { SecurityService } from './security.service';
import { ThemeService } from './theme.service';
import { getApiBaseUrl } from '../config/api-config';
import {
  DEFAULT_USER_SETTINGS,
  normalizeUserSettings,
  readPendingSettings,
  readStoredSettings,
  type UserSettings,
  writeLegacyProfileSnapshot,
  writePendingSettings
} from './user-settings.storage';

export type { UserSettings } from './user-settings.storage';

/** The settings the server keeps (the allow-list of PUT /auth/profile-settings). */
export const SERVER_BACKED_KEYS: readonly (keyof UserSettings)[] = [
  'displayName', 'bio', 'avatarUrl', 'avatarConfig', 'relationshipStatus', 'lookingFor',
  'interestedIn', 'loveLanguage', 'idealDate', 'profileVisibility', 'selectedFriendIds',
  'journalPromptFrequency', 'notifyChatMessages', 'notifyFriendRequests'
];

/** What /auth/me returns that matters here. */
export interface ServerProfile {
  avatarUrl?: string | null;
  avatarConfig?: UserSettings['avatarConfig'] | null;
  profileSettings?: Partial<Record<keyof UserSettings, unknown>> | null;
}

/**
 * Lays the server's copy of the profile over what this device remembered. The
 * server wins for every server-backed key it has a value for; keys it doesn't
 * know (and device-only preferences such as the theme) keep their local value.
 */
export function mergeServerSettings(local: UserSettings, me: ServerProfile | null | undefined): UserSettings {
  if (!me) return local;
  const merged: UserSettings = { ...local };
  const fromServer = (me.profileSettings || {}) as Record<string, unknown>;
  for (const key of SERVER_BACKED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(fromServer, key) && fromServer[key] !== undefined && fromServer[key] !== null) {
      (merged as unknown as Record<string, unknown>)[key] = fromServer[key];
    }
  }
  if (typeof me.avatarUrl === 'string') merged.avatarUrl = me.avatarUrl;
  if (me.avatarConfig !== undefined) merged.avatarConfig = me.avatarConfig ?? undefined;
  if (!merged.displayName) merged.displayName = local.displayName;
  return merged;
}

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly storagePrefix = 'dexii_user_settings_';
  private security = inject(SecurityService);
  private themeService = inject(ThemeService);
  private apiBase = getApiBaseUrl();
  private activeUser = signal<string>('');
  private _settings = signal<UserSettings>(DEFAULT_USER_SETTINGS);
  /** Which account's profile was already pulled from the server this session. */
  private hydratedOwner = '';

  public settings = this._settings.asReadonly();

  constructor() {
    effect(() => {
      const username = this.security.currentUser() || localStorage.getItem('dexii_api_username') || '';
      if (!username) {
        this.activeUser.set('');
        this._settings.set(DEFAULT_USER_SETTINGS);
        this.themeService.setTheme(DEFAULT_USER_SETTINGS.themeMode || 'pearl', { sync: false });
        return;
      }
      if (username === this.activeUser()) {
        return;
      }
      this.loadUserSettings(username);
    }, { allowSignalWrites: true });
  }

  private getStorageKey(username: string): string {
    return `${this.storagePrefix}${username}`;
  }

  private mergeWithDefaults(raw: Partial<UserSettings> | null | undefined): UserSettings {
    return normalizeUserSettings(raw);
  }

  private buildSettingsFromStorage(username: string): UserSettings {
    const parsed = readStoredSettings(username);
    return this.mergeWithDefaults({
      ...parsed,
      username,
      displayName: parsed?.displayName || username
    });
  }

  private loadUserSettings(username: string): void {
    this.activeUser.set(username);
    const loaded = this.buildSettingsFromStorage(username);
    this._settings.set(loaded);
    if (loaded.themeMode) {
      this.themeService.setTheme(loaded.themeMode);
    }
    void this.hydrateFromBackend(username);
  }

  /**
   * Pulls the profile (photo included) from the server once per account, so a
   * new device, the installed app and the browser all show the same thing.
   */
  private async hydrateFromBackend(username: string): Promise<void> {
    if (this.hydratedOwner === username) return;
    const headers = this.security.authHeaders();
    if (!headers['x-auth-token']) return;
    try {
      const response = await fetch(`${this.apiBase}/auth/me`, { headers });
      if (!response.ok) return;
      const me = await response.json() as ServerProfile;
      if (this.activeUser() !== username) return; // switched accounts meanwhile
      this.hydratedOwner = username;
      const merged = mergeServerSettings(this._settings(), me);
      this._settings.set(merged);
      this.persist(merged);
    } catch {
      // Offline: the device copy is all we have, and that's fine.
    }
  }

  private persist(settings: UserSettings): void {
    const username = this.activeUser();
    if (!username) {
      return;
    }
    try {
      localStorage.setItem(this.getStorageKey(username), JSON.stringify(settings));
      writeLegacyProfileSnapshot(settings);
    } catch (err) {
      // Storage full (photos are stored inline). The in-memory copy still works.
      console.warn('Could not store settings locally:', err);
    }
  }

  updateSettings(patch: Partial<UserSettings>): void {
    const next = this.mergeWithDefaults({ ...this._settings(), ...patch });
    this._settings.set(next);
    this.persist(next);
    if (patch.themeMode) {
      this.themeService.setTheme(patch.themeMode);
    }
  }

  resetSettings(): void {
    this._settings.set(DEFAULT_USER_SETTINGS);
    this.persist(DEFAULT_USER_SETTINGS);
    if (DEFAULT_USER_SETTINGS.themeMode) {
      this.themeService.setTheme(DEFAULT_USER_SETTINGS.themeMode);
    }
  }

  /**
   * Saves server-backed settings. With `keys`, only those are sent (e.g. just the
   * photo); the server merges them into what it already has.
   */
  saveToBackend(keys?: readonly (keyof UserSettings)[]): Promise<void> {
    const settings = this._settings();
    const wanted = keys ? SERVER_BACKED_KEYS.filter((key) => keys.includes(key)) : SERVER_BACKED_KEYS;
    const body: Record<string, unknown> = {};
    for (const key of wanted) {
      body[key] = key === 'avatarConfig' ? (settings.avatarConfig ?? null) : settings[key];
    }
    return fetch(`${this.apiBase}/auth/profile-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.security.authHeaders()
      },
      body: JSON.stringify(body)
    }).then((response) => {
      if (!response.ok) throw new Error(`Profile settings save failed (${response.status})`);
    });
  }

  currentUsername(): string {
    return this.activeUser() || this.security.currentUser() || localStorage.getItem('dexii_api_username') || '';
  }

  setProfileAvatar(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        this.updateSettings({ avatarUrl: String(reader.result || '') });
        resolve();
      };
      reader.onerror = () => reject(new Error('Could not read profile photo'));
      reader.readAsDataURL(file);
    });
  }

  getSignupDraft(): UserSettings {
    const pending = readPendingSettings();
    return normalizeUserSettings({
      ...pending,
      username: localStorage.getItem('dexii_pending_username') || pending?.username || '',
      email: localStorage.getItem('dexii_pending_email') || pending?.email || '',
      bio: localStorage.getItem('dexii_pending_bio') || pending?.bio || '',
      relationshipStatus: (localStorage.getItem('dexii_pending_relationshipStatus') || pending?.relationshipStatus || '') as UserSettings['relationshipStatus'],
      lookingFor: (localStorage.getItem('dexii_pending_lookingFor') || pending?.lookingFor || '') as UserSettings['lookingFor'],
      interestedIn: (localStorage.getItem('dexii_pending_interestedIn') || pending?.interestedIn || '') as UserSettings['interestedIn'],
      loveLanguage: (localStorage.getItem('dexii_pending_loveLanguage') || pending?.loveLanguage || '') as UserSettings['loveLanguage'],
      idealDate: localStorage.getItem('dexii_pending_idealDate') || pending?.idealDate || '',
      displayName: localStorage.getItem('dexii_pending_username') || pending?.displayName || ''
    });
  }

  updateSignupDraft(patch: Partial<UserSettings>): void {
    const next = normalizeUserSettings({ ...this.getSignupDraft(), ...patch });
    writePendingSettings(next);
    writeLegacyProfileSnapshot(next);
  }

  clearSignupDraft(): void {
    localStorage.removeItem('dexii_pending_username');
    localStorage.removeItem('dexii_pending_email');
    localStorage.removeItem('dexii_pending_bio');
    localStorage.removeItem('dexii_pending_relationshipStatus');
    localStorage.removeItem('dexii_pending_lookingFor');
    localStorage.removeItem('dexii_pending_interestedIn');
    localStorage.removeItem('dexii_pending_loveLanguage');
    localStorage.removeItem('dexii_pending_idealDate');
  }

  getSelectedFriendIds(): string[] {
    return [...(this._settings().selectedFriendIds || [])];
  }

  setSelectedFriendIds(selectedFriendIds: string[]): void {
    this.updateSettings({ selectedFriendIds });
  }
}
