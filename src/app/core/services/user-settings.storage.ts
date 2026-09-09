export interface UserSettings {
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUrl: string;
  journalTitle: string;
  journalPrompt: string;
  reminderTime: string;
  weeklySummary: boolean;
  shareWithFriends: boolean;
  showUsername: boolean;
  defaultSafetyCheck: boolean;
  allowInvites: boolean;
  notifyFriendRequests: boolean;
  notifyChatMessages: boolean;
  selectedFriendIds: string[];
  relationshipStatus: 'Single' | 'In a Relationship' | 'Married' | "It's Complicated" | 'Open Relationship' | 'Other' | '';
  lookingFor: 'Long-term' | 'Short-term' | 'Friendship' | 'Not Sure' | 'Other' | '';
  interestedIn: 'Men' | 'Women' | 'Everyone' | 'Other' | '';
  loveLanguage: 'Words of Affirmation' | 'Acts of Service' | 'Receiving Gifts' | 'Quality Time' | 'Physical Touch' | '';
  idealDate: string;
  profileVisibility: 'Friends only' | 'Selected friends' | 'Private';
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  username: '',
  displayName: '',
  email: '',
  bio: '',
  avatarUrl: '',
  journalTitle: 'Tea Time',
  journalPrompt: 'What did I learn about love today?',
  reminderTime: '19:00',
  weeklySummary: true,
  shareWithFriends: true,
  showUsername: true,
  defaultSafetyCheck: true,
  allowInvites: true,
  notifyFriendRequests: true,
  notifyChatMessages: true,
  selectedFriendIds: [],
  relationshipStatus: '',
  lookingFor: '',
  interestedIn: '',
  loveLanguage: '',
  idealDate: '',
  profileVisibility: 'Friends only'
};

export const ACTIVE_SETTINGS_PREFIX = 'dexii_user_settings_';
export const PENDING_SETTINGS_KEY = 'dexii_pending_user_settings';

const LEGACY_PROFILE_KEYS = {
  email: 'dexii_profile_email',
  bio: 'dexii_profile_bio',
  avatarUrl: 'dexii_profile_avatar',
  displayName: 'dexii_profile_display_name'
} as const;

export function activeSettingsKey(username: string): string {
  return `${ACTIVE_SETTINGS_PREFIX}${username}`;
}

export function readStoredSettings(username: string): Partial<UserSettings> | null {
  const raw = localStorage.getItem(activeSettingsKey(username));
  if (!raw) return null;
  return JSON.parse(raw) as Partial<UserSettings>;
}

export function readPendingSettings(): Partial<UserSettings> | null {
  const raw = localStorage.getItem(PENDING_SETTINGS_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as Partial<UserSettings>;
}

export function writePendingSettings(settings: Partial<UserSettings>): void {
  localStorage.setItem(PENDING_SETTINGS_KEY, JSON.stringify(settings));
}

export function clearPendingSettings(): void {
  localStorage.removeItem(PENDING_SETTINGS_KEY);
}

export function normalizeUserSettings(raw: Partial<UserSettings> | null | undefined): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...(raw || {})
  };
}

export function readLegacyProfileSnapshot() {
  return {
    email: localStorage.getItem(LEGACY_PROFILE_KEYS.email) || '',
    bio: localStorage.getItem(LEGACY_PROFILE_KEYS.bio) || '',
    avatarUrl: localStorage.getItem(LEGACY_PROFILE_KEYS.avatarUrl) || '',
    displayName: localStorage.getItem(LEGACY_PROFILE_KEYS.displayName) || ''
  };
}

export function writeLegacyProfileSnapshot(settings: Pick<UserSettings, 'email' | 'bio' | 'avatarUrl' | 'displayName'>): void {
  localStorage.setItem(LEGACY_PROFILE_KEYS.email, settings.email || '');
  localStorage.setItem(LEGACY_PROFILE_KEYS.bio, settings.bio || '');
  localStorage.setItem(LEGACY_PROFILE_KEYS.avatarUrl, settings.avatarUrl || '');
  localStorage.setItem(LEGACY_PROFILE_KEYS.displayName, settings.displayName || '');
}

export function promotePendingSettings(username: string): UserSettings {
  const pending = normalizeUserSettings(readPendingSettings());
  const next = normalizeUserSettings({
    ...pending,
    username,
    displayName: pending.displayName || username
  });

  localStorage.setItem(activeSettingsKey(username), JSON.stringify(next));
  writeLegacyProfileSnapshot(next);
  clearPendingSettings();

  return next;
}
