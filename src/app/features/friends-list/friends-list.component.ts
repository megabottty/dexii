import { Component, signal, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { ModalService } from '../../core/services/modal.service';
import { User, SubscriptionTier } from '../../core/models/user.model';
import { getApiBaseUrl } from '../../core/config/api-config';
import { PageHintComponent } from '../../core/components/page-hint.component';

interface FriendSearchResult {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneE164?: string;
  avatarUrl?: string;
  subscriptionTier?: SubscriptionTier;
  friendCategories?: string[];
  isFriend?: boolean;
  hasPendingRequest?: boolean;
}

type InviteMethod = 'email' | 'sms' | 'whatsapp' | 'copy' | 'share';

interface FriendRequestItem {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  nudgeCount?: number;
  lastNudgedAt?: string;
  friendshipProfile?: {
    relationshipName?: string;
    relationshipType?: string;
    howMet?: string;
    trustLevel?: string;
    notes?: string;
  };
  invite?: {
    method?: InviteMethod;
    contact?: string;
    message?: string;
    sentAt?: string;
  };
}

import { NavbarComponent } from '../../core/components/navbar/navbar.component';

@Component({
  selector: 'app-friends-list',
  standalone: true,
  styleUrl: './friends-list.component.css',
  imports: [CommonModule, RouterModule, SlicePipe, PageHintComponent, NavbarComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         class="friends-list-component__s1">
      <app-navbar></app-navbar>

      @if (selectedFriend()) {
        <div class="friends-list-component__s9">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               class="friends-list-component__s10">

            <button (click)="closeSharing()" [style.color]="theme.colors().textSecondary" aria-label="Close sharing controls" class="friends-list-component__s11">✕</button>

            <h3 class="friends-list-component__s12">Sharing Controls</h3>
            <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s13">
              Managing access for {{ selectedFriend()?.username }}
            </p>
            <div [style.border]="'1px solid ' + theme.colors().border"
                 class="friends-list-component__s14">
              <img [src]="selectedFriend()?.avatarUrl || 'https://i.pravatar.cc/150?u=' + (selectedFriend()?.id || 'friend')"
                   [alt]="selectedFriend()?.username || 'Selected friend'"
                   class="friends-list-component__s15">
              <div>
                <p [style.color]="theme.colors().textSecondary"
                   class="friends-list-component__s16">
                  Sharing with
                </p>
                <p class="friends-list-component__s17">{{ selectedFriend()?.username }}</p>
              </div>
            </div>

            <div class="friends-list-component__s18">
              @for (crush of allCrushes(); track crush.id) {
                <div [style.border-bottom]="'1px solid ' + theme.colors().border" class="friends-list-component__s19">
                  <div class="friends-list-component__s20">
                    <div class="friends-list-component__s21">
                      <img [src]="crush.avatarUrl" [alt]="crush.nickname + ' avatar'" class="friends-list-component__s22">
                      <div>
                        <h4 class="friends-list-component__s23">{{ crush.nickname }}</h4>
                        <span [style.color]="theme.colors().primary" class="friends-list-component__s24">{{ crush.status }}</span>
                      </div>
                    </div>
                    <button (click)="toggleCrushSharing(crush.id)"
                            [style.background-color]="isCrushShared(crush) ? theme.colors().primary : 'transparent'"
                            [style.color]="isCrushShared(crush) ? 'white' : theme.colors().text"
                            [style.border]="'1px solid ' + (isCrushShared(crush) ? theme.colors().primary : theme.colors().border)"
                            class="friends-list-component__s25">
                      {{ isCrushShared(crush) ? 'Shared' : 'Private' }}
                    </button>
                  </div>

                  @if (isCrushShared(crush)) {
                    <div class="friends-list-component__s26">
                      <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s27">Specific Entries</p>
                      @for (entry of getEntries(crush.id); track entry.id) {
                        <div class="friends-list-component__s28">
                          <span class="friends-list-component__s29">"{{ entry.content | slice:0:40 }}{{ entry.content.length > 40 ? '...' : '' }}"</span>
                          <button (click)="toggleEntrySharing(entry.id)"
                                  [style.color]="isEntryShared(entry) ? theme.colors().accent : theme.colors().textSecondary"
                                  class="friends-list-component__s30">
                            {{ isEntryShared(entry) ? '👁️' : '🔒' }}
                          </button>
                        </div>
                      } @empty {
                        <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s31">No specific entries to share.</p>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <div class="friends-list-component__s32">
        <app-page-hint
          hintKey="friends_inline"
          title="Friends Hint"
          message="Add friends, open Bio for friend notes, and use Sharing Controls to manage crush and entry visibility by person.">
        </app-page-hint>

        <h2 [style.border-bottom]="'1px solid ' + theme.colors().border" class="friends-list-title">
          The Inner Circle
        </h2>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
          <button (click)="activeTab.set('friends')"
                  [style.background-color]="activeTab() === 'friends' ? theme.colors().primary : 'transparent'"
                  [style.color]="activeTab() === 'friends' ? 'white' : theme.colors().text"
                  [style.border]="'1px solid ' + (activeTab() === 'friends' ? theme.colors().primary : theme.colors().border)"
                  style="padding: 6px 12px; border-radius: 999px; cursor: pointer;">Friends ({{ friends().length }})</button>
          <button (click)="activeTab.set('find')"
                  [style.background-color]="activeTab() === 'find' ? theme.colors().primary : 'transparent'"
                  [style.color]="activeTab() === 'find' ? 'white' : theme.colors().text"
                  [style.border]="'1px solid ' + (activeTab() === 'find' ? theme.colors().primary : theme.colors().border)"
                  style="padding: 6px 12px; border-radius: 999px; cursor: pointer;">Add Friend</button>
          <button (click)="activeTab.set('incoming')"
                  [style.background-color]="activeTab() === 'incoming' ? theme.colors().primary : 'transparent'"
                  [style.color]="activeTab() === 'incoming' ? 'white' : theme.colors().text"
                  [style.border]="'1px solid ' + (activeTab() === 'incoming' ? theme.colors().primary : theme.colors().border)"
                  style="padding: 6px 12px; border-radius: 999px; cursor: pointer;">Incoming ({{ incomingRequests().length }})</button>
          <button (click)="activeTab.set('sent')"
                  [style.background-color]="activeTab() === 'sent' ? theme.colors().primary : 'transparent'"
                  [style.color]="activeTab() === 'sent' ? 'white' : theme.colors().text"
                  [style.border]="'1px solid ' + (activeTab() === 'sent' ? theme.colors().primary : theme.colors().border)"
                  style="padding: 6px 12px; border-radius: 999px; cursor: pointer;">Pending Sent ({{ outgoingRequests().length }})</button>
        </div>

        @if (activeTab() === 'find') {
          <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="friends-list-component__s36">
            <p class="friends-list-component__s37">Add Friend</p>
            <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
              <button (click)="startAddFriendFlow()"
                      [style.background-color]="theme.colors().primary"
                      class="friends-list-component__s8">
                + Start Add Friend
              </button>
            </div>
            <div class="friends-list-component__s38">
              <input
                [value]="searchQuery()"
                (input)="searchQuery.set(asInputValue($event))"
                (keyup.enter)="searchUsers()"
                placeholder="Search by name, username, email, or phone"
                [style.background-color]="theme.colors().bg"
                [style.border]="'1px solid ' + theme.colors().border"
                [style.color]="theme.colors().text"
               class="friends-list-component__s39">
              <button (click)="searchUsers()" [style.background-color]="theme.colors().primary" class="friends-list-component__s40">Search</button>
            </div>

            @if (searchResults().length > 0) {
              <div class="friends-list-component__s41">
                @for (candidate of searchResults(); track candidate.username) {
                  <div [style.border]="'1px solid ' + theme.colors().border" class="friends-list-component__s42">
                    <div class="friends-list-component__s3">
                      <img [src]="candidate.avatarUrl || 'https://i.pravatar.cc/150?u=' + candidate.username" [alt]="candidate.username + ' avatar'" class="friends-list-component__s43">
                      <div>
                        <span class="friends-list-component__s44">{{ candidateDisplayName(candidate) }}</span>
                        <div [style.color]="theme.colors().textSecondary" style="font-size: 0.8rem;">@{{ candidate.username }}</div>
                      </div>
                    </div>
                    <button
                      (click)="openAddFriendModal(candidate)"
                      [disabled]="candidate.isFriend"
                      [style.opacity]="candidate.isFriend ? '0.5' : '1'"
                      [style.background-color]="theme.colors().primary"
                     class="friends-list-component__s8">
                      {{ candidate.isFriend ? 'Friend' : (candidate.hasPendingRequest ? 'Continue Invite' : 'Add Friend') }}
                    </button>
                  </div>
                }
              </div>
            } @else if (didSearch()) {
              <div>
                <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s45">No users found.</p>
                @if (searchQuery().trim()) {
                  <button (click)="openAddFriendModal({ username: searchQuery().trim() })"
                          [style.background-color]="theme.colors().primary"
                          class="friends-list-component__s8">
                    Invite {{ searchQuery().trim() }}
                  </button>
                }
              </div>
            }
          </div>
        }

        @if (activeTab() === 'incoming') {
          <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().accent" class="friends-list-component__s36">
            <div class="friends-list-component__s46">
              <p class="friends-list-component__s47">Friend Requests</p>
              <button (click)="simulateIncomingRequest()" [style.color]="theme.colors().accent" [style.border]="'1px solid ' + theme.colors().accent"
                      class="friends-list-simulate-btn">
                Simulate Request
              </button>
            </div>

            @if (incomingRequests().length > 0) {
              <div class="friends-list-component__s48">
                @for (req of incomingRequests(); track req.id) {
                  <div [style.border]="'1px solid ' + theme.colors().border" class="friends-list-component__s42">
                    <span>{{ req.from }} wants to connect</span>
                    <div class="friends-list-component__s49">
                      <button (click)="respondToRequest(req, 'accept')" [style.background-color]="'#16a34a'" class="friends-list-component__s50">Accept</button>
                      <button (click)="respondToRequest(req, 'decline')" [style.background-color]="'#ef4444'" class="friends-list-component__s50">Decline</button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s51">No incoming requests yet. Tap “Simulate Request” to see the flow.</p>
            }
          </div>
        }

        @if (activeTab() === 'sent') {
          <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().accent" class="friends-list-component__s36">
            <div class="friends-list-component__s46">
              <p class="friends-list-component__s47">Pending Sent Requests</p>
            </div>

            @if (outgoingRequests().length > 0) {
              <div class="friends-list-component__s48">
                @for (req of outgoingRequests(); track req.id) {
                  <div [style.border]="'1px solid ' + theme.colors().border" class="friends-list-component__s42">
                    <div>
                      <div style="font-weight: 600;">To: {{ req.to }}</div>
                      <div [style.color]="theme.colors().textSecondary" style="font-size: 0.8rem;">
                        Sent {{ req.createdAt | date:'MMM d, h:mm a' }}
                        @if (req.lastNudgedAt) {
                          • Nudged {{ req.lastNudgedAt | date:'MMM d, h:mm a' }} ({{ req.nudgeCount || 1 }})
                        }
                      </div>
                    </div>
                    <button (click)="nudgeRequest(req)"
                            [style.background-color]="theme.colors().primary"
                            class="friends-list-component__s50">
                      Nudge
                    </button>
                  </div>
                }
              </div>
            } @else {
              <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s51">No open sent requests right now.</p>
            }
          </div>
        }

        @if (activeTab() === 'friends') {
          <div class="header-actions" style="margin-bottom: 14px; text-align: right;">
            <a routerLink="/shared-history" [style.color]="theme.colors().primary"
               style="text-decoration: none; font-weight: 500; font-family: 'Times New Roman', serif; font-size: 1.1rem; border: 1px solid currentColor; padding: 6px 12px; border-radius: 4px;">
              📜 Shared History
            </a>
          </div>

          <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().accent"
               class="friends-list-component__s52">
            <p class="friends-list-component__s47">
              Friends are unlimited on all tiers.
            </p>
          </div>

          <div class="friends-list-component__s53">
            @for (friend of friends(); track friend.id) {
              <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border"
                   class="friends-list-component__s54">

                <div class="friends-list-component__s55">
                  <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id" [alt]="friend.username + ' avatar'" class="friends-list-component__s56">
                  <div>
                    <h4 class="friends-list-component__s57">{{ friend.username }}</h4>
                    <span [style.color]="theme.colors().textSecondary" class="friends-list-component__s58">{{ friend.friendCategories[0] || 'Uncategorized' }}</span>
                  </div>
                </div>

                <div class="friends-list-component__s59">
                  <a [routerLink]="['/user', friend.id]" [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
                     class="friends-list-action-link">Profile</a>
                  <a [routerLink]="['/user', friend.id]" [style.color]="theme.colors().primary" [style.border]="'1px solid ' + theme.colors().primary"
                     [queryParams]="{history: true}"
                     class="friends-list-action-link">History</a>
                  <a [routerLink]="['/friends', friend.id]" [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
                     class="friends-list-action-link">Bio</a>
                  <button (click)="manageSharing(friend)" [style.color]="theme.colors().primary" [style.border]="'1px solid ' + theme.colors().primary"
                          class="friends-list-action-btn">Sharing</button>
                  <a routerLink="/chat"
                     [queryParams]="{ friendId: friend.id, friendName: friend.username }"
                     [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
                     class="friends-list-action-link">Chat</a>
                  <button (click)="removeFriend(friend.id)" [style.color]="'#ef4444'"
                          class="friends-list-component__s60">Remove</button>
                </div>
              </div>
            } @empty {
              <div [style.border]="'1px dashed ' + theme.colors().border" class="friends-list-empty">
                 <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s61">Your inner circle is currently empty.</p>
              </div>
            }
          </div>
        }
      </div>

      @if (addFriendCandidate()) {
        <div class="friends-list-component__s9">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               class="friends-list-component__s10">
            <button (click)="closeAddFriendModal()"
                    [style.color]="theme.colors().textSecondary"
                    aria-label="Close add friend modal"
                    class="friends-list-component__s11">✕</button>

            <h3 class="friends-list-component__s12">Add Friend</h3>
            <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s13">
              Create a friendship profile and send an invite to {{ addFriendCandidate()?.username }}.
            </p>

            <div class="friends-list-add-modal-grid">
              <label class="friends-list-add-modal-label">
                Friendship Name
                <input [value]="addFriendRelationshipName()"
                       (input)="addFriendRelationshipName.set(asInputValue($event))"
                       [style.background-color]="theme.colors().bgSecondary"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text"
                       class="friends-list-add-modal-input"
                       placeholder="How you'll label this friendship">
              </label>

              <label class="friends-list-add-modal-label">
                Relationship Type
                <select [value]="addFriendRelationshipType()"
                        (change)="addFriendRelationshipType.set(asSelectValue($event))"
                        [style.background-color]="theme.colors().bgSecondary"
                        [style.border]="'1px solid ' + theme.colors().border"
                        [style.color]="theme.colors().text"
                        class="friends-list-add-modal-input">
                  <option value="Close Friend">Close Friend</option>
                  <option value="Bestie">Bestie</option>
                  <option value="Work Friend">Work Friend</option>
                  <option value="Family Friend">Family Friend</option>
                  <option value="New Friend">New Friend</option>
                </select>
              </label>

              <label class="friends-list-add-modal-label">
                How You Met
                <input [value]="addFriendHowMet()"
                       (input)="addFriendHowMet.set(asInputValue($event))"
                       [style.background-color]="theme.colors().bgSecondary"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text"
                       class="friends-list-add-modal-input"
                       placeholder="Work, school, mutuals, app, etc.">
              </label>

              <label class="friends-list-add-modal-label">
                Trust Level
                <select [value]="addFriendTrustLevel()"
                        (change)="addFriendTrustLevel.set(asSelectValue($event))"
                        [style.background-color]="theme.colors().bgSecondary"
                        [style.border]="'1px solid ' + theme.colors().border"
                        [style.color]="theme.colors().text"
                        class="friends-list-add-modal-input">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>

              <label class="friends-list-add-modal-label friends-list-add-modal-label--full">
                Notes
                <textarea [value]="addFriendNotes()"
                          (input)="addFriendNotes.set(asTextAreaValue($event))"
                          [style.background-color]="theme.colors().bgSecondary"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.color]="theme.colors().text"
                          class="friends-list-add-modal-textarea"
                          placeholder="Anything helpful to remember before connecting"></textarea>
              </label>

              <label class="friends-list-add-modal-label">
                Invite Method
                <select [value]="addFriendInviteMethod()"
                        (change)="setInviteMethod(asSelectValue($event))"
                        [style.background-color]="theme.colors().bgSecondary"
                        [style.border]="'1px solid ' + theme.colors().border"
                        [style.color]="theme.colors().text"
                        class="friends-list-add-modal-input">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="copy">Copy Message</option>
                  <option value="share">Share Sheet</option>
                </select>
              </label>

              <label class="friends-list-add-modal-label">
                Invite Contact
                <input [value]="addFriendInviteContact()"
                       (input)="addFriendInviteContact.set(asInputValue($event))"
                       [style.background-color]="theme.colors().bgSecondary"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text"
                       class="friends-list-add-modal-input"
                       [placeholder]="inviteContactPlaceholder()">
              </label>

              <label class="friends-list-add-modal-label friends-list-add-modal-label--full">
                Invite Message
                <textarea [value]="addFriendInviteMessage()"
                          (input)="addFriendInviteMessage.set(asTextAreaValue($event))"
                          [style.background-color]="theme.colors().bgSecondary"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.color]="theme.colors().text"
                          class="friends-list-add-modal-textarea"
                          placeholder="Message they’ll receive"></textarea>
              </label>
            </div>

            <div class="friends-list-add-modal-actions">
              <button (click)="closeAddFriendModal()"
                      [style.border]="'1px solid ' + theme.colors().border"
                      class="friends-list-action-btn">
                Cancel
              </button>
              <button (click)="addFriendAndInvite()"
                      [style.background-color]="theme.colors().primary"
                      class="friends-list-component__s8">
                Add Friend & Invite
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class FriendsListComponent implements OnInit, OnDestroy {
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public modal = inject(ModalService);
  private dataService = inject(DataService);

  private apiBase = `${getApiBaseUrl()}/demo/friends`;

  private get currentUsername(): string {
    return this.security.currentUser() || 'dexii_demo_user';
  }

  selectedFriend = signal<User | null>(null);
  activeTab = signal<'friends' | 'find' | 'incoming' | 'sent'>('friends');
  friends = signal<User[]>([]);
  searchQuery = signal('');
  searchResults = signal<FriendSearchResult[]>([]);
  incomingRequests = signal<FriendRequestItem[]>([]);
  outgoingRequests = signal<FriendRequestItem[]>([]);
  didSearch = signal(false);
  addFriendCandidate = signal<FriendSearchResult | null>(null);
  addFriendRelationshipName = signal('');
  addFriendRelationshipType = signal('Close Friend');
  addFriendHowMet = signal('');
  addFriendTrustLevel = signal('Medium');
  addFriendNotes = signal('');
  addFriendInviteMethod = signal<InviteMethod>('email');
  addFriendInviteContact = signal('');
  addFriendInviteMessage = signal('');
  private hasInitializedIncoming = false;
  private incomingPollTimer: ReturnType<typeof setInterval> | null = null;

  allCrushes = this.dataService.getAllCrushes();

  constructor() {
    // React to user changes automatically
    effect(() => {
      const user = this.security.currentUser();
      if (user) {
        void this.loadFriends();
        void this.loadIncomingRequests();
        void this.loadOutgoingRequests();
        this.startIncomingRequestPolling();
      } else {
        this.friends.set([]);
        this.incomingRequests.set([]);
        this.outgoingRequests.set([]);
        this.hasInitializedIncoming = false;
        this.stopIncomingRequestPolling();
      }
    });
  }

  ngOnInit(): void {
    this.startIncomingRequestPolling();
  }

  ngOnDestroy(): void {
    this.stopIncomingRequestPolling();
  }

  asInputValue(event: Event): string {
    const target = event.target as HTMLInputElement | null;
    return target?.value ?? '';
  }

  asSelectValue(event: Event): string {
    const target = event.target as HTMLSelectElement | null;
    return target?.value ?? '';
  }

  asTextAreaValue(event: Event): string {
    const target = event.target as HTMLTextAreaElement | null;
    return target?.value ?? '';
  }

  candidateDisplayName(candidate: FriendSearchResult): string {
    const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
    return fullName || candidate.username;
  }

  inviteContactPlaceholder(): string {
    const method = this.addFriendInviteMethod();
    if (method === 'email') return 'friend@email.com';
    if (method === 'sms') return '+1 555 123 4567';
    if (method === 'whatsapp') return '+1 555 123 4567';
    return 'Optional';
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

  private getSeenIncomingStorageKey(): string {
    return `dexii_seen_incoming_requests_${this.currentUsername}`;
  }

  private readSeenIncomingRequestIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.getSeenIncomingStorageKey());
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set(parsed.filter((id: unknown): id is string => typeof id === 'string'));
    } catch {
      return new Set<string>();
    }
  }

  private writeSeenIncomingRequestIds(ids: Set<string>): void {
    localStorage.setItem(this.getSeenIncomingStorageKey(), JSON.stringify(Array.from(ids)));
  }

  private async showIncomingRequestBrowserNotification(message: string): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const notification = new Notification('New Friend Request', {
        body: message,
        tag: 'dexii-friend-request'
      });
      notification.onclick = () => {
        window.focus();
        this.activeTab.set('incoming');
        notification.close();
      };
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        void this.showIncomingRequestBrowserNotification(message);
      }
    }
  }

  private async notifyForNewIncomingRequests(requests: FriendRequestItem[]): Promise<void> {
    const idsInResponse = new Set(requests.map((req) => req.id));
    const seenIds = this.readSeenIncomingRequestIds();

    if (!this.hasInitializedIncoming) {
      this.hasInitializedIncoming = true;
      idsInResponse.forEach((id) => seenIds.add(id));
      this.writeSeenIncomingRequestIds(seenIds);
      return;
    }

    const newRequests = requests.filter((req) => !seenIds.has(req.id));
    if (newRequests.length === 0) return;

    newRequests.forEach((req) => seenIds.add(req.id));
    this.writeSeenIncomingRequestIds(seenIds);

    const names = newRequests.map((req) => req.from).slice(0, 3).join(', ');
    const extraCount = newRequests.length > 3 ? ` +${newRequests.length - 3} more` : '';
    const message = newRequests.length === 1
      ? `${newRequests[0].from} sent you a friend request.`
      : `${newRequests.length} new friend requests: ${names}${extraCount}.`;

    this.modal.show(message);
    await this.showIncomingRequestBrowserNotification(message);
  }

  private startIncomingRequestPolling(): void {
    if (this.incomingPollTimer) return;
    this.incomingPollTimer = setInterval(() => {
      void this.loadIncomingRequests();
    }, 15000);
  }

  private stopIncomingRequestPolling(): void {
    if (!this.incomingPollTimer) return;
    clearInterval(this.incomingPollTimer);
    this.incomingPollTimer = null;
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
    await this.notifyForNewIncomingRequests(data as FriendRequestItem[]);
    this.incomingRequests.set(data);
  }

  async loadOutgoingRequests() {
    const encoded = encodeURIComponent(this.currentUsername);
    const data = await this.demoFetch(`/requests/sent?username=${encoded}`);
    if (!Array.isArray(data)) return;
    this.outgoingRequests.set(data);
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

  openAddFriendModal(candidate: FriendSearchResult) {
    const cleanUsername = (candidate.username || '').trim();
    if (!cleanUsername) {
      this.modal.show('Enter a username first.');
      return;
    }

    const displayName = this.candidateDisplayName(candidate).trim() || cleanUsername;
    const inviteMethod: InviteMethod = candidate.email ? 'email' : candidate.phoneE164 ? 'sms' : 'copy';
    const inviteContact = inviteMethod === 'email'
      ? (candidate.email || '')
      : inviteMethod === 'sms'
      ? (candidate.phoneE164 || '')
      : '';

    this.addFriendCandidate.set({ ...candidate, username: cleanUsername });
    this.addFriendRelationshipName.set(displayName);
    this.addFriendRelationshipType.set('Close Friend');
    this.addFriendHowMet.set('');
    this.addFriendTrustLevel.set('Medium');
    this.addFriendNotes.set('');
    this.addFriendInviteMethod.set(inviteMethod);
    this.addFriendInviteContact.set(inviteContact);
    this.addFriendInviteMessage.set(
      `Hey ${displayName}! I added you in my Dexii circle. Make your own account and we can connect there.`
    );
  }

  closeAddFriendModal() {
    this.addFriendCandidate.set(null);
  }

  setInviteMethod(value: string) {
    const allowed: InviteMethod[] = ['email', 'sms', 'whatsapp', 'copy', 'share'];
    const method: InviteMethod = allowed.includes(value as InviteMethod) ? (value as InviteMethod) : 'copy';
    this.addFriendInviteMethod.set(method);
  }

  private buildInviteMessage(username: string): string {
    const custom = this.addFriendInviteMessage().trim();
    const base = custom || `Hey! I added you in my Dexii circle.`;
    const appUrl = typeof window !== 'undefined' ? `${window.location.origin}/signup-profile` : '/signup-profile';
    return `${base}\n\nMake your own Dexii account: ${appUrl}\nThen search for me: @${this.currentUsername}`;
  }

  private async dispatchInvite(method: InviteMethod, contact: string, message: string, launchUrl?: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const encodedMessage = encodeURIComponent(message);
    const cleanContact = (contact || '').trim();

    if (method === 'email') {
      if (launchUrl) {
        window.location.href = launchUrl;
        return;
      }
      const subject = encodeURIComponent('You are invited to Dexii');
      const to = encodeURIComponent(cleanContact);
      window.location.href = `mailto:${to}?subject=${subject}&body=${encodedMessage}`;
      return;
    }

    if (method === 'sms') {
      if (launchUrl) {
        window.location.href = launchUrl;
        return;
      }
      const to = encodeURIComponent(cleanContact);
      window.location.href = `sms:${to}?body=${encodedMessage}`;
      return;
    }

    if (method === 'whatsapp') {
      if (launchUrl) {
        window.open(launchUrl, '_blank', 'noopener');
        return;
      }
      const digits = cleanContact.replace(/\D/g, '');
      const target = digits ? `https://wa.me/${digits}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;
      window.open(target, '_blank', 'noopener');
      return;
    }

    if (method === 'share' && navigator.share) {
      try {
        await navigator.share({
          title: 'Dexii Invite',
          text: message
        });
        return;
      } catch {
        // Fall through to clipboard for canceled/unsupported share.
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      this.modal.show('Invite copied to clipboard.');
      return;
    }

    this.modal.show('Could not open invite channel on this device.');
  }

  private async sendInvite(
    payload: { toUsername: string; method: InviteMethod; contact: string; message: string }
  ): Promise<{ ok: boolean; method: InviteMethod; delivery?: string; launchUrl?: string; message?: string } | null> {
    const response = await this.demoFetch('/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.currentUsername,
        toUsername: payload.toUsername,
        method: payload.method,
        contact: payload.contact,
        message: payload.message
      })
    });

    if (!response?.ok) {
      this.modal.show(response?.message || 'Unable to send invite right now.');
      return null;
    }

    return response as { ok: boolean; method: InviteMethod; delivery?: string; launchUrl?: string; message?: string };
  }

  async addFriendAndInvite() {
    const candidate = this.addFriendCandidate();
    if (!candidate) return;

    const username = (candidate.username || '').trim();
    if (!username) {
      this.modal.show('Missing friend username.');
      return;
    }

    const inviteMethod = this.addFriendInviteMethod();
    const inviteContact = this.addFriendInviteContact().trim();
    if ((inviteMethod === 'email' || inviteMethod === 'sms') && !inviteContact) {
      this.modal.show('Please enter contact info for that invite method.');
      return;
    }

    const result = await this.sendFriendRequest(
      { ...candidate, username },
      {
        friendshipProfile: {
          relationshipName: this.addFriendRelationshipName().trim(),
          relationshipType: this.addFriendRelationshipType().trim(),
          howMet: this.addFriendHowMet().trim(),
          trustLevel: this.addFriendTrustLevel().trim(),
          notes: this.addFriendNotes().trim()
        },
        invite: {
          method: inviteMethod,
          contact: inviteContact,
          message: this.buildInviteMessage(username),
          sentAt: new Date().toISOString()
        }
      }
    );

    if (!result) return;

    const inviteMessage = this.buildInviteMessage(username);
    const inviteResult = await this.sendInvite({
      toUsername: username,
      method: inviteMethod,
      contact: inviteContact,
      message: inviteMessage
    });
    if (!inviteResult) return;

    if (inviteMethod === 'email') {
      this.modal.show('Invite email sent.');
    } else {
      await this.dispatchInvite(inviteMethod, inviteContact, inviteMessage, inviteResult.launchUrl);
      if (inviteMethod === 'sms' || inviteMethod === 'whatsapp') {
        this.modal.show('Invite prepared. Finish sending in your messaging app.');
      }
    }
    this.closeAddFriendModal();
  }

  async sendFriendRequest(
    candidate: FriendSearchResult,
    details?: {
      friendshipProfile?: {
        relationshipName?: string;
        relationshipType?: string;
        howMet?: string;
        trustLevel?: string;
        notes?: string;
      };
      invite?: {
        method?: InviteMethod;
        contact?: string;
        message?: string;
        sentAt?: string;
      };
    }
  ) {
    const result = await this.demoFetch('/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.currentUsername,
        to: candidate.username,
        friendshipProfile: details?.friendshipProfile,
        invite: details?.invite
      })
    });

    if (!result) {
      this.modal.show('Unable to send request right now.');
      return null;
    }

    this.searchResults.update((items) =>
      items.map((u) =>
        u.username === candidate.username ? { ...u, hasPendingRequest: true } : u
      )
    );
    await this.loadOutgoingRequests();
    if (result.status === 'already_friends') {
      this.modal.show('Already friends.');
      return result;
    }
    if (result.status === 'already_pending') {
      this.modal.show('Request already pending.');
      return result;
    }
    this.modal.show('Friend request saved.');
    return result;
  }

  async inviteTypedUsername() {
    const username = this.searchQuery().trim();
    if (!username) return;
    this.openAddFriendModal({ username });
  }

  startAddFriendFlow() {
    const usernameFromSearch = this.searchQuery().trim();
    if (usernameFromSearch) {
      this.openAddFriendModal({ username: usernameFromSearch });
      return;
    }

    this.modal.prompt('Who do you want to add? Enter their username.', '', (value) => {
      const username = (value || '').trim();
      if (!username) {
        this.modal.show('Please enter a username.');
        return;
      }
      this.searchQuery.set(username);
      this.openAddFriendModal({ username });
    });
  }

  async respondToRequest(req: FriendRequestItem, action: 'accept' | 'decline') {
    const updated = await this.demoFetch(`/requests/${req.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.currentUsername, action })
    });

    if (!updated) {
      this.modal.show('Unable to update request.');
      return;
    }

    this.incomingRequests.update((list) => list.filter((r) => r.id !== req.id));
    if (action === 'accept') {
      await this.loadFriends();
    }
    await this.loadOutgoingRequests();
  }

  async removeFriend(id: string) {
    this.modal.confirm('Are you sure you want to remove this friend from your inner circle? All shared tea will be revoked.', async () => {
      await this.demoFetch(`/list/${encodeURIComponent(id)}?username=${encodeURIComponent(this.currentUsername)}`, {
        method: 'DELETE'
      });

      await this.loadFriends();
    });
  }

  manageSharing(friend: User) {
    this.selectedFriend.set(friend);
  }

  closeSharing() {
    this.selectedFriend.set(null);
  }

  async simulateIncomingRequest() {
    const candidates = ['Tea_Spiller_Mark', 'Work_Bri', 'Club_Ari'];
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const result = await this.demoFetch('/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: pick, to: this.currentUsername })
    });

    if (!result) {
      this.modal.show('Unable to simulate a request right now.');
      return;
    }

    await this.loadIncomingRequests();
    if (result.status === 'already_pending') {
      this.modal.show('A request is already pending from that friend.');
    } else {
      this.modal.show(`Incoming request from ${pick}.`);
    }
  }

  async nudgeRequest(req: FriendRequestItem) {
    const result = await this.demoFetch(`/requests/${encodeURIComponent(req.id)}/nudge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.currentUsername })
    });

    if (!result?.ok) {
      this.modal.show('Unable to send nudge right now.');
      return;
    }

    await this.loadOutgoingRequests();
    this.modal.show(`Nudge sent to ${req.to}.`);
  }

  isCrushShared(crush: any): boolean {
    const friend = this.selectedFriend();
    if (!friend) return false;
    return this.dataService.isCrushSharedWith(crush, friend.id);
  }

  isEntryShared(entry: any): boolean {
    const friend = this.selectedFriend();
    return friend ? entry.visibility.includes(friend.id) || entry.visibility.includes('public') : false;
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
