import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ModalService } from '../../core/services/modal.service';
import { SecurityService } from '../../core/services/security.service';
import { IconComponent } from '../../core/components/icon/icon.component';
import { CrushSharePickerComponent } from '../../core/components/crush-share-picker/crush-share-picker.component';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { ActivityTimelineComponent } from '../../core/components/activity-timeline/activity-timeline.component';
import { UserSettingsService } from '../../core/services/user-settings.service';
import { CrushProfile, crushSeenAt } from '../../core/models/crush-profile.model';
import { FriendProfileDetails, FriendSummary, FriendsApiService, FriendshipProfile, clearLocalFriendshipProfile, readLocalFriendshipProfile, writeLocalFriendshipProfile } from '../../core/services/friends-api.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { BackLinkComponent } from '../../core/components/back-link.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  styleUrl: './user-profile.component.css',
  imports: [CommonModule, FormsModule, RouterModule, PageHintComponent, NavbarComponent, BackLinkComponent, ActivityTimelineComponent, IconComponent, CrushSharePickerComponent],
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
          message="Everything about this friendship: their bio, the crushes you share with each other, your history together, and your private friendship profile at the bottom.">
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
                @if (!isSelf() && friend()) {
                  <div class="user-profile-header-actions">
                    <button type="button" (click)="startEditingFriendshipProfile()"
                            [style.color]="theme.colors().onBgPrimary"
                            [style.border]="'1px solid ' + theme.colors().primary"
                            class="user-profile-pill user-profile-pill--ghost">Edit</button>
                    <button type="button" (click)="showSharePicker.set(true)"
                            [style.color]="theme.colors().onBgPrimary"
                            [style.border]="'1px solid ' + theme.colors().primary"
                            class="user-profile-pill user-profile-pill--ghost">
                      <span aria-hidden="true">+</span> Share crush
                    </button>
                    <a [routerLink]="['/chat']"
                       [queryParams]="{ friendId: friendId(), friendName: profileDisplayName() }"
                       [style.background-color]="theme.colors().primary"
                       class="user-profile-pill user-profile-pill--primary">💬 Chat</a>
                  </div>
                }
              }
            </div>
          </div>
        </div>

        @if (showSharePicker()) {
          <app-crush-share-picker [friendId]="friendId()" [friendName]="profileDisplayName()" (closed)="showSharePicker.set(false)"></app-crush-share-picker>
        }

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
                 [style.color]="theme.colors().onBgPrimary"
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
                                  [style.color]="theme.colors().onBgPrimary"
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
                  Crushes from your list that {{ profileDisplayName() }} can see ({{ sharedWithThem().length }}). Use "+ Share crush" above to share another, or unshare any time.
                </p>
              </div>
            </div>

            @if (sharedWithThem().length > 0) {
              <div class="user-profile-component__s15">
                @for (crush of sharedWithThem(); track crush.id) {
                  <div [style.background-color]="theme.colors().bg"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text"
                       class="user-profile-component__s16 user-profile-shared-crush-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
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
                              style="background: transparent; border: 1px solid #ef4444; color: var(--danger); padding: 4px 10px; border-radius: var(--radius-pill); font-size: var(--fs-small); cursor: pointer;">
                        Unshare
                      </button>
                    </div>
                    <div [style.border-top]="'1px solid ' + theme.colors().border" class="user-profile-details-grid user-profile-shared-crush-grid">
                      <p><strong>Your status:</strong> {{ crush.status }}</p>
                      @if (crush.relationshipStatus) {
                        <p><strong>Relationship status:</strong> {{ crush.relationshipStatus }}</p>
                      }
                      @if (getRelationshipLabels(crush).length > 0) {
                        <p><strong>Labels:</strong> {{ getRelationshipLabels(crush).join(', ') }}</p>
                      }
                      @if (crush.age) {
                        <p><strong>Age:</strong> {{ crush.age }}</p>
                      }
                      @if (crush.location) {
                        <p><strong>Location:</strong> {{ crush.location }}</p>
                      }
                      @if (crush.occupation) {
                        <p><strong>Occupation:</strong> {{ crush.occupation }}</p>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div [style.border]="'1px dashed ' + theme.colors().border" class="user-profile-component__s22">
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">You haven't shared any crushes with {{ profileDisplayName() }} yet. Use "+ Share crush" above to pick one.</p>
              </div>
            }
          </div>
        }

        @if (!isSelf()) {
          @if (friendNotFound()) {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="user-profile-component__s11" style="margin-top: 2rem;">
              <p [style.color]="theme.colors().textSecondary" style="margin: 0;">This person isn't in your friends list.</p>
            </div>
          }

          <!-- Friendship Profile: what you wrote about this friendship (only you can see it) -->
          @if (friend(); as f) {
            <section id="friendship-profile"
                     [style.background-color]="theme.colors().bgSecondary"
                     [style.border]="'1px solid ' + theme.colors().border"
                     class="user-profile-component__s11 user-profile-fp" style="margin-top: 2rem;">
              <div class="user-profile-fp-heading">
                <div>
                  <h2 class="section-title">Friendship Profile</h2>
                  <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s13" style="text-transform: none; letter-spacing: 0; margin: 4px 0 0;">
                    Your private notes on this friendship. {{ f.username }} can't see them.
                  </p>
                </div>
                <div class="user-profile-fp-tools">
                  @if (!editingFriendshipProfile()) {
                    <button type="button" (click)="startEditingFriendshipProfile()"
                            [style.color]="theme.colors().onBgPrimary"
                            [style.border]="'1px solid ' + theme.colors().primary"
                            class="user-profile-pill user-profile-pill--ghost">Edit</button>
                  }
                  <button type="button" (click)="f.paused ? resumeFriendship() : pauseFriendship()"
                          [attr.aria-label]="(f.paused ? 'Resume friendship with ' : 'Pause friendship with ') + f.username"
                          [title]="f.paused ? 'Resume friendship' : 'Pause friendship'"
                          [style.color]="theme.colors().textSecondary"
                          class="icon-btn"><app-icon [name]="f.paused ? 'play' : 'pause'" /></button>
                  <button type="button" (click)="removeFriendship()"
                          [attr.aria-label]="'Remove ' + f.username + ' as a friend'" title="Remove friend"
                          class="icon-btn icon-btn--danger"><app-icon name="trash" /></button>
                </div>
              </div>
              @if (f.paused) {
                <p [style.color]="theme.colors().textSecondary" class="user-profile-fp-paused">⏸ This friendship is paused. Resume it to hear from {{ f.username }} again.</p>
              }

              @if (editingFriendshipProfile()) {
                <div class="user-profile-fp-grid">
                  <label for="fp-relationship-name">Relationship Name
                    <input id="fp-relationship-name" [(ngModel)]="friendshipDraft.relationshipName" placeholder="e.g. Bestie, cousin" maxlength="500"
                           [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="user-profile-fp-field">
                  </label>
                  <label for="fp-relationship-type">Relationship Type
                    <select id="fp-relationship-type" [(ngModel)]="friendshipDraft.relationshipType"
                            [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="user-profile-fp-field">
                      <option value="">Choose…</option>
                      @for (type of relationshipTypes; track type) { <option [value]="type">{{ type }}</option> }
                    </select>
                  </label>
                  <label for="fp-how-met">How You Met
                    <input id="fp-how-met" [(ngModel)]="friendshipDraft.howMet" placeholder="e.g. College" maxlength="500"
                           [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="user-profile-fp-field">
                  </label>
                  <label for="fp-trust">Trust Level
                    <select id="fp-trust" [(ngModel)]="friendshipDraft.trustLevel"
                            [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="user-profile-fp-field">
                      <option value="">Choose…</option>
                      @for (level of trustLevels; track level) { <option [value]="level">{{ level }}</option> }
                    </select>
                  </label>
                  <label class="user-profile-fp-field--full" for="fp-notes">Notes
                    <textarea id="fp-notes" [(ngModel)]="friendshipDraft.notes" rows="3" placeholder="Anything worth remembering" maxlength="2000"
                              [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="user-profile-fp-field"></textarea>
                  </label>
                </div>
                <div class="user-profile-fp-actions">
                  <button type="button" (click)="saveFriendshipProfile()" [disabled]="savingFriendshipProfile()"
                          [style.background-color]="theme.colors().primary"
                          class="user-profile-pill user-profile-pill--primary">{{ savingFriendshipProfile() ? 'Saving…' : 'Save Changes' }}</button>
                  <button type="button" (click)="cancelEditingFriendshipProfile()"
                          [style.color]="theme.colors().onBgPrimary"
                          [style.border]="'1px solid ' + theme.colors().primary"
                          class="user-profile-pill user-profile-pill--ghost">Cancel</button>
                </div>
              } @else if (friendshipProfile(); as fp) {
                <dl class="user-profile-fp-view">
                  <div class="user-profile-fp-row" [style.border]="'1px solid ' + theme.colors().border"><dt>Relationship Name</dt><dd>{{ fp.relationshipName || 'N/A' }}</dd></div>
                  <div class="user-profile-fp-row" [style.border]="'1px solid ' + theme.colors().border"><dt>Relationship Type</dt><dd>{{ fp.relationshipType || 'N/A' }}</dd></div>
                  <div class="user-profile-fp-row" [style.border]="'1px solid ' + theme.colors().border"><dt>How You Met</dt><dd>{{ fp.howMet || 'N/A' }}</dd></div>
                  <div class="user-profile-fp-row" [style.border]="'1px solid ' + theme.colors().border"><dt>Trust Level</dt><dd>{{ fp.trustLevel || 'N/A' }}</dd></div>
                  <div class="user-profile-fp-row user-profile-fp-row--full" [style.border]="'1px solid ' + theme.colors().border"><dt>Notes</dt><dd>{{ fp.notes || 'N/A' }}</dd></div>
                </dl>
              } @else {
                <p [style.color]="theme.colors().textSecondary" class="user-profile-fp-empty">No friendship profile saved yet. Tap Edit to add one.</p>
              }
            </section>
          }

          <div class="user-profile-history-row">
            <button type="button" (click)="auditLogView.set(!auditLogView())"
                    [attr.aria-expanded]="auditLogView()"
                    aria-controls="friend-history"
                    [style.color]="theme.colors().onBgPrimary"
                    [style.border]="'1px solid ' + theme.colors().primary"
                    class="user-profile-history-btn">
              📜 {{ auditLogView() ? 'Close history' : 'History' }}
            </button>
          </div>

          @if (auditLogView()) {
            <div id="friend-history"
                 [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="user-profile-component__s11" style="margin-top: 1rem; animation: slideDown 0.3s ease-out;">
              <div class="user-profile-component__s12" style="border-bottom: 1px solid {{theme.colors().border}}; padding-bottom: 0.75rem; margin-bottom: 1rem;">
                <h2 class="section-title">History with {{ profileDisplayName() }}</h2>
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s13" style="text-transform: none; letter-spacing: 0;">
                  Everything that has happened between you two, newest first.
                </p>
              </div>
              <app-activity-timeline [friendId]="friendId()"></app-activity-timeline>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class UserProfileComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private dataService = inject(DataService);
  private friendsApi = inject(FriendsApiService);
  private messaging = inject(MessagingService);
  private settings = inject(UserSettingsService);
  private modal = inject(ModalService);
  private security = inject(SecurityService);
  public theme = inject(ThemeService);

  /** The route param as written: 'me', a username, or (from old links) an id. */
  routeUserId = signal('');
  /** The friend matching the route param, once the friends list has loaded. */
  friend = computed<FriendSummary | null>(() => {
    const param = this.routeUserId();
    if (!param || this.isSelf()) return null;
    return this.friendSummaries().find((item) => item.id === param || item.username === param) || null;
  });
  /** The friend's real id: every API call, chat link and share toggle uses this, never the raw param. */
  friendId = computed(() => this.friend()?.id || '');
  protected friendNotFound = signal(false);
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
      this.editingFriendshipProfile.set(false);
      this.friendNotFound.set(false);
    });
    this.route.queryParamMap.subscribe(params => {
      if (params.get('history') === 'true') {
        this.auditLogView.set(true);
      }
      if (params.get('edit') === 'profile') {
        this.pendingEdit = true;
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
    if (this.isSelf()) return this.dataService.activeCrushes();
    return this.friendSharedCrushes();
  });

  /** My crushes this friend can see, with when they last opened each one. */
  sharedWithThem = computed(() => {
    const friendId = this.friendId();
    if (!friendId || this.dataService.isMe(friendId)) return [] as Array<CrushProfile & { seenAt: Date | null }>;
    return this.dataService.activeCrushes()
      .filter((crush) => this.dataService.isCrushSharedWith(crush, friendId))
      .map((crush) => ({ ...crush, seenAt: crushSeenAt(crush, friendId) }));
  });


  protected showSharePicker = signal(false);

  toggleShare(crushId: string) {
    const friendId = this.friendId();
    if (friendId) this.dataService.toggleCrushVisibility(crushId, friendId);
  }

  unshare(crushId: string) {
    this.toggleShare(crushId);
  }

  // ---------- Friendship profile (private to you; saved on the server) ----------
  readonly relationshipTypes = ['Close Friend', 'Bestie', 'Work Friend', 'Family Friend', 'New Friend'];
  readonly trustLevels = ['Low', 'Medium', 'High'];
  protected editingFriendshipProfile = signal(false);
  protected savingFriendshipProfile = signal(false);
  protected friendshipDraft: FriendshipProfile = {};
  private pendingEdit = false;

  friendshipProfile = computed<FriendshipProfile | null>(() => {
    const profile = this.friend()?.friendshipProfile;
    if (!profile) return null;
    const hasContent = [profile.relationshipName, profile.relationshipType, profile.howMet, profile.trustLevel, profile.notes].some((v) => (v || '').trim());
    return hasContent ? profile : null;
  });

  startEditingFriendshipProfile(): void {
    const friend = this.friend();
    if (!friend) return;
    const current = friend.friendshipProfile || {};
    this.friendshipDraft = {
      relationshipName: current.relationshipName || '',
      relationshipType: current.relationshipType || '',
      howMet: current.howMet || '',
      trustLevel: current.trustLevel || '',
      notes: current.notes || ''
    };
    this.editingFriendshipProfile.set(true);
    setTimeout(() => {
      const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('friendship-profile')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      document.getElementById('fp-relationship-name')?.focus({ preventScroll: true });
    }, 50);
  }

  cancelEditingFriendshipProfile(): void {
    this.editingFriendshipProfile.set(false);
  }

  /** Do the five text fields in `a` and `b` actually match (ignoring `updatedAt`)? */
  private friendshipProfileMatches(a: FriendshipProfile, b: FriendshipProfile): boolean {
    const fields: (keyof FriendshipProfile)[] = ['relationshipName', 'relationshipType', 'howMet', 'trustLevel', 'notes'];
    return fields.every((field) => (a[field] || '') === (b[field] || ''));
  }

  async saveFriendshipProfile(): Promise<void> {
    const friend = this.friend();
    if (!friend || this.savingFriendshipProfile()) return;
    const profile: FriendshipProfile = {
      relationshipName: (this.friendshipDraft.relationshipName || '').trim(),
      relationshipType: (this.friendshipDraft.relationshipType || '').trim(),
      howMet: (this.friendshipDraft.howMet || '').trim(),
      trustLevel: (this.friendshipDraft.trustLevel || '').trim(),
      notes: (this.friendshipDraft.notes || '').trim()
    };
    this.savingFriendshipProfile.set(true);
    try {
      await this.friendsApi.saveFriendshipProfile(friend.id, profile);
      // The PUT can report success without it actually sticking (a friendship
      // that only exists in one direction, a stale route on an old deploy, ...).
      // Re-read the list instead of trusting the echo, so a save that didn't
      // really land is never reported as "saved".
      const refreshed = await this.friendsApi.listFriends();
      this.friendSummaries.set(refreshed);
      const match = refreshed.find((item) => item.id === friend.id);
      if (match?.friendshipProfile && this.friendshipProfileMatches(match.friendshipProfile, profile)) {
        clearLocalFriendshipProfile(this.security.currentUserId() || '', friend.id);
        this.modal.show('Friendship profile saved.');
      } else {
        writeLocalFriendshipProfile(this.security.currentUserId() || '', friend.id, profile);
        this.patchFriend(friend.id, { friendshipProfile: profile });
        this.modal.show("Saved, but your account doesn't show it back yet. It's kept on this device and we'll keep trying to sync it.");
      }
    } catch (error: any) {
      if (error?.status !== undefined) {
        // The server actively rejected this: show what it said rather than
        // quietly keeping a local copy that reads as success.
        this.modal.show(error?.message || `Could not save your friendship profile (error ${error.status}).`);
      } else {
        // A genuine offline/network failure: keep it on this device and sync later.
        writeLocalFriendshipProfile(this.security.currentUserId() || '', friend.id, profile);
        this.patchFriend(friend.id, { friendshipProfile: profile });
        this.modal.show('Saved on this device. It will sync to your account when you are back online.');
      }
    } finally {
      this.savingFriendshipProfile.set(false);
      this.editingFriendshipProfile.set(false);
    }
  }

  private patchFriend(friendId: string, patch: Partial<FriendSummary>): void {
    this.friendSummaries.update((list) => list.map((f) => f.id === friendId ? { ...f, ...patch } : f));
  }

  // ---------- Pause / remove ----------
  pauseFriendship(): void {
    const friend = this.friend();
    if (!friend) return;
    this.modal.confirm(
      `Pause your friendship with ${friend.username}? They move to your Paused list and, with notifications muted, you won't hear from them until you resume. Sharing stays active both ways, and they aren't told.`,
      async () => {
        try {
          const state = await this.friendsApi.setPauseState(friend.id, true, true);
          this.patchFriend(friend.id, { paused: state.paused, mutedNotifications: state.mutedNotifications });
          this.modal.show(`Friendship with ${friend.username} paused. Resume any time.`);
        } catch (error: any) {
          this.modal.show(error?.message || 'Unable to pause this friendship right now.');
        }
      },
      undefined,
      { title: 'Pause friendship?', confirmLabel: 'Pause' }
    );
  }

  async resumeFriendship(): Promise<void> {
    const friend = this.friend();
    if (!friend) return;
    try {
      const state = await this.friendsApi.setPauseState(friend.id, false);
      this.patchFriend(friend.id, { paused: state.paused, mutedNotifications: state.mutedNotifications });
      this.modal.show(`${friend.username} is back in your friends list.`);
    } catch (error: any) {
      this.modal.show(error?.message || 'Unable to resume this friendship right now.');
    }
  }

  removeFriendship(): void {
    const friend = this.friend();
    if (!friend) return;
    this.modal.confirm(
      `Remove ${friend.username} as a friend? You both lose access to what you shared with each other. This cannot be undone.`,
      async () => {
        try {
          await this.friendsApi.removeFriend(friend.id);
          this.messaging.pruneConversation(friend.id, friend.username);
          this.modal.show(`${friend.username} has been removed from your friends.`);
          void this.router.navigate(['/friends']);
        } catch (error: any) {
          this.modal.show(error?.message || 'Unable to remove this friend right now.');
        }
      },
      undefined,
      { title: 'Remove friend?', confirmLabel: 'Remove', danger: true }
    );
  }

  getRelationshipLabels(crush: CrushProfile): string[] {
    return (crush.relationshipLabels || [])
      .map((label) => label.trim())
      .filter((label) => label.length > 0)
      .map((label) => label.replace(/^Other:\s*/i, '').trim())
      .filter((label, index, labels) => label.length > 0 && labels.indexOf(label) === index);
  }

  private async loadFriendContext(param: string): Promise<void> {
    const requestId = ++this.friendLoadRequestId;
    this.profileLoading.set(true);
    this.friendSharedCrushesLoading.set(true);

    // The URL carries a username (or an id from an old link): find the friend first.
    let friends: FriendSummary[] = [];
    try {
      friends = await this.friendsApi.listFriends();
    } catch (error) {
      console.error('Failed to load friends for user profile.', error);
    }
    if (requestId !== this.friendLoadRequestId) return;
    this.friendSummaries.set(friends);
    const match = friends.find((item) => item.id === param || item.username === param) || null;
    if (!match) {
      this.friendNotFound.set(true);
      this.friendSharedCrushes.set([]);
      this.friendProfileDetailsState.set(null);
      this.friendSharedCrushesLoading.set(false);
      this.profileLoading.set(false);
      return;
    }
    // The page lives at /friends/<username>; swap an id in the address bar for the username.
    if (param !== match.username) {
      const query = window.location.search || '';
      this.location.replaceState(`/friends/${encodeURIComponent(match.username)}${query}`);
    }
    // Friendship profiles used to live only in this browser: hand a leftover copy to the server once.
    if (!match.friendshipProfile) {
      const local = readLocalFriendshipProfile(this.security.currentUserId() || '', match.id);
      if (local) {
        this.patchFriend(match.id, { friendshipProfile: local });
        void this.friendsApi.saveFriendshipProfile(match.id, local)
          .then(() => clearLocalFriendshipProfile(this.security.currentUserId() || '', match.id))
          .catch(() => { /* keep the local copy */ });
      }
    }
    if (this.pendingEdit) { this.pendingEdit = false; this.startEditingFriendshipProfile(); }
    const friendId = match.id;
    void this.messaging.loadConversation(friendId);

    const [sharedCrushesResult, profileResult] = await Promise.allSettled([
      this.friendsApi.getFriendSharedCrushes(friendId),
      this.friendsApi.getFriendProfile(friendId)
    ]);

    if (requestId !== this.friendLoadRequestId) return;

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
