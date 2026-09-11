import { Component, signal, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { ModalService } from '../../core/services/modal.service';
import { MessagingService } from '../../core/services/messaging.service';
import {
  FriendsApiService,
  type FriendSearchResult as ApiFriendSearchResult,
  type FriendSummary
} from '../../core/services/friends-api.service';
import { User, SubscriptionTier } from '../../core/models/user.model';
import { PageHintComponent } from '../../core/components/page-hint.component';

interface FriendSearchResult extends Omit<Partial<ApiFriendSearchResult>, 'subscriptionTier'> {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneE164?: string;
  avatarUrl?: string;
  subscriptionTier?: SubscriptionTier | string;
  friendCategories?: string[];
}

type InviteMethod = 'email' | 'sms' | 'whatsapp' | 'copy' | 'share';

interface FriendRequestItem {
  id: string;
  from: string;
  to: string;
  fromId?: string;
  toId?: string;
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

interface FriendshipProfile {
  relationshipName?: string;
  relationshipType?: string;
  howMet?: string;
  trustLevel?: string;
  notes?: string;
}

interface FriendCardView {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  friendCategories: string[];
  subscriptionTier: SubscriptionTier;
  friendshipProfile?: FriendshipProfile | null;
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
                            [attr.aria-pressed]="isCrushShared(crush)"
                            [attr.aria-label]="(isCrushShared(crush) ? 'Unshare ' : 'Share ') + crush.nickname + ' with ' + (selectedFriend()?.username || 'selected friend')"
                            class="friends-list-component__s25">
                      {{ isCrushShared(crush) ? 'Unshare' : 'Share' }}
                    </button>
                  </div>

                  @if (isCrushShared(crush)) {
                    <div class="friends-list-component__s26">
                      <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s27">Specific Entries</p>
                      <div
                        [style.max-height]="getEntries(crush.id).length > 3 ? '260px' : 'none'"
                        [style.overflow-y]="getEntries(crush.id).length > 3 ? 'auto' : 'visible'"
                        [style.border]="'1px solid ' + theme.colors().border"
                        [style.background-color]="theme.colors().bg"
                        class="friends-list-specific-entries">
                        @for (entry of getEntries(crush.id); track entry.id) {
                          <div class="friends-list-component__s28">
                            <span class="friends-list-component__s29">"{{ entry.content | slice:0:40 }}{{ entry.content.length > 40 ? '...' : '' }}"</span>
                            <button (click)="toggleEntrySharing(entry)"
                                    [style.color]="isEntryShared(entry) ? theme.colors().accent : theme.colors().textSecondary"
                                    class="friends-list-component__s30">
                              {{ isEntryShared(entry) ? '👁️' : '🔒' }}
                            </button>
                          </div>
                        } @empty {
                          <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s31">No specific entries to share.</p>
                        }
                      </div>
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

        @if (!isAuthenticated()) {
          <div class="friends-list-auth-state" role="status">
            <p class="friends-list-auth-state__title">Sign in to manage live friends</p>
            <p class="friends-list-auth-state__message">
              Friend search, requests, and your inner circle now use the live Dexii API and require your signed-in account.
            </p>
          </div>
        }

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
              <button (click)="searchUsers()"
                      [disabled]="isSearching() || !isAuthenticated()"
                      [style.opacity]="isSearching() || !isAuthenticated() ? '0.6' : '1'"
                      [style.background-color]="theme.colors().primary"
                      class="friends-list-component__s40">
                {{ isSearching() ? 'Searching…' : 'Search' }}
              </button>
            </div>

            @if (searchError()) {
              <div class="friends-list-search-empty" role="alert" aria-live="assertive">
                <div class="friends-list-search-empty__icon" aria-hidden="true">⚠️</div>
                <div class="friends-list-search-empty__content">
                  <p class="friends-list-search-empty__title">Search unavailable</p>
                  <p class="friends-list-search-empty__message">{{ searchError() }}</p>
                </div>
              </div>
            } @else if (isSearching()) {
              <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s51">Searching live Dexii users…</p>
            } @else if (searchResults().length > 0) {
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
                    <div class="friends-list-component__s49">
                      @if (candidate.relationship === 'request_received') {
                        <button
                          (click)="acceptSearchResult(candidate)"
                          [disabled]="isSubmittingFriendAction()"
                          [style.opacity]="isSubmittingFriendAction() ? '0.6' : '1'"
                          [style.background-color]="'#16a34a'"
                          class="friends-list-component__s8">
                          {{ candidateActionLabel(candidate) }}
                        </button>
                      } @else {
                        <button
                          (click)="sendFriendRequest(candidate)"
                          [disabled]="candidate.relationship === 'friends' || candidate.relationship === 'request_sent' || isSubmittingFriendAction()"
                          [style.opacity]="candidate.relationship === 'friends' || candidate.relationship === 'request_sent' || isSubmittingFriendAction() ? '0.5' : '1'"
                          [style.background-color]="theme.colors().primary"
                         class="friends-list-component__s8">
                          {{ candidateActionLabel(candidate) }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else if (didSearch()) {
              <div class="friends-list-search-empty" role="alert" aria-live="assertive">
                <div class="friends-list-search-empty__icon" aria-hidden="true">⚠️</div>
                <div class="friends-list-search-empty__content">
                  <p class="friends-list-search-empty__title">No matching user found</p>
                  <p class="friends-list-search-empty__message">
                    @if (searchQuery().trim()) {
                      No Dexii user matched “{{ searchQuery().trim() }}”. You can invite them to connect instead.
                    } @else {
                      No Dexii user matched your search. Try another term, or invite them to connect instead.
                    }
                  </p>
                </div>
                @if (searchQuery().trim()) {
                  <button (click)="openAddFriendModal({ username: searchQuery().trim() })"
                          [style.background-color]="theme.colors().primary"
                          class="friends-list-component__s8 friends-list-search-empty__invite">
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
            </div>

            @if (isLoadingIncoming()) {
              <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s51">Loading incoming requests…</p>
            } @else if (incomingRequests().length > 0) {
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
              <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s51">No incoming requests yet.</p>
            }
          </div>
        }

        @if (activeTab() === 'sent') {
          <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().accent" class="friends-list-component__s36">
            <div class="friends-list-component__s46">
              <p class="friends-list-component__s47">Pending Sent Requests</p>
            </div>

            @if (isLoadingOutgoing()) {
              <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s51">Loading sent requests…</p>
            } @else if (outgoingRequests().length > 0) {
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
                      @if (req.friendshipProfile) {
                        <div [style.color]="theme.colors().textSecondary" style="font-size: 0.8rem; margin-top: 6px;">
                          {{ req.friendshipProfile.relationshipType || 'Friendship profile saved' }}
                          @if (req.friendshipProfile.relationshipName) {
                            • {{ req.friendshipProfile.relationshipName }}
                          }
                        </div>
                      }
                    </div>
                    <div class="friends-list-component__s49">
                      <button (click)="openFriendProfile(req)"
                              [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().text"
                              class="friends-list-component__s50">
                        View Profile
                      </button>
                      <button (click)="cancelOutgoingRequest(req)"
                              [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().textSecondary"
                              class="friends-list-component__s50">
                        Delete Request
                      </button>
                      <button (click)="nudgeRequest(req)"
                              [style.background-color]="theme.colors().primary"
                              class="friends-list-component__s50">
                        Nudge
                      </button>
                    </div>
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
            @if (isLoadingFriends()) {
              <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s51">Loading your live friends…</p>
            } @else if (friendsError()) {
              <div class="friends-list-search-empty" role="alert" aria-live="assertive">
                <div class="friends-list-search-empty__icon" aria-hidden="true">⚠️</div>
                <div class="friends-list-search-empty__content">
                  <p class="friends-list-search-empty__title">Could not load friends</p>
                  <p class="friends-list-search-empty__message">{{ friendsError() }}</p>
                </div>
              </div>
            } @else {
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
                  <button (click)="openFriendProfileFromFriend(friend)"
                          [style.color]="theme.colors().primary"
                          [style.border]="'1px solid ' + theme.colors().primary"
                          class="friends-list-action-btn">
                    View Friendship
                  </button>
                  <button (click)="manageSharing(friend)" [style.color]="theme.colors().primary" [style.border]="'1px solid ' + theme.colors().primary"
                          class="friends-list-action-btn">Sharing</button>
                  <a routerLink="/chat"
                     [queryParams]="{ friendId: friend.id, friendName: friend.username }"
                     [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
                     class="friends-list-action-link">Chat</a>
                  <button (click)="archiveFriend(friend.id)" [style.color]="'#ef4444'"
                          class="friends-list-component__s60">Archive</button>
                </div>
              </div>
            } @empty {
              <div [style.border]="'1px dashed ' + theme.colors().border" class="friends-list-empty">
                 <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s61">Your inner circle is currently empty.</p>
              </div>
            }
            }
          </div>
        }
      </div>

      @if (viewingFriendProfile()) {
        <div class="friends-list-component__s9">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               class="friends-list-component__s10">
            <button (click)="closeFriendProfile()"
                    [style.color]="theme.colors().textSecondary"
                    aria-label="Close friendship profile"
                    class="friends-list-component__s11">✕</button>

            <h3 class="friends-list-component__s12">Friendship Profile</h3>
            <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s13">
              Fill this out for {{ viewingFriendUsername() || viewingFriendProfile()?.to }}
            </p>

            <div class="friends-list-add-modal-grid">
              <label class="friends-list-add-modal-label">
                Relationship Name
                <input [value]="friendProfileDraft().relationshipName || ''"
                       (input)="setFriendProfileRelationshipName($event)"
                       [style.background-color]="theme.colors().bgSecondary"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text"
                       class="friends-list-add-modal-input"
                       placeholder="How you label this friendship">
              </label>

              <label class="friends-list-add-modal-label">
                Relationship Type
                <select [value]="friendProfileDraft().relationshipType || 'Close Friend'"
                        (change)="setFriendProfileRelationshipType($event)"
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
                <input [value]="friendProfileDraft().howMet || ''"
                       (input)="setFriendProfileHowMet($event)"
                       [style.background-color]="theme.colors().bgSecondary"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text"
                       class="friends-list-add-modal-input"
                       placeholder="Work, school, app, mutuals...">
              </label>

              <label class="friends-list-add-modal-label">
                Trust Level
                <select [value]="friendProfileDraft().trustLevel || 'Medium'"
                        (change)="setFriendProfileTrustLevel($event)"
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
                <textarea [value]="friendProfileDraft().notes || ''"
                          (input)="setFriendProfileNotes($event)"
                          [style.background-color]="theme.colors().bgSecondary"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.color]="theme.colors().text"
                          class="friends-list-add-modal-textarea"
                          placeholder="Anything you want to remember"></textarea>
              </label>
            </div>

            <div class="friends-list-add-modal-actions">
              <button (click)="saveFriendshipProfile()"
                      [style.background-color]="theme.colors().primary"
                      class="friends-list-component__s8">
                Save Questionnaire
              </button>
            </div>

            @if (viewingFriendProfile()?.invite; as invite) {
              <div [style.border-top]="'1px solid ' + theme.colors().border" style="margin-top: 18px; padding-top: 18px;">
                <p [style.color]="theme.colors().primary" style="margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Invite Details</p>
                <div class="friends-list-profile-grid">
                  <div class="friends-list-profile-row">
                    <span class="friends-list-profile-label">Method</span>
                    <span class="friends-list-profile-value">{{ invite.method || 'N/A' }}</span>
                  </div>
                  <div class="friends-list-profile-row">
                    <span class="friends-list-profile-label">Contact</span>
                    <span class="friends-list-profile-value">{{ invite.contact || 'N/A' }}</span>
                  </div>
                  <div class="friends-list-profile-row friends-list-profile-row--full">
                    <span class="friends-list-profile-label">Message</span>
                    <span class="friends-list-profile-value">{{ invite.message || 'N/A' }}</span>
                  </div>
                </div>
              </div>
            }

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; flex-wrap: wrap;">
              <a [routerLink]="['/friends', viewingFriendUsername() || viewingFriendProfile()?.to]"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.color]="theme.colors().text"
                 class="friends-list-action-link">
                Open Bio
              </a>
            </div>
          </div>
        </div>
      }

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
                {{ addFriendCandidate()?.id ? 'Add Friend & Invite' : 'Send Invite' }}
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
  public messaging = inject(MessagingService);
  private friendsApi = inject(FriendsApiService);
  private dataService = inject(DataService);
  private route = inject(ActivatedRoute);

  private get currentUserId(): string | null {
    return this.security.currentUserId();
  }

  private get currentUsername(): string {
    return this.security.currentUser() || '';
  }

  selectedFriend = signal<FriendCardView | null>(null);
  activeTab = signal<'friends' | 'find' | 'incoming' | 'sent'>('friends');
  friends = signal<FriendCardView[]>([]);
  searchQuery = signal('');
  searchResults = signal<FriendSearchResult[]>([]);
  incomingRequests = signal<FriendRequestItem[]>([]);
  outgoingRequests = signal<FriendRequestItem[]>([]);
  didSearch = signal(false);
  isLoadingFriends = signal(false);
  isLoadingIncoming = signal(false);
  isLoadingOutgoing = signal(false);
  isSearching = signal(false);
  isSubmittingFriendAction = signal(false);
  friendsError = signal('');
  searchError = signal('');
  addFriendCandidate = signal<FriendSearchResult | null>(null);
  addFriendRelationshipName = signal('');
  addFriendRelationshipType = signal('Close Friend');
  addFriendHowMet = signal('');
  addFriendTrustLevel = signal('Medium');
  addFriendNotes = signal('');
  addFriendInviteMethod = signal<InviteMethod>('email');
  addFriendInviteContact = signal('');
  addFriendInviteMessage = signal('');
  viewingFriendProfile = signal<FriendRequestItem | null>(null);
  viewingFriendUsername = signal('');
  friendProfileDraft = signal<FriendshipProfile>({
    relationshipName: '',
    relationshipType: 'Close Friend',
    howMet: '',
    trustLevel: 'Medium',
    notes: ''
  });
  private hasInitializedIncoming = false;
  private incomingPollTimer: ReturnType<typeof setInterval> | null = null;

  allCrushes = this.dataService.getAllCrushes();

  constructor() {
    // React to user changes automatically
    effect(() => {
      const userId = this.security.currentUserId();
      if (userId) {
        void this.loadFriends();
        void this.loadIncomingRequests();
        void this.loadOutgoingRequests();
        this.startIncomingRequestPolling();
      } else {
        this.friends.set([]);
        this.searchResults.set([]);
        this.incomingRequests.set([]);
        this.outgoingRequests.set([]);
        this.friendsError.set('');
        this.searchError.set('');
        this.hasInitializedIncoming = false;
        this.stopIncomingRequestPolling();
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'friends' || tab === 'find' || tab === 'incoming' || tab === 'sent') {
        this.activeTab.set(tab);
      }
    });

    if (this.isAuthenticated()) {
      this.startIncomingRequestPolling();
    }
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

  isAuthenticated(): boolean {
    return this.friendsApi.isAuthenticated();
  }

  candidateActionLabel(candidate: FriendSearchResult): string {
    if (candidate.relationship === 'friends') return 'Already friends';
    if (candidate.relationship === 'request_sent') return 'Pending Sent';
    if (candidate.relationship === 'request_received') return 'Accept';
    return 'Add Friend';
  }

  inviteContactPlaceholder(): string {
    const method = this.addFriendInviteMethod();
    if (method === 'email') return 'friend@email.com';
    if (method === 'sms') return '+1 555 123 4567';
    if (method === 'whatsapp') return '+1 555 123 4567';
    return 'Optional';
  }

  private mapApiUser(friend: FriendSummary & { firstName?: string; lastName?: string; subscriptionTier?: SubscriptionTier | string }): FriendCardView {
    const id = friend.id || friend.username;
    return {
      id,
      username: friend.username,
      firstName: friend.firstName || '',
      lastName: friend.lastName || '',
      avatarUrl: friend.avatarUrl,
      friendCategories: friend.friendCategories || ['Close Friends'],
      subscriptionTier: (friend.subscriptionTier as SubscriptionTier) || SubscriptionTier.Free,
      friendshipProfile: this.readFriendshipProfile(id) || null
    };
  }

  private mapRequest(request: any): FriendRequestItem {
    const from = request.from || {};
    const to = request.to || {};
    const fromId = typeof from === 'object' ? from.id : undefined;
    const toId = typeof to === 'object' ? to.id : undefined;
    const fromUsername = typeof from === 'string' ? from : from.username || fromId || 'Unknown user';
    const toUsername = typeof to === 'string' ? to : to.username || toId || 'Unknown user';
    const profileTarget = this.currentUserId === fromId ? toId : fromId;

    return {
      id: request.id,
      from: fromUsername,
      to: toUsername,
      fromId,
      toId,
      status: request.status || 'pending',
      createdAt: request.createdAt || new Date().toISOString(),
      nudgeCount: request.nudgeCount,
      lastNudgedAt: request.lastNudgedAt,
      friendshipProfile: request.friendshipProfile || (profileTarget ? this.readFriendshipProfile(profileTarget) : undefined),
      invite: request.invite
    };
  }

  private getUserStorageSuffix(): string {
    return this.currentUserId || 'signed_out';
  }

  private getFriendshipProfilesStorageKey(): string {
    return `dexii_friendship_profiles_${this.getUserStorageSuffix()}`;
  }

  private readFriendshipProfiles(): Record<string, FriendshipProfile> {
    try {
      const raw = localStorage.getItem(this.getFriendshipProfilesStorageKey());
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private readFriendshipProfile(friendId: string): FriendshipProfile | null {
    return this.readFriendshipProfiles()[friendId] || null;
  }

  private writeFriendshipProfile(friendId: string, profile: FriendshipProfile): void {
    const profiles = this.readFriendshipProfiles();
    profiles[friendId] = profile;
    localStorage.setItem(this.getFriendshipProfilesStorageKey(), JSON.stringify(profiles));
  }

  private getArchivedFriendsStorageKey(): string {
    return `dexii_archived_friends_${this.getUserStorageSuffix()}`;
  }

  private readArchivedFriendIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.getArchivedFriendsStorageKey());
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set(parsed.filter((id: unknown): id is string => typeof id === 'string'));
    } catch {
      return new Set<string>();
    }
  }

  private writeArchivedFriendIds(ids: Set<string>): void {
    localStorage.setItem(this.getArchivedFriendsStorageKey(), JSON.stringify(Array.from(ids)));
  }

  private getSeenIncomingStorageKey(): string {
    return `dexii_seen_incoming_requests_${this.getUserStorageSuffix()}`;
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
    if (!this.isAuthenticated()) {
      this.friends.set([]);
      return;
    }

    this.isLoadingFriends.set(true);
    this.friendsError.set('');
    try {
      const data = await this.friendsApi.listFriends();
      const archivedIds = this.readArchivedFriendIds();
      this.friends.set(data.map((f) => this.mapApiUser(f)).filter((friend) => !archivedIds.has(friend.id)));
    } catch (error: any) {
      const message = error?.message || 'Unable to load friends.';
      this.friendsError.set(message);
      this.modal.show(message);
    } finally {
      this.isLoadingFriends.set(false);
    }
  }

  async loadIncomingRequests() {
    if (!this.isAuthenticated()) {
      this.incomingRequests.set([]);
      return;
    }

    this.isLoadingIncoming.set(true);
    try {
      const data = (await this.friendsApi.incomingRequests()).map((req) => this.mapRequest(req));
      await this.notifyForNewIncomingRequests(data);
      this.incomingRequests.set(data);
    } catch (error: any) {
      const message = error?.message || 'Unable to load incoming requests.';
      this.modal.show(message);
    } finally {
      this.isLoadingIncoming.set(false);
    }
  }

  async loadOutgoingRequests() {
    if (!this.isAuthenticated()) {
      this.outgoingRequests.set([]);
      return;
    }

    this.isLoadingOutgoing.set(true);
    try {
      const data = (await this.friendsApi.outgoingRequests()).map((req) => this.mapRequest(req));
      this.outgoingRequests.set(data);
    } catch (error: any) {
      const message = error?.message || 'Unable to load sent requests.';
      this.modal.show(message);
    } finally {
      this.isLoadingOutgoing.set(false);
    }
  }

  async searchUsers() {
    this.didSearch.set(true);
    this.searchError.set('');
    const query = this.searchQuery().trim();
    if (!this.isAuthenticated()) {
      this.searchResults.set([]);
      this.searchError.set('Sign in to search live Dexii users.');
      return;
    }
    if (!query) {
      this.searchResults.set([]);
      return;
    }

    this.isSearching.set(true);
    try {
      this.searchResults.set(await this.friendsApi.search(query));
    } catch (error: any) {
      const message = error?.message || 'Unable to search users right now.';
      this.searchResults.set([]);
      this.searchError.set(message);
      this.modal.show(message);
    } finally {
      this.isSearching.set(false);
    }
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

  openFriendProfile(request: FriendRequestItem) {
    const target = request.fromId === this.currentUserId ? request.to : request.from;
    const targetId = request.fromId === this.currentUserId ? request.toId : request.fromId;
    const storedProfile = targetId ? this.readFriendshipProfile(targetId) : null;
    this.viewingFriendUsername.set(target);
    this.friendProfileDraft.set({
      relationshipName: storedProfile?.relationshipName || request.friendshipProfile?.relationshipName || '',
      relationshipType: storedProfile?.relationshipType || request.friendshipProfile?.relationshipType || 'Close Friend',
      howMet: storedProfile?.howMet || request.friendshipProfile?.howMet || '',
      trustLevel: storedProfile?.trustLevel || request.friendshipProfile?.trustLevel || 'Medium',
      notes: storedProfile?.notes || request.friendshipProfile?.notes || ''
    });
    this.viewingFriendProfile.set({ ...request, friendshipProfile: storedProfile || request.friendshipProfile });
  }

  openFriendProfileFromFriend(friend: FriendCardView) {
    this.viewingFriendUsername.set(friend.username);
    this.friendProfileDraft.set({
      relationshipName: friend.friendshipProfile?.relationshipName || friend.username,
      relationshipType: friend.friendshipProfile?.relationshipType || 'Close Friend',
      howMet: friend.friendshipProfile?.howMet || '',
      trustLevel: friend.friendshipProfile?.trustLevel || 'Medium',
      notes: friend.friendshipProfile?.notes || ''
    });
    this.viewingFriendProfile.set({
      id: `friend-${friend.id}`,
      from: this.currentUsername || this.currentUserId || '',
      to: friend.username,
      fromId: this.currentUserId || undefined,
      toId: friend.id,
      status: 'accepted',
      createdAt: new Date().toISOString(),
      friendshipProfile: friend.friendshipProfile || undefined
    });
  }

  closeFriendProfile() {
    this.viewingFriendProfile.set(null);
    this.viewingFriendUsername.set('');
  }

  setFriendProfileRelationshipName(event: Event) {
    this.friendProfileDraft.update((draft) => ({ ...draft, relationshipName: this.asInputValue(event) }));
  }

  setFriendProfileRelationshipType(event: Event) {
    this.friendProfileDraft.update((draft) => ({ ...draft, relationshipType: this.asSelectValue(event) }));
  }

  setFriendProfileHowMet(event: Event) {
    this.friendProfileDraft.update((draft) => ({ ...draft, howMet: this.asInputValue(event) }));
  }

  setFriendProfileTrustLevel(event: Event) {
    this.friendProfileDraft.update((draft) => ({ ...draft, trustLevel: this.asSelectValue(event) }));
  }

  setFriendProfileNotes(event: Event) {
    this.friendProfileDraft.update((draft) => ({ ...draft, notes: this.asTextAreaValue(event) }));
  }

  async saveFriendshipProfile() {
    const profile = this.viewingFriendProfile();
    const target = profile?.fromId === this.currentUserId
      ? profile?.toId || this.viewingFriendUsername()
      : profile?.fromId || this.viewingFriendUsername();
    if (!target) {
      this.modal.show('Missing friend.');
      return;
    }

    const draft = this.friendProfileDraft();
    const friendshipProfile = {
      relationshipName: draft.relationshipName?.trim() || '',
      relationshipType: draft.relationshipType?.trim() || 'Close Friend',
      howMet: draft.howMet?.trim() || '',
      trustLevel: draft.trustLevel?.trim() || 'Medium',
      notes: draft.notes?.trim() || ''
    };

    this.writeFriendshipProfile(target, friendshipProfile);
    this.friends.update((items) =>
      items.map((friend) => friend.id === target || friend.username === target ? { ...friend, friendshipProfile } : friend)
    );
    this.viewingFriendProfile.update((profile) => profile ? { ...profile, friendshipProfile } : profile);
    this.modal.show('Friendship profile saved.');
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
    const from = this.currentUsername ? `@${this.currentUsername}` : 'me';
    return `${base}\n\nMake your own Dexii account: ${appUrl}\nThen search for me: ${from}`;
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
    if (payload.method === 'email' || payload.method === 'sms') {
      try {
        const result = await this.friendsApi.invite(payload.contact, payload.method, payload.message);
        return {
          ok: true,
          method: payload.method,
          delivery: result.delivery,
          launchUrl: result.smsUrl,
          message: result.message
        };
      } catch (error: any) {
        // The server returns their profile when the contact already has an account.
        if (error?.alreadyRegistered && error?.user?.username) {
          this.modal.show(`${error.user.username} is already on Dexii. Search for them to send a friend request instead.`);
          return null;
        }
        this.modal.show(error?.message || 'Unable to send invite right now.');
        return null;
      }
    }

    return { ok: true, method: payload.method };
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

    const friendshipProfile = {
      relationshipName: this.addFriendRelationshipName().trim(),
      relationshipType: this.addFriendRelationshipType().trim(),
      howMet: this.addFriendHowMet().trim(),
      trustLevel: this.addFriendTrustLevel().trim(),
      notes: this.addFriendNotes().trim()
    };

    if (candidate.id && (!candidate.relationship || candidate.relationship === 'none')) {
      const result = await this.sendFriendRequest({ ...candidate, username }, { friendshipProfile });
      if (!result) return;
      this.writeFriendshipProfile(candidate.id, friendshipProfile);
    }

    const inviteMessage = this.buildInviteMessage(username);
    const inviteResult = await this.sendInvite({
      toUsername: username,
      method: inviteMethod,
      contact: inviteContact,
      message: this.addFriendInviteMessage().trim()
    });
    if (!inviteResult) return;

    // Only claim delivery when the server actually sent it.
    if (inviteResult.delivery === 'sent') {
      this.modal.show(inviteResult.message || `Invite sent to ${inviteContact}.`);
    } else if (inviteResult.delivery === 'debug') {
      this.modal.show(inviteResult.message || 'Invite created, but email delivery is not configured on the server.');
    } else {
      await this.dispatchInvite(inviteMethod, inviteContact, inviteMessage, inviteResult.launchUrl);
      if (inviteMethod === 'sms' || inviteMethod === 'whatsapp') {
        this.modal.show('Invite ready. Finish sending it in your messaging app.');
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
    if (!this.isAuthenticated()) {
      this.modal.show('Sign in to add friends.');
      return null;
    }
    if (!candidate.id) {
      this.modal.show('Search for a live Dexii user before sending a friend request, or invite them instead.');
      return null;
    }

    this.isSubmittingFriendAction.set(true);
    try {
      const result = await this.friendsApi.sendRequest(candidate.id, details?.invite?.message || '');
      if (details?.friendshipProfile) {
        this.writeFriendshipProfile(candidate.id, details.friendshipProfile);
      }
      this.searchResults.update((items) =>
        items.map((u) =>
          u.id === candidate.id ? { ...u, relationship: 'request_sent' } : u
        )
      );
      await this.loadOutgoingRequests();
      this.modal.show('Friend request sent.');
      return result;
    } catch (error: any) {
      this.modal.show(error?.message || 'Unable to send request right now.');
      return null;
    } finally {
      this.isSubmittingFriendAction.set(false);
    }
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
    try {
      await this.friendsApi.respondToRequest(req.id, action);
      this.incomingRequests.update((list) => list.filter((r) => r.id !== req.id));
      if (action === 'accept') {
        await this.loadFriends();
        this.searchResults.update((items) =>
          items.map((candidate) => candidate.id === req.fromId ? { ...candidate, relationship: 'friends' } : candidate)
        );
      }
      await this.loadOutgoingRequests();
    } catch (error: any) {
      this.modal.show(error?.message || 'Unable to update request.');
    }
  }

  async acceptSearchResult(candidate: FriendSearchResult) {
    const request = this.incomingRequests().find((req) =>
      (candidate.id && req.fromId === candidate.id) || req.from === candidate.username
    );
    if (!request) {
      this.modal.show('Unable to find that incoming request. Refreshing requests now.');
      await this.loadIncomingRequests();
      return;
    }
    await this.respondToRequest(request, 'accept');
  }

  async removeFriend(id: string) {
    this.modal.confirm('Are you sure you want to remove this friend from your inner circle? All shared tea will be revoked.', async () => {
      try {
        await this.friendsApi.removeFriend(id);
        const archivedIds = this.readArchivedFriendIds();
        archivedIds.delete(id);
        this.writeArchivedFriendIds(archivedIds);
        await this.loadFriends();
        this.modal.show('Friend removed.');
      } catch (error: any) {
        this.modal.show(error?.message || 'Unable to remove friend right now.');
      }
    });
  }

  async archiveFriend(id: string) {
    this.modal.confirm('Archive this friend from your inner circle on this device? Your live friendship and shared access will stay active.', async () => {
      const archivedIds = this.readArchivedFriendIds();
      archivedIds.add(id);
      this.writeArchivedFriendIds(archivedIds);
      await this.loadFriends();
      this.modal.show('Friend archived.');
    });
  }

  manageSharing(friend: FriendCardView) {
    this.selectedFriend.set(friend);
  }

  closeSharing() {
    this.selectedFriend.set(null);
  }

  async nudgeRequest(req: FriendRequestItem) {
    try {
      await this.friendsApi.nudgeRequest(req.id);
      await this.loadOutgoingRequests();
      this.modal.show(`Nudge sent to ${req.to}.`);
    } catch (error: any) {
      this.modal.show(error?.message || 'Unable to send nudge right now.');
    }
  }

  async cancelOutgoingRequest(req: FriendRequestItem) {
    this.modal.confirm(`Delete the pending request to ${req.to}?`, async () => {
      try {
        await this.friendsApi.cancelRequest(req.id);
        await this.loadOutgoingRequests();
        await this.searchUsers();
        this.modal.show('Friend request deleted.');
      } catch (error: any) {
        this.modal.show(error?.message || 'Unable to delete request right now.');
      }
    });
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

  toggleEntrySharing(entry: any) {
    const friend = this.selectedFriend();
    if (!friend) return;

    const wasShared = this.isEntryShared(entry);
    this.dataService.toggleEntryVisibility(entry.id, friend.id);

    if (!wasShared) {
      const crush = this.allCrushes().find((current) => current.id === entry.crushId);
      const preview = (entry.content || '').trim();
      this.messaging.sendMessage({
        senderId: this.currentUserId || this.currentUsername,
        receiverId: friend.id,
        content: `Shared a specific entry${crush ? ` from ${crush.nickname}` : ''}: ${preview}`,
        relatedCrushId: entry.crushId,
        relatedEntryId: entry.id
      });
      this.modal.show(`Shared entry sent to ${friend.username}.`);
    }
  }

  getEntries(crushId: string) {
    return this.dataService.getEntriesForCrush(crushId)();
  }

  lockApp() {
    this.security.lockApp();
  }
}
