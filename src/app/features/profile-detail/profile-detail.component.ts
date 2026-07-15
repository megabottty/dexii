import { Component, signal, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { SecurityService } from '../../core/services/security.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionTier, User } from '../../core/models/user.model';
import { getApiBaseUrl } from '../../core/config/api-config';
import { CrushProfile, CrushStatus } from '../../core/models/crush-profile.model';

import { NavbarComponent } from '../../core/components/navbar/navbar.component';

@Component({
  selector: 'app-profile-detail',
  standalone: true,
  styleUrl: './profile-detail.component.css',
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent],
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
        <a routerLink="/dashboard" [style.color]="theme.colors().text" class="back-link">← Back to Dashboard</a>
      </div>

      @if (crush(); as c) {
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
                <div [style.color]="theme.colors().textSecondary" style="font-size: 0.85rem; margin-top: 2px;">
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
                <div class="profile-avatar-stars" style="display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
                  <span [style.color]="theme.colors().accent">
                    @for (star of [1,2,3,4,5]; track star) {
                      {{ (c.rating || 0) >= star ? '★' : '☆' }}
                    }
                  </span>
                  <span
                    [style.color]="(c.redFlags || 0) > 0 ? '#ef4444' : '#22c55e'"
                    [style.border]="'1px solid ' + ((c.redFlags || 0) > 0 ? '#ef4444' : '#22c55e')"
                    style="padding: 2px 8px; border-radius: 999px; font-size: 0.78rem; font-weight: 600; line-height: 1.2;">
                    {{ (c.redFlags || 0) > 0 ? '🚩' : '✅' }}
                    @if ((c.redFlags || 0) > 0) {
                      ({{ c.redFlags }})
                    }
                  </span>
                </div>
              </div>
              <div class="profile-title-section">
                <h1 class="profile-name">{{ c.nickname }}</h1>
                <p [style.color]="theme.colors().primary" class="profile-subtitle">
                  {{ c.location || 'Location Unknown' }} • {{ c.age ? c.age + ' years' : 'Age Unknown' }}
                </p>
                @if (c.bio) {
                  <p [style.color]="theme.colors().textSecondary" class="profile-bio">{{ c.bio }}</p>
                }
              </div>
            </div>

            <div class="action-buttons-grid">
              @if (isEditMode()) {
                <button (click)="saveEdit(c.id)" class="action-btn-styled primary">Save Changes</button>
                <button (click)="toggleEditMode()" class="action-btn-styled secondary">Cancel</button>
              } @else {
                <button (click)="toggleEditMode()" class="action-btn-styled secondary">Edit Profile</button>
                <button (click)="addNote(c.id)" class="action-btn-styled primary">📝 Add Note</button>
                <button (click)="shareSelectorMode.set('crush'); pendingShareEntryId.set(null); showShareSelector.set(true)" class="action-btn-styled primary">🔗 Share</button>
                <button (click)="openDatingStatusShareSelector()" class="action-btn-styled primary action-btn-no-wrap">📣 Share Dating Status</button>

                <button (click)="toggleArchive(c)" class="action-btn-styled secondary">
                  {{ c.status === statuses.Archived ? '📂 Restore' : '📁 Archive' }}
                </button>
                <button (click)="logRedFlag(c.id)" class="action-btn-styled danger">🚩 Red Flag</button>
                <button (click)="deleteCrush(c.id)" class="action-btn-styled danger">🗑️ Delete</button>
              }
            </div>

            @if (!isEditMode()) {
              <div [style.border]="'1px solid ' + theme.colors().border"
                   [style.background-color]="theme.colors().bg"
                   style="margin-top: 14px; border-radius: 10px; padding: 12px;">
                <h3 [style.color]="theme.colors().primary" style="margin: 0 0 8px 0; font-size: 1rem;">Safety Check-In Setup</h3>

                <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 10px;">
                  <label [style.color]="theme.colors().textSecondary" style="font-size: 0.85rem;">Check-in interval</label>
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
                  <span [style.color]="theme.colors().textSecondary" style="font-size: 0.78rem;">
                    We’ll pop a halfway check-in prompt automatically.
                  </span>
                </div>

                <p [style.color]="theme.colors().textSecondary" style="margin: 0 0 8px 0; font-size: 0.85rem;">Share with trusted friends:</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  @for (friend of friends(); track friend.id) {
                    <button (click)="toggleSafetyContact(friend.id)"
                            [style.background-color]="isSafetyContact(friend.id) ? theme.colors().primary : 'transparent'"
                            [style.color]="isSafetyContact(friend.id) ? 'white' : theme.colors().text"
                            [style.border]="'1px solid ' + (isSafetyContact(friend.id) ? theme.colors().primary : theme.colors().border)"
                            style="padding: 5px 10px; border-radius: 999px; cursor: pointer; font-size: 0.8rem;">
                      {{ isSafetyContact(friend.id) ? '✓ ' : '' }}{{ friend.username }}
                    </button>
                  } @empty {
                    <span [style.color]="theme.colors().textSecondary" style="font-size: 0.82rem;">No friends found. Add friends first.</span>
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
                  <button class="close-btn" (click)="closeShareSelector()">✕</button>
                </div>
                <div class="friend-list-scroll">
                  @for (friend of friends(); track friend.id) {
                    <div class="friend-item" (click)="shareSelectorMode() === 'dating' ? toggleDatingShareFriend(friend.id) : shareWithFriend(c.id, friend.id)" [style.border-bottom]="'1px solid ' + theme.colors().border">
                      <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id" [alt]="friend.username" class="friend-avatar">
                      <div class="friend-info">
                        <span class="friend-name">{{ friend.username }}</span>
                        <span class="friend-status" [style.color]="shareSelectorMode() === 'dating' ? (isDatingShareFriendSelected(friend.id) ? theme.colors().primary : theme.colors().textSecondary) : ((pendingShareEntryId() ? isEntrySharedWithFriend(friend.id) : isShared(c, friend.id)) ? theme.colors().primary : theme.colors().textSecondary)">
                          @if (shareSelectorMode() === 'dating') {
                            {{ isDatingShareFriendSelected(friend.id) ? '✓ Selected' : 'Tap to select' }}
                          } @else {
                            {{ (pendingShareEntryId() ? isEntrySharedWithFriend(friend.id) : isShared(c, friend.id)) ? '✓ Shared' : 'Not shared' }}
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
                }
              </div>
            </div>
          }

          @if (isEditMode()) {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="info-section-card edit-form">
              <h2 [style.color]="theme.colors().primary" class="info-title">Edit Details</h2>

              <!-- Basic Info -->
              <div class="edit-section">
                <h3 [style.color]="theme.colors().textSecondary" class="edit-section-heading">Basic Info</h3>
                <div class="edit-fields-grid">
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Nickname</label>
                    <input [(ngModel)]="editForm.nickname" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">First Name</label>
                    <input [(ngModel)]="editForm.fullName" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Crush Status</label>
                    <select [(ngModel)]="editForm.status" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                      <option [value]="statuses.Crush">Crush</option>
                      <option [value]="statuses.Crushing">Crushing</option>
                      <option [value]="statuses.Dating">Dating</option>
                      <option [value]="statuses.Exclusive">Exclusive</option>
                      <option [value]="statuses.Archived">Archived</option>
                      <option [value]="statuses.Friend">Friend</option>
                    </select>
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Avatar URL</label>
                    <input [(ngModel)]="editForm.avatarUrl" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled" placeholder="https://...">
                    <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
                      @for (avatar of mockAvatars; track avatar) {
                        <img [src]="avatar"
                             [alt]="'Avatar option ' + ($index + 1)"
                             (click)="editForm.avatarUrl = avatar"
                             role="button"
                             tabindex="0"
                             (keydown.enter)="editForm.avatarUrl = avatar"
                             (keydown.space)="editForm.avatarUrl = avatar; $event.preventDefault()"
                             [style.border]="editForm.avatarUrl === avatar ? '2px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                             style="width: 42px; height: 42px; border-radius: 10px; object-fit: cover; cursor: pointer;">
                      }
                    </div>
                  </div>
                  <div class="edit-field edit-field--full">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Pronouns</label>
                    <div class="edit-chip-grid">
                      @for (p of pronounOptions; track p.value) {
                        <button (click)="editForm.pronouns = p.value"
                                [style.background-color]="editForm.pronouns === p.value ? theme.colors().primary : 'transparent'"
                                [style.color]="editForm.pronouns === p.value ? 'white' : theme.colors().text"
                                [style.border-color]="editForm.pronouns === p.value ? theme.colors().primary : theme.colors().border"
                                class="option-btn">{{ p.label }}</button>
                      }
                    </div>
                  </div>
                  <div class="edit-field edit-field--full">
                    <div class="vibe-pair-row">
                      <div class="vibe-pair-item">
                        <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Initial Vibe
                          <span [style.color]="theme.colors().textSecondary" class="vibe-sub-label">— first impression</span>
                        </label>
                        <div class="edit-stars-row">
                          @for (star of [1,2,3,4,5]; track star) {
                            <button (click)="editForm.initialRating = star"
                                    [style.color]="(editForm.initialRating || 3) >= star ? theme.colors().accent : theme.colors().border"
                                    class="star-btn">★</button>
                          }
                        </div>
                      </div>
                      <div class="vibe-pair-item">
                        <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Current Vibe
                          <span [style.color]="theme.colors().textSecondary" class="vibe-sub-label">— how you feel now</span>
                        </label>
                        <div class="edit-stars-row">
                          @for (star of [1,2,3,4,5]; track star) {
                            <button (click)="editForm.rating = star"
                                    [style.color]="editForm.rating >= star ? theme.colors().accent : theme.colors().border"
                                    class="star-btn">★</button>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- About Them -->
              <div class="edit-section">
                <h3 [style.color]="theme.colors().textSecondary" class="edit-section-heading">About Them</h3>
                <div class="edit-fields-grid">
                  <div class="edit-field edit-field--full">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Relationship Status</label>
                    <div class="edit-chip-grid">
                      @for (s of getRelationshipStatusOptions(); track s) {
                        <button (click)="editForm.relationshipStatus = s"
                                [style.background-color]="editForm.relationshipStatus === s ? theme.colors().primary : 'transparent'"
                                [style.color]="editForm.relationshipStatus === s ? 'white' : theme.colors().text"
                                [style.border-color]="editForm.relationshipStatus === s ? theme.colors().primary : theme.colors().border"
                                class="option-btn">{{ s }}</button>
                      }
                    </div>
                    @if (editForm.relationshipStatus === 'Other') {
                      <textarea [(ngModel)]="editForm.relationshipNotes" [style.background-color]="theme.colors().bgSecondary" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-textarea-styled" rows="2" placeholder="Describe your relationship status..." style="margin-top:12px;"></textarea>
                    }
                    @if (editForm.relationshipStatus === 'Heartbroken') {
                      <input [(ngModel)]="editForm.heartbreakSong"
                             [style.background-color]="theme.colors().bg"
                             [style.border-color]="theme.colors().border"
                             [style.color]="theme.colors().text"
                             class="edit-input-styled"
                             placeholder="Heartbreak song"
                             style="margin-top:12px;">
                      <textarea [(ngModel)]="editForm.heartbreakRecovery"
                                [style.background-color]="theme.colors().bgSecondary"
                                [style.border-color]="theme.colors().border"
                                [style.color]="theme.colors().text"
                                class="edit-textarea-styled"
                                rows="2"
                                placeholder="What you're doing to get over it..."
                                style="margin-top:12px;"></textarea>
                    }
                  </div>
                  <div class="edit-field edit-field--full">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Hair</label>
                    <div class="edit-chip-grid">
                      @for (h of ['Blonde', 'Brown', 'Black', 'Red', 'Long', 'Spikey', 'Bald', 'Other']; track h) {
                        <button (click)="toggleSelection(editForm.hair, h)"
                                [style.background-color]="editForm.hair.includes(h) ? theme.colors().primary : 'transparent'"
                                [style.color]="editForm.hair.includes(h) ? 'white' : theme.colors().text"
                                [style.border-color]="editForm.hair.includes(h) ? theme.colors().primary : theme.colors().border"
                                class="option-btn">{{ h }}</button>
                      }
                    </div>
                    @if (editForm.hair.includes('Other')) {
                      <textarea [(ngModel)]="editForm.hairNotes" [style.background-color]="theme.colors().bgSecondary" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-textarea-styled" rows="2" placeholder="Describe their hair..." style="margin-top:12px;"></textarea>
                    }
                  </div>
                  <div class="edit-field edit-field--full">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Eyes</label>
                    <div class="edit-chip-grid">
                      @for (e of ['Grey', 'Blue', 'Aqua', 'Green', 'Brown', 'Hazel', 'Black', 'Other']; track e) {
                        <button (click)="toggleSelection(editForm.eyes, e)"
                                [style.background-color]="editForm.eyes.includes(e) ? theme.colors().primary : 'transparent'"
                                [style.color]="editForm.eyes.includes(e) ? 'white' : theme.colors().text"
                                [style.border-color]="editForm.eyes.includes(e) ? theme.colors().primary : theme.colors().border"
                                class="option-btn">{{ e }}</button>
                      }
                    </div>
                    @if (editForm.eyes.includes('Other')) {
                      <textarea [(ngModel)]="editForm.eyeNotes" [style.background-color]="theme.colors().bgSecondary" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-textarea-styled" rows="2" placeholder="Describe their eyes..." style="margin-top:12px;"></textarea>
                    }
                  </div>
                  <div class="edit-field edit-field--full">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Build</label>
                    <div class="edit-chip-grid">
                      @for (b of ['Skinny', 'Ripped', 'Athletic', 'Tall', 'Short', 'Lots to love', 'Average', 'Other']; track b) {
                        <button (click)="toggleSelection(editForm.build, b)"
                                [style.background-color]="editForm.build.includes(b) ? theme.colors().primary : 'transparent'"
                                [style.color]="editForm.build.includes(b) ? 'white' : theme.colors().text"
                                [style.border-color]="editForm.build.includes(b) ? theme.colors().primary : theme.colors().border"
                                class="option-btn">{{ b }}</button>
                      }
                    </div>
                    @if (editForm.build.includes('Other')) {
                      <textarea [(ngModel)]="editForm.buildNotes" [style.background-color]="theme.colors().bgSecondary" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-textarea-styled" rows="2" placeholder="Describe their build..." style="margin-top:12px;"></textarea>
                    }
                  </div>
                </div>
              </div>

              <!-- Details -->
              <div class="edit-section">
                <h3 [style.color]="theme.colors().textSecondary" class="edit-section-heading">Details</h3>
                <div class="edit-fields-grid">
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Location</label>
                    <input [(ngModel)]="editForm.location" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Age</label>
                    <input type="number" [(ngModel)]="editForm.age" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">How We Met</label>
                    <input [(ngModel)]="editForm.howWeMet" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">When We Met</label>
                    <input [(ngModel)]="editForm.whenWeMet" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Grade</label>
                    <input [(ngModel)]="editForm.grade" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Occupation</label>
                    <input [(ngModel)]="editForm.occupation" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Family</label>
                    <input [(ngModel)]="editForm.family" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Their Friends</label>
                    <input [(ngModel)]="editForm.friends" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled" placeholder="Comma separated">
                  </div>
                </div>
              </div>

              <!-- Social Handles -->
              <div class="edit-section">
                <h3 [style.color]="theme.colors().textSecondary" class="edit-section-heading">Social Handles</h3>
                <div class="edit-fields-grid">
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">👻 Snapchat</label>
                    <input [(ngModel)]="editForm.social.snapchat" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled" placeholder="Username">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">💬 WhatsApp</label>
                    <input [(ngModel)]="editForm.social.whatsapp" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled" placeholder="Number">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">🐦 Twitter</label>
                    <input [(ngModel)]="editForm.social.twitter" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled" placeholder="@username">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">📘 Facebook</label>
                    <input [(ngModel)]="editForm.social.facebook" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled" placeholder="profile link">
                  </div>
                  <div class="edit-field">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">📸 Instagram</label>
                    <input [(ngModel)]="editForm.social.instagram" [style.background-color]="theme.colors().bg" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-input-styled" placeholder="@username">
                  </div>
                </div>
              </div>

              <!-- Bio & Notes -->
              <div class="edit-section">
                <h3 [style.color]="theme.colors().textSecondary" class="edit-section-heading">Bio & Notes</h3>
                <div class="edit-fields-grid">
                  <div class="edit-field edit-field--full">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Crush Note (Optional)</label>
                    <textarea [(ngModel)]="editForm.note"
                              [style.background-color]="theme.colors().bgSecondary"
                              [style.border-color]="theme.colors().border"
                              [style.color]="theme.colors().text"
                              class="edit-textarea-styled"
                              rows="3"
                              placeholder="Add a new note while editing..."></textarea>
                    <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                      <button (click)="editForm.noteVisibility = 'private'"
                              [style.background-color]="editForm.noteVisibility === 'private' ? theme.colors().primary : 'transparent'"
                              [style.color]="editForm.noteVisibility === 'private' ? 'white' : theme.colors().text"
                              [style.border-color]="editForm.noteVisibility === 'private' ? theme.colors().primary : theme.colors().border"
                              class="option-btn">Private</button>
                      <button (click)="editForm.noteVisibility = 'public'"
                              [style.background-color]="editForm.noteVisibility === 'public' ? theme.colors().primary : 'transparent'"
                              [style.color]="editForm.noteVisibility === 'public' ? 'white' : theme.colors().text"
                              [style.border-color]="editForm.noteVisibility === 'public' ? theme.colors().primary : theme.colors().border"
                              class="option-btn">Public</button>
                    </div>
                  </div>
                  <div class="edit-field edit-field--full">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Bio</label>
                    <textarea [(ngModel)]="editForm.bio" [style.background-color]="theme.colors().bgSecondary" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-textarea-styled" rows="3" placeholder="A little about them..."></textarea>
                  </div>
                  <div class="edit-field edit-field--full">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Memorable Moments</label>
                    <textarea [(ngModel)]="editForm.memorableMoments" [style.background-color]="theme.colors().bgSecondary" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-textarea-styled" rows="4" placeholder="Any moments worth remembering..."></textarea>
                  </div>
                  <div class="edit-field edit-field--full">
                    <label [style.color]="theme.colors().textSecondary" class="edit-field-label">Private Notes</label>
                    <textarea [(ngModel)]="editForm.customNotes" [style.background-color]="theme.colors().bgSecondary" [style.border-color]="theme.colors().border" [style.color]="theme.colors().text" class="edit-textarea-styled" rows="3" placeholder="Your private thoughts..."></textarea>
                  </div>
                </div>
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
                @if (c.customNotes?.includes('Hair:')) {
                   <div class="info-row-styled full-width note-detail">
                     <span class="info-label">Hair Notes</span>
                     <span class="info-value note-text">{{ getNoteDetail(c.customNotes, 'Hair:') }}</span>
                   </div>
                }
                <div class="info-row-styled">
                  <span class="info-label">Eyes</span>
                  <span class="info-value">{{ c.eyes?.join(', ') || 'N/A' }}</span>
                </div>
                @if (c.customNotes?.includes('Eyes:')) {
                   <div class="info-row-styled full-width note-detail">
                     <span class="info-label">Eye Notes</span>
                     <span class="info-value note-text">{{ getNoteDetail(c.customNotes, 'Eyes:') }}</span>
                   </div>
                }
                <div class="info-row-styled">
                  <span class="info-label">Build</span>
                  <span class="info-value">{{ c.build?.join(', ') || 'N/A' }}</span>
                </div>
                @if (c.customNotes?.includes('Build:')) {
                   <div class="info-row-styled full-width note-detail">
                     <span class="info-label">Build Notes</span>
                     <span class="info-value note-text">{{ getNoteDetail(c.customNotes, 'Build:') }}</span>
                   </div>
                }
                <div class="info-row-styled">
                  <span class="info-label">Pronouns</span>
                  <span class="info-value">{{ c.pronouns || 'N/A' }}</span>
                </div>
                <div class="info-row-styled">
                  <span class="info-label">Status</span>
                  <span class="info-value">{{ c.status }}</span>
                </div>
                @if (c.customNotes?.includes('Relationship:')) {
                   <div class="info-row-styled full-width note-detail">
                     <span class="info-label">Relationship Notes</span>
                     <span class="info-value note-text">{{ getNoteDetail(c.customNotes, 'Relationship:') }}</span>
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
                <div class="info-row-styled">
                  <span class="info-label">Social Standing</span>
                  <span class="info-value">{{ c.relationshipStatus || 'N/A' }}</span>
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

              @if (getFilteredNotes(c.customNotes)) {
                <div class="extended-info-section">
                  <h3 [style.color]="theme.colors().primary" class="extended-info-title">Private Notes</h3>
                  <p [style.color]="theme.colors().textSecondary" class="extended-info-text" style="white-space: pre-wrap;">{{ getFilteredNotes(c.customNotes) }}</p>
                </div>
              }

              <div class="extended-info-section">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                  <h3 [style.color]="theme.colors().primary" class="extended-info-title" style="margin: 0;">Added Notes</h3>
                  <span [style.color]="theme.colors().textSecondary" style="font-size: 0.85rem;">{{ noteEntries().length }} total</span>
                </div>

                @if (noteEntries().length > 0) {
                  <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
                    @for (entry of noteEntries(); track entry.id) {
                      <div [style.border]="'1px solid ' + theme.colors().border"
                           [style.background-color]="theme.colors().bg"
                           style="padding: 12px; border-radius: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
                          <span [style.color]="theme.colors().textSecondary" style="font-size: 0.8rem;">
                            {{ entry.timestamp | date:'MMM d, h:mm a' }}
                          </span>
                          <button (click)="startSharingNote(entry.id)"
                                  [style.background-color]="theme.colors().primary"
                                  style="border: none; color: white; border-radius: 999px; padding: 4px 10px; font-size: 0.78rem; cursor: pointer;">
                            Share note
                          </button>
                        </div>
                        <p [style.color]="theme.colors().textSecondary" style="margin: 0; white-space: pre-wrap;">{{ entry.content }}</p>
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
                    <span [style.color]="theme.colors().textSecondary" style="font-size: 0.8rem;">Ask me</span>
                    <select [ngModel]="vibePromptFrequencyHours()" (ngModelChange)="setVibePromptFrequency($event)"
                            [style.background-color]="theme.colors().bg"
                            [style.border]="'1px solid ' + theme.colors().border"
                            [style.color]="theme.colors().text"
                            style="padding: 4px 8px; border-radius: 6px; font-size: 0.8rem;">
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
      }
    </div>
  `
})
export class ProfileDetailComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private messaging = inject(MessagingService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public subscription = inject(SubscriptionService);
  public modal = inject(ModalService);
  private router = inject(Router);

  crushId = signal<string | null>(null);
  safetyState = signal<'Draft' | 'Sent' | 'Safe' | 'Urgent'>('Draft');
  onDateMode = signal(false);
  statuses = CrushStatus;
  isEditMode = signal(false);
  showShareSelector = signal(false);
  shareSelectorMode = signal<'crush' | 'dating'>('crush');
  showVibeBanner = signal(true);
  vibePromptFrequencyHours = signal(24);
  friends = signal<User[]>([]);
  pendingVibe = signal(0);
  pendingShareEntryId = signal<string | null>(null);
  datingShareFriendIds = signal<string[]>([]);
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
  mockAvatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo'
  ];
  private halfwaySafetyTimer: ReturnType<typeof setTimeout> | null = null;

  pronounOptions: Array<{label: string, value: 'he' | 'she' | 'they'}> = [
    {label: 'He/Him', value: 'he'},
    {label: 'She/Her', value: 'she'},
    {label: 'They/Them', value: 'they'}
  ];

  editForm: any = {
    nickname: '',
    fullName: '',
    bio: '',
    pronouns: 'they',
    relationshipStatus: '',
    heartbreakSong: '',
    heartbreakRecovery: '',
    relationshipNotes: '',
    customNotes: '',
    location: '',
    age: null,
    hair: [] as string[],
    eyes: [] as string[],
    build: [] as string[],
    hairNotes: '',
    eyeNotes: '',
    buildNotes: '',
    howWeMet: '',
    whenWeMet: '',
    grade: '',
    occupation: '',
    family: '',
    memorableMoments: '',
    friends: '',
    avatarUrl: '',
    rating: 3,
    initialRating: 3,
    social: {
      snapchat: '',
      whatsapp: '',
      twitter: '',
      facebook: '',
      instagram: ''
    },
    note: '',
    noteVisibility: 'private'
  };

  crush = computed(() => {
    const id = this.crushId();
    if (!id) return null;
    return this.dataService.visibleCrushes().find(c => c.id === id) || null;
  });

  entries = computed(() => {
    const id = this.crushId();
    if (!id) return [];
    return this.dataService.getEntriesForCrush(id)();
  });

  noteEntries = computed(() =>
    this.entries()
      .filter((entry) => entry.type === 'Note')
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  );

  selectedSafetyContactNames = computed(() => {
    const selected = this.safetyContactIds();
    if (selected.length === 0) return '';
    const byId = new Map(this.friends().map((friend) => [friend.id, friend.username]));
    return selected.map((id) => byId.get(id) || id).join(', ');
  });

  constructor() {
    this.crushId.set(this.route.snapshot.paramMap.get('id'));
    this.loadFriends();
    this.loadVibePromptFrequency();
    this.refreshVibePromptVisibility();
  }

  ngOnDestroy(): void {
    this.clearSafetyTimers();
  }

  private async loadFriends() {
    const currentUsername = this.security.currentUser() || 'dexii_demo_user';
    const apiBase = `${getApiBaseUrl()}/demo/friends`;
    try {
      const response = await fetch(`${apiBase}/list?username=${encodeURIComponent(currentUsername)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          this.friends.set(data.map(f => ({
            id: f.id || f.username,
            username: f.username,
            friends: [],
            blockedUsers: [],
            subscriptionTier: f.subscriptionTier || SubscriptionTier.Free,
            isVerified18: true,
            avatarUrl: f.avatarUrl,
            friendCategories: f.friendCategories || ['Close Friends']
          } as User)));
        }
      }
    } catch (err) {
      console.error('Failed to load friends', err);
    }
  }

  getRelationshipStatusOptions(): string[] {
    const pronoun = this.editForm.pronouns || 'they';
    const subject = pronoun === 'he' ? 'he' : pronoun === 'she' ? 'she' : 'they';
    const subjectCap = subject.charAt(0).toUpperCase() + subject.slice(1);
    const object = pronoun === 'he' ? 'him' : pronoun === 'she' ? 'her' : 'them';
    const verb = pronoun === 'they' ? "don't" : "doesn't";
    const likes = pronoun === 'they' ? 'like' : 'likes';

    return [
      `${subjectCap} ${verb} know I exist`,
      "Just friends",
      "Just flirting",
      "Just sexting",
      "Heartbroken",
      `I think ${subject} ${likes} me`,
      "Getting serious",
      "We are a couple",
      "Friends With Benefits",
      "We are engaged",
      "Other"
    ];
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
    this.dataService.incrementRedFlag(id);
    this.dataService.addEntry({
      crushId: id,
      type: 'RedFlag',
      content: 'A new cautionary flag was raised.',
      isBurnAfterReading: false,
      visibility: [],
      isSensitive: false
    });

    // Persist the red flag increment to backend
    const c = this.crush();
    if (c) {
      this.dataService.updateCrush({ ...c, redFlags: (c.redFlags || 0) + 1 });
    }
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
      this.dataService.updateCrush({ ...c, rating: num, vibeHistory: history });
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
        content: `🚨 Emergency mode enabled for ${this.crush()?.nickname || 'my date'}. Please check in now.`
      });
    });
    this.modal.show('Emergency Mode enabled. Trusted contacts alerted urgently.');
  }

  toggleArchive(crush: CrushProfile) {
    const newStatus = crush.status === CrushStatus.Archived ? CrushStatus.Crush : CrushStatus.Archived;
    const updatedCrush = { ...crush, status: newStatus };
    this.dataService.updateCrush(updatedCrush);
  }

  openDatingStatusShareSelector(): void {
    if (this.friends().length === 0) {
      this.modal.show('Add at least one friend first to share your dating status.');
      return;
    }
    this.pendingShareEntryId.set(null);
    this.shareSelectorMode.set('dating');
    this.datingShareFriendIds.set([]);
    this.showShareSelector.set(true);
  }

  closeShareSelector(): void {
    this.showShareSelector.set(false);
    this.pendingShareEntryId.set(null);
    this.shareSelectorMode.set('crush');
    this.datingShareFriendIds.set([]);
  }

  toggleDatingShareFriend(friendId: string): void {
    this.datingShareFriendIds.update((ids) =>
      ids.includes(friendId) ? ids.filter((id) => id !== friendId) : [...ids, friendId]
    );
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
        relatedCrushId: crushId
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

  shareWithFriend(crushId: string, friendId: string): void {
    if (friendId) {
      const entryId = this.pendingShareEntryId();
      if (entryId) {
        if (!this.isEntrySharedWithFriend(friendId)) {
          this.dataService.toggleEntryVisibility(entryId, friendId);
        }

        const note = this.entries().find((entry) => entry.id === entryId);
        if (note) {
          this.messaging.sendMessage({
            senderId: 'me',
            receiverId: friendId,
            content: `Shared note about ${this.crush()?.nickname || 'this crush'}: ${note.content}`,
            relatedCrushId: crushId,
            relatedEntryId: note.id
          });
        }

        this.closeShareSelector();
        this.modal.show(`Note shared with ${friendId}.`);
        return;
      }

      this.dataService.toggleCrushVisibility(crushId, friendId);

      // Check if now visible or not
      const c = this.crush();
      const isSharedNow = c?.visibility.some(id =>
        id === friendId ||
        (this.dataService.isMe(friendId) && (id === 'me' || id === this.dataService.getUserId())) ||
        id.toLowerCase().replace(/\s+/g, '_') === friendId.toLowerCase().replace(/\s+/g, '_')
      );

      if (isSharedNow) {
        this.modal.show(`Crush shared with ${friendId}! Check Shared History to track.`);
      } else {
        this.modal.show(`Crush unshared from ${friendId}.`);
      }
      this.closeShareSelector();
    }
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
    this.modal.confirm('Are you sure you want to delete this crush? This cannot be undone.', () => {
      this.dataService.deleteCrush(crushId);
      this.router.navigate(['/dashboard']);
    });
  }

  toggleSelection(list: string[], item: string) {
    const index = list.indexOf(item);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(item);
    }
  }

  toggleEditMode() {
    if (!this.isEditMode()) {
      // Entering edit mode - populate form
      const c = this.crush();
      if (c) {
        this.editForm = {
          nickname: c.nickname || '',
          fullName: c.fullName || '',
          bio: c.bio || '',
          pronouns: c.pronouns || 'they',
          relationshipStatus: c.relationshipStatus || '',
          heartbreakSong: c.heartbreakSong || '',
          heartbreakRecovery: c.heartbreakRecovery || '',
          relationshipNotes: this.getNoteDetail(c.customNotes, 'Relationship:'),
          customNotes: this.getFilteredNotes(c.customNotes),
          location: c.location || '',
          age: c.age || null,
          hair: c.hair ? [...c.hair] : [],
          eyes: c.eyes ? [...c.eyes] : [],
          build: c.build ? [...c.build] : [],
          hairNotes: this.getNoteDetail(c.customNotes, 'Hair:'),
          eyeNotes: this.getNoteDetail(c.customNotes, 'Eyes:'),
          buildNotes: this.getNoteDetail(c.customNotes, 'Build:'),
          howWeMet: c.howWeMet || '',
          whenWeMet: c.whenWeMet || '',
          grade: c.grade || '',
          occupation: c.occupation || '',
          family: c.family || '',
          memorableMoments: c.memorableMoments || '',
          friends: c.friends ? c.friends.join(', ') : '',
          avatarUrl: c.avatarUrl || '',
          status: c.status || this.statuses.Crushing,
          rating: c.rating || 3,
          initialRating: c.initialRating || c.rating || 3,
          social: {
            snapchat: c.social?.snapchat || '',
            whatsapp: c.social?.whatsapp || '',
            twitter: c.social?.twitter || '',
            facebook: c.social?.facebook || '',
            instagram: c.social?.instagram || ''
          },
          note: '',
          noteVisibility: 'private'
        };
      }
    }
    this.isEditMode.set(!this.isEditMode());
  }

  saveEdit(crushId: string) {
    let customNotes = '';
    if (this.editForm.hairNotes) customNotes += `Hair: ${this.editForm.hairNotes}\n`;
    if (this.editForm.eyeNotes) customNotes += `Eyes: ${this.editForm.eyeNotes}\n`;
    if (this.editForm.buildNotes) customNotes += `Build: ${this.editForm.buildNotes}\n`;
    if (this.editForm.relationshipNotes) customNotes += `Relationship: ${this.editForm.relationshipNotes}\n`;
    if (this.editForm.customNotes) customNotes += this.editForm.customNotes;

    const updatedCrush = {
      ...this.crush(),
      ...this.editForm,
      hair: Array.isArray(this.editForm.hair) ? this.editForm.hair : [],
      eyes: Array.isArray(this.editForm.eyes) ? this.editForm.eyes : [],
      build: Array.isArray(this.editForm.build) ? this.editForm.build : [],
      friends: this.editForm.friends ? this.editForm.friends.split(',').map((f: string) => f.trim()).filter((f: string) => f) : [],
      heartbreakSong: this.editForm.heartbreakSong || '',
      heartbreakRecovery: this.editForm.heartbreakRecovery || '',
      customNotes: customNotes.trim(),
      id: crushId
    } as CrushProfile;

    this.dataService.updateCrush(updatedCrush);

    const note = (this.editForm.note || '').trim();
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

  getNoteDetail(notes: string | undefined, key: string): string {
    if (!notes || !notes.includes(key)) return '';
    const parts = notes.split(key);
    if (parts.length < 2) return '';
    const detailPart = parts[1].split('\n')[0];
    return detailPart ? detailPart.trim() : '';
  }

  getFilteredNotes(notes: string | undefined): string {
    if (!notes) return '';
    const keys = ['Hair:', 'Eyes:', 'Build:', 'Relationship:'];
    return notes.split('\n')
      .filter(line => !keys.some(key => line.startsWith(key)))
      .join('\n')
      .trim();
  }
}
