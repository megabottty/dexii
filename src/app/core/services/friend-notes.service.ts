import { Injectable, signal } from '@angular/core';

export type FriendNoteVisibility = 'private' | 'shared';

export interface FriendNote {
  id: string;
  friendId: string;
  content: string;
  visibility: FriendNoteVisibility;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FriendNotesService {
  private storageKey = 'dexii_friend_notes';
  private _notes = signal<FriendNote[]>(this.readFromStorage());
  notes = this._notes.asReadonly();

  getNotesForFriend(friendId: string): FriendNote[] {
    return this._notes()
      .filter((n) => n.friendId === friendId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  addNote(friendId: string, content: string, visibility: FriendNoteVisibility): FriendNote {
    const note: FriendNote = {
      id: Math.random().toString(36).slice(2),
      friendId,
      content,
      visibility,
      createdAt: new Date()
    };
    this._notes.update((items) => [note, ...items]);
    this.persist();
    return note;
  }

  toggleVisibility(noteId: string): FriendNote | null {
    let updated: FriendNote | null = null;
    this._notes.update((items) =>
      items.map((n) => {
        if (n.id !== noteId) return n;
        const next: FriendNote = {
          ...n,
          visibility: n.visibility === 'private' ? 'shared' : 'private'
        };
        updated = next;
        return next;
      })
    );
    this.persist();
    return updated;
  }

  private persist() {
    const payload = this._notes().map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString()
    }));
    localStorage.setItem(this.storageKey, JSON.stringify(payload));
  }

  private readFromStorage(): FriendNote[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<{
        id: string;
        friendId: string;
        content: string;
        visibility: FriendNoteVisibility;
        createdAt: string;
      }>;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((n) => typeof n.id === 'string' && typeof n.friendId === 'string' && typeof n.content === 'string')
        .map((n) => ({
          id: n.id,
          friendId: n.friendId,
          content: n.content,
          visibility: n.visibility === 'shared' ? 'shared' : 'private',
          createdAt: new Date(n.createdAt)
        }));
    } catch {
      return [];
    }
  }
}
