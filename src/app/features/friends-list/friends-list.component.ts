import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { PrivacyService } from '../../core/services/privacy.service';
import { ThemeService } from '../../core/services/theme.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { User, SubscriptionTier } from '../../core/models/user.model';

@Component({
  selector: 'app-friends-list',
  standalone: true,
  imports: [CommonModule, RouterModule, SlicePipe],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         style="min-height: 100vh; font-family: 'Times New Roman', serif; padding: 60px 40px; position: relative;">

      <!-- Sharing Controls Modal -->
      @if (selectedFriend()) {
        <div style="position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; backdrop-blur: 15px; padding: 20px;">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               style="width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto; padding: 40px; border-radius: 0px; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">

            <button (click)="closeSharing()" [style.color]="theme.colors().textSecondary" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>

            <h3 style="font-size: 28px; font-weight: 200; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 12px; text-align: center;">Sharing Controls</h3>
            <p [style.color]="theme.colors().textSecondary" style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 40px;">
              Managing access for {{ selectedFriend()?.username }}
            </p>

            <div style="display: flex; flex-direction: column; gap: 32px;">
              @for (crush of allCrushes(); track crush.id) {
                <div [style.border-bottom]="'1px solid ' + theme.colors().border" style="padding-bottom: 24px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                      <img [src]="crush.avatarUrl" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                      <div>
                        <h4 style="font-size: 16px; font-weight: 400; margin: 0;">{{ crush.nickname }}</h4>
                        <span [style.color]="theme.colors().primary" style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">{{ crush.status }}</span>
                      </div>
                    </div>
                    <button (click)="toggleCrushSharing(crush.id)"
                            [style.background-color]="isCrushShared(crush) ? theme.colors().primary : 'transparent'"
                            [style.color]="isCrushShared(crush) ? 'white' : theme.colors().text"
                            [style.border]="'1px solid ' + (isCrushShared(crush) ? theme.colors().primary : theme.colors().border)"
                            style="padding: 6px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: all 0.3s;">
                      {{ isCrushShared(crush) ? 'Shared' : 'Private' }}
                    </button>
                  </div>

                  @if (isCrushShared(crush)) {
                    <div style="padding-left: 56px; display: flex; flex-direction: column; gap: 12px;">
                      <p [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px 0;">Specific Entries</p>
                      @for (entry of getEntries(crush.id); track entry.id) {
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="font-size: 13px; font-style: italic; opacity: 0.8;">"{{ entry.content | slice:0:40 }}{{ entry.content.length > 40 ? '...' : '' }}"</span>
                          <button (click)="toggleEntrySharing(entry.id)"
                                  [style.color]="isEntryShared(entry) ? theme.colors().accent : theme.colors().textSecondary"
                                  style="background: none; border: none; font-size: 18px; cursor: pointer; padding: 0 8px;">
                            {{ isEntryShared(entry) ? '👁️' : '🔒' }}
                          </button>
                        </div>
                      } @empty {
                        <p [style.color]="theme.colors().textSecondary" style="font-size: 11px; font-style: italic;">No specific entries to share.</p>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <div style="max-width: 800px; margin: 0 auto;">
        <h2 style="font-size: 32px; font-weight: 200; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 40px; border-bottom: 1px solid {{ theme.colors().border }}; padding-bottom: 20px;">
          The Inner Circle
        </h2>

        <!-- Subscription Limit Warning -->
        @if (!subscription.isPremium()) {
          <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().accent"
               style="padding: 20px; margin-bottom: 40px; text-align: center;">
            <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
              Free Account: 5 Friends Limit
            </p>
            <button (click)="subscription.upgrade(goldTier)" [style.color]="theme.colors().accent"
                    style="background: none; border: none; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; text-decoration: underline;">
              Upgrade for Unlimited Sharing
            </button>
          </div>
        }

        <div style="display: flex; flex-direction: column; gap: 24px;">
          @for (friend of friends(); track friend.id) {
            <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border"
                 style="padding: 24px; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s;">

              <div style="display: flex; align-items: center; gap: 20px;">
                <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id"
                     style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                <div>
                  <h4 style="font-size: 18px; font-weight: 400; margin: 0;">{{ friend.username }}</h4>
                  <span [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    {{ friend.friendCategories[0] || 'Uncategorized' }}
                  </span>
                </div>
              </div>

              <div style="display: flex; gap: 12px;">
                <button (click)="manageSharing(friend)" [style.color]="theme.colors().primary"
                        style="background: none; border: 1px solid {{ theme.colors().primary }}; padding: 8px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">
                  Sharing Controls
                </button>
                <a routerLink="/chat" [style.color]="theme.colors().text"
                   style="text-decoration: none; border: 1px solid {{ theme.colors().border }}; padding: 8px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">
                  Chat
                </a>
                <button (click)="removeFriend(friend.id)" [style.color]="'#ef4444'"
                        style="background: none; border: 1px solid #ef4444; padding: 8px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">
                  Remove
                </button>
              </div>
            </div>
          } @empty {
            <div style="text-align: center; padding: 60px; border: 1px dashed {{ theme.colors().border }};">
               <p [style.color]="theme.colors().textSecondary" style="font-style: italic;">Your inner circle is currently empty.</p>
               <button (click)="addMockFriend()" [style.background-color]="theme.colors().primary"
                       style="color: white; border: none; padding: 12px 30px; margin-top: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">
                 Find Friends
               </button>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class FriendsListComponent {
  public theme = inject(ThemeService);
  public subscription = inject(SubscriptionService);
  private privacy = inject(PrivacyService);

  goldTier = SubscriptionTier.Gold;
  selectedFriend = signal<User | null>(null);

  allCrushes = this.privacy.getAllCrushes();

  friends = signal<User[]>([
    {
      id: 'friend_1',
      username: 'Bestie_Sarah',
      friends: [],
      blockedUsers: [],
      subscriptionTier: SubscriptionTier.Free,
      isVerified18: true,
      friendCategories: ['Close Friends'],
      avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
      email: 'sarah@example.com'
    },
    {
      id: 'friend_2',
      username: 'Tea_Spiller_Mark',
      friends: [],
      blockedUsers: [],
      subscriptionTier: SubscriptionTier.Premium,
      isVerified18: true,
      friendCategories: ['Casual'],
      avatarUrl: 'https://i.pravatar.cc/150?u=mark',
      email: 'mark@example.com'
    }
  ]);

  addMockFriend() {
    if (!this.subscription.checkLimit(this.friends().length, 5)) {
      alert("Upgrade to Premium to add more than 5 friends.");
      return;
    }
    const newFriend: User = {
      id: 'friend_' + Math.random().toString(36).substring(7),
      username: 'New_Friend_' + this.friends().length,
      friends: [],
      blockedUsers: [],
      subscriptionTier: SubscriptionTier.Free,
      isVerified18: false,
      friendCategories: ['General'],
      avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}`
    };
    this.friends.update(f => [...f, newFriend]);
  }

  removeFriend(id: string) {
    if (confirm("Are you sure you want to remove this friend from your inner circle? All shared tea will be revoked.")) {
      this.friends.update(f => f.filter(friend => friend.id !== id));
    }
  }

  manageSharing(friend: User) {
    this.selectedFriend.set(friend);
  }

  closeSharing() {
    this.selectedFriend.set(null);
  }

  isCrushShared(crush: any): boolean {
    const friend = this.selectedFriend();
    return friend ? crush.visibility.includes(friend.id) : false;
  }

  isEntryShared(entry: any): boolean {
    const friend = this.selectedFriend();
    return friend ? entry.visibility.includes(friend.id) : false;
  }

  toggleCrushSharing(crushId: string) {
    const friend = this.selectedFriend();
    if (friend) {
      this.privacy.toggleCrushVisibility(crushId, friend.id);
    }
  }

  toggleEntrySharing(entryId: string) {
    const friend = this.selectedFriend();
    if (friend) {
      this.privacy.toggleEntryVisibility(entryId, friend.id);
    }
  }

  getEntries(crushId: string) {
    return this.privacy.getEntriesForCrush(crushId)();
  }
}
