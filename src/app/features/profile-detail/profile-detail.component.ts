import { Component, signal, inject, computed, OnDestroy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { Location } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { SecurityService } from '../../core/services/security.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionTier, User } from '../../core/models/user.model';
import { FriendsApiService } from '../../core/services/friends-api.service';
import { CrushProfile, CrushStatus } from '../../core/models/crush-profile.model';
import { AvatarRenderService } from '../../core/services/avatar-render.service';
import { CrushFormComponent } from '../../core/components/crush-form/crush-form.component';
import { CrushFormValue, crushFormTextFields, crushToFormValue, emptyCrushFormValue, formValueToCrushPatch, parseCustomNotes } from '../../core/utils/crush-form.util';
import { CRUSH_FORM_FIELDS } from '../../core/services/crush-payload';

import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { UpgradePromptComponent } from '../../core/components/upgrade-prompt/upgrade-prompt.component';
import { FeatureGateService } from '../../core/services/feature-gate.service';

@Component({
  selector: 'app-profile-detail',
  standalone: true,
  styleUrl: './profile-detail.component.css',
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, CrushFormComponent, UpgradePromptComponent],
  template: `
    <div [style.background-color]="theme.colors().bg"
         [style.color]="theme.colors().text"
         [style.--primary]="theme.colors().primary"
         [style.--primary-hover]="theme.colors().primaryHover"
         [style.--bg-secondary]="theme.colors().bgSecondary"
         [style.--border]="theme.colors().border"
         [style.--text]="theme.colors().text"
         class="profile-container">
      <app-navbar></app-navbar>

      <div [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + '22, ' + theme.colors().accent + '22)'"
           class="header-gradient-container">
        <a href="#" (click)="goBack($event)" [style.color]="theme.colors().text" class="back-link">← {{ isReadOnlyFriendView() || friendCrushLoading() || friendCrushNotFound() || friendCrushError() ? 'Back' : 'Back to Dashboard' }}</a>
      </div>

      @if (isReadOnlyFriendView() && crush(); as c) {
        <div class="profile-main-content">
          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               style="border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; font-size: var(--fs-label); font-weight: 700; text-transform: uppercase; letter-spacing: 1px;"
               [style.color]="theme.colors().primary">
            @if (friendCrushOwnerName()) {
              Shared by {{ friendCrushOwnerName() }} · Read-only
            } @else {
              Shared crush · Read-only
            }

          </div>
          @if (friendCrushOwnerId(); as ownerId) {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="read-only-chat-card">
              <div>
                <strong>Want to talk about {{ getCrushDisplayName(c) }}?</strong>
                <p [style.color]="theme.colors().textSecondary">
                  Ask {{ friendCrushOwnerName() || 'your friend' }} a question or leave a comment.
                </p>
              </div>
              <a [routerLink]="['/chat']"
                 [queryParams]="{ friendId: ownerId, friendName: friendCrushOwnerName() || 'Friend' }"
                 [style.background-color]="theme.colors().primary"
                 class="read-only-chat-button">
                💬 Chat with {{ friendCrushOwnerName() || 'your friend' }}
              </a>
            </div>
          }
          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               style="border-radius: 16px; padding: 24px; display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;">
            <div class="profile-avatar-wrap">
              <img [src]="c.avatarUrl || 'https://i.pravatar.cc/150?u=' + c.nickname"
                   [alt]="c.nickname"
                   style="width: 96px; height: 96px; border-radius: 12px; object-fit: cover;">
            </div>
            <div style="flex: 1; min-width: 200px;">
              <h2 style="margin: 0 0 4px 0; font-size: 22px;">{{ getCrushDisplayName(c) }}</h2>
              @if (c.fullName) {
                <p [style.color]="theme.colors().textSecondary" style="margin: 0 0 8px 0;">{{ c.fullName }}</p>
              }
              <div class="profile-rating-row" aria-label="Rating">
                <span class="profile-rating-stars" [style.color]="theme.colors().accent">
                  @for (star of [1,2,3,4,5]; track star) { {{ (c.rating || 0) >= star ? '★' : '☆' }} }
                </span>
                @if ((c.redFlags || 0) > 0) {
                  <button type="button" (click)="showRedFlagReason(c)"
                          [style.color]="'#ef4444'" [style.border]="'1px solid #ef4444'"
                          class="profile-pill red-flag-chip-button" aria-label="Red flagged">🚩 Red flag</button>
                } @else {
                  <span [style.color]="'#22c55e'" [style.border]="'1px solid #22c55e'" class="profile-pill" aria-label="No red flags">⚑ No flags</span>
                }
              </div>
              <div class="profile-status-row">
                <span [style.color]="theme.colors().primary" [style.border]="'1px solid ' + theme.colors().primary" class="profile-pill profile-pill--status">
                  Status: {{ c.status }}
                </span>
              </div>
              @if (getRelationshipLabels(c).length) {
                <div class="profile-labels-row" aria-label="Additional relationship labels">
                  @for (label of getRelationshipLabels(c); track label) {
                    <span [style.color]="theme.colors().text"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.background-color]="theme.colors().bg"
                          class="profile-pill profile-relationship-labels">
                      {{ label }}
                    </span>
                  }
                </div>
              }
              @if (c.location || getCrushAge(c)) {
                <p [style.color]="theme.colors().primary" style="margin: 12px 0 8px 0; font-size: var(--fs-label);">
                  {{ c.location || 'Location Unknown' }}{{ getCrushAge(c) ? ' • ' + getCrushAge(c) + ' years' : '' }}
                </p>
              }
              @if (c.bio) {
                <p style="margin-top: 12px; line-height: 1.6;">{{ c.bio }}</p>
              }

              @if (hasMoreCrushDetails()) {
                <button type="button"
                        (click)="toggleFullCrushDetails()"
                        [style.color]="theme.colors().primary"
                        [style.border]="'1px solid ' + theme.colors().primary"
                        style="margin-top: 14px; background: transparent; border-radius: 999px; padding: 6px 14px; font-size: var(--fs-label); font-weight: 700; cursor: pointer;">
                  {{ showFullCrushDetails() ? 'Show less ▲' : 'Show more details ▼' }}
                </button>

                @if (showFullCrushDetails()) {
                  <div [style.border]="'1px solid ' + theme.colors().border"
                       class="read-only-details-panel"
                       style="border-radius: 10px; padding: 14px; margin-top: 12px; display: flex; flex-direction: column; gap: 8px; font-size: var(--fs-small);">
                    @if (c.customNotes) {
                      <p [style.color]="theme.colors().textSecondary" style="margin: 0; font-style: italic; line-height: 1.6;">{{ c.customNotes }}</p>
                    }
                    @if (c.pronouns) {
                      <p style="margin: 0;"><strong>Pronouns:</strong> {{ c.pronouns }}</p>
                    }
                    @if (c.category) {
                      <p style="margin: 0;"><strong>Category:</strong> {{ c.category }}</p>
                    }
                    @if (c.occupation) {
                      <p style="margin: 0;"><strong>Occupation:</strong> {{ c.occupation }}</p>
                    }
                    @if (c.grade) {
                      <p style="margin: 0;"><strong>Grade/Year:</strong> {{ c.grade }}</p>
                    }
                    @if (c.family) {
                      <p style="margin: 0;"><strong>Family:</strong> {{ c.family }}</p>
                    }
                    @if (c.howWeMet) {
                      <p style="margin: 0;"><strong>How they met:</strong> {{ c.howWeMet }}</p>
                    }
                    @if (c.whenWeMet) {
                      <p style="margin: 0;"><strong>When they met:</strong> {{ c.whenWeMet }}</p>
                    }
                    @if (c.memorableMoments) {
                      <p style="margin: 0;"><strong>Memorable moments:</strong> {{ c.memorableMoments }}</p>
                    }
                    @if (c.hair?.length) {
                      <p style="margin: 0;"><strong>Hair:</strong> {{ c.hair?.join(', ') }}</p>
                    }
                    @if (c.eyes?.length) {
                      <p style="margin: 0;"><strong>Eyes:</strong> {{ c.eyes?.join(', ') }}</p>
                    }
                    @if (c.build?.length) {
                      <p style="margin: 0;"><strong>Build:</strong> {{ c.build?.join(', ') }}</p>
                    }
                    @if (c.heartbreakSong) {
                      <p style="margin: 0;"><strong>Heartbreak song:</strong> {{ c.heartbreakSong }}</p>
                    }
                    @if (c.heartbreakRecovery) {
                      <p style="margin: 0;"><strong>Heartbreak recovery:</strong> {{ c.heartbreakRecovery }}</p>
                    }
                    @if (c.redFlagReason) {
                      <p style="margin: 0; color: #ef4444;"><strong>Red flag notes:</strong> {{ c.redFlagReason }}</p>
                    }
                    @if (c.social?.instagram || c.social?.snapchat || c.social?.twitter || c.social?.facebook || c.social?.whatsapp) {
                      <div style="margin-top: 4px;">
                        <strong>Social:</strong>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px;">
                          @if (c.social?.instagram) { <span>📷 {{ c.social?.instagram }}</span> }
                          @if (c.social?.snapchat) { <span>👻 {{ c.social?.snapchat }}</span> }
                          @if (c.social?.twitter) { <span>🐦 {{ c.social?.twitter }}</span> }
                          @if (c.social?.facebook) { <span>📘 {{ c.social?.facebook }}</span> }
                          @if (c.social?.whatsapp) { <span>💬 {{ c.social?.whatsapp }}</span> }
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>

          @if (sharedEntriesForCrush().length > 0) {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 style="border-radius: 16px; padding: 20px; margin-top: 16px;">
              <h3 [style.color]="theme.colors().textSecondary" style="margin: 0 0 12px 0; font-size: var(--fs-label); text-transform: uppercase; letter-spacing: 1px;">
                Shared with you
              </h3>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                @for (entry of sharedEntriesForCrush(); track entry.id) {
                  <div [style.border]="'1px solid ' + theme.colors().border"
                       style="border-radius: 10px; padding: 10px 12px;">
                    <p style="margin: 0; line-height: 1.5;">{{ entry.content }}</p>
                    <span [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label);">
                      {{ entry.timestamp | date:'MMM d, h:mm a' }}
                    </span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else if (crush(); as c) {
        <div class="profile-main-content">
          @if (safetyState() !== 'Draft') {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + (safetyState() === 'Urgent' ? '#ef4444' : theme.colors().border)"
                 style="position: sticky; top: 12px; z-index: 30; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <div>
                <div style="font-weight: 700;" [style.color]="safetyState() === 'Urgent' ? '#ef4444' : theme.colors().primary">
                  @if (safetyState() === 'Sent') { 🔒 Safety Check Active }
                  @if (safetyState() === 'Safe') { ✅ Safety Check Resolved }
                  @if (safetyState() === 'Urgent') { 🚨 Emergency Mode Active }
                </div>
                <div [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label); margin-top: 2px;">
                  Contacts: {{ selectedSafetyContactNames() || 'None selected' }} • Interval: {{ safetyDurationMinutes() }} min
                </div>
              </div>
              @if (safetyState() === 'Sent') {
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button (click)="markSafe(c.id)" class="action-btn-styled safe">✅ Mark Safe</button>
                  <button (click)="triggerEmergency(c.id)" class="action-btn-styled urgent">🚨 URGENT</button>
                </div>
              }
            </div>
          }

          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               class="profile-header-card">
            <div class="profile-header-flex">
              <div class="profile-avatar-wrap">
                <img [src]="c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop'"
                     [alt]="c.nickname"
                     class="profile-avatar">
              </div>
              <div class="profile-title-section">
                <h1 class="profile-name">{{ getCrushDisplayName(c) }}</h1>

                <div class="profile-rating-row" aria-label="Vibe rating">
                  <span class="profile-rating-stars" [style.color]="theme.colors().accent">
                    @for (star of [1,2,3,4,5]; track star) {
                      {{ (c.rating || 0) >= star ? '★' : '☆' }}
                    }
                  </span>
                  @if ((c.redFlags || 0) > 0) {
                    <button type="button"
                            (click)="showRedFlagReason(c)"
                            [style.color]="'#ef4444'"
                            [style.border]="'1px solid #ef4444'"
                            class="profile-pill red-flag-chip-button"
                            title="Red flag logged">
                      🚩 Red flag
                    </button>
                  } @else {
                    <span [style.color]="'#22c55e'"
                          [style.border]="'1px solid #22c55e'"
                          class="profile-pill"
                          title="No red flags">
                      ⚑ No flags
                    </span>
                  }
                </div>

                <div class="profile-status-row">
                  @if (!statusQuickEditOpen()) {
                    <button type="button"
                            (click)="openQuickStatusEditor(c)"
                            [style.color]="theme.colors().primary"
                            [style.border]="'1px solid ' + theme.colors().primary"
                            class="profile-pill profile-pill--status status-chip-button">
                      Status: {{ c.status || 'Plotting' }}
                    </button>
                    <span class="status-visibility-info"
                          title="Status tracks where things stand: Crush → Plotting → Dating → Exclusive, or Broken Up / Heartbroken / Archived / Friend if it ends. Changing status will ask whether to make the update Public (everyone on your friends list can see it) or Private (only friends you pick can see it)."
                          aria-label="What does changing status do?">ℹ</span>
                  } @else {
                    <div class="status-quick-edit">
                      <select [value]="quickStatusDraft() || c.status || statuses.Plotting"
                              (change)="beginQuickStatusChange(c.id, asSelectValue($event))"
                              [style.background-color]="theme.colors().bg"
                              [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().text"
                              class="status-quick-select">
                        <option [value]="statuses.Crush">Crush</option>
                        <option [value]="statuses.Plotting">Plotting</option>
                        <option [value]="statuses.Dating">Dating</option>
                        <option [value]="statuses.Exclusive">Exclusive</option>
                        <option [value]="statuses.BrokenUp">Broken Up</option>
                        <option [value]="statuses.Heartbroken">Heartbroken</option>
                        <option [value]="statuses.Archived">Archived</option>
                        <option [value]="statuses.Friend">Friend</option>
                      </select>
                      <button type="button"
                              (click)="closeQuickStatusEditor()"
                              [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().textSecondary"
                              class="status-chip-button status-chip-button--ghost">
                        Cancel
                      </button>
                    </div>
                  }
                </div>

                @if ((c.relationshipLabels || []).length > 0) {
                  <div class="profile-labels-row" aria-label="Relationship labels">
                    @for (label of c.relationshipLabels || []; track label) {
                      <span [style.color]="theme.colors().text"
                            [style.border]="'1px solid ' + theme.colors().border"
                            [style.background-color]="theme.colors().bg"
                            class="profile-pill profile-relationship-labels">
                        {{ label }}
                      </span>
                    }
                  </div>
                }
                <p [style.color]="theme.colors().primary" class="profile-subtitle">
                  {{ c.location || 'Location Unknown' }} • {{ getCrushAge(c) ? getCrushAge(c) + ' years' : 'Age Unknown' }}
                </p>
                @if (c.bio) {
                  <p [style.color]="theme.colors().textSecondary" class="profile-bio">{{ c.bio }}</p>
                }
              </div>
            </div>

            @if (!isEditMode()) {
              <div class="action-buttons-grid">
                <button (click)="toggleEditMode()" class="action-btn-styled secondary">Edit Profile</button>
                <button (click)="addNote(c.id)" class="action-btn-styled primary">📝 Add Note</button>
                <button (click)="openShareSelector(c.id)" class="action-btn-styled primary">🔗 Share</button>
                <button (click)="openDatingStatusShareSelector()" class="action-btn-styled primary share-dating-status-button">📣 Share Dating Status</button>
                @if (gate.canUseSafetyCheck()) {
                  <button (click)="toggleSafetySetup()" class="action-btn-styled safety">
                    {{ showSafetySetup() ? 'Hide Safety Check' : '🛡️ Safety Check' }}
                  </button>
                } @else {
                  <button (click)="showSafetyUpgrade.set(!showSafetyUpgrade())" class="action-btn-styled safety">
                    🛡️ Safety Check · Premium
                  </button>
                }

                <button (click)="toggleArchive(c)" class="action-btn-styled secondary">
                  {{ c.status === statuses.Archived ? '📂 Restore' : '📁 Archive' }}
                </button>
                @if ((c.redFlags || 0) > 0) {
                  <button (click)="removeRedFlag(c.id)" class="action-btn-styled danger">🧹 Remove Red Flag</button>
                } @else {
                  <button (click)="logRedFlag(c.id)" class="action-btn-styled danger">🚩 Red Flag</button>
                }
                <button (click)="deleteCrush(c.id)" class="action-btn-styled danger">🗑️ Delete</button>
              </div>
            }

            @if (!isEditMode() && showSafetyUpgrade() && !gate.canUseSafetyCheck()) {
              <div style="margin-top: 14px;">
                <app-upgrade-prompt feature="safetyCheck"></app-upgrade-prompt>
              </div>
            }

            @if (!isEditMode() && showSafetySetup() && gate.canUseSafetyCheck()) {
              <div [style.border]="'1px solid ' + theme.colors().border"
                   [style.background-color]="theme.colors().bg"
                   style="margin-top: 14px; border-radius: 10px; padding: 12px;">
                <h3 [style.color]="theme.colors().primary" style="margin: 0 0 8px 0; font-size: 1rem;">Safety Check-In Setup</h3>

                <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 10px;">
                  <label [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label);">Check-in interval</label>
                  <select [ngModel]="safetyDurationMinutes()"
                          (ngModelChange)="setSafetyDuration($event)"
                          [style.background-color]="theme.colors().bgSecondary"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.color]="theme.colors().text"
                          style="padding: 6px 10px; border-radius: 6px;">
                    @for (minutes of safetyDurationOptions; track minutes) {
                      <option [ngValue]="minutes">{{ minutes }} min</option>
                    }
                  </select>
                  <span [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label);">
                    We’ll pop a halfway check-in prompt automatically.
                  </span>
                </div>

                <p [style.color]="theme.colors().textSecondary" style="margin: 0 0 8px 0; font-size: var(--fs-label);">Share with trusted friends:</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  @for (friend of friends(); track friend.id) {
                    <button (click)="toggleSafetyContact(friend.id)"
                            [style.background-color]="isSafetyContact(friend.id) ? theme.colors().primary : 'transparent'"
                            [style.color]="isSafetyContact(friend.id) ? 'white' : theme.colors().text"
                            [style.border]="'1px solid ' + (isSafetyContact(friend.id) ? theme.colors().primary : theme.colors().border)"
                            style="padding: 5px 10px; border-radius: 999px; cursor: pointer; font-size: var(--fs-btn);">
                      {{ isSafetyContact(friend.id) ? '✓ ' : '' }}{{ friend.username }}
                    </button>
                  } @empty {
                    <span [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label);">No friends found. Add friends first.</span>
                  }
                </div>

                <div style="margin-top: 10px;">
                  <button (click)="startSafetyCheck(c.id)"
                          [style.background-color]="theme.colors().primary"
                          class="action-btn-styled safety">
                    {{ safetyState() === 'Sent' ? 'Restart Safety Check' : '🔒 Start Safety Check' }}
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Vibe Check Banner -->
          @if (showVibeBanner()) {
            <div [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + '18, ' + theme.colors().accent + '18)'"
                 [style.border]="'1px solid ' + theme.colors().primary + '40'"
                 class="vibe-banner">
              <div class="vibe-banner-content">
                <span class="vibe-banner-emoji">✨</span>
                <div class="vibe-banner-text">
                  <span [style.color]="theme.colors().text" class="vibe-banner-title">How's the vibe with {{ c.nickname }}?</span>
                  <span [style.color]="theme.colors().textSecondary" class="vibe-banner-sub">Tap a star to log today's vibe</span>
                </div>
                <div class="vibe-banner-stars">
                  @for (star of [1,2,3,4,5]; track star) {
                    <button (click)="logVibeInline(c.id, star)"
                            [style.color]="theme.colors().accent"
                            class="vibe-banner-star"
                            [attr.aria-label]="'Log vibe ' + star + ' stars'">★</button>
                  }
                </div>
              </div>
              <button (click)="dismissVibePrompt(c.id)"
                      [style.color]="theme.colors().textSecondary"
                      class="vibe-banner-dismiss"
                      aria-label="Dismiss">✕</button>
            </div>
          }

          @if (showShareSelector()) {
            <div class="selector-overlay" (click)="closeShareSelector()">
              <div class="selector-card" [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" (click)="$event.stopPropagation()">
                <div class="selector-header">
                  <h3>{{ shareSelectorMode() === 'dating' ? 'Share dating status' : (pendingShareEntryId() ? 'Share note with a friend' : 'Share with a Friend') }}</h3>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    @if (shareSelectorMode() === 'dating') {
                      <button class="action-btn-styled secondary" style="padding: 6px 10px;" (click)="toggleSelectAllDatingShareFriends()">
                        {{ areAllDatingShareFriendsSelected() ? 'Deselect All' : 'Select All' }}
                      </button>
                    } @else {
                      <button class="action-btn-styled secondary" style="padding: 6px 10px;" (click)="toggleSelectAllShareFriends()">
                        {{ areAllShareFriendsSelected() ? 'Deselect All' : 'Select All' }}
                      </button>
                    }
                    <button class="close-btn" (click)="closeShareSelector()">✕</button>
                  </div>
                </div>
                <div class="friend-list-scroll">
                  @for (friend of friends(); track friend.id) {
                    <div class="friend-item" (click)="shareSelectorMode() === 'dating' ? toggleDatingShareFriend(friend.id, friend.username) : toggleShareFriend(friend.id, friend.username)" [style.border-bottom]="'1px solid ' + theme.colors().border">
                      <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id" [alt]="friend.username" class="friend-avatar">
                      <div class="friend-info">
                        <span class="friend-name">{{ friend.username }}</span>
                        <span class="friend-status" [style.color]="shareSelectorMode() === 'dating' ? (isDatingShareFriendSelected(friend.id) ? theme.colors().primary : theme.colors().textSecondary) : (isShareFriendSelected(friend.id) ? theme.colors().primary : theme.colors().textSecondary)">
                          @if (shareSelectorMode() === 'dating') {
                            {{ isDatingShareFriendSelected(friend.id) ? '✓ Selected' : 'Tap to select' }}
                          } @else {
                            {{ isShareFriendSelected(friend.id) ? '✓ Selected' : 'Tap to select' }}
                          }
                        </span>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <p>No friends found.</p>
                      <a routerLink="/friends" (click)="closeShareSelector()" [style.color]="theme.colors().primary">Add friends</a>
                    </div>
                  }
                </div>
                @if (shareSelectorMode() === 'dating') {
                  <div style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px; margin-top: 12px; border-top: 1px solid;" [style.border-color]="theme.colors().border">
                    <button class="action-btn-styled secondary" (click)="closeShareSelector()">Cancel</button>
                    <button class="action-btn-styled primary" (click)="confirmDatingStatusShare(c.id)">Share with selected</button>
                  </div>
                } @else {
                  <div style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px; margin-top: 12px; border-top: 1px solid;" [style.border-color]="theme.colors().border">
                    <button class="action-btn-styled secondary" (click)="closeShareSelector()">Cancel</button>
                    <button class="action-btn-styled primary" (click)="confirmShareSelected(c.id)">
                      {{ pendingShareEntryId() ? 'Share Note with Selected' : 'Share with Selected' }}
                    </button>
                  </div>
                }
              </div>
            </div>
          }

          @if (showStatusVisibilityModal()) {
            <div class="selector-overlay" (click)="cancelQuickStatusChange()">
              <div class="selector-card status-visibility-card"
                   [style.background-color]="theme.colors().bg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   (click)="$event.stopPropagation()">
                <div class="selector-header">
                  <h3>Share this update with more friends?</h3>
                  <button class="close-btn" (click)="cancelQuickStatusChange()">✕</button>
                </div>

                <div class="status-visibility-body">
                  <p [style.color]="theme.colors().textSecondary" class="status-visibility-description">
                    Friends who already see this crush will see the new <strong>{{ pendingStatusValue() || quickStatusDraft() }}</strong> status. Pick anyone else you'd like to add.
                  </p>

                  <div class="status-visibility-options">
                    <button type="button"
                            (click)="setStatusVisibilityMode('private')"
                            [style.border]="'1px solid ' + (statusVisibilityMode() === 'private' ? theme.colors().primary : theme.colors().border)"
                            [style.background-color]="statusVisibilityMode() === 'private' ? theme.colors().primary + '14' : theme.colors().bgSecondary"
                            class="status-visibility-option">
                      <span class="status-visibility-option__title">
                        Keep current sharing
                        <span class="status-visibility-info"
                              title="Nobody new is added unless you pick them below."
                              aria-label="Nobody new is added unless you pick them below.">ℹ</span>
                      </span>
                      <span [style.color]="theme.colors().textSecondary" class="status-visibility-option__copy">
                        Same friends as today, plus anyone you pick below.
                      </span>
                    </button>

                    <button type="button"
                            (click)="setStatusVisibilityMode('public')"
                            [style.border]="'1px solid ' + (statusVisibilityMode() === 'public' ? theme.colors().primary : theme.colors().border)"
                            [style.background-color]="statusVisibilityMode() === 'public' ? theme.colors().primary + '14' : theme.colors().bgSecondary"
                            class="status-visibility-option">
                      <span class="status-visibility-option__title">
                        Everyone
                        <span class="status-visibility-info"
                              title="Shares this crush with every friend in your list."
                              aria-label="Shares this crush with every friend in your list.">ℹ</span>
                      </span>
                      <span [style.color]="theme.colors().textSecondary" class="status-visibility-option__copy">
                        Share this crush with all of your friends.
                      </span>
                    </button>
                  </div>

                  @if (statusVisibilityMode() === 'private') {
                    <div class="status-visibility-private">
                      <div class="status-visibility-private__header">
                        <p class="status-visibility-private__title">Add friends</p>
                        @if (friends().length > 0) {
                          <button class="action-btn-styled secondary"
                                  style="padding: 6px 10px;"
                                  (click)="toggleAllPendingVisibilityFriends()">
                            {{ areAllPendingVisibilityFriendsSelected() ? 'Deselect All' : 'Select All' }}
                          </button>
                        }
                      </div>

                      @if (friends().length > 0) {
                        <div class="friend-list-scroll status-visibility-private__friends">
                          @for (friend of friends(); track friend.id) {
                            <div class="friend-item"
                                 (click)="togglePendingVisibilityFriend(friend.id)"
                                 [style.border-bottom]="'1px solid ' + theme.colors().border">
                              <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id"
                                   [alt]="friend.username"
                                   class="friend-avatar">
                              <div class="friend-info">
                                <span class="friend-name">{{ friend.username }}</span>
                                <span class="friend-status"
                                      [style.color]="isPendingVisibilityFriendSelected(friend.id) ? theme.colors().primary : theme.colors().textSecondary">
                                  {{ isAlreadySharedWith(friend.id) ? '✓ Already shared' : (isPendingVisibilityFriendSelected(friend.id) ? '✓ Will be added' : 'Tap to add') }}
                                </span>
                              </div>
                            </div>
                          }
                        </div>
                      } @else {
                        <p [style.color]="theme.colors().textSecondary" class="status-visibility-empty">
                          No friends yet. Add friends to share this crush with them.
                        </p>
                      }
                    </div>
                  }
                </div>

                <div class="status-visibility-actions"
                     [style.border-top]="'1px solid ' + theme.colors().border">
                  <button class="action-btn-styled secondary" (click)="cancelQuickStatusChange()">Cancel</button>
                  <button class="action-btn-styled primary" (click)="confirmQuickStatusChange()">Save Status</button>
                </div>
              </div>
            </div>
          }

          @if (isEditMode()) {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="info-section-card edit-form">
              <h2 [style.color]="theme.colors().primary" class="info-title">Edit Details</h2>

              <app-crush-form [form]="editForm"></app-crush-form>

              <div class="edit-actions-footer">
                <button (click)="saveEdit(c.id)" class="action-btn-styled primary">Save Changes</button>
                <button (click)="toggleEditMode()" class="action-btn-styled secondary">Cancel</button>
              </div>

            </div>
          } @else {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="info-section-card">
              <h2 [style.color]="theme.colors().primary" class="info-title">Vitals</h2>
              <div class="info-grid">
                <div class="info-row-styled">
                  <span class="info-label">Hair</span>
                  <span class="info-value">{{ c.hair?.join(', ') || 'N/A' }}</span>
                </div>
                @if (parsedNotes().hairNotes) {
                   <div class="info-row-styled full-width note-detail">
                     <span class="info-label">Hair Notes</span>
                     <span class="info-value note-text">{{ parsedNotes().hairNotes }}</span>
                   </div>
                }
                <div class="info-row-styled">
                  <span class="info-label">Eyes</span>
                  <span class="info-value">{{ c.eyes?.join(', ') || 'N/A' }}</span>
                </div>
                @if (parsedNotes().eyeNotes) {
                   <div class="info-row-styled full-width note-detail">
                     <span class="info-label">Eye Notes</span>
                     <span class="info-value note-text">{{ parsedNotes().eyeNotes }}</span>
                   </div>
                }
                <div class="info-row-styled">
                  <span class="info-label">Build</span>
                  <span class="info-value">{{ c.build?.join(', ') || 'N/A' }}</span>
                </div>
                @if (parsedNotes().buildNotes) {
                   <div class="info-row-styled full-width note-detail">
                     <span class="info-label">Build Notes</span>
                     <span class="info-value note-text">{{ parsedNotes().buildNotes }}</span>
                   </div>
                }
                <div class="info-row-styled">
                  <span class="info-label">Pronouns</span>
                  <span class="info-value">{{ c.pronouns || 'N/A' }}</span>
                </div>
                <div class="info-row-styled">
                  <span class="info-label">Crush Status</span>
                  <span class="info-value">{{ c.status }}</span>
                </div>
                @if (parsedNotes().relationshipNotes) {
                   <div class="info-row-styled full-width note-detail">
                     <span class="info-label">Relationship Notes</span>
                     <span class="info-value note-text">{{ parsedNotes().relationshipNotes }}</span>
                   </div>
                }
                <div class="info-row-styled">
                  <span class="info-label">Rating</span>
                  <span [style.color]="theme.colors().accent" class="info-value">
                    @for (star of [1,2,3,4,5]; track star) {
                      {{ (c.rating || 0) >= star ? '★' : '☆' }}
                    }
                  </span>
                </div>
                @if (c.heartbreakSong) {
                  <div class="info-row-styled">
                    <span class="info-label">Heartbreak Song</span>
                    <span class="info-value">{{ c.heartbreakSong }}</span>
                  </div>
                }
                @if (c.heartbreakRecovery) {
                  <div class="info-row-styled full-width note-detail">
                    <span class="info-label">Healing Plan</span>
                    <span class="info-value note-text">{{ c.heartbreakRecovery }}</span>
                  </div>
                }
                <div class="info-row-styled">
                  <span class="info-label">How we met</span>
                  <span class="info-value">{{ c.howWeMet || 'N/A' }}</span>
                </div>
                <div class="info-row-styled">
                  <span class="info-label">When we met</span>
                  <span class="info-value">{{ c.whenWeMet || 'N/A' }}</span>
                </div>
                <div class="info-row-styled">
                  <span class="info-label">Grade</span>
                  <span class="info-value">{{ c.grade || 'N/A' }}</span>
                </div>
                <div class="info-row-styled">
                  <span class="info-label">Occupation</span>
                  <span class="info-value">{{ c.occupation || 'N/A' }}</span>
                </div>
                <div class="info-row-styled">
                  <span class="info-label">Family</span>
                  <span class="info-value">{{ c.family || 'N/A' }}</span>
                </div>
                <div class="info-row-styled">
                  <span class="info-label">Friends</span>
                  <span class="info-value">{{ c.friends?.join(', ') || 'None' }}</span>
                </div>
              </div>

              @if (c.memorableMoments) {
                <div class="extended-info-section">
                  <h3 [style.color]="theme.colors().primary" class="extended-info-title">Memorable Moments</h3>
                  <p [style.color]="theme.colors().textSecondary" class="extended-info-text">{{ c.memorableMoments }}</p>
                </div>
              }

              @if (parsedNotes().privateNotes) {
                <div class="extended-info-section">
                  <h3 [style.color]="theme.colors().primary" class="extended-info-title">Private Notes</h3>
                  <p [style.color]="theme.colors().textSecondary" class="extended-info-text" style="white-space: pre-wrap;">{{ parsedNotes().privateNotes }}</p>
                </div>
              }

              @if (redFlagEntries().length > 0) {
                <div class="extended-info-section">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <h3 [style.color]="'#ef4444'" class="extended-info-title" style="margin: 0;">🚩 Red Flag Entries</h3>
                    <span [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label);">{{ redFlagEntries().length }} total</span>
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
                    @for (entry of redFlagEntries(); track entry.id) {
                      <div [style.border]="'1px solid #ef4444'"
                           [style.background-color]="theme.colors().bg"
                           style="padding: 12px; border-radius: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
                          <span [style.color]="'#ef4444'" style="font-size: var(--fs-label); font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                            🚩 Red Flag
                          </span>
                          <span [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label);">
                            {{ entry.timestamp | date:'MMM d, h:mm a' }}
                          </span>
                        </div>
                        <p [style.color]="theme.colors().textSecondary" style="margin: 0; white-space: pre-wrap;">{{ entry.content }}</p>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="extended-info-section">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                  <h3 [style.color]="theme.colors().primary" class="extended-info-title" style="margin: 0;">Added Notes</h3>
                  <span [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label);">{{ noteEntries().length }} total</span>
                </div>

                @if (noteEntries().length > 0) {
                  <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
                    @for (entry of noteEntries(); track entry.id) {
                      <div [style.border]="'1px solid ' + theme.colors().border"
                           [style.background-color]="theme.colors().bg"
                           style="padding: 12px; border-radius: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
                          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span [style.color]="noteVisibility(entry).color"
                                  [style.border]="'1px solid ' + noteVisibility(entry).color"
                                  style="padding: 3px 8px; border-radius: 999px; font-size: var(--fs-label); font-weight: 700;">
                              {{ noteVisibility(entry).label }}
                            </span>
                            <span [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label);">
                              {{ entry.timestamp | date:'MMM d, h:mm a' }}
                            </span>
                          </div>
                          <button (click)="startSharingNote(entry.id)"
                                  [style.background-color]="theme.colors().primary"
                                  style="border: none; color: white; border-radius: 999px; padding: 4px 10px; font-size: var(--fs-label); cursor: pointer;">
                            Share note
                          </button>
                        </div>
                        <p [style.color]="theme.colors().textSecondary" style="margin: 0; white-space: pre-wrap;">{{ entry.content }}</p>
                        <p [style.color]="theme.colors().textSecondary" style="margin: 8px 0 0; font-size: var(--fs-label);">
                          {{ noteVisibility(entry).detail }}
                        </p>
                      </div>
                    }
                  </div>
                } @else {
                  <p [style.color]="theme.colors().textSecondary" class="extended-info-text">No notes yet. Tap “Add Note” to save one.</p>
                }
              </div>

              <!-- Vibe Tracker -->
              <div [style.background-color]="theme.colors().bgSecondary"
                   [style.border]="'1px solid ' + theme.colors().border"
                   class="extended-info-section vibe-tracker-section">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                  <h3 [style.color]="theme.colors().primary" class="extended-info-title" style="margin: 0;">✨ Vibe Tracker</h3>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span [style.color]="theme.colors().textSecondary" style="font-size: var(--fs-label);">Ask me</span>
                    <select [ngModel]="vibePromptFrequencyHours()" (ngModelChange)="setVibePromptFrequency($event)"
                            [style.background-color]="theme.colors().bg"
                            [style.border]="'1px solid ' + theme.colors().border"
                            [style.color]="theme.colors().text"
                            style="padding: 4px 8px; border-radius: 6px; font-size: var(--fs-label);">
                      @for (option of vibePromptOptions; track option.hours) {
                        <option [ngValue]="option.hours">{{ option.label }}</option>
                      }
                    </select>
                  </div>
                </div>

                <div class="vibe-log-row">
                  <span [style.color]="theme.colors().textSecondary" class="vibe-log-label">How's the vibe today?</span>
                  <div class="vibe-stars-row">
                    @for (star of [1,2,3,4,5]; track star) {
                      <button (click)="logVibeInline(c.id, star)"
                              [style.color]="pendingVibe() >= star ? theme.colors().accent : theme.colors().border"
                              (mouseenter)="pendingVibe.set(star)"
                              (mouseleave)="pendingVibe.set(0)"
                              class="vibe-star-btn"
                              [attr.aria-label]="'Log vibe ' + star + ' stars'">★</button>
                    }
                  </div>
                </div>

                @if (c.vibeHistory && c.vibeHistory.length > 0) {
                  <div class="vibe-history">
                    <span [style.color]="theme.colors().textSecondary" class="vibe-history-label">Vibe History</span>
                    <div class="vibe-history-list">
                      @for (v of c.vibeHistory.slice().reverse(); track $index) {
                        <div class="vibe-history-row">
                          <span [style.color]="theme.colors().textSecondary" class="vibe-entry-num">#{{ c.vibeHistory.length - $index }}</span>
                          <span [style.color]="theme.colors().accent" class="vibe-entry-stars">
                            @for (star of [1,2,3,4,5]; track star) {
                              {{ v >= star ? '★' : '☆' }}
                            }
                          </span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="social-links-section">
                <h3 [style.color]="theme.colors().primary" class="extended-info-title">Social Connections</h3>
                <div class="social-icons-grid">
                  @if (c.social?.snapchat) { <div class="social-icon-item" title="Snapchat">👻 <span>Snapchat</span></div> }
                  @if (c.social?.whatsapp) { <div class="social-icon-item" title="WhatsApp">💬 <span>WhatsApp</span></div> }
                  @if (c.social?.twitter) { <div class="social-icon-item" title="Twitter">🐦 <span>Twitter</span></div> }
                  @if (c.social?.facebook) { <div class="social-icon-item" title="Facebook">📘 <span>Facebook</span></div> }
                  @if (c.social?.instagram) { <div class="social-icon-item" title="Instagram">📸 <span>Instagram</span></div> }
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (friendCrushLoading()) {
        <div style="padding: 48px; text-align: center;">
          <p [style.color]="theme.colors().textSecondary">Loading shared crush…</p>
        </div>
      } @else if (friendCrushError()) {
        <div style="padding: 48px; text-align: center;">
          <p [style.color]="theme.colors().text" style="font-weight: 700; margin-bottom: 8px;">Couldn't load this crush.</p>
          <p [style.color]="theme.colors().textSecondary" style="margin-bottom: 18px;">
            Check your connection and try again. It's still shared with you.
          </p>
          <button type="button" (click)="loadFriendCrushIfNeeded()" [style.background-color]="theme.colors().primary" class="action-btn-styled" style="color: #fff; display: inline-flex; width: auto; padding: 10px 22px; border: none; border-radius: 999px;">Try again</button>
        </div>
      } @else if (friendCrushNotFound()) {
        <div style="padding: 48px; text-align: center;">
          <p [style.color]="theme.colors().text" style="font-weight: 700; margin-bottom: 8px;">This crush isn't available.</p>
          <p [style.color]="theme.colors().textSecondary" style="margin-bottom: 18px;">
            It may have been removed, or it's no longer shared with you.
          </p>
          <a routerLink="/feed" [style.background-color]="theme.colors().primary" class="action-btn-styled" style="color: #fff; display: inline-flex; width: auto; padding: 10px 22px; border: none; border-radius: 999px;">Back to Tea</a>
        </div>
      }
    </div>
  `
})
export class ProfileDetailComponent implements OnDestroy {
  readonly todayDate = new Date().toISOString().slice(0, 10);
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private messaging = inject(MessagingService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public subscription = inject(SubscriptionService);
  public gate = inject(FeatureGateService);
  showSafetyUpgrade = signal(false);
  public modal = inject(ModalService);
  private avatarRenderer = inject(AvatarRenderService);
  private friendsApi = inject(FriendsApiService);
  private router = inject(Router);

  crushId = signal<string | null>(null);
  friendCrush = signal<CrushProfile | null>(null);
  friendCrushOwnerId = signal<string | null>(null);
  friendCrushOwnerName = signal<string | null>(null);
  friendCrushLoading = signal(false);
  friendCrushNotFound = signal(false);
  /** The shared-crush request failed for a reason other than "not shared" (offline, server error). */
  friendCrushError = signal(false);
  private destroyRef = inject(DestroyRef);
  private location = inject(Location);
  /** Whether the "Show more details" section is expanded on the read-only friend view. */
  showFullCrushDetails = signal(false);


  toggleFullCrushDetails(): void {
    this.showFullCrushDetails.update((v) => !v);
  }
  safetyState = signal<'Draft' | 'Sent' | 'Safe' | 'Urgent'>('Draft');
  onDateMode = signal(false);
  statuses = CrushStatus;
  isEditMode = signal(false);
  showShareSelector = signal(false);
  showStatusVisibilityModal = signal(false);
  shareSelectorMode = signal<'crush' | 'dating'>('crush');
  showVibeBanner = signal(true);
  showSafetySetup = signal(false);
  statusQuickEditOpen = signal(false);
  quickStatusDraft = signal<CrushStatus | null>(null);
  pendingStatusValue = signal<CrushStatus | null>(null);
  statusVisibilityMode = signal<'private' | 'public'>('private');
  vibePromptFrequencyHours = signal(24);
  friends = signal<User[]>([]);
  pendingVibe = signal(0);
  pendingShareEntryId = signal<string | null>(null);
  shareFriendIds = signal<string[]>([]);
  datingShareFriendIds = signal<string[]>([]);
  pendingVisibilityFriendIds = signal<string[]>([]);
  safetyDurationMinutes = signal<number>(60);
  safetyContactIds = signal<string[]>([]);
  safetyDurationOptions = [30, 60, 90, 120, 150, 180, 210, 240];
  vibePromptOptions = [
    { label: 'Every 6 hours', hours: 6 },
    { label: 'Every 12 hours', hours: 12 },
    { label: 'Daily', hours: 24 },
    { label: 'Every 2 days', hours: 48 },
    { label: 'Weekly', hours: 168 }
  ];
  private halfwaySafetyTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRedFlagLogs = new Set<string>();

  editForm: CrushFormValue = emptyCrushFormValue();

  /** The "Other" detail notes and private notes, split out of customNotes for the view. */
  parsedNotes = computed(() => parseCustomNotes(this.crush()?.customNotes));

  crush = computed(() => {
    const id = this.crushId();
    if (!id) return null;
    const own = this.dataService.visibleCrushes().find(c => c.id === id);
    if (own) return own;
    return this.friendCrush();
  });

  /** True when the crush being viewed belongs to a friend (read-only view, no edit/share/archive controls). */
  isReadOnlyFriendView = computed(() => {
    const id = this.crushId();
    if (!id) return false;
    const own = this.dataService.visibleCrushes().find(c => c.id === id);
    return !own && !!this.friendCrush();
  });

  entries = computed(() => {
    const id = this.crushId();
    if (!id) return [];
    return this.dataService.getEntriesForCrush(id)();
  });

  /**
   * Journal entries a friend has specifically shared with *me* about this crush
   * (used only in the read-only friend view, since `entries` above only covers
   * entries the viewer owns themselves).
   */
  sharedEntriesForCrush = computed(() => {
    const id = this.crushId();
    if (!id) return [];
    return this.dataService.getSharedEntries()()
      .filter((entry) => entry.crushId === id)
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  /** True if the crush being viewed has any additional public details beyond the brief header (used to show/hide the "Show more" button on the read-only friend view). */
  hasMoreCrushDetails = computed(() => {
    const c = this.crush();
    if (!c) return false;
    return !!(
      c.customNotes || c.pronouns || c.category || c.howWeMet || c.whenWeMet ||
      c.occupation || c.grade || c.family || c.memorableMoments ||
      c.heartbreakSong || c.heartbreakRecovery || c.redFlagReason ||
      (c.hair && c.hair.length) || (c.eyes && c.eyes.length) || (c.build && c.build.length) ||
      (c.social && Object.values(c.social).some((v) => !!v))
    );
  });

  noteEntries = computed(() =>
    this.entries()
      .filter((entry) => entry.type === 'Note')
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  );

  getCrushDisplayName(crush: CrushProfile): string {
    return crush.displayName === 'fullName' && crush.fullName?.trim()
      ? crush.fullName
      : crush.nickname;
  }

  getCrushAge(crush: CrushProfile): number | null {
    if (!crush.dateOfBirth) return null;
    const birthDate = new Date(`${crush.dateOfBirth.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (today.getMonth() < birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age >= 0 ? age : null;
  }

  getRelationshipLabels(crush: CrushProfile): string[] {
    const labels = Array.isArray(crush.relationshipLabels) ? crush.relationshipLabels : [];
    return [...new Set(labels.filter((label) => typeof label === 'string' && label.trim().length > 0))];
  }

  redFlagEntries = computed(() =>
    this.entries()
      .filter((entry) => entry.type === 'RedFlag')
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, (this.crush()?.redFlags || 0) > 0 ? 1 : 0)
  );

  noteVisibility(entry: { visibility?: string[] }): { label: string; detail: string; color: string } {
    const visibility = entry.visibility || [];
    if (visibility.includes('public')) {
      const friendNames = this.friends().map((friend) => friend.username);
      return {
        label: 'Public',
        detail: friendNames.length > 0
          ? `Visible to all friends: ${friendNames.join(', ')}`
          : 'Visible to all friends',
        color: '#16a34a'
      };
    }

    if (visibility.length === 0) {
      return {
        label: 'Private',
        detail: 'Only you can see this note',
        color: '#64748b'
      };
    }

    const friendNames = visibility.map((friendId) =>
      this.friends().find((friend) => friend.id === friendId)?.username || 'Friend'
    );
    return {
      label: 'Shared',
      detail: `Visible to: ${friendNames.join(', ')}`,
      color: '#2563eb'
    };
  }

  selectedSafetyContactNames = computed(() => {
    const selected = this.safetyContactIds();
    if (selected.length === 0) return '';
    const byId = new Map(this.friends().map((friend) => [friend.id, friend.username]));
    return selected.map((id) => byId.get(id) || id).join(', ');
  });

  constructor() {
    this.loadFriends();
    this.loadVibePromptFrequency();
    this.refreshVibePromptVisibility();
    void this.messaging.loadConversationSummaries();
    // The same page instance is reused when going from one crush straight to
    // another (e.g. two Tea cards in a row), so follow the id rather than read it once.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.crushId.set(params.get('id'));
      this.friendCrush.set(null);
      this.friendCrushOwnerId.set(null);
      this.friendCrushOwnerName.set(null);
      this.friendCrushNotFound.set(false);
      this.friendCrushError.set(false);
      void this.loadFriendCrushIfNeeded();
    });
  }

  /**
   * If the requested crush isn't in the viewer's own list (e.g. they arrived via a
   * "friend shared a new crush" notification, or a link from a friend's profile page),
   * fetch it as a read-only shared crush instead of showing a blank page.
   */
  /** Back to where this crush was opened from (Tea, chat, a friend's page); else a sensible home. */
  goBack(event: Event): void {
    event.preventDefault();
    const state = (typeof history !== 'undefined' ? history.state : null) as { navigationId?: number } | null;
    if (state?.navigationId && state.navigationId > 1) {
      this.location.back();
      return;
    }
    const friendView = this.isReadOnlyFriendView() || this.friendCrushNotFound() || this.friendCrushError();
    void this.router.navigate([friendView ? '/friends' : '/dashboard']);
  }

  async loadFriendCrushIfNeeded(): Promise<void> {
    const id = this.crushId();
    if (!id) return;
    if (this.dataService.visibleCrushes().find(c => c.id === id)) return;

    this.friendCrushLoading.set(true);
    this.friendCrushNotFound.set(false);
    this.friendCrushError.set(false);
    try {
      const result = await this.friendsApi.getSharedCrush(id);
      if (id !== this.crushId()) return; // navigated on while loading
      if (result.kind === 'ok') {
        this.friendCrush.set(result.crush);
        this.friendCrushOwnerId.set(result.ownerId);
        this.friendCrushOwnerName.set(result.ownerName);
      } else if (result.kind === 'error') {
        this.friendCrushError.set(true);
      } else {
        this.friendCrushNotFound.set(true);
      }
    } finally {
      this.friendCrushLoading.set(false);
    }
  }

  asSelectValue(event: Event): string {
    const target = event.target as HTMLSelectElement | null;
    return target?.value ?? '';
  }

  openQuickStatusEditor(crush: CrushProfile): void {
    this.quickStatusDraft.set(crush.status || this.statuses.Plotting);
    this.statusQuickEditOpen.set(true);
  }

  closeQuickStatusEditor(): void {
    this.statusQuickEditOpen.set(false);
    this.quickStatusDraft.set(null);
    this.cancelQuickStatusChange();
  }

  beginQuickStatusChange(crushId: string, statusValue: string): void {
    const crush = this.crush();
    if (!crush || crush.id !== crushId) return;

    const nextStatus = statusValue as CrushStatus;
    this.quickStatusDraft.set(nextStatus);

    if (nextStatus === crush.status) {
      return;
    }

    const sharedFriendIds = this.friends()
      .filter((friend) => this.isShared(crush, friend.id))
      .map((friend) => friend.id);
    const allFriendIds = this.friends().map((friend) => friend.id);
    const isPublic = allFriendIds.length > 0 && sharedFriendIds.length === allFriendIds.length;

    this.pendingStatusValue.set(nextStatus);
    // Only new picks live here; friends already shared with are shown as such.
    this.pendingVisibilityFriendIds.set([]);
    this.statusVisibilityMode.set(isPublic ? 'public' : 'private');
    this.showStatusVisibilityModal.set(true);
  }

  setStatusVisibilityMode(mode: 'private' | 'public'): void {
    this.statusVisibilityMode.set(mode);
  }

  /** Friends who already see this crush; the status modal can't take them off. */
  isAlreadySharedWith(friendId: string): boolean {
    const crush = this.crush();
    return Boolean(crush && this.isShared(crush, friendId));
  }

  isPendingVisibilityFriendSelected(friendId: string): boolean {
    return this.isAlreadySharedWith(friendId) || this.pendingVisibilityFriendIds().includes(friendId);
  }

  togglePendingVisibilityFriend(friendId: string): void {
    if (this.isAlreadySharedWith(friendId)) return;
    this.pendingVisibilityFriendIds.update((ids) =>
      ids.includes(friendId) ? ids.filter((id) => id !== friendId) : [...ids, friendId]
    );
  }

  private selectableVisibilityFriendIds(): string[] {
    return this.friends().map((friend) => friend.id).filter((id) => !this.isAlreadySharedWith(id));
  }

  areAllPendingVisibilityFriendsSelected(): boolean {
    const selectable = this.selectableVisibilityFriendIds();
    return selectable.length > 0 && selectable.every((id) => this.pendingVisibilityFriendIds().includes(id));
  }

  toggleAllPendingVisibilityFriends(): void {
    const selectable = this.selectableVisibilityFriendIds();
    if (selectable.length === 0) return;
    if (this.areAllPendingVisibilityFriendsSelected()) {
      this.pendingVisibilityFriendIds.set([]);
      return;
    }
    this.pendingVisibilityFriendIds.set(selectable);
  }

  cancelQuickStatusChange(): void {
    const crush = this.crush();
    this.showStatusVisibilityModal.set(false);
    this.pendingStatusValue.set(null);
    this.statusVisibilityMode.set('private');
    this.pendingVisibilityFriendIds.set([]);
    this.quickStatusDraft.set(crush?.status || this.statuses.Plotting);
  }

  ngOnDestroy(): void {
    this.clearSafetyTimers();
  }

  private async loadFriends() {
    if (!this.friendsApi.isAuthenticated()) return;
    try {
      const data = await this.friendsApi.listFriends();
      this.friends.set(data.map(f => ({
        id: f.id || f.username,
        username: f.username,
        friends: [],
        blockedUsers: [],
        subscriptionTier: SubscriptionTier.Free,
        isVerified18: true,
        avatarUrl: f.avatarUrl,
        friendCategories: f.friendCategories || ['Close Friends']
      } as User)));
    } catch (err) {
      console.error('Failed to load friends', err);
    }
  }

  private getVibePromptSettingsKey(): string {
    const username = this.security.currentUser() || 'dexii_demo_user';
    return `dexii_vibe_prompt_hours_${username}`;
  }

  private getVibeCheckedKey(crushId: string): string {
    return `vibe_checked_${crushId}`;
  }

  private loadVibePromptFrequency(): void {
    const raw = localStorage.getItem(this.getVibePromptSettingsKey());
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      this.vibePromptFrequencyHours.set(parsed);
    }
  }

  private refreshVibePromptVisibility(): void {
    const id = this.crushId();
    if (!id) {
      this.showVibeBanner.set(false);
      return;
    }

    const last = Number(localStorage.getItem(this.getVibeCheckedKey(id)) || 0);
    if (!Number.isFinite(last) || last <= 0) {
      this.showVibeBanner.set(true);
      return;
    }

    const cooldownMs = this.vibePromptFrequencyHours() * 60 * 60 * 1000;
    this.showVibeBanner.set(Date.now() - last >= cooldownMs);
  }

  setVibePromptFrequency(value: unknown): void {
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours <= 0) return;
    this.vibePromptFrequencyHours.set(hours);
    localStorage.setItem(this.getVibePromptSettingsKey(), String(hours));
    this.refreshVibePromptVisibility();
  }

  dismissVibePrompt(crushId: string): void {
    localStorage.setItem(this.getVibeCheckedKey(crushId), String(Date.now()));
    this.showVibeBanner.set(false);
  }

  logRedFlag(id: string) {
    const c = this.crush();
    if (!c) return;
    if ((c.redFlags || 0) > 0) {
      this.showRedFlagReason(c);
      return;
    }
    if (this.pendingRedFlagLogs.has(id)) return;

    this.pendingRedFlagLogs.add(id);
    this.modal.prompt('Why are you adding a red flag?', c.redFlagReason || '', (reason) => {
      if (!this.pendingRedFlagLogs.has(id)) return;
      this.pendingRedFlagLogs.delete(id);

      const trimmedReason = reason.trim();
      if (!trimmedReason) {
        this.modal.show('Please add a reason before saving the red flag.');
        return;
      }

      const latestCrush = this.dataService.visibleCrushes().find((item) => item.id === id);
      if (!latestCrush) return;
      if ((latestCrush.redFlags || 0) > 0) {
        this.showRedFlagReason(latestCrush);
        return;
      }

      this.dataService.setRedFlag(id, trimmedReason);
      this.dataService.addEntry({
        crushId: id,
        type: 'RedFlag',
        content: `Red flag added: ${trimmedReason}`,
        isBurnAfterReading: false,
        visibility: [],
        isSensitive: false,
        redFlagCount: 1
      });
      this.modal.show(`Red flag added: ${trimmedReason}`);
    }, () => {
      this.pendingRedFlagLogs.delete(id);
    });
  }

  showRedFlagReason(crush: CrushProfile) {
    const reason = (crush.redFlagReason || '').trim();
    if (!reason) {
      this.modal.show('This crush has one red flag, but no reason was saved yet.');
      return;
    }

    this.modal.show(`Red flag reason: ${reason}`);
  }

  removeRedFlag(id: string) {
    this.modal.confirm('Remove the red flag from this crush?', () => {
      this.dataService.clearRedFlag(id);
      this.modal.show('Red flag removed.');
    });
  }

  private applyVibeLog(id: string, rating: number, reason?: string): void {
    const num = Math.max(1, Math.min(5, rating));
    const trimmedReason = (reason || '').trim();
    this.dataService.updateVibe(id, num);
    this.dataService.addEntry({
      crushId: id,
      type: 'Note',
      content: trimmedReason
        ? `Vibe logged: ${'★'.repeat(num)}${'☆'.repeat(5 - num)} (${num}/5)\nWhy: ${trimmedReason}`
        : `Vibe logged: ${'★'.repeat(num)}${'☆'.repeat(5 - num)} (${num}/5)`,
      isBurnAfterReading: false,
      visibility: [],
      isSensitive: false
    });

    const c = this.crush();
    if (c) {
      const history = [...(c.vibeHistory || [])];
      if (history.length >= 10) history.shift();
      history.push(num);
      this.dataService.updateCrush({ ...c, rating: num, vibeHistory: history }, { fields: ['rating', 'vibeHistory'] });
    }
    localStorage.setItem(this.getVibeCheckedKey(id), String(Date.now()));
    this.showVibeBanner.set(false);
    this.pendingVibe.set(0);
  }

  logVibeInline(id: string, rating: number) {
    const num = Math.max(1, Math.min(5, rating));
    this.modal.prompt(
      `Optional: add a note for why today's vibe is ${num}/5.`,
      '',
      (reason) => {
        const trimmedReason = (reason || '').trim();
        if (trimmedReason && !this.security.moderateContent(trimmedReason)) {
          this.modal.show('Vibe note flagged by AI moderation. Logged vibe without note.');
          this.applyVibeLog(id, num);
          return;
        }
        this.applyVibeLog(id, num, trimmedReason);
      },
      () => this.applyVibeLog(id, num)
    );
  }

  addNote(id: string) {
    this.modal.prompt("What's the tea?", "", (tea) => {
      if (tea) {
        if (!this.security.moderateContent(tea)) {
          this.modal.show('Note flagged by AI moderation for safety.');
          return;
        }
        this.modal.confirm("Should this note disappear after reading?", () => {
          this.dataService.addEntry({
            crushId: id,
            type: 'Note',
            content: tea,
            isBurnAfterReading: true,
            visibility: [],
            isSensitive: false
          });
        }, () => {
          this.dataService.addEntry({
            crushId: id,
            type: 'Note',
            content: tea,
            isBurnAfterReading: false,
            visibility: [],
            isSensitive: false
          });
        });
      }
    });
  }

  setSafetyDuration(value: unknown): void {
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes < 30) return;
    this.safetyDurationMinutes.set(minutes);
  }

  isSafetyContact(friendId: string): boolean {
    return this.safetyContactIds().includes(friendId);
  }

  toggleSafetyContact(friendId: string): void {
    this.safetyContactIds.update((ids) =>
      ids.includes(friendId) ? ids.filter((id) => id !== friendId) : [...ids, friendId]
    );
  }

  private getSafetyContacts(): User[] {
    const selected = new Set(this.safetyContactIds());
    return this.friends().filter((friend) => selected.has(friend.id));
  }

  private clearSafetyTimers(): void {
    if (this.halfwaySafetyTimer) {
      clearTimeout(this.halfwaySafetyTimer);
      this.halfwaySafetyTimer = null;
    }
  }

  private supportsBrowserNotifications(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  private async ensureSafetyNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.supportsBrowserNotifications()) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    return Notification.requestPermission();
  }

  private showHalfwaySafetyNotification(): void {
    if (!this.supportsBrowserNotifications() || Notification.permission !== 'granted') {
      return;
    }

    const crushName = this.crush()?.nickname || 'your date';
    const notification = new Notification('Dexii Safety Check-In', {
      body: `Halfway reminder for ${crushName}: check in and confirm you are safe/having fun.`,
      tag: `dexii-safety-halfway-${this.crushId() || 'current'}`,
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  private scheduleHalfwayCheck(crushId: string): void {
    this.clearSafetyTimers();
    const durationMs = this.safetyDurationMinutes() * 60 * 1000;
    const halfwayMs = Math.max(1000, Math.floor(durationMs / 2));

    this.halfwaySafetyTimer = setTimeout(() => {
      if (this.safetyState() !== 'Sent') {
        return;
      }

      this.showHalfwaySafetyNotification();
      const contacts = this.getSafetyContacts();
      this.modal.confirm(
        `Halfway check-in (${this.safetyDurationMinutes()} min plan): are you safe and having fun?`,
        () => {
          contacts.forEach((friend) => {
            this.messaging.sendMessage({
              senderId: 'me',
              receiverId: friend.id,
        isSafetyAlert: true,
              content: `Halfway check-in: I'm safe and having fun with ${this.crush()?.nickname || 'my date'}.`
            });
            this.dataService.addEntry({
              crushId,
              type: 'SafetyCheck',
              content: `Halfway check-in sent to ${friend.username}: safe and having fun.`,
              visibility: [],
              isSensitive: true,
              safetyStatus: 'Sent',
              safetyContactId: friend.id
            });
          });
          this.modal.show('Great. Halfway safety check-in sent.');
        },
        () => {
          this.modal.show('If anything feels off, tap URGENT in the safety bar at the top.');
        }
      );
    }, halfwayMs);
  }

  async startSafetyCheck(id: string): Promise<void> {
    if (!this.gate.canUseSafetyCheck()) {
      this.showSafetyUpgrade.set(true);
      return;
    }
    const contacts = this.getSafetyContacts();
    if (contacts.length === 0) {
      this.modal.show('Choose at least one trusted friend for this safety check.');
      return;
    }

    const notificationPermission = await this.ensureSafetyNotificationPermission();

    this.safetyState.set('Sent');
    contacts.forEach((friend) => {
      this.dataService.addEntry({
        crushId: id,
        type: 'SafetyCheck',
        content: `Safety check started and shared with ${friend.username}.`,
        visibility: [],
        isSensitive: true,
        safetyStatus: 'Sent',
        safetyContactId: friend.id
      });

      this.messaging.sendMessage({
        senderId: 'me',
        receiverId: friend.id,
        isSafetyAlert: true,
        content: `Safety check started for ${this.crush()?.nickname || 'my date'}. Check-in interval: ${this.safetyDurationMinutes()} minutes.`
      });
    });
    this.scheduleHalfwayCheck(id);

    if (notificationPermission === 'granted') {
      this.modal.show('Safety Check enabled. Trusted contacts were notified and you will get a phone/browser notification at halfway.');
      return;
    }

    if (notificationPermission === 'denied') {
      this.modal.show('Safety Check enabled. Trusted contacts were notified. Browser notifications are blocked, so halfway check-in will appear in-app only.');
      return;
    }

    this.modal.show('Safety Check enabled. Trusted contacts were notified, and a halfway in-app check-in is scheduled.');
  }

  markSafe(id: string) {
    this.clearSafetyTimers();
    this.safetyState.set('Safe');
    this.getSafetyContacts().forEach((friend) => {
      this.dataService.addEntry({
        crushId: id,
        type: 'SafetyCheck',
        content: `Safety check resolved: marked safe with ${friend.username}.`,
        visibility: [],
        isSensitive: true,
        safetyStatus: 'Safe',
        safetyContactId: friend.id
      });
      this.messaging.sendMessage({
        senderId: 'me',
        receiverId: friend.id,
        isSafetyAlert: true,
        content: `Safety check resolved: I'm safe and good.`
      });
    });
    this.modal.show('Safety Check resolved and marked Safe.');
  }

  triggerEmergency(id: string) {
    this.clearSafetyTimers();
    this.safetyState.set('Urgent');
    this.getSafetyContacts().forEach((friend) => {
      this.dataService.addEntry({
        crushId: id,
        type: 'SafetyCheck',
        content: `Emergency mode escalated and sent to ${friend.username}.`,
        visibility: [],
        isSensitive: true,
        safetyStatus: 'Urgent',
        safetyContactId: friend.id
      });
      this.messaging.sendMessage({
        senderId: 'me',
        receiverId: friend.id,
        isSafetyAlert: true,
        content: `🚨 Emergency mode enabled for ${this.crush()?.nickname || 'my date'}. Please check in now.`
      });
    });
    this.modal.show('Emergency Mode enabled. Trusted contacts alerted urgently.');
  }

  toggleArchive(crush: CrushProfile) {
    const isRestoring = crush.status === CrushStatus.Archived;
    this.modal.confirm(
      isRestoring
        ? 'Restore this crush from the archive?'
        : 'Archive this crush? You can restore it later from the Archive view.',
      () => {
        const newStatus = isRestoring ? CrushStatus.Crush : CrushStatus.Archived;
        const updatedCrush = { ...crush, status: newStatus };
        this.dataService.updateCrush(updatedCrush, { fields: ['status'] });
        this.modal.show(isRestoring ? 'Crush restored from archive.' : 'Crush archived.');
      }
    );
  }

  openDatingStatusShareSelector(): void {
    if (this.friends().length === 0) {
      this.modal.show('Add at least one friend first to share your dating status.');
      return;
    }
    this.pendingShareEntryId.set(null);
    this.shareSelectorMode.set('dating');
    this.shareFriendIds.set([]);
    this.datingShareFriendIds.set([]);
    this.showShareSelector.set(true);
  }

  openShareSelector(crushId: string): void {
    if (this.friends().length === 0) {
      this.modal.show('Add at least one friend first to share.');
      return;
    }
    this.pendingShareEntryId.set(null);
    this.shareSelectorMode.set('crush');
    this.shareFriendIds.set(this.friends().filter((friend) => this.crush() ? this.isShared(this.crush()!, friend.id) : false).map((friend) => friend.id));
    this.showShareSelector.set(true);
  }

  closeShareSelector(): void {
    this.showShareSelector.set(false);
    this.pendingShareEntryId.set(null);
    this.shareSelectorMode.set('crush');
    this.shareFriendIds.set([]);
    this.datingShareFriendIds.set([]);
  }

  toggleDatingShareFriend(friendId: string, friendName?: string): void {
    this.datingShareFriendIds.update((ids) =>
      ids.includes(friendId) ? ids.filter((id) => id !== friendId) : [...ids, friendId]
    );
  }

  areAllDatingShareFriendsSelected(): boolean {
    const friends = this.friends();
    const selected = this.datingShareFriendIds();
    return friends.length > 0 && selected.length === friends.length;
  }

  toggleSelectAllDatingShareFriends(): void {
    if (this.areAllDatingShareFriendsSelected()) {
      this.datingShareFriendIds.set([]);
      return;
    }

    this.datingShareFriendIds.set(this.friends().map((friend) => friend.id));
  }

  isShareFriendSelected(friendId: string): boolean {
    return this.shareFriendIds().includes(friendId);
  }

  areAllShareFriendsSelected(): boolean {
    const friends = this.friends();
    return friends.length > 0 && this.shareFriendIds().length === friends.length;
  }

  toggleSelectAllShareFriends(): void {
    const friends = this.friends();
    if (friends.length === 0) return;
    if (this.areAllShareFriendsSelected()) {
      this.shareFriendIds.set([]);
      return;
    }

    this.shareFriendIds.set(friends.map((friend) => friend.id));
  }

  isDatingShareFriendSelected(friendId: string): boolean {
    return this.datingShareFriendIds().includes(friendId);
  }

  confirmDatingStatusShare(crushId: string): void {
    const crush = this.crush();
    if (!crush) {
      this.modal.show('Unable to share dating status right now.');
      return;
    }

    const selectedIds = this.datingShareFriendIds();
    if (selectedIds.length === 0) {
      this.modal.show('Select at least one friend to share your dating status.');
      return;
    }
    const contacts = this.friends().filter((friend) => selectedIds.includes(friend.id));

    const statusLabel = crush.relationshipStatus?.trim() || crush.status;
    const parts = [
      `Dating status update for ${crush.nickname}: ${statusLabel}.`
    ];
    if (crush.relationshipStatus === 'Heartbroken' && crush.heartbreakSong) {
      parts.push(`Current song: ${crush.heartbreakSong}.`);
    }
    if (crush.relationshipStatus === 'Heartbroken' && crush.heartbreakRecovery) {
      parts.push(`Getting over it by: ${crush.heartbreakRecovery}.`);
    }
    const content = parts.join(' ');

    contacts.forEach((friend) => {
      this.messaging.sendMessage({
        senderId: 'me',
        receiverId: friend.id,
        content,
        relatedCrushId: crushId,
        kind: 'dating_status'
      });
    });

    this.dataService.addEntry({
      crushId,
      type: 'Note',
      content: `Shared dating status with ${contacts.length} friend${contacts.length === 1 ? '' : 's'}: ${statusLabel}.`,
      isBurnAfterReading: false,
      visibility: [],
      isSensitive: false
    });
    this.closeShareSelector();
    this.modal.show(`Dating status shared with ${contacts.length} friend${contacts.length === 1 ? '' : 's'}.`);
  }

  confirmShareSelected(crushId: string): void {
    const selectedIds = this.shareFriendIds();
    if (selectedIds.length === 0) {
      this.modal.show('Select at least one friend to share with.');
      return;
    }

    const crush = this.crush();
    if (!crush) {
      this.modal.show('Unable to share right now.');
      return;
    }

    const entryId = this.pendingShareEntryId();
    const selectedFriends = this.friends().filter((friend) => selectedIds.includes(friend.id));
    const selectedSet = new Set(selectedIds);

    if (entryId) {
      const currentSet = new Set(this.friends().filter((friend) => this.isEntrySharedWithFriend(friend.id)).map((friend) => friend.id));
      this.friends().forEach((friend) => {
        const shouldBeSelected = selectedSet.has(friend.id);
        const isSelected = currentSet.has(friend.id);
        if (shouldBeSelected !== isSelected) {
          this.dataService.toggleEntryVisibility(entryId, friend.id);
        }
      });

      selectedFriends.forEach((friend) => {
        this.messaging.sendMessage({
          senderId: 'me',
          receiverId: friend.id,
          content: `Shared note about ${this.crush()?.nickname || 'this crush'}: ${this.entries().find((entry) => entry.id === entryId)?.content || 'Shared note'}`,
          relatedCrushId: crushId,
          relatedEntryId: entryId,
          kind: 'entry_share'
        });
      });

      this.closeShareSelector();
      this.modal.show(`Note shared with ${selectedFriends.length} friend${selectedFriends.length === 1 ? '' : 's'}.`);
      return;
    }

    const friendLabel = this.describeFriendsForShare(selectedFriends);
    this.modal.confirm(
      `Share this crush with ${friendLabel}? They'll be able to see what you've shared.`,
      () => {
        const currentSet = new Set(this.friends().filter((friend) => this.isShared(crush, friend.id)).map((friend) => friend.id));
        this.friends().forEach((friend) => {
          const shouldBeSelected = selectedSet.has(friend.id);
          const isSelected = currentSet.has(friend.id);
          if (shouldBeSelected !== isSelected) {
            this.dataService.toggleCrushVisibility(crushId, friend.id);
          }
        });

        this.closeShareSelector();
        this.modal.show(`Crush shared with ${selectedFriends.length} friend${selectedFriends.length === 1 ? '' : 's'}.`);
      }
    );
  }

  shareWithFriend(crushId: string, friendId: string, friendName?: string): void {
    this.toggleShareFriend(friendId, friendName);
  }

  toggleShareFriend(friendId: string, friendName?: string): void {
    this.shareFriendIds.update((ids) =>
      ids.includes(friendId) ? ids.filter((id) => id !== friendId) : [...ids, friendId]
    );
  }

  startSharingNote(entryId: string): void {
    if (this.friends().length === 0) {
      this.modal.show('Add at least one friend first to share notes.');
      return;
    }
    this.shareSelectorMode.set('crush');
    this.pendingShareEntryId.set(entryId);
    this.showShareSelector.set(true);
  }

  isEntrySharedWithFriend(friendId: string): boolean {
    const entryId = this.pendingShareEntryId();
    if (!entryId) return false;
    const entry = this.entries().find((currentEntry) => currentEntry.id === entryId);
    if (!entry) return false;
    return entry.visibility.includes(friendId) || entry.visibility.includes('public');
  }

  isShared(crush: CrushProfile, friendId: string): boolean {
    return this.dataService.isCrushSharedWith(crush, friendId);
  }

  deleteCrush(crushId: string): void {
    this.modal.confirm('Delete this crush profile? This cannot be undone.', () => {
      this.dataService.deleteCrush(crushId);
      this.router.navigate(['/dashboard']);
    });
  }

  toggleEditMode() {
    if (!this.isEditMode()) {
      this.showSafetySetup.set(false);
      // Entering edit mode - populate form
      const c = this.crush();
      if (c) {
        this.editForm = crushToFormValue(c);
      }
    }
    this.isEditMode.set(!this.isEditMode());
  }

  toggleSafetySetup(): void {
    this.showSafetySetup.update((open) => !open);
  }

  confirmQuickStatusChange(): void {
    const crush = this.crush();
    const nextStatus = this.pendingStatusValue();
    if (!crush || !nextStatus) {
      this.cancelQuickStatusChange();
      return;
    }

    // The status is saved on its own. Sharing can only grow from here: friends who
    // already see this crush keep seeing it, and any new picks are added on the
    // server, so nothing shared from another device is lost.
    this.dataService.updateCrush({ ...crush, status: nextStatus }, { fields: ['status'] });
    const wanted = this.statusVisibilityMode() === 'public'
      ? this.friends().map((friend) => friend.id)
      : this.pendingVisibilityFriendIds();
    const added = wanted.filter((id) => !this.isShared(crush, id));
    if (added.length > 0) void this.dataService.shareCrushWith(crush.id, added);
    this.showStatusVisibilityModal.set(false);
    this.pendingStatusValue.set(null);
    this.pendingVisibilityFriendIds.set([]);
    this.statusVisibilityMode.set('private');
    this.statusQuickEditOpen.set(false);
    this.quickStatusDraft.set(nextStatus);
    this.modal.show(`Status updated to ${nextStatus}.`);
  }

  private describeFriendsForShare(selectedFriends: User[]): string {
    if (selectedFriends.length === 0) return 'your selected friends';
    if (selectedFriends.length === 1) return selectedFriends[0].username;
    if (selectedFriends.length === 2) {
      return `${selectedFriends[0].username} and ${selectedFriends[1].username}`;
    }
    return `${selectedFriends[0].username}, ${selectedFriends[1].username}, and ${selectedFriends.length - 2} others`;
  }

  async saveEdit(crushId: string) {
    const current = this.crush();
    if (!current) return;

    if (!this.editForm.nickname.trim() && !this.editForm.fullName.trim()) {
      this.modal.show('Give them a nickname or a first name so you can find them.');
      return;
    }
    if (!crushFormTextFields(this.editForm).every((text) => this.security.moderateContent(text))) {
      this.modal.show('Profile text flagged by AI moderation.');
      return;
    }

    if (!this.editForm.avatarUrl) {
      // No picture chosen: give them a preset that stays stable for this nickname.
      this.editForm.avatarConfig = this.avatarRenderer.presetFor(this.editForm.nickname);
      this.editForm.avatarUrl = await this.avatarRenderer.render(this.editForm.avatarConfig, 256);
    }

    this.dataService.updateCrush({
      ...current,
      ...formValueToCrushPatch(this.editForm),
      id: crushId
    }, { fields: CRUSH_FORM_FIELDS, silent: false });

    const note = this.editForm.note.trim();
    if (note) {
      this.dataService.addEntry({
        crushId,
        type: 'Note',
        content: note,
        isBurnAfterReading: false,
        visibility: this.editForm.noteVisibility === 'public' ? ['public'] : [],
        isSensitive: false
      });
    }
    this.isEditMode.set(false);
  }
}
