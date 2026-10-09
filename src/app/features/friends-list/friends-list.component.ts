import { computed, Component, signal, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { FocusTrapDirective } from '../../core/a11y/focus-trap.directive';
import { IconComponent } from '../../core/components/icon/icon.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { ModalService } from '../../core/services/modal.service';
import { MessagingService } from '../../core/services/messaging.service';
import {
  FriendsApiService,
  FriendshipProfile,
  readLocalFriendshipProfile,
  clearLocalFriendshipProfile,
  writeLocalFriendshipProfile,
  type FriendSearchResult as ApiFriendSearchResult,
  type FriendSummary
} from '../../core/services/friends-api.service';
import { User, SubscriptionTier } from '../../core/models/user.model';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { CrushSharePickerComponent } from '../../core/components/crush-share-picker/crush-share-picker.component';

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
  kind?: 'request' | 'invite';
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
  
    id?: string;
  };
}


interface FriendCardView {
  paused?: boolean;
  mutedNotifications?: boolean;
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
  imports: [CommonModule, FormsModule, RouterModule, PageHintComponent, NavbarComponent, FocusTrapDirective, IconComponent, CrushSharePickerComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         class="friends-list-component__s1">
      <app-navbar></app-navbar>

      <div class="friends-list-component__s32">
        <app-page-hint
          hintKey="friends_inline"
          title="Friends Hint"
          message="Add friends here. Profile opens their page: what you share with each other, your history, and your private friendship profile. Share picks a crush for them to see. Pause and bin manage each friendship.">
        </app-page-hint>

        <h1 [style.border-bottom]="'1px solid ' + theme.colors().border" class="friends-list-title">
          The Inner Circle
        </h1>

        @if (!isAuthenticated()) {
          <div class="friends-list-auth-state" role="status">
            <p class="friends-list-auth-state__title">Sign in to manage live friends</p>
            <p class="friends-list-auth-state__message">
              Friend search, requests, and your inner circle now use the live Dexii API and require your signed-in account.
            </p>
          </div>
        }

        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
          <button (click)="activeTab.set('friends')" [attr.aria-pressed]="activeTab() === 'friends'"
                  [style.background-color]="activeTab() === 'friends' ? theme.colors().primary : 'transparent'"
                  [style.color]="activeTab() === 'friends' ? 'white' : theme.colors().text"
                  [style.border]="'1px solid ' + (activeTab() === 'friends' ? theme.colors().primary : theme.colors().border)"
                  class="friends-list-tab">Friends ({{ friends().length }})</button>
          <button (click)="activeTab.set('find')" [attr.aria-pressed]="activeTab() === 'find'"
                  [style.background-color]="activeTab() === 'find' ? theme.colors().primary : 'transparent'"
                  [style.color]="activeTab() === 'find' ? 'white' : theme.colors().text"
                  [style.border]="'1px solid ' + (activeTab() === 'find' ? theme.colors().primary : theme.colors().border)"
                  class="friends-list-tab">Add Friend</button>
          <button (click)="activeTab.set('incoming')" [attr.aria-pressed]="activeTab() === 'incoming'"
                  [style.background-color]="activeTab() === 'incoming' ? theme.colors().primary : 'transparent'"
                  [style.color]="activeTab() === 'incoming' ? 'white' : theme.colors().text"
                  [style.border]="'1px solid ' + (activeTab() === 'incoming' ? theme.colors().primary : theme.colors().border)"
                  class="friends-list-tab">Incoming ({{ incomingRequests().length }})</button>
          <button (click)="activeTab.set('sent')" [attr.aria-pressed]="activeTab() === 'sent'"
                  [style.background-color]="activeTab() === 'sent' ? theme.colors().primary : 'transparent'"
                  [style.color]="activeTab() === 'sent' ? 'white' : theme.colors().text"
                  [style.border]="'1px solid ' + (activeTab() === 'sent' ? theme.colors().primary : theme.colors().border)"
                  class="friends-list-tab">Pending Sent ({{ outgoingRequests().length }})</button>
          <button (click)="activeTab.set('paused')" [attr.aria-pressed]="activeTab() === 'paused'"
                  [style.background-color]="activeTab() === 'paused' ? theme.colors().primary : 'transparent'"
                  [style.color]="activeTab() === 'paused' ? 'white' : theme.colors().text"
                  [style.border]="'1px solid ' + (activeTab() === 'paused' ? theme.colors().primary : theme.colors().border)"
                  class="friends-list-tab">Paused ({{ pausedFriends().length }})</button>
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
                aria-label="Find people"
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
                        <div [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-small);">@{{ candidate.username }}</div>
                      </div>
                    </div>
                    <div class="friends-list-component__s49">
                      @if (candidate.relationship === 'request_received') {
                        <button
                          (click)="acceptSearchResult(candidate)"
                          [disabled]="isSubmittingFriendAction()"
                          [style.opacity]="isSubmittingFriendAction() ? '0.6' : '1'"
                          [style.background-color]="'#15803d'"
                          class="friends-list-component__s8">
                          {{ candidateActionLabel(candidate) }}
                        </button>
                      } @else if (candidate.relationship === 'invite_sent') {
                        <span class="friends-list-pending-chip"
                              [style.color]="theme.colors().onBgPrimary"
                              [style.border]="'1px solid ' + theme.colors().primary">✉️ Invite sent {{ candidate.invite?.sentAt | date:'MMM d' }}</span>
                        <span [style.color]="theme.colors().textSecondary" class="friends-list-invite-note">They haven't joined Dexii yet. You can send the invite again or withdraw it.</span>
                        <button type="button"
                                (click)="resendInvite(inviteItemFor(candidate))"
                                [disabled]="resendingInviteId() === candidate.id"
                                [style.background-color]="theme.colors().primary"
                                class="friends-list-component__s8">
                          {{ resendingInviteId() === candidate.id ? 'Sending…' : 'Send again' }}
                        </button>
                        <button type="button"
                                (click)="withdrawInvite(inviteItemFor(candidate))"
                                [style.color]="theme.colors().textSecondary"
                                [style.border]="'1px solid ' + theme.colors().border"
                                class="friends-list-action-btn">Withdraw invite</button>
                      } @else if (candidate.relationship === 'request_sent') {
                        <span class="friends-list-pending-chip"
                              [style.color]="theme.colors().onBgPrimary"
                              [style.border]="'1px solid ' + theme.colors().primary">⏳ Request pending</span>
                        @if (outgoingRequestFor(candidate); as pending) {
                          <button type="button"
                                  (click)="nudgeRequest(pending)"
                                  [disabled]="nudgeCooldownMs(pending) > 0 || nudgingRequestId() === pending.id"
                                  [style.opacity]="nudgeCooldownMs(pending) > 0 ? '0.6' : '1'"
                                  [style.background-color]="theme.colors().primary"
                                  [title]="nudgeCooldownMs(pending) > 0 ? 'You can nudge again in ' + nudgeCooldownLabel(pending) : 'Send a gentle reminder'"
                                  class="friends-list-component__s8">
                            {{ nudgingRequestId() === pending.id ? 'Nudging…' : (nudgeCooldownMs(pending) > 0 ? nudgedAgoLabel(pending) : 'Nudge') }}
                          </button>
                          <button type="button"
                                  (click)="cancelOutgoingRequest(pending)"
                                  [style.color]="theme.colors().textSecondary"
                                  [style.border]="'1px solid ' + theme.colors().border"
                                  class="friends-list-action-btn">Cancel request</button>
                        }
                      } @else {
                        <button
                          (click)="sendFriendRequest(candidate)"
                          [disabled]="candidate.relationship === 'friends' || isSubmittingFriendAction()"
                          [style.opacity]="candidate.relationship === 'friends' || isSubmittingFriendAction() ? '0.5' : '1'"
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
              <div class="friends-list-search-empty" role="status" aria-live="polite">
                <div class="friends-list-search-empty__icon" aria-hidden="true">💌</div>
                <div class="friends-list-search-empty__content">
                  <p class="friends-list-search-empty__title">We couldn't find them yet</p>
                  <p class="friends-list-search-empty__message">
                    @if (searchQuery().trim()) {
                      No one on Dexii matches “{{ searchQuery().trim() }}” — but that's an easy fix. Send an invite and we'll add them to your friends automatically when they join.
                    } @else {
                      Nothing matched that search. Try a name, username, email or phone number — or invite a friend and we'll connect you as soon as they join.
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
                <p [style.color]="theme.colors().textSecondary" class="friends-list-search-empty__hint">
                  Invites go out by email or text — you choose on the next step.
                </p>
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
                    <span>
                      {{ req.from }} wants to connect
                      @if (req.lastNudgedAt) {
                        <span [style.background-color]="theme.colors().accent + '22'"
                              [style.color]="theme.colors().text"
                              class="friends-list-nudge-chip"
                              [title]="'Nudged you ' + (req.lastNudgedAt | date:'MMM d, h:mm a')">
                          Nudged you · {{ req.lastNudgedAt | date:'MMM d' }}
                        </span>
                      }
                    </span>
                    <div class="friends-list-component__s49">
                      <button (click)="respondToRequest(req, 'accept')" [style.background-color]="'#15803d'" class="friends-list-component__s50">Accept</button>
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
                      <div style="font-weight: 600;">{{ req.kind === 'invite' ? 'Invited: ' : 'To: ' }}{{ req.to }}</div>
                      <div [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-small);">
                        @if (req.kind === 'invite') {
                          Invite {{ req.invite?.method === 'sms' ? 'texted' : 'emailed' }} {{ req.createdAt | date:'MMM d, h:mm a' }} · they haven't joined Dexii yet
                        } @else {
                          Sent {{ req.createdAt | date:'MMM d, h:mm a' }}
                          @if (req.lastNudgedAt) {
                            • Nudged {{ req.lastNudgedAt | date:'MMM d, h:mm a' }} ({{ req.nudgeCount || 1 }})
                          }
                        }
                      </div>
                      @if (req.friendshipProfile) {
                        <div [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-small); margin-top: 6px;">
                          {{ req.friendshipProfile.relationshipType || 'Friendship profile saved' }}
                          @if (req.friendshipProfile.relationshipName) {
                            • {{ req.friendshipProfile.relationshipName }}
                          }
                        </div>
                      }
                    </div>
                    <div class="friends-list-component__s49">
                      @if (req.kind === 'invite') {
                        <button (click)="resendInvite(req)"
                                [disabled]="resendingInviteId() === req.id"
                                [style.background-color]="theme.colors().primary"
                                class="friends-list-component__s50">
                          {{ resendingInviteId() === req.id ? 'Sending…' : 'Send again' }}
                        </button>
                        <button (click)="withdrawInvite(req)"
                                [style.border]="'1px solid ' + theme.colors().border"
                                [style.color]="theme.colors().textSecondary"
                                class="friends-list-component__s50">
                          Withdraw invite
                        </button>
                      } @else {
                      <button (click)="cancelOutgoingRequest(req)"
                              [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().textSecondary"
                              class="friends-list-component__s50">
                        Delete Request
                      </button>
                      <button (click)="nudgeRequest(req)"
                              [disabled]="nudgeCooldownMs(req) > 0 || nudgingRequestId() === req.id"
                              [style.opacity]="nudgeCooldownMs(req) > 0 ? '0.6' : '1'"
                              [style.background-color]="theme.colors().primary"
                              [title]="nudgeCooldownMs(req) > 0 ? 'You can nudge again in ' + nudgeCooldownLabel(req) : 'Send a gentle reminder'"
                              class="friends-list-component__s50">
                        {{ nudgingRequestId() === req.id ? 'Nudging…' : (nudgeCooldownMs(req) > 0 ? nudgedAgoLabel(req) : 'Nudge') }}
                      </button>
                      }
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
          @if (friends().length > 0) {
            <label class="friends-list-filter">
              <span class="friends-list-filter__icon" aria-hidden="true">🔍</span>
              <input type="search" aria-label="Filter your friends"
                     [ngModel]="friendSearch()"
                     (ngModelChange)="friendSearch.set($event)"
                     [style.background-color]="theme.colors().bgSecondary"
                     [style.border]="'1px solid ' + theme.colors().border"
                     [style.color]="theme.colors().text"
                     class="friends-list-filter__input"
                     placeholder="Search your friends"
                     aria-label="Search your friends">
            </label>
          }

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
            @for (friend of visibleFriends(); track friend.id) {
              <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border"
                   class="friends-list-component__s54">

                <div class="friends-list-component__s55">
                  <a [routerLink]="['/friends', friend.username]" [attr.aria-label]="'Open your friendship page with ' + friend.username" class="friends-list-avatar-link">
                    <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id" [alt]="friend.username + ' avatar'" class="friends-list-component__s56">
                  </a>
                  <div>
                    <h4 class="friends-list-component__s57">{{ friend.username }}</h4>
                    <span [style.color]="theme.colors().textSecondary" class="friends-list-component__s58">{{ friend.friendCategories[0] || 'Uncategorized' }}</span>
                  </div>
                </div>

                <div class="friends-list-component__s59 friends-list-card-actions">
                  <a [routerLink]="['/friends', friend.username]"
                     [attr.aria-label]="'Open your friendship page with ' + friend.username"
                     title="Profile"
                     [style.color]="theme.colors().textSecondary"
                     class="icon-btn"><app-icon name="profile" /></a>
                  <button type="button" (click)="openSharePicker(friend)"
                          [attr.aria-label]="'Share a crush with ' + friend.username"
                          [style.color]="theme.colors().onBgPrimary"
                          [style.border]="'1px solid ' + theme.colors().primary"
                          class="friends-list-action-link">Share</button>
                  <a routerLink="/chat"
                     [queryParams]="{ friendId: friend.id, friendName: friend.username }"
                     [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
                     class="friends-list-action-link">Chat</a>
                  <button type="button" (click)="pauseFriend(friend)"
                          [attr.aria-label]="'Pause friendship with ' + friend.username" title="Pause friendship"
                          [style.color]="theme.colors().textSecondary"
                          class="icon-btn"><app-icon name="pause" /></button>
                  <button type="button" (click)="removeFriend(friend)"
                          [attr.aria-label]="'Remove ' + friend.username + ' as a friend'" title="Remove friend"
                          class="icon-btn icon-btn--danger"><app-icon name="trash" /></button>
                </div>
              </div>
            } @empty {
              <div [style.border]="'1px dashed ' + theme.colors().border" class="friends-list-empty">
                 @if (friendSearch().trim()) {
                   <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s61">No friends match “{{ friendSearch().trim() }}”.</p>
                 } @else {
                 <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s61">Your inner circle is currently empty.</p>
                 }
              </div>
            }
            }
          </div>
        }

        @if (activeTab() === 'paused') {
          <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border"
               class="friends-list-component__s52">
            <p class="friends-list-component__s47">
              Paused friends stay out of your main list and, while muted, don't send you notifications. You both keep access to anything already shared, and they aren't told. Resume any time.
            </p>
          </div>

          <div class="friends-list-component__s53">
            @if (isLoadingFriends()) {
              <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s51">Loading…</p>
            } @else {
              @for (friend of pausedFriends(); track friend.id) {
                <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border"
                     class="friends-list-component__s54">
                  <div class="friends-list-component__s55">
                    <a [routerLink]="['/friends', friend.username]" [attr.aria-label]="'Open your friendship page with ' + friend.username" class="friends-list-avatar-link">
                      <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id" [alt]="friend.username + ' avatar'" class="friends-list-component__s56">
                    </a>
                    <div>
                      <h4 class="friends-list-component__s57">{{ friend.username }}</h4>
                      <span [style.color]="theme.colors().textSecondary" class="friends-list-component__s58">{{ friend.mutedNotifications ? 'Paused · notifications muted' : 'Paused' }}</span>
                    </div>
                  </div>
                  <div class="friends-list-component__s59 friends-list-card-actions">
                    <label class="friends-list-mute-toggle" [style.color]="theme.colors().text">
                      <input type="checkbox"
                             [checked]="friend.mutedNotifications"
                             (change)="setMuted(friend, $any($event.target).checked)">
                      Mute notifications from {{ friend.username }}
                    </label>
                    <button (click)="resumeFriend(friend)"
                            [style.color]="theme.colors().onBgPrimary"
                            [style.border]="'1px solid ' + theme.colors().primary"
                            class="friends-list-action-btn">
                      Resume friendship
                    </button>
                    <a [routerLink]="['/friends', friend.username]"
                       [attr.aria-label]="'Open your friendship page with ' + friend.username"
                       title="Profile"
                       [style.color]="theme.colors().textSecondary"
                       class="icon-btn"><app-icon name="profile" /></a>
                    <button type="button" (click)="openSharePicker(friend)"
                            [attr.aria-label]="'Share a crush with ' + friend.username"
                            [style.color]="theme.colors().onBgPrimary"
                            [style.border]="'1px solid ' + theme.colors().primary"
                            class="friends-list-action-link">Share</button>
                    <a routerLink="/chat"
                       [queryParams]="{ friendId: friend.id, friendName: friend.username }"
                       [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
                       class="friends-list-action-link">Chat</a>
                    <button type="button" (click)="removeFriend(friend)"
                            [attr.aria-label]="'Remove ' + friend.username + ' as a friend'" title="Remove friend"
                            class="icon-btn icon-btn--danger"><app-icon name="trash" /></button>
                  </div>
                </div>
              } @empty {
                <div [style.border]="'1px dashed ' + theme.colors().border" class="friends-list-empty">
                   <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s61">No paused friendships.</p>
                </div>
              }
            }
          </div>
        }
      </div>

      @if (shareForFriend(); as shareFriend) {
        <app-crush-share-picker [friendId]="shareFriend.id" [friendName]="shareFriend.username" (closed)="shareForFriend.set(null)"></app-crush-share-picker>
      }

      @if (addFriendCandidate()) {
        <div class="friends-list-component__s9">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               role="dialog" aria-modal="true" aria-label="Add friend" appFocusTrap (escaped)="closeAddFriendModal()"
               class="friends-list-component__s10">
            <button (click)="closeAddFriendModal()"
                    [style.color]="theme.colors().textSecondary"
                    aria-label="Close add friend modal"
                    class="friends-list-component__s11">✕</button>

            <h3 class="friends-list-component__s12">Add Friend</h3>
            <p [style.color]="theme.colors().textSecondary" class="friends-list-component__s13">
              Create a friendship profile and send an invite to {{ addFriendCandidate()?.username }}.
            </p>

            <label class="friends-list-add-modal-skip" [style.color]="theme.colors().textSecondary">
              <span [style.color]="theme.colors().text">
                <input type="checkbox"
                       [checked]="skipFriendshipProfile()"
                       (change)="skipFriendshipProfile.set($any($event.target).checked)">
                Skip the friendship profile for now
              </span>
              <small>You can finish it later from Pending Sent or your Friends list.</small>
            </label>

            <div class="friends-list-add-modal-grid">
              @if (!skipFriendshipProfile()) {
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
              }

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
                          maxlength="300"
                          placeholder="Message they’ll receive"></textarea>
                <span [style.color]="theme.colors().textSecondary" class="friends-list-add-modal-counter">{{ addFriendInviteMessage().length }}/300</span>
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

  activeTab = signal<'friends' | 'find' | 'incoming' | 'sent' | 'paused'>('friends');
  /** The friend whose crush-share picker is open, or null if none. */
  shareForFriend = signal<FriendCardView | null>(null);
  openSharePicker(friend: FriendCardView): void {
    this.shareForFriend.set(friend);
  }
  /** Every friend from the server, paused or not. */
  allFriends = signal<FriendCardView[]>([]);
  friends = computed(() => this.allFriends().filter((friend) => !friend.paused));
  pausedFriends = computed(() => this.allFriends().filter((friend) => friend.paused));
  /** Text typed into the "Search your friends" box on the Friends tab. */
  friendSearch = signal('');
  visibleFriends = computed(() => {
    const query = this.friendSearch().trim().toLowerCase();
    const list = this.friends();
    if (!query) return list;
    return list.filter((friend) =>
      [friend.username, friend.firstName, friend.lastName, `${friend.firstName} ${friend.lastName}`]
        .some((value) => (value || '').toLowerCase().includes(query))
    );
  });
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
  skipFriendshipProfile = signal(false);
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
        this.allFriends.set([]);
        this.searchResults.set([]);
        this.incomingRequests.set([]);
        this.outgoingRequests.set([]);
        this.friendsError.set('');
        this.searchError.set('');
        this.stopIncomingRequestPolling();
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'friends' || tab === 'find' || tab === 'incoming' || tab === 'sent' || tab === 'paused') {
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

  /** The sent-but-unanswered request behind a search result, if we have it loaded. */
  outgoingRequestFor(candidate: FriendSearchResult): FriendRequestItem | null {
    return this.outgoingRequests().find((req) => req.kind !== 'invite' && (req.toId === candidate.id || req.to === candidate.username)) || null;
  }

  /** A search hit for an email/phone we already invited, as a list item. */
  inviteItemFor(candidate: FriendSearchResult): FriendRequestItem {
    return {
      id: candidate.id || `invite-${candidate.invite?.id}`,
      kind: 'invite',
      from: this.currentUsername,
      to: candidate.username,
      status: 'pending',
      createdAt: candidate.invite?.sentAt || new Date().toISOString(),
      invite: candidate.invite ? { contact: candidate.invite.contact, message: candidate.invite.message, sentAt: candidate.invite.sentAt, method: candidate.invite.method, id: candidate.invite.id } : undefined
    } as FriendRequestItem;
  }

  resendingInviteId = signal<string | null>(null);

  /** Sends the same invite again (email or text); the link stays the same. */
  async resendInvite(item: FriendRequestItem) {
    const invite = item.invite as { contact?: string; method?: InviteMethod; message?: string } | undefined;
    if (!invite?.contact || !invite.method) return;
    this.resendingInviteId.set(item.id);
    try {
      const result = await this.sendInvite({ toUsername: invite.contact, method: invite.method, contact: invite.contact, message: invite.message || '' });
      if (result?.ok) {
        await this.dispatchInvite(invite.method, invite.contact, invite.message || '', result.launchUrl);
        await this.loadOutgoingRequests();
        if (this.didSearch()) await this.searchUsers();
      }
    } finally {
      this.resendingInviteId.set(null);
    }
  }

  async withdrawInvite(item: FriendRequestItem) {
    const invite = item.invite as { id?: string; contact?: string } | undefined;
    if (!invite?.id) return;
    this.modal.confirm(`Withdraw the invite to ${invite.contact || item.to}? The link you sent them will stop working.`, async () => {
      try {
        await this.friendsApi.cancelInvite(invite.id!);
        await this.loadOutgoingRequests();
        if (this.didSearch()) await this.searchUsers();
        this.modal.show('Invite withdrawn.');
      } catch (error: any) {
        this.modal.show(error?.message || 'Unable to withdraw that invite right now.');
      }
    });
  }

  candidateActionLabel(candidate: FriendSearchResult): string {
    if (candidate.relationship === 'friends') return 'Already friends';
    if (candidate.relationship === 'request_sent') return 'Request pending';
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
      friendshipProfile: friend.friendshipProfile || this.readFriendshipProfile(id) || null,
      paused: Boolean(friend.paused),
      mutedNotifications: Boolean(friend.mutedNotifications)
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
      kind: request.kind || 'request',
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

  private readFriendshipProfile(friendId: string): FriendshipProfile | null {
    return readLocalFriendshipProfile(this.currentUserId || '', friendId);
  }

  private writeFriendshipProfile(friendId: string, profile: FriendshipProfile): void {
    writeLocalFriendshipProfile(this.currentUserId || '', friendId, profile);
  }

  /** Friendship profiles used to live only in this browser; hand any leftover copy to the server once. */
  private migrateLocalFriendshipProfile(friendId: string): void {
    const local = this.readFriendshipProfile(friendId);
    if (!local) return;
    void this.friendsApi.saveFriendshipProfile(friendId, local)
      .then(() => clearLocalFriendshipProfile(this.currentUserId || '', friendId))
      .catch(() => { /* offline or demo: keep the local copy for next time */ });
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

  /**
   * Friends "archived" before pausing lived only in this browser. The first time
   * the list loads, turn them into paused friendships on the server and forget the
   * local copy, so every device agrees.
   */
  private async migrateArchivedFriends(data: FriendSummary[]): Promise<FriendSummary[]> {
    const legacy = this.readArchivedFriendIds();
    if (legacy.size === 0) return data;
    const toPause = data.filter((f) => legacy.has(f.id) && !f.paused);
    const results = await Promise.allSettled(toPause.map((f) => this.friendsApi.setPauseState(f.id, true, true)));
    if (results.every((r) => r.status === 'fulfilled')) {
      localStorage.removeItem(this.getArchivedFriendsStorageKey());
    }
    if (toPause.length === 0) return data;
    return data.map((f) => legacy.has(f.id) ? { ...f, paused: true, mutedNotifications: true } : f);
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
      this.allFriends.set([]);
      return;
    }

    this.isLoadingFriends.set(true);
    this.friendsError.set('');
    try {
      let data = await this.friendsApi.listFriends();
      data = await this.migrateArchivedFriends(data);
      this.allFriends.set(data.map((f) => this.mapApiUser(f)));
      for (const f of data) if (!f.friendshipProfile) this.migrateLocalFriendshipProfile(f.id);
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
    const searchedValue = (candidate.email || candidate.phoneE164 || candidate.username || '').trim();
    if (!searchedValue) {
      this.modal.show('Enter a name, email, or phone number first.');
      return;
    }

    const cleanUsername = (candidate.username || searchedValue).trim();
    const displayName = this.candidateDisplayName(candidate).trim() || cleanUsername;
    const inviteMethod: InviteMethod = candidate.email || this.looksLikeEmail(searchedValue)
      ? 'email'
      : candidate.phoneE164 || this.looksLikePhone(searchedValue)
      ? 'sms'
      : 'copy';
    const inviteContact = inviteMethod === 'email'
      ? (candidate.email || (this.looksLikeEmail(searchedValue) ? searchedValue : ''))
      : inviteMethod === 'sms'
      ? (candidate.phoneE164 || (this.looksLikePhone(searchedValue) ? searchedValue : ''))
      : '';

    this.addFriendCandidate.set({ ...candidate, username: cleanUsername });
    this.addFriendRelationshipName.set(displayName);
    this.addFriendRelationshipType.set('Close Friend');
    this.addFriendHowMet.set('');
    this.addFriendTrustLevel.set('Medium');
    this.addFriendNotes.set('');
    this.addFriendInviteMethod.set(inviteMethod);
    this.addFriendInviteContact.set(inviteContact);
    this.addFriendInviteMessage.set(this.defaultInviteMessage(candidate, displayName));
    this.skipFriendshipProfile.set(false);
  }

  /** Friendly greeting name: first name, else a name-like username, else the part of an email before @. */
  private inviteGreetingName(candidate: FriendSearchResult, displayName: string): string {
    const first = (candidate.firstName || '').trim();
    if (first) return first;
    const raw = (displayName || candidate.username || '').trim();
    if (this.looksLikePhone(raw)) return 'there';
    const local = this.looksLikeEmail(raw) ? raw.split('@')[0] : raw;
    const cleaned = local.replace(/[._\-+]+/g, ' ').replace(/\d+/g, '').trim();
    if (!cleaned) return 'there';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  private defaultInviteMessage(candidate: FriendSearchResult, displayName: string): string {
    const name = this.inviteGreetingName(candidate, displayName);
    return `Hey ${name}! I added you on my Dexii inner circle. Make your own account and we can connect there and share our love life adventures!`;
  }

  private looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private looksLikePhone(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 && !this.looksLikeEmail(value);
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
    const base = custom || `Hey! I added you on my Dexii inner circle. Make your own account and we can connect there and share our love life adventures!`;
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
      const result = await this.sendFriendRequest(
        { ...candidate, username },
        this.skipFriendshipProfile() ? undefined : { friendshipProfile }
      );
      if (!result) return;
      if (!this.skipFriendshipProfile()) {
        this.writeFriendshipProfile(candidate.id, friendshipProfile);
      }
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

  async removeFriend(friend: FriendCardView) {
    this.modal.confirm(`Remove ${friend.username} as a friend? You both lose access to what you shared with each other. This cannot be undone.`, async () => {
      try {
        await this.friendsApi.removeFriend(friend.id);
        this.allFriends.update((items) => items.filter((item) => item.id !== friend.id));
        this.messaging.pruneConversation(friend.id, friend.username);
        await this.loadFriends();
        this.modal.show(`${friend.username} removed from your friends.`);
      } catch (error: any) {
        this.modal.show(error?.message || 'Unable to remove friend right now.');
      }
    }, undefined, { title: 'Remove friend?', confirmLabel: 'Remove', danger: true });
  }

  async pauseFriend(friend: FriendCardView) {
    this.modal.confirm(
      `Pause your friendship with ${friend.username}? They move to your Paused list and, with notifications muted, you won't hear from them until you resume. Sharing stays active both ways, and they aren't told.`,
      async () => {
        try {
          const state = await this.friendsApi.setPauseState(friend.id, true, true);
          this.applyPauseState(friend.id, state.paused, state.mutedNotifications);
          this.modal.show(`Friendship with ${friend.username} paused. Resume any time from the Paused tab.`);
        } catch (error: any) {
          this.modal.show(error?.message || 'Unable to pause this friendship right now.');
        }
      }
    );
  }

  async resumeFriend(friend: FriendCardView) {
    try {
      const state = await this.friendsApi.setPauseState(friend.id, false);
      this.applyPauseState(friend.id, state.paused, state.mutedNotifications);
      this.modal.show(`${friend.username} is back in your friends list.`);
    } catch (error: any) {
      this.modal.show(error?.message || 'Unable to resume this friendship right now.');
    }
  }

  async setMuted(friend: FriendCardView, muted: boolean) {
    try {
      const state = await this.friendsApi.setPauseState(friend.id, true, muted);
      this.applyPauseState(friend.id, state.paused, state.mutedNotifications);
    } catch (error: any) {
      this.modal.show(error?.message || 'Unable to change notifications for this friend right now.');
    }
  }

  private applyPauseState(friendId: string, paused: boolean, mutedNotifications: boolean): void {
    this.allFriends.update((items) => items.map((item) =>
      item.id === friendId ? { ...item, paused, mutedNotifications } : item
    ));
  }

  private static readonly NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  nudgingRequestId = signal<string | null>(null);

  /** Milliseconds until this request can be nudged again (0 when allowed). */
  nudgeCooldownMs(req: FriendRequestItem): number {
    if (!req.lastNudgedAt) return 0;
    const elapsed = Date.now() - new Date(req.lastNudgedAt).getTime();
    if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
    return Math.max(0, FriendsListComponent.NUDGE_COOLDOWN_MS - elapsed);
  }

  nudgeCooldownLabel(req: FriendRequestItem): string {
    const hours = Math.ceil(this.nudgeCooldownMs(req) / (60 * 60 * 1000));
    return hours <= 1 ? 'about an hour' : `${hours} hours`;
  }

  nudgedAgoLabel(req: FriendRequestItem): string {
    if (!req.lastNudgedAt) return 'Nudge';
    const minutes = Math.floor((Date.now() - new Date(req.lastNudgedAt).getTime()) / 60000);
    if (minutes < 60) return 'Nudged just now';
    return `Nudged ${Math.floor(minutes / 60)}h ago`;
  }

  async nudgeRequest(req: FriendRequestItem) {
    if (this.nudgeCooldownMs(req) > 0) {
      this.modal.show(`Already nudged — you can nudge ${req.to} again in ${this.nudgeCooldownLabel(req)}.`);
      return;
    }
    this.nudgingRequestId.set(req.id);
    try {
      await this.friendsApi.nudgeRequest(req.id);
      await this.loadOutgoingRequests();
      this.modal.show(`Nudge sent to ${req.to}. They'll get a notification.`);
    } catch (error: any) {
      if (error?.status === 409 && error?.body?.lastNudgedAt) {
        this.outgoingRequests.update((list) => list.map((item) =>
          item.id === req.id ? { ...item, lastNudgedAt: error.body.lastNudgedAt, nudgeCount: error.body.nudgeCount ?? item.nudgeCount } : item
        ));
        this.modal.show(`Already nudged — you can nudge ${req.to} again in ${this.nudgeCooldownLabel({ ...req, lastNudgedAt: error.body.lastNudgedAt })}.`);
        return;
      }
      this.modal.show(error?.message || 'Unable to send nudge right now.');
    } finally {
      this.nudgingRequestId.set(null);
    }
  }

  // TODO(copy): friend-request wording ("{{ req.from }} wants to connect", request popups) — awaiting decision.

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

  lockApp() {
    this.security.lockApp();
  }
}
