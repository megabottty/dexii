import { Injectable, signal, computed } from '@angular/core';
import { CrushProfile, CrushStatus } from '../models/crush-profile.model';
import { Entry } from '../models/entry.model';

@Injectable({
  providedIn: 'root'
})
export class PrivacyService {
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
        if (history.length >= 7) history.shift(); // Keep last 7 readings for the visual
        history.push(score);
        return { ...c, vibeHistory: history };
      }
      return c;
    }));
  }

  public addCrush(crush: Omit<CrushProfile, 'id' | 'userId' | 'lastInteraction' | 'vibeHistory' | 'redFlags' | 'sharedEntries'>) {
    const newCrush: CrushProfile = {
      ...crush,
      id: Math.random().toString(36).substring(7),
      userId: 'me', // Current owner
      lastInteraction: new Date(),
      redFlags: 0,
      vibeHistory: [5], // Start with a neutral vibe
      sharedEntries: []
    };
    this._allCrushes.update(prev => [newCrush, ...prev]);
  }

  // Simulation of current user's friend ID context
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
