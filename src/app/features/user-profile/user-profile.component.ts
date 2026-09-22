import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { AuditService } from '../../core/services/audit.service';
import { UserSettingsService } from '../../core/services/user-settings.service';
import { CrushProfile } from '../../core/models/crush-profile.model';
import { FriendProfileDetails, FriendSummary, FriendsApiService } from '../../core/services/friends-api.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

import { NavbarComponent } from '../../core/components/navbar/navbar.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  styleUrl: './user-profile.component.css',
  imports: [CommonModule, RouterModule, PageHintComponent, NavbarComponent],
  template: `
    <div [style.background-color]="theme.colors().bg"
         [style.color]="theme.colors().text"
         class="user-profile-component__s1">
      <app-navbar></app-navbar>

      <div class="user-profile-component__s4">
        <app-page-hint
          hintKey="user_profile_inline"
          title="Profile Hint"
          message="This page shows the user's crush list. Open any crush card to view details and notes.">
        </app-page-hint>

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="user-profile-component__s5">
          <div class="user-profile-component__s6">
            <img [src]="profileAvatar()"
                 [alt]="profileDisplayName()"
                 class="user-profile-component__s7">
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
                     style="display: inline-flex; align-items: center; gap: 6px; color: white; text-decoration: none; padding: 6px 14px; border-radius: 999px; font-size: 0.85rem; font-weight: 600; margin-top: 10px;">
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
              <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">No crush profiles found for this user yet.</p>
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
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s13">
                  {{ sharedWithThem().length }} crushes
                </p>
              </div>
              <button (click)="showShareSelector.set(!showShareSelector())"
                      [style.background-color]="showShareSelector() ? theme.colors().bg : theme.colors().primary"
                      [style.color]="showShareSelector() ? theme.colors().text : 'white'"
                      [style.border]="'1px solid ' + theme.colors().primary"
                      style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; transition: all 0.2s;">
                +
              </button>
            </div>

            @if (showShareSelector()) {
              <div class="share-modal-backdrop" (click)="showShareSelector.set(false)">
                <div [style.background-color]="theme.colors().bg"
                     [style.border]="'1px solid ' + theme.colors().border"
                     class="share-modal-content"
                     (click)="$event.stopPropagation()">

                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; font-size: 1.2rem; font-weight: bold;">Share Tea with {{ profileDisplayName() }}</h3>
                    <button (click)="showShareSelector.set(false)"
                            [style.color]="theme.colors().textSecondary"
                            style="background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0;">×</button>
                  </div>

                  <p [style.color]="theme.colors().textSecondary" style="margin-bottom: 1rem; font-size: 0.9rem;">Select crushes to share with your friend:</p>

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
                            <p [style.color]="theme.colors().textSecondary" style="margin: 0; font-size: 0.8rem;">{{ crush.fullName }}</p>
                          </div>
                        </div>
                        <button (click)="toggleShare(crush.id)"
                                [style.background-color]="isShared(crush) ? theme.colors().primary : 'transparent'"
                                [style.color]="isShared(crush) ? 'white' : theme.colors().text"
                                [style.border]="'1px solid ' + (isShared(crush) ? theme.colors().primary : theme.colors().border)"
                                style="padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: all 0.2s;">
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
                           <span [style.color]="theme.colors().textSecondary">Visible to {{ profileDisplayName() }}</span>
                           @if (crush.viewedByFriend) {
                             <span class="status-icon viewed" title="Viewed" style="font-size: 0.8rem;">👁️</span>
                           } @else {
                             <span class="status-icon pending" title="Pending" style="font-size: 0.8rem;">👁️‍🗨️</span>
                           }
                        </div>
                      </div>
                    </a>
                    <button (click)="unshare(crush.id)"
                            style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                      Unshare
                    </button>
                  </div>
                }
              </div>
            } @else {
              <div [style.border]="'1px dashed ' + theme.colors().border" class="user-profile-component__s22">
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">You haven't shared any crushes with this friend yet.</p>
              </div>
            }
          </div>
        }

        @if (!isSelf()) {
          <div style="display: flex; justify-content: flex-end; margin-top: 2rem;">
            <button (click)="auditLogView.set(!auditLogView())"
                    [style.color]="theme.colors().primary"
                    [style.border]="'1px solid ' + theme.colors().primary"
                    style="background: transparent; padding: 6px 12px; border-radius: 12px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              📜 {{ auditLogView() ? 'Close History' : 'Shared History' }}
            </button>
          </div>

          @if (auditLogView()) {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="user-profile-component__s11" style="margin-top: 1rem; animation: slideDown 0.3s ease-out;">
              <div class="user-profile-component__s12" style="border-bottom: 1px solid {{theme.colors().border}}; padding-bottom: 0.75rem; margin-bottom: 1rem;">
                <h2 class="section-title">Audit Log: History with {{ profileDisplayName() }}</h2>
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s13">
                  Tracking all shared tea and interactions
                </p>
              </div>

              <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
                @for (entry of auditLog(); track entry.id) {
                  <div [style.border-left]="'3px solid ' + (entry.isFromMe ? theme.colors().primary : '#10b981')"
                       style="padding: 0.75rem 1rem; background: rgba(0,0,0,0.02); border-radius: 0 8px 8px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
                      <span style="font-weight: 600; font-size: 0.85rem;" [style.color]="entry.isFromMe ? theme.colors().primary : '#10b981'">
                        {{ entry.isFromMe ? 'You sent' : entry.friendName + ' sent' }}
                      </span>
                      <span [style.color]="theme.colors().textSecondary" style="font-size: 0.75rem;">
                        {{ entry.timestamp | date:'short' }}
                      </span>
                    </div>
                    @if (entry.type === 'entry-share') {
                      <div style="margin-bottom: 0.4rem;">
                        <span [style.color]="theme.colors().primary"
                              style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border: 1px solid currentColor; padding: 2px 6px; border-radius: 999px;">
                          Specific entry shared
                        </span>
                      </div>
                    }
                    <p style="margin: 0; font-size: 0.95rem;">
                      {{ entry.content }}
                      @if (entry.crushId) {
                        <a [routerLink]="['/profile', entry.crushId]" [style.color]="theme.colors().primary" style="text-decoration: underline; margin-left: 4px;">
                          View {{ entry.crushName }}
                        </a>
                      }
                    </p>
                    @if (entry.isFromMe) {
                      <div style="margin-top: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
                        @if (entry.readAt) {
                          <span style="font-size: 0.75rem; color: #10b981; display: flex; align-items: center; gap: 2px;">
                            <span style="font-size: 0.9rem;">👁️</span> Viewed {{ entry.readAt | date:'shortTime' }}
                          </span>
                        } @else {
                          <span style="font-size: 0.75rem;" [style.color]="theme.colors().textSecondary" title="Pending view">
                            <span style="font-size: 0.9rem;">⌛👁️</span> Pending...
                          </span>
                        }
                      </div>
                    }
                  </div>
                } @empty {
                  <div style="text-align: center; padding: 2rem 0;">
                    <p [style.color]="theme.colors().textSecondary">No shared history found yet.</p>
                  </div>
                }
              </div>
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
  private audit = inject(AuditService);
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

  sharedWithThem = computed(() => {
    const friendId = this.routeUserId();
    return this.audit.getSentCrushesStatus(friendId, this.dataService)();
  });

  auditLog = computed(() => {
    const friendId = this.routeUserId();
    return this.audit.getHistoryWithFriend(friendId, this.dataService)();
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
