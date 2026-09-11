import { Injectable, effect, inject, signal } from '@angular/core';
import { SecurityService } from './security.service';
import { ThemeService } from './theme.service';
import {
  DEFAULT_USER_SETTINGS,
  normalizeUserSettings,
  readLegacyProfileSnapshot,
  readPendingSettings,
  readStoredSettings,
  type UserSettings,
  writeLegacyProfileSnapshot,
  writePendingSettings
} from './user-settings.storage';

export type { UserSettings } from './user-settings.storage';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly storagePrefix = 'dexii_user_settings_';
  private security = inject(SecurityService);
  private themeService = inject(ThemeService);
  private activeUser = signal<string>('');
  private _settings = signal<UserSettings>(DEFAULT_USER_SETTINGS);

  public settings = this._settings.asReadonly();

  constructor() {
    effect(() => {
      const username = this.security.currentUser() || localStorage.getItem('dexii_api_username') || '';
      if (!username || username === this.activeUser()) {
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
    const legacy = readLegacyProfileSnapshot();
    return this.mergeWithDefaults({
      ...parsed,
      username,
      email: parsed?.email || legacy.email,
      bio: parsed?.bio || legacy.bio,
      avatarUrl: parsed?.avatarUrl || legacy.avatarUrl,
      displayName: parsed?.displayName || legacy.displayName || username
    });
  }

  private loadUserSettings(username: string): void {
    this.activeUser.set(username);
    const loaded = this.buildSettingsFromStorage(username);
    this._settings.set(loaded);
    if (loaded.themeMode) {
      this.themeService.setTheme(loaded.themeMode);
    }
  }

  private persist(settings: UserSettings): void {
    const username = this.activeUser();
    if (!username) {
      return;
    }
    localStorage.setItem(this.getStorageKey(username), JSON.stringify(settings));
    writeLegacyProfileSnapshot(settings);
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
