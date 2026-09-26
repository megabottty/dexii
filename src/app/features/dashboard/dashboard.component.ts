import { Component, signal, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { WalkthroughService } from '../../core/services/walkthrough.service';
import {
  FIRST_CRUSH_SHARE_TOUR,
  FIRST_CRUSH_SHARE_TOUR_KEY
} from '../../core/config/walkthrough-tours';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { CrushProfile, CrushStatus } from '../../core/models/crush-profile.model';
import { AvatarConfig } from '../../core/models/avatar-config.model';
import { AvatarPickerComponent } from '../../core/components/avatar-picker/avatar-picker.component';
import { AvatarRenderService } from '../../core/services/avatar-render.service';
import { SubscriptionTier } from '../../core/models/user.model';

import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { FriendsApiService, FriendSummary } from '../../core/services/friends-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  styleUrl: './dashboard.component.css',
  imports: [CommonModule, RouterModule, FormsModule, PageHintComponent, NavbarComponent, AvatarPickerComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         class="dashboard-component__s1">

      <!-- New Entry Modal -->
      @if (showNewEntryModal()) {
        <div class="dashboard-component__s2">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               class="dashboard-component__s3">

            <button (click)="closeModal()" [style.color]="theme.colors().textSecondary" aria-label="Close new crush modal" class="dashboard-component__s4">✕</button>

            <h3 class="dashboard-component__s5">New Crush</h3>

            <div class="dashboard-component__s6">
              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">Pronouns</label>
                <div class="dashboard-component__s28" style="margin-bottom: 20px;">
                  @for (p of pronounOptions; track p.value) {
                    <div (click)="newCrush.pronouns = p.value"
                         role="button"
                         tabindex="0"
                         (keydown.enter)="newCrush.pronouns = p.value"
                         (keydown.space)="newCrush.pronouns = p.value; $event.preventDefault()"
                         [attr.aria-pressed]="newCrush.pronouns === p.value"
                         [style.border]="newCrush.pronouns === p.value ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                         [style.background-color]="newCrush.pronouns === p.value ? theme.colors().primary + '10' : 'transparent'"
                         class="dashboard-component__s29">
                      <div [style.border]="'2px solid ' + (newCrush.pronouns === p.value ? theme.colors().primary : theme.colors().textSecondary)"
                           [style.background-color]="newCrush.pronouns === p.value ? theme.colors().primary : 'transparent'"
                           class="dashboard-component__s30">
                         @if (newCrush.pronouns === p.value) {
                           <span class="dashboard-component__s31">✓</span>
                         }
                      </div>
                      <span class="dashboard-component__s32">{{p.label}}</span>
                    </div>
                  }
                </div>
              </div>

              <app-avatar-picker [(url)]="newCrush.avatarUrl" [(config)]="newCrush.avatarConfig"></app-avatar-picker>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">Nickname</label>
                <input [(ngModel)]="newCrush.nickname" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">First Name (Optional)</label>
                <input [(ngModel)]="newCrush.firstName" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s18">
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">Status</label>
                <select [(ngModel)]="newCrush.status" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s19">
                  <option [value]="statuses.Crush">Crush</option>
                  <option [value]="statuses.Plotting">Plotting</option>
                  <option [value]="statuses.Dating">Dating</option>
                  <option [value]="statuses.Exclusive">Exclusive</option>
                  <option [value]="statuses.BrokenUp">Broken Up</option>
                  <option [value]="statuses.Heartbroken">Heartbroken</option>
                  <option [value]="statuses.Archived">Archived</option>
                  <option [value]="statuses.Friend">Friend</option>
                </select>
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">Crush Note (Optional)</label>
                <textarea [(ngModel)]="newCrush.note"
                          [style.background-color]="theme.colors().bgSecondary"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.color]="theme.colors().text"
                          rows="4"

                          placeholder="Add your first note about this crush..." class="dashboard-component__s20"></textarea>

                <div class="dashboard-component__s21">
                  <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s22">
                    Note Visibility
                  </p>
                  <div class="dashboard-component__s23">
                    <button (click)="newCrush.noteVisibility = 'private'"
                            [style.background-color]="newCrush.noteVisibility === 'private' ? theme.colors().primary : 'transparent'"
                            [style.color]="newCrush.noteVisibility === 'private' ? 'white' : theme.colors().text"
                            [style.border]="'1px solid ' + (newCrush.noteVisibility === 'private' ? theme.colors().primary : theme.colors().border)"
                            class="dashboard-component__s24">
                      Private
                    </button>
                    <button (click)="newCrush.noteVisibility = 'public'"
                            [style.background-color]="newCrush.noteVisibility === 'public' ? theme.colors().primary : 'transparent'"
                            [style.color]="newCrush.noteVisibility === 'public' ? 'white' : theme.colors().text"
                            [style.border]="'1px solid ' + (newCrush.noteVisibility === 'public' ? theme.colors().primary : theme.colors().border)"
                            class="dashboard-component__s24">
                      Public
                    </button>
                  </div>
                </div>
              </div>

              <!-- About the Boy Sections -->
              <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-section-top">
                <h4 [style.color]="theme.colors().primary" class="dashboard-component__s25">About the Boy</h4>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Hair</label>
                  <div class="dashboard-component__s28">
                    @for (h of ['Blonde', 'Brown', 'Black', 'Red', 'Long', 'Spikey', 'Bald', 'Other']; track h) {
                      <div (click)="toggleSelection(newCrush.hair, h)"
                           role="button"
                           tabindex="0"
                           (keydown.enter)="toggleSelection(newCrush.hair, h)"
                           (keydown.space)="toggleSelection(newCrush.hair, h); $event.preventDefault()"
                           [attr.aria-pressed]="newCrush.hair.includes(h)"
                           [style.border]="newCrush.hair.includes(h) ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.hair.includes(h) ? theme.colors().primary + '10' : 'transparent'"
                           class="dashboard-component__s29">
                        <div [style.border]="'2px solid ' + (newCrush.hair.includes(h) ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.hair.includes(h) ? theme.colors().primary : 'transparent'"
                             class="dashboard-component__s30">
                           @if (newCrush.hair.includes(h)) {
                             <span class="dashboard-component__s31">✓</span>
                           }
                        </div>
                        <span class="dashboard-component__s32">{{h}}</span>
                      </div>
                    }
                  </div>
                  @if (newCrush.hair.includes('Other')) {
                    <div style="margin-top: 12px;">
                      <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Hair Notes</label>
                      <textarea [(ngModel)]="newCrush.hairNotes"
                                [style.background-color]="theme.colors().bgSecondary"
                                [style.border]="'1px solid ' + theme.colors().border"
                                [style.color]="theme.colors().text"
                                rows="2"
                                placeholder="Describe their hair..."
                                class="dashboard-component__s20"></textarea>
                    </div>
                  }
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Eyes</label>
                  <div class="dashboard-component__s28">
                    @for (e of ['Grey', 'Blue', 'Aqua', 'Green', 'Brown', 'Hazel', 'Black', 'Other']; track e) {
                      <div (click)="toggleSelection(newCrush.eyes, e)"
                           role="button"
                           tabindex="0"
                           (keydown.enter)="toggleSelection(newCrush.eyes, e)"
                           (keydown.space)="toggleSelection(newCrush.eyes, e); $event.preventDefault()"
                           [attr.aria-pressed]="newCrush.eyes.includes(e)"
                           [style.border]="newCrush.eyes.includes(e) ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.eyes.includes(e) ? theme.colors().primary + '10' : 'transparent'"
                           class="dashboard-component__s29">
                        <div [style.border]="'2px solid ' + (newCrush.eyes.includes(e) ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.eyes.includes(e) ? theme.colors().primary : 'transparent'"
                             class="dashboard-component__s30">
                           @if (newCrush.eyes.includes(e)) {
                             <span class="dashboard-component__s31">✓</span>
                           }
                        </div>
                        <span class="dashboard-component__s32">{{e}}</span>
                      </div>
                    }
                  </div>
                  @if (newCrush.eyes.includes('Other')) {
                    <div style="margin-top: 12px;">
                      <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Eye Notes</label>
                      <textarea [(ngModel)]="newCrush.eyeNotes"
                                [style.background-color]="theme.colors().bgSecondary"
                                [style.border]="'1px solid ' + theme.colors().border"
                                [style.color]="theme.colors().text"
                                rows="2"
                                placeholder="Describe their eyes..."
                                class="dashboard-component__s20"></textarea>
                    </div>
                  }
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Build</label>
                  <div class="dashboard-component__s28">
                    @for (b of ['Skinny', 'Ripped', 'Athletic', 'Tall', 'Short', 'Lots to love', 'Average', 'Other']; track b) {
                      <div (click)="toggleSelection(newCrush.build, b)"
                           role="button"
                           tabindex="0"
                           (keydown.enter)="toggleSelection(newCrush.build, b)"
                           (keydown.space)="toggleSelection(newCrush.build, b); $event.preventDefault()"
                           [attr.aria-pressed]="newCrush.build.includes(b)"
                           [style.border]="newCrush.build.includes(b) ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.build.includes(b) ? theme.colors().primary + '10' : 'transparent'"
                           class="dashboard-component__s29">
                        <div [style.border]="'2px solid ' + (newCrush.build.includes(b) ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.build.includes(b) ? theme.colors().primary : 'transparent'"
                             class="dashboard-component__s30">
                           @if (newCrush.build.includes(b)) {
                             <span class="dashboard-component__s31">✓</span>
                           }
                        </div>
                        <span class="dashboard-component__s32">{{b}}</span>
                      </div>
                    }
                  </div>
                  @if (newCrush.build.includes('Other')) {
                    <div style="margin-top: 12px;">
                      <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Build Notes</label>
                      <textarea [(ngModel)]="newCrush.buildNotes"
                                [style.background-color]="theme.colors().bgSecondary"
                                [style.border]="'1px solid ' + theme.colors().border"
                                [style.color]="theme.colors().text"
                                rows="2"
                                placeholder="Describe their build..."
                                class="dashboard-component__s20"></textarea>
                    </div>
                  }
                </div>
              </div>

              <!-- Social Handles -->
              <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-section-top">
                <h4 [style.color]="theme.colors().primary" class="dashboard-component__s25">Where I can find them</h4>
                <div class="dashboard-component__s33">
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">👻</span>
                    <input placeholder="Snapchat Username" [(ngModel)]="newCrush.social.snapchat" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">💬</span>
                    <input placeholder="WhatsApp Number" [(ngModel)]="newCrush.social.whatsapp" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">🐦</span>
                    <input placeholder="Twitter @username" [(ngModel)]="newCrush.social.twitter" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">📘</span>
                    <input placeholder="Facebook.com/" [(ngModel)]="newCrush.social.facebook" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">📸</span>
                    <input placeholder="Instagram @username" [(ngModel)]="newCrush.social.instagram" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                </div>
              </div>

              <!-- Relationship Status -->
              <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-section-top">
                <h4 [style.color]="theme.colors().primary" class="dashboard-component__s25">Relationship Status</h4>
                <div class="dashboard-component__s37">
                  @for (s of getRelationshipStatusOptions(); track s) {
                    <div (click)="newCrush.relationshipStatus = s"
                         role="button"
                         tabindex="0"
                         (keydown.enter)="newCrush.relationshipStatus = s"
                         (keydown.space)="newCrush.relationshipStatus = s; $event.preventDefault()"
                         [attr.aria-pressed]="newCrush.relationshipStatus === s"
                         [style.border]="newCrush.relationshipStatus === s ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                         [style.background-color]="newCrush.relationshipStatus === s ? theme.colors().primary + '10' : 'transparent'"
                         class="dashboard-component__s38">
                      <div [style.border]="'2px solid ' + (newCrush.relationshipStatus === s ? theme.colors().primary : theme.colors().textSecondary)"
                           class="dashboard-component__s39">
                         @if (newCrush.relationshipStatus === s) {
                           <div [style.background-color]="theme.colors().primary" class="dashboard-component__s40"></div>
                         }
                      </div>
                      <span class="dashboard-component__s32">{{s}}</span>
                    </div>
                  }
                </div>
                @if (newCrush.relationshipStatus === 'Other') {
                  <div style="margin-top: 12px;">
                    <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Relationship Notes</label>
                    <textarea [(ngModel)]="newCrush.relationshipNotes"
                              [style.background-color]="theme.colors().bgSecondary"
                              [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().text"
                              rows="2"
                              placeholder="Describe your relationship status..."
                              class="dashboard-component__s20"></textarea>
                  </div>
                }
                @if (newCrush.relationshipStatus === 'Heartbroken') {
                  <div style="margin-top: 12px;">
                    <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Heartbreak Song</label>
                    <input [(ngModel)]="newCrush.heartbreakSong"
                           [style.background-color]="theme.colors().bgSecondary"
                           [style.border]="'1px solid ' + theme.colors().border"
                           [style.color]="theme.colors().text"
                           placeholder="What song are you listening to?"
                           class="dashboard-component__s17">
                  </div>
                  <div style="margin-top: 12px;">
                    <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">How I'm Getting Over It</label>
                    <textarea [(ngModel)]="newCrush.heartbreakRecovery"
                              [style.background-color]="theme.colors().bgSecondary"
                              [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().text"
                              rows="2"
                              placeholder="Gym, journaling, long walks, etc."
                              class="dashboard-component__s20"></textarea>
                  </div>
                }
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s41">Initial Vibe (1-5 Stars)</label>
                <div class="dashboard-component__s42">
                  @for (star of [1,2,3,4,5]; track star) {
                    <button type="button" (click)="newCrush.initialRating = star" [attr.aria-label]="'Set initial vibe to ' + star + ' stars'"
                            [style.color]="newCrush.initialRating >= star ? theme.colors().accent : theme.colors().border" class="dashboard-rating-star">★</button>
                  }
                </div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s41" style="margin-top: 10px; display: block;">Current Vibe (Optional)</label>
                <div class="dashboard-component__s42">
                  @for (star of [1,2,3,4,5]; track star) {
                    <button type="button" (click)="newCrush.currentRating = star" [attr.aria-label]="'Set current vibe to ' + star + ' stars'"
                            [style.color]="(newCrush.currentRating ?? 0) >= star ? theme.colors().accent : theme.colors().border" class="dashboard-rating-star">★</button>
                  }
                  <button type="button" (click)="newCrush.currentRating = null"
                          [style.color]="theme.colors().textSecondary"
                          class="dashboard-rating-star"
                          aria-label="Skip current vibe">Skip</button>
                </div>
              </div>

              <!-- More About Them -->
              <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-section-top">
                <h4 [style.color]="theme.colors().primary" class="dashboard-component__s25">More About Them</h4>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Bio</label>
                  <textarea [(ngModel)]="newCrush.bio"
                            [style.background-color]="theme.colors().bgSecondary"
                            [style.border]="'1px solid ' + theme.colors().border"
                            [style.color]="theme.colors().text"
                            rows="3"
                            placeholder="A little about them..."
                            class="dashboard-component__s20"></textarea>
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Location</label>
                  <input [(ngModel)]="newCrush.location" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Age</label>
                  <input type="date" [(ngModel)]="newCrush.dateOfBirth" [max]="todayDate" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
                  <span class="vibe-sub-label">Enter their birthday so the displayed age stays current.</span>
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">How We Met</label>
                  <input [(ngModel)]="newCrush.howWeMet" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">When We Met</label>
                  <input [(ngModel)]="newCrush.whenWeMet" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Are they in school or working?</label>
                  <div class="dashboard-component__s28">
                    @for (option of schoolOrWorkOptions; track option.value) {
                      <div (click)="selectSchoolOrWork(option.value)"
                           role="button"
                           tabindex="0"
                           (keydown.enter)="selectSchoolOrWork(option.value)"
                           (keydown.space)="selectSchoolOrWork(option.value); $event.preventDefault()"
                           [attr.aria-pressed]="newCrush.schoolOrWork === option.value"
                           [style.border]="newCrush.schoolOrWork === option.value ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.schoolOrWork === option.value ? theme.colors().primary + '10' : 'transparent'"
                           class="dashboard-component__s29">
                        <div [style.border]="'2px solid ' + (newCrush.schoolOrWork === option.value ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.schoolOrWork === option.value ? theme.colors().primary : 'transparent'"
                             class="dashboard-component__s30">
                           @if (newCrush.schoolOrWork === option.value) {
                             <span class="dashboard-component__s31">✓</span>
                           }
                        </div>
                        <span class="dashboard-component__s32">{{option.label}}</span>
                      </div>
                    }
                  </div>
                </div>

                @if (shouldShowGrade()) {
                  <div class="dashboard-component__s26">
                    <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Grade</label>
                    <input [(ngModel)]="newCrush.grade" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
                  </div>
                }

                @if (shouldShowOccupation()) {
                  <div class="dashboard-component__s26">
                    <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Occupation</label>
                    <input [(ngModel)]="newCrush.occupation" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
                  </div>
                }

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Family</label>
                  <input [(ngModel)]="newCrush.family" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Their Friends (comma separated)</label>
                  <input [(ngModel)]="newCrush.friends" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17" placeholder="e.g. Alex, Jordan, Sam">
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Memorable Moments</label>
                  <textarea [(ngModel)]="newCrush.memorableMoments"
                            [style.background-color]="theme.colors().bgSecondary"
                            [style.border]="'1px solid ' + theme.colors().border"
                            [style.color]="theme.colors().text"
                            rows="3"
                            placeholder="Any moments worth remembering..."
                            class="dashboard-component__s20"></textarea>
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Private Notes</label>
                  <textarea [(ngModel)]="newCrush.privateNotes"
                            [style.background-color]="theme.colors().bgSecondary"
                            [style.border]="'1px solid ' + theme.colors().border"
                            [style.color]="theme.colors().text"
                            rows="3"
                            placeholder="Your private thoughts..."
                            class="dashboard-component__s20"></textarea>
                </div>
              </div>
            </div>

            <button (click)="saveCrush()" [style.background-color]="theme.colors().primary" class="dashboard-component__s43">
              Save Crush
            </button>
          </div>
        </div>
      }

      <!-- Glamour Decorative Elements -->
      @if (theme.isPearl()) {
        <div class="dashboard-component__s60"></div>
      }

      <!-- Navigation -->
      <app-navbar></app-navbar>

      <main class="dashboard-component__s70">
        <app-page-hint
          hintKey="dashboard_inline"
          title="Dashboard Hint"
          message="Use New Crush to add a crush. Keep notes private/public, then control who sees what from Friends > Sharing Controls.">
        </app-page-hint>

        @if (!dataService.hasLoaded()) {
          <div class="dashboard-crush-loading"
               [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               role="status"
               aria-live="polite">
            <span class="dashboard-crush-loading__spinner"
                  [style.border-color]="theme.colors().border"
                  [style.border-top-color]="theme.colors().primary"
                  aria-hidden="true">💖</span>
            <span [style.color]="theme.colors().textSecondary">Loading your crushes...</span>
          </div>
        }

        <!-- Hero Section -->
        <div class="dashboard-component__s71">
          <div class="dashboard-component__s72">
            <h2 class="dashboard-component__s73">The Rolodex</h2>
            <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s74">
              Curating {{ activeCrushCount() }} active crushes
              @if (archivedCrushCount() > 0) {
                ({{ archivedCrushCount() }} archived)
              }.
            </p>
            <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s75">
              {{ subscription.tier() }} tier: up to {{ subscription.getCrushLimit() }} crushes.
            </p>
          </div>
          <div class="dashboard-component__s76">
            <button (click)="goToFriends()"
                    [style.border]="'1px solid ' + theme.colors().accent"
                    [style.color]="theme.colors().accent"
                    class="dashboard-component__s78 dashboard-component__s78--friend">
               + Add Friend
            </button>
            <button (click)="openNewEntryModal()"
                    [style.background-color]="theme.colors().primary"
                    [style.border]="'1px solid ' + theme.colors().primary"
                    [style.color]="'#ffffff'"
                    class="dashboard-component__s78 dashboard-component__s78--primary">
               + New Crush
            </button>
          </div>
        </div>

        @if (!subscription.isPremium()) {
          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               style="border-radius: 12px; padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
              <div>
                <p style="margin: 0; font-weight: 600;">Crush Plan</p>
                <p [style.color]="theme.colors().textSecondary" style="margin: 4px 0 0 0; font-size: 0.85rem;">
                  Friends are unlimited. Plans only change crush capacity.
                </p>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button (click)="subscription.upgrade(freeTier)"
                        [style.background-color]="subscription.tier() === freeTier ? theme.colors().primary : 'transparent'"
                        [style.color]="subscription.tier() === freeTier ? 'white' : theme.colors().text"
                        [style.border]="'1px solid ' + (subscription.tier() === freeTier ? theme.colors().primary : theme.colors().border)"
                        style="padding: 6px 10px; border-radius: 8px; cursor: pointer;">
                  Free (5)
                </button>
                <button (click)="subscription.upgrade(premiumTier)"
                        [style.background-color]="subscription.tier() === premiumTier ? theme.colors().primary : 'transparent'"
                        [style.color]="subscription.tier() === premiumTier ? 'white' : theme.colors().text"
                        [style.border]="'1px solid ' + (subscription.tier() === premiumTier ? theme.colors().primary : theme.colors().border)"
                        style="padding: 6px 10px; border-radius: 8px; cursor: pointer;">
                  Premium (25)
                </button>
                <button (click)="subscription.upgrade(goldTier)"
                        [style.background-color]="subscription.tier() === goldTier ? theme.colors().primary : 'transparent'"
                        [style.color]="subscription.tier() === goldTier ? 'white' : theme.colors().text"
                        [style.border]="'1px solid ' + (subscription.tier() === goldTier ? theme.colors().primary : theme.colors().border)"
                        style="padding: 6px 10px; border-radius: 8px; cursor: pointer;">
                  Gold (100)
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Filter Chips -->
        <div class="dashboard-component__s79">
          <button (click)="selectedFilter.set('All')"
                  [style.color]="selectedFilter() === 'All' ? theme.colors().primary : theme.colors().textSecondary"
                  [style.border-bottom]="selectedFilter() === 'All' ? '2px solid ' + theme.colors().primary : 'none'"
                  class="dashboard-component__s80">All</button>
          <button (click)="selectedFilter.set('Dating')"
                  [style.color]="selectedFilter() === 'Dating' ? theme.colors().primary : theme.colors().textSecondary"
                  [style.border-bottom]="selectedFilter() === 'Dating' ? '2px solid ' + theme.colors().primary : 'none'"
                  class="dashboard-component__s81">Dating</button>
          <button (click)="selectedFilter.set('Prospects')"
                  [style.color]="selectedFilter() === 'Prospects' ? theme.colors().primary : theme.colors().textSecondary"
                  [style.border-bottom]="selectedFilter() === 'Prospects' ? '2px solid ' + theme.colors().primary : 'none'"
                  class="dashboard-component__s81">Prospects</button>
        </div>

        <!-- Grid -->
          <div class="dashboard-component__s82">
             <h2 [style.color]="theme.colors().primary" class="dashboard-rolodex-mini-title">
               {{ showArchived() ? 'Archived' : 'Active Crushes' }}
             </h2>
             <button (click)="toggleArchived()"
                     [style.color]="theme.colors().textSecondary"
                     class="dashboard-component__s83">
               {{ showArchived() ? 'View Active' : 'View Archive' }}
             </button>
          </div>

        <div class="dashboard-component__s84">
          @for (crush of displayCrushes(); track crush.id) {
            <div [routerLink]="draggingId() ? null : ['/profile', crush.id]"
                 [attr.data-crush-id]="crush.id"
                 [style.background-color]="theme.colors().cardBg"
                 [style.border]="dragOverId() === crush.id ? '2px dashed ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                 [style.opacity]="draggingId() === crush.id ? 0.5 : 1"
                 class="dashboard-component__s85">

              <!-- Shimmer Effect on Card (Light Mode) -->
              @if (theme.isPearl()) {
                <div class="dashboard-component__s86"></div>
              }

              <!-- Drag handle: press and drag to reorder crushes -->
              <button type="button"
                      class="dashboard-crush-drag-handle"
                      title="Drag to reorder"
                      aria-label="Drag to reorder this crush"
                      (pointerdown)="onDragHandlePointerDown($event, crush.id)"
                      (click)="$event.preventDefault(); $event.stopPropagation()">
                ⠿
              </button>

              <!-- Image Area -->
              <div class="dashboard-component__s87">
                <img [src]="crush.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'"
                     [alt]="getCrushDisplayName(crush) + ' profile photo'"
                     class="dashboard-component__s88">
                <div class="dashboard-component__s89"></div>
                <div class="dashboard-component__s90">
                   <span [style.background-color]="'rgba(255,255,255,0.9)'"
                         [style.color]="theme.colors().primary"
                         class="dashboard-component__s91">
                     {{ crush.status }}
                   </span>
                   @if ((crush.redFlags || 0) > 0) {
                     <button type="button"
                             (click)="$event.stopPropagation(); showRedFlagReason(crush)"
                             class="dashboard-red-flag-chip dashboard-red-flag-chip-button">
                       🚩
                     </button>
                   }
                </div>
              </div>

              <!-- Content -->
              <div class="dashboard-component__s92">
                <h3 class="dashboard-component__s93">{{ getCrushDisplayName(crush) }}</h3>

                <div [style.color]="theme.colors().accent" class="dashboard-component__s94">
                  @for (star of [1,2,3,4,5]; track star) {
                     {{ (crush.rating || 0) >= star ? '★' : '☆' }}
                  }
                </div>

                <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s95">
                  "{{ crush.bio || 'A crush waiting to be defined.' }}"
                </p>

                <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-component__s96">
                  <span [style.color]="theme.colors().textSecondary" class="dashboard-component__s97">Profile Active • {{ crush.lastInteraction | date:'MMM d' }}</span>
                </div>
              </div>
            </div>
          }

          @if (!showArchived() && displayCrushes().length > 0) {
            <button type="button"
                    (click)="openNewEntryModal()"
                    [style.border]="'2px dashed ' + theme.colors().border"
                    [style.color]="theme.colors().textSecondary"
                    class="dashboard-add-crush-ghost-card">
              <span class="dashboard-add-crush-ghost-icon" [style.color]="theme.colors().primary">✦ +</span>
              <span class="dashboard-add-crush-ghost-label">Add another crush</span>
            </button>
          }

          @if (displayCrushes().length === 0) {
            <div class="dashboard-empty-crushes">
              <span class="dashboard-empty-crushes-icon">💌</span>
              <h3 [style.color]="theme.colors().text" class="dashboard-empty-crushes-title">
                {{ showArchived() ? 'Nothing archived yet' : 'Your love life starts here' }}
              </h3>
              <p [style.color]="theme.colors().textSecondary" class="dashboard-empty-crushes-copy">
                {{ showArchived() ? 'Archived crushes will show up here.' : 'Add your first crush and start building your own little black book.' }}
              </p>
              @if (!showArchived()) {
                <button type="button"
                        (click)="openNewEntryModal()"
                        [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + ', ' + theme.colors().accent + ')'"
                        class="dashboard-empty-crushes-cta">
                  ✦ Add Your First Crush
                </button>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  readonly todayDate = new Date().toISOString().slice(0, 10);
  getCrushDisplayName(crush: CrushProfile): string {
    return crush.displayName === 'fullName' && crush.fullName?.trim()
      ? crush.fullName
      : crush.nickname;
  }
  public dataService = inject(DataService);
  public security = inject(SecurityService);
  public theme = inject(ThemeService);
  public messaging = inject(MessagingService);
  public modal = inject(ModalService);
  public subscription = inject(SubscriptionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private walkthrough = inject(WalkthroughService);
  private avatarRenderer = inject(AvatarRenderService);
  private friendsApi = inject(FriendsApiService);

  showNewEntryModal = signal(false);
  statuses = CrushStatus;

  showArchived = signal(false);
  selectedFilter = signal<'All' | 'Dating' | 'Prospects'>('All');
  freeTier = SubscriptionTier.Free;
  premiumTier = SubscriptionTier.Premium;
  goldTier = SubscriptionTier.Gold;

  pronounOptions: Array<{label: string, value: 'he' | 'she' | 'they'}> = [
    {label: 'He/Him', value: 'he'},
    {label: 'She/Her', value: 'she'},
    {label: 'They/Them', value: 'they'}
  ];

  schoolOrWorkOptions: Array<{label: string, value: 'school' | 'working' | 'both' | 'neither'}> = [
    {label: 'In school', value: 'school'},
    {label: 'Working', value: 'working'},
    {label: 'Both', value: 'both'},
    {label: 'Neither', value: 'neither'}
  ];

  filteredCrushes = computed(() => {
    let crushes = this.dataService.visibleCrushes();
    crushes = this.sortByOrder(crushes);

    if (this.showArchived()) {
      return crushes.filter((c: any) => c.status === CrushStatus.Archived);
    }

    // Filter by Archive first
    crushes = crushes.filter((c: any) => c.status !== CrushStatus.Archived);

    // Apply category filters
    const filter = this.selectedFilter();
    if (filter === 'Dating') {
      return crushes.filter((c: any) => c.status === CrushStatus.Dating || c.status === CrushStatus.Exclusive);
    } else if (filter === 'Prospects') {
      return crushes.filter((c: any) => c.status === CrushStatus.Crush || c.status === CrushStatus.Plotting);
    }

    return crushes;
  });

  private sortByOrder(crushes: any[]): any[] {
    return [...crushes].sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return 0;
    });
  }

  // --- Drag-and-drop crush reordering ---
  draggingId = signal<string | null>(null);
  dragOverId = signal<string | null>(null);
  private orderedVisibleIds = signal<string[]>([]);
  private dragPointerId: number | null = null;
  private boundPointerMove = (e: PointerEvent) => this.onDragPointerMove(e);
  private boundPointerUp = (e: PointerEvent) => this.onDragPointerUp(e);

  /** While dragging, shows the live-reordered list; otherwise mirrors filteredCrushes(). */
  displayCrushes = computed(() => {
    const dragging = this.draggingId();
    if (!dragging) return this.filteredCrushes();

    const byId = new Map(this.filteredCrushes().map((c: any) => [c.id, c]));
    return this.orderedVisibleIds()
      .map((id) => byId.get(id))
      .filter((c): c is any => !!c);
  });

  onDragHandlePointerDown(event: PointerEvent, crushId: string): void {
    event.preventDefault();
    event.stopPropagation();

    this.dragPointerId = event.pointerId;
    this.orderedVisibleIds.set(this.filteredCrushes().map((c: any) => c.id));
    this.draggingId.set(crushId);
    this.dragOverId.set(crushId);

    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
  }

  private onDragPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.dragPointerId) return;

    const target = document.elementFromPoint(event.clientX, event.clientY);
    const card = target?.closest('[data-crush-id]') as HTMLElement | null;
    if (!card) return;

    const overId = card.getAttribute('data-crush-id');
    const draggedId = this.draggingId();
    if (!overId || !draggedId || overId === draggedId) return;

    this.dragOverId.set(overId);

    const ids = [...this.orderedVisibleIds()];
    const fromIndex = ids.indexOf(draggedId);
    const toIndex = ids.indexOf(overId);
    if (fromIndex === -1 || toIndex === -1) return;

    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggedId);
    this.orderedVisibleIds.set(ids);
  }

  private onDragPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.dragPointerId) return;

    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    this.dragPointerId = null;

    const finalVisibleOrder = this.orderedVisibleIds();
    const draggedId = this.draggingId();
    this.draggingId.set(null);
    this.dragOverId.set(null);

    if (!draggedId || finalVisibleOrder.length === 0) return;

    // Merge the new order of the *visible* (filtered) subset back into the
    // full crush list, preserving the relative position of any crushes not
    // currently shown (e.g. hidden by the Dating/Prospects filter or archive).
    const fullSorted = this.sortByOrder(this.dataService.getAllCrushes()());
    const visibleSet = new Set(finalVisibleOrder);
    const visiblePositions = fullSorted
      .map((c: any, index: number) => (visibleSet.has(c.id) ? index : -1))
      .filter((index) => index !== -1);

    const fullIds = fullSorted.map((c: any) => c.id);
    visiblePositions.forEach((position, i) => {
      fullIds[position] = finalVisibleOrder[i];
    });

    this.dataService.reorderCrushes(fullIds);
  }

  activeCrushCount = computed(() =>
    this.dataService.getAllCrushes()().filter((c: any) => c.status !== CrushStatus.Archived).length
  );
  archivedCrushCount = computed(() =>
    this.dataService.getAllCrushes()().filter((c: any) => c.status === CrushStatus.Archived).length
  );

  friends = signal<FriendSummary[]>([]);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  newCrush = {
    nickname: '',
    firstName: '',
    status: CrushStatus.Crush,
    initialRating: 3,
    currentRating: null as number | null,
    note: '',
    noteVisibility: 'private' as 'private' | 'public',
    visibility: [] as string[],
    avatarUrl: '',
    avatarConfig: undefined as AvatarConfig | undefined,
    pronouns: 'they' as 'he' | 'she' | 'they',
    hair: [] as string[],
    eyes: [] as string[],
    build: [] as string[],
    social: {
      snapchat: '',
      whatsapp: '',
      twitter: '',
      facebook: '',
      instagram: ''
    },
    relationshipStatus: '',
    heartbreakSong: '',
    heartbreakRecovery: '',
    hairNotes: '',
    eyeNotes: '',
    buildNotes: '',
    relationshipNotes: '',
    bio: '',
    location: '',
    dateOfBirth: '',
    age: undefined as number | undefined,
    howWeMet: '',
    whenWeMet: '',
    schoolOrWork: '' as '' | 'school' | 'working' | 'both' | 'neither',
    grade: '',
    occupation: '',
    family: '',
    friends: '',
    memorableMoments: '',
    privateNotes: ''
  };

  ngOnInit() {
    this.dataService.setViewer(null);
    void this.messaging.loadConversationSummaries();
    void this.loadFriends();
    this.refreshTimer = setInterval(() => {
      void this.messaging.loadConversationSummaries();
    }, 10000);
    setTimeout(() => {
      void this.walkthrough.startFirstLogin();
    }, 150);

    // Lets other pages (e.g. the user's own profile page's "+ Add New
    // Crush" link) deep-link straight into this same New Crush modal
    // instead of just dropping the user on the dashboard and making them
    // find/click the button themselves.
    if (this.route.snapshot.queryParamMap.get('newCrush') === '1') {
      setTimeout(() => this.openNewEntryModal(), 0);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { newCrush: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  private async loadFriends(): Promise<void> {
    if (!this.security.currentUserId()) {
      this.friends.set([]);
      return;
    }
    try {
      this.friends.set(await this.friendsApi.listFriends());
    } catch {
      this.friends.set([]);
    }
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  getRelationshipStatusOptions(): string[] {
    const pronoun = this.newCrush.pronouns || 'they';
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
      "Seeing where it goes (more than friends, haven't DTR)",
      "Heartbroken",
      `I think ${subject} ${likes} me`,
      "Getting serious",
      "We are a couple",
      "Friends With Benefits",
      "We are engaged",
      "Other"
    ];
  }

  toggleArchived() {
    this.showArchived.update(v => !v);
  }

  goToFriends() {
    this.router.navigate(['/friends'], { queryParams: { tab: 'find' } });
  }

  showRedFlagReason(crush: any) {
    const reason = (crush.redFlagReason || '').trim();
    if (!reason) {
      this.modal.show('This crush has one red flag, but no reason was saved yet.');
      return;
    }

    this.modal.show(`Red flag reason: ${reason}`);
  }

  openNewEntryModal() {
    const crushLimit = this.subscription.getCrushLimit();
    if (!this.subscription.checkLimit(this.activeCrushCount())) {
      this.modal.show(`${this.subscription.tier()} tier allows up to ${crushLimit} active crushes. Archive one or upgrade to add more.`);
      return;
    }
    this.showNewEntryModal.set(true);
  }

  closeModal() {
    this.showNewEntryModal.set(false);
    this.resetForm();
  }

  toggleSelection(list: string[], item: string) {
    const index = list.indexOf(item);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(item);
    }
  }

  selectSchoolOrWork(value: 'school' | 'working' | 'both' | 'neither') {
    this.newCrush.schoolOrWork = value;
  }

  shouldShowGrade(): boolean {
    return !this.newCrush.schoolOrWork || this.newCrush.schoolOrWork === 'school' || this.newCrush.schoolOrWork === 'both';
  }

  shouldShowOccupation(): boolean {
    return !this.newCrush.schoolOrWork || this.newCrush.schoolOrWork === 'working' || this.newCrush.schoolOrWork === 'both';
  }

  async saveCrush() {
    const crushLimit = this.subscription.getCrushLimit();
    if (!this.subscription.checkLimit(this.activeCrushCount())) {
      this.modal.show(`${this.subscription.tier()} tier allows up to ${crushLimit} active crushes. Archive one or upgrade to add more.`);
      return;
    }

    if (!this.newCrush.nickname) {
      this.modal.show('Please enter a nickname at least!');
      return;
    }
    if (!this.security.moderateContent(this.newCrush.nickname) ||
        !this.security.moderateContent(this.newCrush.firstName) ||
        !this.security.moderateContent(this.newCrush.note) ||
        !this.security.moderateContent(this.newCrush.privateNotes)) {
      this.modal.show('Profile text flagged by AI moderation.');
      return;
    }

    // Combine all "Other" notes into customNotes
    let customNotes = '';
    if (this.newCrush.hairNotes) customNotes += `Other: Hair - ${this.newCrush.hairNotes}\n`;
    if (this.newCrush.eyeNotes) customNotes += `Other: Eyes - ${this.newCrush.eyeNotes}\n`;
    if (this.newCrush.buildNotes) customNotes += `Other: Build - ${this.newCrush.buildNotes}\n`;
    if (this.newCrush.relationshipNotes) customNotes += `Other: Relationship - ${this.newCrush.relationshipNotes}\n`;
    if (this.newCrush.privateNotes) customNotes += this.newCrush.privateNotes;

    if (!this.newCrush.avatarUrl) {
      // No picture chosen: give them a preset that stays stable for this nickname.
      this.newCrush.avatarConfig = this.avatarRenderer.presetFor(this.newCrush.nickname);
      this.newCrush.avatarUrl = await this.avatarRenderer.render(this.newCrush.avatarConfig, 256);
    }

    const createdCrush = this.dataService.addCrush({
      nickname: this.newCrush.nickname,
      fullName: this.newCrush.firstName,
      status: this.newCrush.status,
      rating: this.newCrush.currentRating ?? this.newCrush.initialRating,
      initialRating: this.newCrush.initialRating,
      bio: this.newCrush.bio,
      visibility: [],
      avatarUrl: this.newCrush.avatarUrl,
      avatarConfig: this.newCrush.avatarConfig,
      pronouns: this.newCrush.pronouns,
      hair: this.newCrush.hair,
      eyes: this.newCrush.eyes,
      build: this.newCrush.build,
      social: { ...this.newCrush.social },
      relationshipStatus: this.newCrush.relationshipStatus,
      heartbreakSong: this.newCrush.heartbreakSong,
      heartbreakRecovery: this.newCrush.heartbreakRecovery,
      customNotes: customNotes.trim(),
      location: this.newCrush.location,
      dateOfBirth: this.newCrush.dateOfBirth || undefined,
      age: this.newCrush.age,
      howWeMet: this.newCrush.howWeMet,
      whenWeMet: this.newCrush.whenWeMet,
      grade: this.newCrush.grade,
      occupation: this.newCrush.occupation,
      family: this.newCrush.family,
      memorableMoments: this.newCrush.memorableMoments,
      friends: this.newCrush.friends ? this.newCrush.friends.split(',').map((f: string) => f.trim()).filter((f: string) => f) : []
    });

    const note = this.newCrush.note.trim();
    if (note) {
      this.dataService.addEntry({
        crushId: createdCrush.id,
        type: 'Note',
        content: note,
        isBurnAfterReading: false,
        visibility: this.newCrush.noteVisibility === 'public' ? ['public'] : [],
        isSensitive: false
      });
    }

    this.closeModal();

    // First crush ever: guide them through sharing it with a friend.
    if (this.dataService.getAllCrushes()().length === 1) {
      this.walkthrough.start(FIRST_CRUSH_SHARE_TOUR_KEY, FIRST_CRUSH_SHARE_TOUR);
    }
  }

  resetForm() {
    this.newCrush = {
      nickname: '',
      firstName: '',
      status: CrushStatus.Crush,
      initialRating: 3,
      currentRating: null,
      note: '',
      noteVisibility: 'private',
      visibility: [],
      avatarUrl: '',
    avatarConfig: undefined as AvatarConfig | undefined,
      pronouns: 'they',
      hair: [],
      eyes: [],
      build: [],
      social: {
        snapchat: '',
        whatsapp: '',
        twitter: '',
        facebook: '',
        instagram: ''
      },
      relationshipStatus: '',
      heartbreakSong: '',
      heartbreakRecovery: '',
      hairNotes: '',
      eyeNotes: '',
      buildNotes: '',
      relationshipNotes: '',
      bio: '',
      location: '',
      dateOfBirth: '',
      age: undefined,
      howWeMet: '',
      whenWeMet: '',
      schoolOrWork: '',
      grade: '',
      occupation: '',
      family: '',
      friends: '',
      memorableMoments: '',
      privateNotes: ''
    };
  }
}
