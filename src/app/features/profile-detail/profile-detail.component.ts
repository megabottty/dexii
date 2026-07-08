import { Component, signal, inject, computed } from '@angular/core';
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
          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               class="profile-header-card">
            <div class="profile-header-flex">
              <div class="profile-avatar-wrap">
                <img [src]="c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop'"
                     [alt]="c.nickname"
                     class="profile-avatar">
                <div [style.color]="theme.colors().accent" class="profile-avatar-stars">
                  @for (star of [1,2,3,4,5]; track star) {
                    {{ (c.rating || 0) >= star ? '★' : '☆' }}
                  }
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
                <button (click)="showShareSelector.set(true)" class="action-btn-styled primary">🔗 Share</button>

                @if (safetyState() === 'Draft') {
                  <button (click)="startSafetyCheck(c.id)" class="action-btn-styled safety">🔒 Start Safety</button>
                } @else if (safetyState() === 'Sent') {
                  <button (click)="markSafe(c.id)" class="action-btn-styled safe">✅ Mark Safe</button>
                  <button (click)="triggerEmergency(c.id)" class="action-btn-styled urgent">🚨 URGENT</button>
                }

                <button (click)="toggleArchive(c)" class="action-btn-styled secondary">
                  {{ c.status === statuses.Archived ? '📂 Restore' : '📁 Archive' }}
                </button>
                <button (click)="logRedFlag(c.id)" class="action-btn-styled danger">🚩 Red Flag</button>
                <button (click)="deleteCrush(c.id)" class="action-btn-styled danger">🗑️ Delete</button>
              }
            </div>
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
              <button (click)="showVibeBanner.set(false)"
                      [style.color]="theme.colors().textSecondary"
                      class="vibe-banner-dismiss"
                      aria-label="Dismiss">✕</button>
            </div>
          }

          @if (showShareSelector()) {
            <div class="selector-overlay" (click)="showShareSelector.set(false)">
              <div class="selector-card" [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" (click)="$event.stopPropagation()">
                <div class="selector-header">
                  <h3>Share with a Friend</h3>
                  <button class="close-btn" (click)="showShareSelector.set(false)">✕</button>
                </div>
                <div class="friend-list-scroll">
                  @for (friend of friends(); track friend.id) {
                    <div class="friend-item" (click)="shareWithFriend(c.id, friend.id)" [style.border-bottom]="'1px solid ' + theme.colors().border">
                      <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id" [alt]="friend.username" class="friend-avatar">
                      <div class="friend-info">
                        <span class="friend-name">{{ friend.username }}</span>
                        <span class="friend-status" [style.color]="isShared(c, friend.id) ? theme.colors().primary : theme.colors().textSecondary">
                          {{ isShared(c, friend.id) ? '✓ Shared' : 'Not shared' }}
                        </span>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <p>No friends found.</p>
                      <a routerLink="/friends" (click)="showShareSelector.set(false)" [style.color]="theme.colors().primary">Add friends</a>
                    </div>
                  }
                </div>
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

              <!-- Vibe Tracker -->
              <div [style.background-color]="theme.colors().bgSecondary"
                   [style.border]="'1px solid ' + theme.colors().border"
                   class="extended-info-section vibe-tracker-section">
                <h3 [style.color]="theme.colors().primary" class="extended-info-title">✨ Vibe Tracker</h3>

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
export class ProfileDetailComponent {
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
  showVibeBanner = signal(true);
  friends = signal<User[]>([]);
  pendingVibe = signal(0);

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
    }
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

  constructor() {
    this.crushId.set(this.route.snapshot.paramMap.get('id'));
    this.loadFriends();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const key = `vibe_checked_${id}`;
      const last = localStorage.getItem(key);
      if (last && Date.now() - Number(last) < 24 * 60 * 60 * 1000) {
        this.showVibeBanner.set(false);
      }
    }
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
      `I think ${subject} ${likes} me`,
      "Getting serious",
      "We are a couple",
      "Friends With Benefits",
      "We are engaged",
      "Other"
    ];
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

  logVibeInline(id: string, rating: number) {
    const num = Math.max(1, Math.min(5, rating));
    this.dataService.updateVibe(id, num);
    this.dataService.addEntry({
      crushId: id,
      type: 'Note',
      content: `Vibe logged: ${'★'.repeat(num)}${'☆'.repeat(5 - num)} (${num}/5)`,
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
    localStorage.setItem(`vibe_checked_${id}`, String(Date.now()));
    this.showVibeBanner.set(false);
    this.pendingVibe.set(0);
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

  startSafetyCheck(id: string) {
    this.safetyState.set('Sent');
    this.dataService.addEntry({
      crushId: id,
      type: 'SafetyCheck',
      content: 'Safety Check-In Started.',
      visibility: [],
      isSensitive: true,
      safetyStatus: 'Sent',
      safetyContactId: 'friend_99' // Mock contact
    });
    this.modal.show('Safety Check Enabled. Your trusted contacts have been notified.');
  }

  markSafe(id: string) {
    this.safetyState.set('Safe');
    this.dataService.addEntry({
      crushId: id,
      type: 'SafetyCheck',
      content: 'Safety Check-In Resolved: I am safe.',
      visibility: [],
      isSensitive: true,
      safetyStatus: 'Safe',
      safetyContactId: 'friend_99'
    });
    this.modal.show('Safety Check resolved and marked Safe.');
  }

  triggerEmergency(id: string) {
    this.safetyState.set('Urgent');
    this.dataService.addEntry({
      crushId: id,
      type: 'SafetyCheck',
      content: 'Emergency Mode escalated. Immediate assistance requested.',
      visibility: [],
      isSensitive: true,
      safetyStatus: 'Urgent',
      safetyContactId: 'friend_99'
    });
    this.modal.show('Emergency Mode enabled. Trusted contacts alerted urgently.');
  }

  toggleArchive(crush: CrushProfile) {
    const newStatus = crush.status === CrushStatus.Archived ? CrushStatus.Crush : CrushStatus.Archived;
    const updatedCrush = { ...crush, status: newStatus };
    this.dataService.updateCrush(updatedCrush);
  }

  shareWithFriend(crushId: string, friendId: string): void {
    if (friendId) {
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
      this.showShareSelector.set(false);
    }
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
          }
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
      customNotes: customNotes.trim(),
      id: crushId
    } as CrushProfile;

    this.dataService.updateCrush(updatedCrush);
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
