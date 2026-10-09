import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { ActivityTimelineComponent } from '../../core/components/activity-timeline/activity-timeline.component';
import { UserSettingsService } from '../../core/services/user-settings.service';
import { CrushProfile, crushSeenAt } from '../../core/models/crush-profile.model';
import { FriendProfileDetails, FriendSummary, FriendsApiService } from '../../core/services/friends-api.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { BackLinkComponent } from '../../core/components/back-link.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  styleUrl: './user-profile.component.css',
  imports: [CommonModule, RouterModule, PageHintComponent, NavbarComponent, BackLinkComponent, ActivityTimelineComponent],
  template: `
    <div [style.background-color]="theme.colors().bg"
         [style.color]="theme.colors().text"
         class="user-profile-component__s1">
      <app-navbar></app-navbar>

      <div class="user-profile-component__s4">
        @if (!isSelf()) {
          <app-back-link label="Back to Friends" fallback="/friends"></app-back-link>
        }
        <app-page-hint
          hintKey="user_profile_inline"
          title="Profile Hint"
          message="This page is your sharing overview with a friend: the crushes they let you see, and the crushes of yours they can see. Open any crush card for details and notes.">
        </app-page-hint>

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="user-profile-component__s5">
          <div class="user-profile-component__s6">
            @if (!isSelf()) {
              <a [routerLink]="['/friends', profileUsername()]" [attr.aria-label]="'Open your friendship page with ' + profileDisplayName()" class="user-profile-avatar-link">
                <img [src]="profileAvatar()"
                     [alt]="profileDisplayName()"
                     class="user-profile-component__s7">
              </a>
            } @else {
              <img [src]="profileAvatar()"
                   [alt]="profileDisplayName()"
                   class="user-profile-component__s7">
            }
            <div>
              @if (profileLoading()) {
                <div class="user-profile-loading" role="status" aria-live="polite">
                  <span class="user-profile-spinner" aria-hidden="true"></span>
                  Loading profile…
                </div>
              } @else {
                <h1 class="user-profile-component__s8">
                  {{ profileDisplayName() }}
                </h1>
                @if (profileUsername()) {
                  <p [style.color]="theme.colors().textSecondary"
                     class="user-profile-username">
                    @{{ profileUsername() }}
                  </p>
                }
                @if (!isSelf()) {
                  <p [style.color]="theme.colors().textSecondary"
                     class="user-profile-component__s9" style="margin: 0.25rem 0 0;">
                    {{ crushes().length }} shared {{ crushes().length === 1 ? 'crush' : 'crushes' }}
                  </p>
                }
                @if (profileBio()) {
                  <p [style.color]="theme.colors().textSecondary"
                     class="user-profile-component__s10">
                    {{ profileBio() }}
                  </p>
                }
                @if (!isSelf()) {
                  <a [routerLink]="['/chat']"
                     [queryParams]="{ friendId: routeUserId(), friendName: profileDisplayName() }"
                     [style.background-color]="theme.colors().primary"
                     style="display: inline-flex; align-items: center; gap: 6px; color: white; text-decoration: none; padding: 6px 14px; border-radius: 999px; font-size: var(--fs-small); font-weight: 600; margin-top: 10px;">
                    💬 Chat with {{ profileDisplayName() }}
                  </a>
                }
              }
            </div>
          </div>
        </div>

        @if (profileDetails(); as profile) {
        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="user-profile-component__s11 user-profile-details-card">
          <h2 class="section-title">About {{ profileDisplayName() }}</h2>
          <div class="user-profile-details-grid">
            @if (profile.relationshipStatus) {
              <p><strong>Relationship status:</strong> {{ profile.relationshipStatus }}</p>
            }
            @if (profile.lookingFor) {
              <p><strong>Looking for:</strong> {{ profile.lookingFor }}</p>
            }
            @if (profile.interestedIn) {
              <p><strong>Interested in:</strong> {{ profile.interestedIn }}</p>
            }
            @if (profile.loveLanguage) {
              <p><strong>Love language:</strong> {{ profile.loveLanguage }}</p>
            }
            @if (profile.idealDate) {
              <p><strong>Ideal date:</strong> {{ profile.idealDate }}</p>
            }
          </div>
        </div>
        }

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="user-profile-component__s11">
          <div class="user-profile-component__s12">
            <div>
              <h2 class="section-title">{{ isSelf() ? 'Your Crushes' : profileDisplayName() + "'s Crushes" }}</h2>
              @if (!isSelf()) {
                <p [style.color]="theme.colors().textSecondary"
                   class="user-profile-component__s13 user-profile-component__s13--detail">
                  Only crushes they have shared with you are shown here.
                </p>
              }
            </div>
            <p [style.color]="theme.colors().textSecondary"
               class="user-profile-component__s13">
              {{ crushes().length }} crushes
            </p>
            @if (isSelf()) {
              <a routerLink="/dashboard"
                 [queryParams]="{ newCrush: 1 }"
                 [style.color]="theme.colors().primary"
                 class="user-profile-component__s14">
                + Add New Crush
              </a>
            }
          </div>

          @if (!isSelf() && friendSharedCrushesLoading()) {
            <div [style.border]="'1px dashed ' + theme.colors().border"
                 class="user-profile-component__s22">
              <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">Loading shared crushes...</p>
            </div>
          } @else if (crushes().length > 0) {
            <div class="user-profile-component__s15">
              @for (crush of crushes(); track crush.id) {
                <a [routerLink]="['/profile', crush.id]"
                   [style.background-color]="theme.colors().bg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   [style.color]="theme.colors().text"
                   class="user-profile-component__s16">
                  <div class="user-profile-component__s17">
                    <img [src]="crush.avatarUrl || 'https://i.pravatar.cc/150?u=' + crush.nickname"
                         [alt]="crush.nickname"
                         class="user-profile-component__s18">
                    <div>
                      <p class="user-profile-component__s19">{{ crush.nickname }}</p>
                      <p [style.color]="theme.colors().textSecondary"
                         class="user-profile-component__s20">{{ crush.fullName || 'No first name set' }}</p>
                      @if (getRelationshipLabels(crush).length > 0) {
                        <div class="user-profile-component__s25">
                          @for (label of getRelationshipLabels(crush); track label) {
                            <span [style.border-color]="theme.colors().primary"
                                  [style.color]="theme.colors().primary"
                                  class="user-profile-component__s26">
                              {{ label }}
                            </span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                  <span [style.background-color]="theme.colors().primary"
                      class="user-profile-component__s21">
                  Dating status: {{ crush.status }}
                  </span>
                </a>
              }
            </div>
          } @else {
            <div [style.border]="'1px dashed ' + theme.colors().border"
                 class="user-profile-component__s22">
              <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">{{ isSelf() ? 'You have no crush profiles yet.' : profileDisplayName() + " hasn't shared any crushes with you yet." }}</p>
            </div>
          }
        </div>

        @if (!isSelf()) {
          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               class="user-profile-component__s11" style="margin-top: 2rem;">
            <div class="user-profile-component__s12" style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h2 class="section-title">Crushes You've Shared</h2>
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s13" style="text-transform: none; letter-spacing: 0; line-height: 1.5;">
                  Crushes from your list that {{ profileDisplayName() }} can see ({{ sharedWithThem().length }}). Share another with the button, or unshare any time.
                </p>
              </div>
              <button type="button"
                      (click)="showShareSelector.set(!showShareSelector())"
                      [style.background-color]="showShareSelector() ? theme.colors().bg : theme.colors().primary"
                      [style.color]="showShareSelector() ? theme.colors().text : 'white'"
                      [style.border]="'1px solid ' + theme.colors().primary"
                      class="user-profile-share-btn">
                <span aria-hidden="true">+</span> Share a crush
              </button>
            </div>

            @if (showShareSelector()) {
              <div class="share-modal-backdrop" (click)="showShareSelector.set(false)">
                <div [style.background-color]="theme.colors().bg"
                     [style.border]="'1px solid ' + theme.colors().border"
                     class="share-modal-content"
                     (click)="$event.stopPropagation()">

                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; font-size: 1.2rem; font-weight: bold;">Share a crush with {{ profileDisplayName() }}</h3>
                    <button (click)="showShareSelector.set(false)"
                            [style.color]="theme.colors().textSecondary"
                            style="background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0;">×</button>
                  </div>

                  <p [style.color]="theme.colors().textSecondary" style="margin-bottom: 1rem; font-size: var(--fs-body);">Tap Share next to any crush. {{ profileDisplayName() }} will see its profile and whatever you share about it.</p>

                  <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
                    @for (crush of myCrushes(); track crush.id) {
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: 8px;"
                           [style.background-color]="theme.colors().bgSecondary"
                           [style.border]="'1px solid ' + theme.colors().border">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <img [src]="crush.avatarUrl || 'https://i.pravatar.cc/150?u=' + crush.nickname"
                               style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                          <div>
                            <p style="margin: 0; font-weight: 500;">{{ crush.nickname }}</p>
                            <p [style.color]="theme.colors().textSecondary" style="margin: 0; font-size: var(--fs-small);">{{ crush.fullName }}</p>
                          </div>
                        </div>
                        <button (click)="toggleShare(crush.id)"
                                [style.background-color]="isShared(crush) ? theme.colors().primary : 'transparent'"
                                [style.color]="isShared(crush) ? 'white' : theme.colors().text"
                                [style.border]="'1px solid ' + (isShared(crush) ? theme.colors().primary : theme.colors().border)"
                                style="padding: 8px 18px; border-radius: var(--radius-pill); font-size: var(--fs-small); cursor: pointer; font-weight: 500; transition: all 0.2s;">
                          {{ isShared(crush) ? 'Shared' : 'Share' }}
                        </button>
                      </div>
                    } @empty {
                      <div style="text-align: center; padding: 2rem 0;">
                        <p [style.color]="theme.colors().textSecondary">You have no crushes to share yet.</p>
                        <a routerLink="/dashboard" (click)="showShareSelector.set(false)" [style.color]="theme.colors().primary">Create a crush profile</a>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            @if (sharedWithThem().length > 0) {
              <div class="user-profile-component__s15">
                @for (crush of sharedWithThem(); track crush.id) {
                  <div [style.background-color]="theme.colors().bg"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text"
                       class="user-profile-component__s16" style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
                    <a [routerLink]="['/profile', crush.id]" style="display: flex; align-items: center; gap: 1rem; text-decoration: none; color: inherit; flex-grow: 1;">
                      <img [src]="crush.avatarUrl || 'https://i.pravatar.cc/150?u=' + crush.nickname"
                           [alt]="crush.nickname"
                           class="user-profile-component__s18">
                      <div>
                        <p class="user-profile-component__s19">{{ crush.nickname }}</p>
                        <div class="user-profile-component__s20" style="display: flex; align-items: center; gap: 0.5rem;">
                           @if (crush.seenAt) {
                             <span class="status-icon viewed" [style.color]="theme.colors().textSecondary"><span aria-hidden="true">👁️</span> Seen {{ crush.seenAt | date:'MMM d, h:mm a' }}</span>
                           } @else {
                             <span class="status-icon pending" [style.color]="theme.colors().textSecondary"><span aria-hidden="true">👁️‍🗨️</span> Not seen yet</span>
                           }
                        </div>
                      </div>
                    </a>
                    <button (click)="unshare(crush.id)"
                            style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 4px 10px; border-radius: var(--radius-pill); font-size: var(--fs-small); cursor: pointer;">
                      Unshare
                    </button>
                  </div>
                }
              </div>
            } @else {
              <div [style.border]="'1px dashed ' + theme.colors().border" class="user-profile-component__s22">
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">You haven't shared any crushes with {{ profileDisplayName() }} yet. Use “Share a crush” to pick one.</p>
              </div>
            }
          </div>
        }

        @if (!isSelf()) {
          <div style="display: flex; justify-content: flex-end; margin-top: 2rem;">
            <button (click)="auditLogView.set(!auditLogView())"
                    [style.color]="theme.colors().primary"
                    [style.border]="'1px solid ' + theme.colors().primary"
                    style="background: transparent; padding: 8px 16px; border-radius: var(--radius-pill); font-size: var(--fs-btn); cursor: pointer; display: flex; align-items: center; gap: 4px;">
              📜 {{ auditLogView() ? 'Close history' : 'History' }}
            </button>
          </div>

          @if (auditLogView()) {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="user-profile-component__s11" style="margin-top: 1rem; animation: slideDown 0.3s ease-out;">
              <div class="user-profile-component__s12" style="border-bottom: 1px solid {{theme.colors().border}}; padding-bottom: 0.75rem; margin-bottom: 1rem;">
                <h2 class="section-title">History with {{ profileDisplayName() }}</h2>
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s13" style="text-transform: none; letter-spacing: 0;">
                  Everything that has happened between you two, newest first.
                </p>
              </div>
              <app-activity-timeline [friendId]="routeUserId()"></app-activity-timeline>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class UserProfileComponent {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private friendsApi = inject(FriendsApiService);
  private messaging = inject(MessagingService);
  private settings = inject(UserSettingsService);
  public theme = inject(ThemeService);

  routeUserId = signal('');
  private friendSummaries = signal<FriendSummary[]>([]);
  private friendSharedCrushes = signal<CrushProfile[]>([]);
  private friendProfileDetailsState = signal<FriendProfileDetails | null>(null);
  protected friendProfileDetails = this.friendProfileDetailsState.asReadonly();
  protected friendSharedCrushesLoading = signal(false);
  protected profileLoading = signal(false);
  protected auditLogView = signal(false);
  private friendLoadRequestId = 0;

  constructor() {
    this.route.paramMap.subscribe(params => {
      this.routeUserId.set(params.get('id') || 'me');
    });
    this.route.queryParamMap.subscribe(params => {
      if (params.get('history') === 'true') {
        this.auditLogView.set(true);
      }
    });

    effect(() => {
      const routeUserId = this.routeUserId();

      if (!routeUserId || this.isSelf() || !this.friendsApi.isAuthenticated()) {
        this.friendLoadRequestId++;
        this.profileLoading.set(false);
        this.friendSharedCrushesLoading.set(false);
        this.friendSharedCrushes.set([]);
        this.friendProfileDetailsState.set(null);
        return;
      }

      void this.loadFriendContext(routeUserId);
      // Shared History is built from the share messages between us; make sure
      // they're loaded on this device (a fresh phone has none cached).
      void this.messaging.loadConversation(routeUserId);
    }, { allowSignalWrites: true });
  }

  isSelf = computed(() => {
    return this.dataService.isMe(this.routeUserId());
  });

  profileDisplayName = computed(() => {
    const id = this.routeUserId();
    if (this.isSelf()) return this.settings.settings().displayName || this.dataService.getUserId();
    const friend = this.friendSummaries().find((item) => item.id === id || item.username === id);
    if (!friend) return id === 'me' ? this.dataService.getUserId() : id;

    const name = [friend.firstName, friend.lastName].filter(Boolean).join(' ').trim();
    return name || friend.username || id;
  });
  profileUsername = computed(() => {
    if (this.isSelf()) return this.dataService.getUserId();
    const friend = this.friendSummaries().find((item) => item.id === this.routeUserId() || item.username === this.routeUserId());
    return friend?.username || '';
  });
  profileBio = computed(() => {
    if (this.isSelf()) return this.settings.settings().bio;
    return this.friendProfileDetailsState()?.profile?.bio || '';
  });
  profileDetails = computed(() => {
    if (this.isSelf()) {
      const settings = this.settings.settings();
      return settings.profileVisibility === 'Public'
        ? {
            relationshipStatus: settings.relationshipStatus,
            lookingFor: settings.lookingFor,
            interestedIn: settings.interestedIn,
            loveLanguage: settings.loveLanguage,
            idealDate: settings.idealDate
          }
        : null;
    }
    return this.friendProfileDetailsState()?.profile || null;
  });

  profileAvatar = computed(() => {
    if (this.isSelf() && this.settings.settings().avatarUrl) {
      return this.settings.settings().avatarUrl;
    }
    if (!this.isSelf() && this.friendProfileDetailsState()?.avatarUrl) {
      return this.friendProfileDetailsState()?.avatarUrl || '';
    }
    return `https://i.pravatar.cc/300?u=${encodeURIComponent(this.profileDisplayName())}`;
  });

  crushes = computed(() => {
    if (this.isSelf()) return this.dataService.getAllCrushes()();
    return this.friendSharedCrushes();
  });

  /** My crushes this friend can see, with when they last opened each one. */
  sharedWithThem = computed(() => {
    const friendId = this.routeUserId();
    if (!friendId || this.dataService.isMe(friendId)) return [] as Array<CrushProfile & { seenAt: Date | null }>;
    return this.dataService.getAllCrushes()()
      .filter((crush) => this.dataService.isCrushSharedWith(crush, friendId))
      .map((crush) => ({ ...crush, seenAt: crushSeenAt(crush, friendId) }));
  });


  myCrushes = computed(() => {
    // Return all crushes. In the demo environment, this list is already filtered by owner on the backend.
    return this.dataService.getAllCrushes()();
  });

  protected showShareSelector = signal(false);

  isShared(crush: any): boolean {
    const friendId = this.routeUserId();
    return this.dataService.isCrushSharedWith(crush, friendId);
  }

  toggleShare(crushId: string) {
    let friendId = this.routeUserId();
    if (this.dataService.isMe(friendId)) friendId = this.dataService.getUserId();
    this.dataService.toggleCrushVisibility(crushId, friendId);
  }

  unshare(crushId: string) {
    let friendId = this.routeUserId();
    if (this.dataService.isMe(friendId)) friendId = this.dataService.getUserId();
    this.dataService.toggleCrushVisibility(crushId, friendId);
  }

  getRelationshipLabels(crush: CrushProfile): string[] {
    return (crush.relationshipLabels || [])
      .map((label) => label.trim())
      .filter((label) => label.length > 0)
      .map((label) => label.replace(/^Other:\s*/i, '').trim())
      .filter((label, index, labels) => label.length > 0 && labels.indexOf(label) === index);
  }

  private async loadFriendContext(friendId: string): Promise<void> {
    const requestId = ++this.friendLoadRequestId;
    this.profileLoading.set(true);
    this.friendSharedCrushesLoading.set(true);

    const [friendsResult, sharedCrushesResult, profileResult] = await Promise.allSettled([
      this.friendsApi.listFriends(),
      this.friendsApi.getFriendSharedCrushes(friendId),
      this.friendsApi.getFriendProfile(friendId)
    ]);

    if (requestId !== this.friendLoadRequestId) return;

    if (friendsResult.status === 'fulfilled') {
      this.friendSummaries.set(friendsResult.value);
    } else {
      console.error('Failed to load friends for user profile.', friendsResult.reason);
      this.friendSummaries.set([]);
    }

    if (sharedCrushesResult.status === 'fulfilled') {
      this.friendSharedCrushes.set(sharedCrushesResult.value);
    } else {
      console.error('Failed to load shared crushes for user profile.', sharedCrushesResult.reason);
      this.friendSharedCrushes.set([]);
    }
    if (profileResult.status === 'fulfilled') {
      this.friendProfileDetailsState.set(profileResult.value);
    } else {
      console.error('Failed to load friend profile details.', profileResult.reason);
      this.friendProfileDetailsState.set(null);
    }

    this.friendSharedCrushesLoading.set(false);
    this.profileLoading.set(false);
  }
}
