import { Injectable, signal, computed } from '@angular/core';
import { CrushProfile, CrushStatus } from '../models/crush-profile.model';

@Injectable({
  providedIn: 'root'
})
export class PrivacyService {
  private _allCrushes = signal<CrushProfile[]>([
    {
      id: '1',
      nickname: 'Coffee Shop Cutie',
      fullName: 'Alex Rivera',
      status: CrushStatus.Crush,
      bio: 'Loves oat milk lattes and indie rock. Has a great smile.',
      avatarUrl: 'https://i.pravatar.cc/150?u=alex',
      visibility: [],
      lastInteraction: new Date(),
      rating: 4
    },
    {
      id: '2',
      nickname: 'Gym Buddy',
      fullName: 'Jordan Smith',
      status: CrushStatus.Dating,
      bio: 'Very consistent, slightly obsessed with protein powder.',
      avatarUrl: 'https://i.pravatar.cc/150?u=jordan',
      visibility: [],
      lastInteraction: new Date(Date.now() - 86400000),
      rating: 5
    },
    {
      id: '3',
      nickname: 'The Ghost',
      fullName: 'Casey Moore',
      status: CrushStatus.Archive,
      bio: 'Last seen 3 weeks ago. Left me on read.',
      avatarUrl: 'https://i.pravatar.cc/150?u=casey',
      visibility: [],
      lastInteraction: new Date(Date.now() - 2592000000),
      rating: 1
    }
  ]);

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
}
