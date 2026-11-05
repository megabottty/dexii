import { describe, expect, it } from 'vitest';
import { mergeServerSettings, needsRealName } from './user-settings.service';
import { DEFAULT_USER_SETTINGS, type UserSettings } from './user-settings.storage';

const local: UserSettings = {
  ...DEFAULT_USER_SETTINGS,
  username: 'ava',
  displayName: 'Ava',
  bio: 'local bio',
  avatarUrl: 'data:local',
  themeMode: 'onyx',
  journalTitle: 'My Tea'
};

describe('mergeServerSettings', () => {
  it('lets the server win for the settings it stores', () => {
    const merged = mergeServerSettings(local, {
      avatarUrl: 'data:server',
      profileSettings: { bio: 'server bio', lookingFor: 'Friendship' }
    });
    expect(merged.avatarUrl).toBe('data:server');
    expect(merged.bio).toBe('server bio');
    expect(merged.lookingFor).toBe('Friendship');
  });

  it('keeps device-only preferences and anything the server has no value for', () => {
    const merged = mergeServerSettings(local, { profileSettings: { bio: 'server bio' } });
    expect(merged.themeMode).toBe('onyx');
    expect(merged.journalTitle).toBe('My Tea');
    expect(merged.displayName).toBe('Ava');
    expect(merged.avatarUrl).toBe('data:local');
  });

  it('treats an explicitly cleared server photo as cleared', () => {
    expect(mergeServerSettings(local, { avatarUrl: '' }).avatarUrl).toBe('');
  });

  it('leaves everything alone when the server returns nothing useful', () => {
    expect(mergeServerSettings(local, null)).toEqual(local);
    expect(mergeServerSettings(local, { profileSettings: null })).toEqual(local);
  });
});

describe('needsRealName (DEX-53)', () => {
  it('asks people whose only name is their username or an email', () => {
    expect(needsRealName({ username: 'mgrange' })).toBe(true);
    expect(needsRealName({ username: 'mgrange', profileSettings: { displayName: 'mgrange' } })).toBe(true);
    expect(needsRealName({ username: 'mgrange', profileSettings: { displayName: 'michelle@example.com' } })).toBe(true);
  });

  it('leaves alone anyone with a first name or a chosen display name', () => {
    expect(needsRealName({ username: 'mgrange', firstName: 'Michelle' })).toBe(false);
    expect(needsRealName({ username: 'mgrange', profileSettings: { displayName: 'Shelly' } })).toBe(false);
  });

  it('does not ask while the profile is unknown', () => {
    expect(needsRealName(null)).toBe(false);
  });
});
