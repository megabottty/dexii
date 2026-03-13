import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SecurityService } from '../../core/services/security.service';
import { User, SubscriptionTier } from '../../core/models/user.model';
import { getApiBaseUrl } from '../../core/config/api-config';

interface FriendSearchResult {
  username: string;
  avatarUrl?: string;
  subscriptionTier?: SubscriptionTier;
  friendCategories?: string[];
  isFriend?: boolean;
  hasPendingRequest?: boolean;
}

interface FriendRequestItem {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

@Component({
  selector: 'app-friends-list',
  standalone: true,
  imports: [CommonModule, RouterModule, SlicePipe],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         style="min-height: 100vh; font-family: 'Times New Roman', serif; padding: 60px 40px; position: relative;">
      <nav [style.background-color]="theme.colors().bgSecondary"
           [style.border]="'1px solid ' + theme.colors().border"
           style="max-width: 900px; margin: 0 auto 28px auto; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + ', ' + theme.colors().accent + ')'"
               style="width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">D</div>
          <span style="font-size: 16px; letter-spacing: 2px; text-transform: uppercase;">Dexii</span>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <a routerLink="/dashboard" [style.color]="theme.colors().text"
             style="text-decoration: none; border: 1px solid {{ theme.colors().border }}; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Dashboard</a>
          <a routerLink="/vault" [style.color]="theme.colors().text"
             style="text-decoration: none; border: 1px solid {{ theme.colors().border }}; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Vault</a>
          <a routerLink="/chat" [style.color]="theme.colors().text"
             style="text-decoration: none; border: 1px solid {{ theme.colors().border }}; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Chat</a>
          <button (click)="theme.toggleTheme()" [style.color]="theme.colors().text"
                  [style.border]="'1px solid ' + theme.colors().border"
                  style="background: transparent; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">
            {{ theme.mode() === 'dark' ? 'Pearl' : 'Onyx' }}
          </button>
          <button (click)="lockApp()" [style.background-color]="theme.colors().primary"
                  style="color: white; border: none; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">
            Lock
          </button>
        </div>
      </nav>

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

      <div style="max-width: 900px; margin: 0 auto;">
        <h2 style="font-size: 32px; font-weight: 200; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 40px; border-bottom: 1px solid {{ theme.colors().border }}; padding-bottom: 20px;">
          The Inner Circle
        </h2>

        <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" style="padding: 20px; margin-bottom: 20px;">
          <p [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">
            Subscription Tier: {{ subscription.tier() }}
          </p>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button (click)="subscription.upgrade(freeTier)"
                    [style.background-color]="subscription.tier() === freeTier ? theme.colors().primary : 'transparent'"
                    [style.color]="subscription.tier() === freeTier ? 'white' : theme.colors().text"
                    [style.border]="'1px solid ' + theme.colors().border"
                    style="padding: 8px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">Free</button>
            <button (click)="subscription.upgrade(premiumTier)"
                    [style.background-color]="subscription.tier() === premiumTier ? theme.colors().primary : 'transparent'"
                    [style.color]="subscription.tier() === premiumTier ? 'white' : theme.colors().text"
                    [style.border]="'1px solid ' + theme.colors().border"
                    style="padding: 8px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">Premium ($5/mo)</button>
            <button (click)="subscription.upgrade(goldTier)"
                    [style.background-color]="subscription.tier() === goldTier ? theme.colors().primary : 'transparent'"
                    [style.color]="subscription.tier() === goldTier ? 'white' : theme.colors().text"
                    [style.border]="'1px solid ' + theme.colors().border"
                    style="padding: 8px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">Gold ($15/mo)</button>
          </div>
        </div>

        <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" style="padding: 20px; margin-bottom: 28px;">
          <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 0;">Find Friends</p>
          <div style="display: flex; gap: 10px; margin-bottom: 16px;">
            <input
              [value]="searchQuery()"
              (input)="searchQuery.set(asInputValue($event))"
              (keyup.enter)="searchUsers()"
              placeholder="Search by username"
              [style.background-color]="theme.colors().bg"
              [style.border]="'1px solid ' + theme.colors().border"
              [style.color]="theme.colors().text"
              style="flex: 1; padding: 10px 12px; outline: none; font-family: 'Times New Roman', serif;"
            >
            <button (click)="searchUsers()" [style.background-color]="theme.colors().primary" style="color: white; border: none; padding: 10px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">Search</button>
          </div>

          @if (searchResults().length > 0) {
            <div style="display: flex; flex-direction: column; gap: 10px;">
              @for (candidate of searchResults(); track candidate.username) {
                <div [style.border]="'1px solid ' + theme.colors().border" style="padding: 12px; display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img [src]="candidate.avatarUrl || 'https://i.pravatar.cc/150?u=' + candidate.username" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                    <span style="font-size: 14px;">{{ candidate.username }}</span>
                  </div>
                  <button
                    (click)="sendFriendRequest(candidate)"
                    [disabled]="candidate.isFriend || candidate.hasPendingRequest"
                    [style.opacity]="candidate.isFriend || candidate.hasPendingRequest ? '0.5' : '1'"
                    [style.background-color]="theme.colors().primary"
                    style="color: white; border: none; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;"
                  >
                    {{ candidate.isFriend ? 'Friend' : (candidate.hasPendingRequest ? 'Pending' : 'Request') }}
                  </button>
                </div>
              }
            </div>
          } @else if (didSearch()) {
            <div>
              <p [style.color]="theme.colors().textSecondary" style="margin: 0 0 10px 0; font-size: 12px; font-style: italic;">No users found.</p>
              @if (searchQuery().trim()) {
                <button (click)="inviteTypedUsername()"
                        [style.background-color]="theme.colors().primary"
                        style="color: white; border: none; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">
                  Invite {{ searchQuery().trim() }}
                </button>
              }
            </div>
          }
        </div>

        @if (incomingRequests().length > 0) {
          <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().accent" style="padding: 20px; margin-bottom: 28px;">
            <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 0;">Friend Requests</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              @for (req of incomingRequests(); track req.id) {
                <div [style.border]="'1px solid ' + theme.colors().border" style="padding: 12px; display: flex; align-items: center; justify-content: space-between;">
                  <span>{{ req.from }} wants to connect</span>
                  <div style="display: flex; gap: 8px;">
                    <button (click)="respondToRequest(req, 'accept')" [style.background-color]="'#16a34a'" style="color: white; border: none; padding: 6px 10px; font-size: 10px; cursor: pointer;">Accept</button>
                    <button (click)="respondToRequest(req, 'decline')" [style.background-color]="'#ef4444'" style="color: white; border: none; padding: 6px 10px; font-size: 10px; cursor: pointer;">Decline</button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (!subscription.isPremium()) {
          <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().accent"
               style="padding: 20px; margin-bottom: 40px; text-align: center;">
            <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Free Account: 5 Friends Limit</p>
            <button (click)="subscription.upgrade(goldTier)" [style.color]="theme.colors().accent"
                    style="background: none; border: none; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; text-decoration: underline;">Upgrade for Unlimited Sharing</button>
          </div>
        }

        <div style="display: flex; flex-direction: column; gap: 24px;">
          @for (friend of friends(); track friend.id) {
            <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border"
                 style="padding: 24px; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s;">

              <div style="display: flex; align-items: center; gap: 20px;">
                <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                <div>
                  <h4 style="font-size: 18px; font-weight: 400; margin: 0;">{{ friend.username }}</h4>
                  <span [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">{{ friend.friendCategories[0] || 'Uncategorized' }}</span>
                </div>
              </div>

              <div style="display: flex; gap: 12px;">
                <button (click)="manageSharing(friend)" [style.color]="theme.colors().primary"
                        style="background: none; border: 1px solid {{ theme.colors().primary }}; padding: 8px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">Sharing Controls</button>
                <a routerLink="/chat" [style.color]="theme.colors().text"
                   style="text-decoration: none; border: 1px solid {{ theme.colors().border }}; padding: 8px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">Chat</a>
                <button (click)="removeFriend(friend.id)" [style.color]="'#ef4444'"
                        style="background: none; border: 1px solid #ef4444; padding: 8px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">Remove</button>
              </div>
            </div>
          } @empty {
            <div style="text-align: center; padding: 60px; border: 1px dashed {{ theme.colors().border }};">
               <p [style.color]="theme.colors().textSecondary" style="font-style: italic;">Your inner circle is currently empty.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class FriendsListComponent implements OnInit {
  public theme = inject(ThemeService);
  public subscription = inject(SubscriptionService);
  public security = inject(SecurityService);
  private dataService = inject(DataService);

  private apiBase = `${getApiBaseUrl()}/demo/friends`;
  private currentUsername = localStorage.getItem('dexii_api_username') || 'dexii_demo_user';

  freeTier = SubscriptionTier.Free;
  premiumTier = SubscriptionTier.Premium;
  goldTier = SubscriptionTier.Gold;

  selectedFriend = signal<User | null>(null);
  friends = signal<User[]>([]);
  searchQuery = signal('');
  searchResults = signal<FriendSearchResult[]>([]);
  incomingRequests = signal<FriendRequestItem[]>([]);
  didSearch = signal(false);

  allCrushes = this.dataService.getAllCrushes();

  ngOnInit(): void {
    void this.loadFriends();
    void this.loadIncomingRequests();
  }

  asInputValue(event: Event): string {
    const target = event.target as HTMLInputElement | null;
    return target?.value ?? '';
  }

  private mapApiUser(friend: any): User {
    return {
      id: friend.id || friend.username,
      username: friend.username,
      friends: [],
      blockedUsers: [],
      subscriptionTier: friend.subscriptionTier || SubscriptionTier.Free,
      isVerified18: true,
      avatarUrl: friend.avatarUrl,
      friendCategories: friend.friendCategories || ['Close Friends']
    };
  }

  private async demoFetch(path: string, init: RequestInit = {}): Promise<any | null> {
    try {
      const response = await fetch(`${this.apiBase}${path}`, init);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async loadFriends() {
    const encoded = encodeURIComponent(this.currentUsername);
    const data = await this.demoFetch(`/list?username=${encoded}`);
    if (!Array.isArray(data)) return;
    this.friends.set(data.map((f) => this.mapApiUser(f)));
  }

  async loadIncomingRequests() {
    const encoded = encodeURIComponent(this.currentUsername);
    const data = await this.demoFetch(`/requests?username=${encoded}`);
    if (!Array.isArray(data)) return;
    this.incomingRequests.set(data);
  }

  async searchUsers() {
    this.didSearch.set(true);
    const query = encodeURIComponent(this.searchQuery().trim());
    const owner = encodeURIComponent(this.currentUsername);
    const data = await this.demoFetch(`/search?owner=${owner}&query=${query}`);
    if (!Array.isArray(data)) {
      this.searchResults.set([]);
      return;
    }
    this.searchResults.set(data);
  }

  async sendFriendRequest(candidate: FriendSearchResult) {
    if (!this.subscription.checkLimit(this.friends().length, 5)) {
      alert('Upgrade to Premium to add more than 5 friends.');
      return;
    }

    const result = await this.demoFetch('/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.currentUsername,
        to: candidate.username
      })
    });

    if (!result) {
      alert('Unable to send request right now.');
      return;
    }

    this.searchResults.update((items) =>
      items.map((u) =>
        u.username === candidate.username ? { ...u, hasPendingRequest: true } : u
      )
    );
    alert(result.status === 'already_friends' ? 'Already friends.' : 'Request sent.');
  }

  async inviteTypedUsername() {
    const username = this.searchQuery().trim();
    if (!username) return;
    await this.sendFriendRequest({ username });
  }

  async respondToRequest(req: FriendRequestItem, action: 'accept' | 'decline') {
    const updated = await this.demoFetch(`/requests/${req.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.currentUsername, action })
    });

    if (!updated) {
      alert('Unable to update request.');
      return;
    }

    this.incomingRequests.update((list) => list.filter((r) => r.id !== req.id));
    if (action === 'accept') {
      await this.loadFriends();
    }
  }

  async removeFriend(id: string) {
    if (!confirm('Are you sure you want to remove this friend from your inner circle? All shared tea will be revoked.')) {
      return;
    }

    await this.demoFetch(`/list/${encodeURIComponent(id)}?username=${encodeURIComponent(this.currentUsername)}`, {
      method: 'DELETE'
    });

    await this.loadFriends();
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
      this.dataService.toggleCrushVisibility(crushId, friend.id);
    }
  }

  toggleEntrySharing(entryId: string) {
    const friend = this.selectedFriend();
    if (friend) {
      this.dataService.toggleEntryVisibility(entryId, friend.id);
    }
  }

  getEntries(crushId: string) {
    return this.dataService.getEntriesForCrush(crushId)();
  }

  lockApp() {
    this.security.lockApp();
  }
}
