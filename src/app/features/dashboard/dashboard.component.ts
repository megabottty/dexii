import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { CrushStatus } from '../../core/models/crush-profile.model';
import { SubscriptionTier } from '../../core/models/user.model';

import { NavbarComponent } from '../../core/components/navbar/navbar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  styleUrl: './dashboard.component.css',
  imports: [CommonModule, RouterModule, FormsModule, PageHintComponent, NavbarComponent],
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

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">Avatar (Optional)</label>
                <div class="dashboard-component__s8">
                  <button (click)="avatarUpload.click()" [style.border]="'1px solid ' + theme.colors().primary"
                          [style.color]="theme.colors().primary"
                          class="dashboard-component__s9">
                    Upload Photo
                  </button>
                  <input #avatarUpload type="file" accept="image/*" (change)="onAvatarFileSelected($event)" class="dashboard-component__s10">
                  @if (uploadedAvatarName()) {
                    <span [style.color]="theme.colors().textSecondary" class="dashboard-component__s11">{{ uploadedAvatarName() }}</span>
                  }
                </div>

                @if (newCrush.avatarUrl) {
                  <div class="dashboard-component__s12">
                    <img [src]="newCrush.avatarUrl" alt="Selected avatar preview" [style.border]="'1px solid ' + theme.colors().border"
                         class="dashboard-component__s13">
                    @if (cropSourceImage()) {
                      <button (click)="showCropModal.set(true)" [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().text"
                              class="dashboard-component__s14">
                        Re-Crop
                      </button>
                    }
                  </div>
                }

                <div class="dashboard-component__s15">
                   @for (avatar of mockAvatars; track avatar) {
                     <img [src]="avatar" [alt]="'Avatar option ' + ($index + 1)" (click)="newCrush.avatarUrl = avatar"
                          role="button"
                          tabindex="0"
                          (keydown.enter)="newCrush.avatarUrl = avatar"
                          (keydown.space)="newCrush.avatarUrl = avatar; $event.preventDefault()"
                          [style.border]="newCrush.avatarUrl === avatar ? '2px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                          class="dashboard-component__s16">
                   }
                </div>
                <div style="margin-top: 10px;">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Avatar URL (Optional)</label>
                  <input [(ngModel)]="newCrush.avatarUrl"
                         [style.background-color]="theme.colors().bgSecondary"
                         [style.border]="'1px solid ' + theme.colors().border"
                         [style.color]="theme.colors().text"
                         class="dashboard-component__s17"
                         placeholder="https://...">
                </div>
              </div>

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
                  <option [value]="statuses.Crushing">Crushing</option>
                  <option [value]="statuses.Dating">Dating</option>
                  <option [value]="statuses.Exclusive">Exclusive</option>
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
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s41" style="margin-top: 10px; display: block;">Current Vibe (1-5 Stars)</label>
                <div class="dashboard-component__s42">
                  @for (star of [1,2,3,4,5]; track star) {
                    <button type="button" (click)="newCrush.currentRating = star" [attr.aria-label]="'Set current vibe to ' + star + ' stars'"
                            [style.color]="newCrush.currentRating >= star ? theme.colors().accent : theme.colors().border" class="dashboard-rating-star">★</button>
                  }
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
                  <input type="number" [(ngModel)]="newCrush.age" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
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
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Grade</label>
                  <input [(ngModel)]="newCrush.grade" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Occupation</label>
                  <input [(ngModel)]="newCrush.occupation" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
                </div>

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

      @if (showCropModal() && cropSourceImage()) {
        <div class="dashboard-component__s44">
          <div [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border"
               class="dashboard-component__s45">
            <h3 class="dashboard-component__s46">Crop Avatar</h3>
            <div [style.background-color]="theme.colors().bgSecondary" class="dashboard-component__s47">
              <div class="dashboard-component__s48">
                <img [src]="cropSourceImage()!" alt="Avatar crop preview"
                     [style.transform]="cropTransform()"
                     class="dashboard-component__s49">
              </div>
            </div>
            <div class="dashboard-component__s50">
              <label class="dashboard-component__s51">
                Zoom
                <input type="range" min="1" max="3" step="0.05" [value]="cropZoom()" (input)="cropZoom.set(toNumber($event, 1.5))" class="dashboard-component__s52">
              </label>
              <label class="dashboard-component__s51">
                Horizontal
                <input type="range" min="-120" max="120" step="1" [value]="cropOffsetX()" (input)="cropOffsetX.set(toNumber($event, 0))" class="dashboard-component__s52">
              </label>
              <label class="dashboard-component__s51">
                Vertical
                <input type="range" min="-120" max="120" step="1" [value]="cropOffsetY()" (input)="cropOffsetY.set(toNumber($event, 0))" class="dashboard-component__s52">
              </label>
            </div>
            <div class="dashboard-component__s53">
              <button (click)="cancelCrop()" [style.border]="'1px solid ' + theme.colors().border"
                      class="dashboard-component__s54">
                Cancel
              </button>
              <button (click)="applyCrop()" [style.background-color]="theme.colors().primary"
                      class="dashboard-component__s55">
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Digital Note Passing Overlay (Simulation) -->
      @if (isNotePassing()) {
        <div class="dashboard-component__s56">
          <div (click)="closeNote()"
               role="button"
               tabindex="0"
               (keydown.enter)="closeNote()"
               (keydown.space)="closeNote(); $event.preventDefault()"
                [style.background-color]="theme.colors().bgSecondary"
                [style.border]="'2px solid ' + theme.colors().primary"
                class="dashboard-component__s57">
             <span [style.color]="theme.colors().primary" class="dashboard-component__s58">Private Note Received</span>
             <p class="dashboard-component__s59">"{{ currentTeaPreview() || 'No new tea right now.' }}"</p>
           </div>
        </div>
      }

      <!-- Glamour Decorative Elements -->
      @if (theme.mode() === 'light') {
        <div class="dashboard-component__s60"></div>
      }

      <!-- Navigation -->
      <app-navbar></app-navbar>

      <main class="dashboard-component__s70">
        <app-page-hint
          hintKey="dashboard_inline"
          title="Dashboard Hint"
          message="Use New Entry to add a crush. Keep notes private/public, then control who sees what from Friends > Sharing Controls.">
        </app-page-hint>

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
            <button (click)="simulateNote()"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    class="dashboard-component__s77">
               Waiting for the Tea? {{ unreadTeaCount() > 0 ? '(' + unreadTeaCount() + ')' : '' }}
            </button>
            <button (click)="openNewEntryModal()" [style.border]="'1px solid ' + theme.colors().primary"
                    [style.color]="theme.colors().primary"
                    class="dashboard-component__s78">
               + New Entry
            </button>
          </div>
        </div>

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
             <h2 [style.color]="theme.colors().primary" class="dashboard-rolodex-mini-title">The Rolodex</h2>
             <button (click)="toggleArchived()"
                     [style.color]="theme.colors().textSecondary"
                     class="dashboard-component__s83">
               {{ showArchived() ? 'View Active' : 'View Archive' }}
             </button>
          </div>

        <div class="dashboard-component__s84">
          @for (crush of filteredCrushes(); track crush.id) {
            <div [routerLink]="['/profile', crush.id]"
                 [style.background-color]="theme.colors().cardBg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="dashboard-component__s85">

              <!-- Shimmer Effect on Card (Light Mode) -->
              @if (theme.mode() === 'light') {
                <div class="dashboard-component__s86"></div>
              }

              <!-- Image Area -->
              <div class="dashboard-component__s87">
                <img [src]="crush.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'"
                     [alt]="crush.nickname + ' profile photo'"
                     class="dashboard-component__s88">
                <div class="dashboard-component__s89"></div>
                <div class="dashboard-component__s90">
                   <span [style.background-color]="'rgba(255,255,255,0.9)'"
                         [style.color]="theme.colors().primary"
                         class="dashboard-component__s91">
                     {{ crush.status }}
                   </span>
                   <span *ngIf="crush.redFlags > 0" class="dashboard-red-flag-chip">
                     {{ crush.redFlags }} Flags
                   </span>
                </div>
              </div>

              <!-- Content -->
              <div class="dashboard-component__s92">
                <h3 class="dashboard-component__s93">{{ crush.nickname }}</h3>

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
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  public dataService = inject(DataService);
  public security = inject(SecurityService);
  public theme = inject(ThemeService);
  public messaging = inject(MessagingService);
  public modal = inject(ModalService);
  public subscription = inject(SubscriptionService);

  isNotePassing = signal(false);
  currentTeaPreview = signal('');
  showNewEntryModal = signal(false);
  showCropModal = signal(false);
  statuses = CrushStatus;
  uploadedAvatarName = signal('');
  cropSourceImage = signal<string | null>(null);
  cropZoom = signal(1);
  cropOffsetX = signal(0);
  cropOffsetY = signal(0);

  mockAvatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo'
  ];

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

  filteredCrushes = computed(() => {
    let crushes = this.dataService.visibleCrushes();

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
      return crushes.filter((c: any) => c.status === CrushStatus.Crush);
    }

    return crushes;
  });
  activeCrushCount = computed(() =>
    this.dataService.getAllCrushes()().filter((c: any) => c.status !== CrushStatus.Archived).length
  );
  archivedCrushCount = computed(() =>
    this.dataService.getAllCrushes()().filter((c: any) => c.status === CrushStatus.Archived).length
  );

  unreadTeaCount = computed(() => this.messaging.getUnreadForUser('me').length);

  newCrush = {
    nickname: '',
    firstName: '',
    status: CrushStatus.Crush,
    initialRating: 3,
    currentRating: 3,
    note: '',
    noteVisibility: 'private' as 'private' | 'public',
    visibility: [] as string[],
    avatarUrl: '',
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
    age: undefined as number | undefined,
    howWeMet: '',
    whenWeMet: '',
    grade: '',
    occupation: '',
    family: '',
    friends: '',
    memorableMoments: '',
    privateNotes: ''
  };

  ngOnInit() {
    this.dataService.setViewer(null);
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

  simulateNote() {
    const latestUnread = this.messaging.getLatestUnreadForUser('me');
    if (latestUnread) {
      this.currentTeaPreview.set(latestUnread.content);
      this.messaging.markUnreadForUserAsRead('me');
    } else {
      this.currentTeaPreview.set('No unread private tea at the moment.');
    }
    this.isNotePassing.set(true);
  }

  closeNote() {
    this.isNotePassing.set(false);
    this.currentTeaPreview.set('');
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
    this.cancelCrop();
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

  saveCrush() {
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
    if (this.newCrush.hairNotes) customNotes += `Hair: ${this.newCrush.hairNotes}\n`;
    if (this.newCrush.eyeNotes) customNotes += `Eyes: ${this.newCrush.eyeNotes}\n`;
    if (this.newCrush.buildNotes) customNotes += `Build: ${this.newCrush.buildNotes}\n`;
    if (this.newCrush.relationshipNotes) customNotes += `Relationship: ${this.newCrush.relationshipNotes}\n`;
    if (this.newCrush.privateNotes) customNotes += this.newCrush.privateNotes;

    const createdCrush = this.dataService.addCrush({
      nickname: this.newCrush.nickname,
      fullName: this.newCrush.firstName,
      status: this.newCrush.status,
      rating: this.newCrush.currentRating,
      initialRating: this.newCrush.initialRating,
      bio: this.newCrush.bio,
      visibility: [],
      avatarUrl: this.newCrush.avatarUrl || `https://i.pravatar.cc/150?u=${this.newCrush.nickname}`, // Fallback avatar
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
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.modal.show('Please upload an image file.');
      return;
    }

    this.uploadedAvatarName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      this.cropSourceImage.set(result);
      this.cropZoom.set(1);
      this.cropOffsetX.set(0);
      this.cropOffsetY.set(0);
      this.showCropModal.set(true);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  cropTransform(): string {
    return `translate(${this.cropOffsetX()}px, ${this.cropOffsetY()}px) scale(${this.cropZoom()})`;
  }

  toNumber(event: Event, fallback: number): number {
    const target = event.target as HTMLInputElement | null;
    if (!target) return fallback;
    const parsed = Number(target.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  cancelCrop() {
    this.showCropModal.set(false);
  }

  applyCrop() {
    const source = this.cropSourceImage();
    if (!source) return;

    const image = new Image();
    image.onload = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coverScale = Math.max(size / image.width, size / image.height);
      const scale = coverScale * this.cropZoom();
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const dx = (size - drawWidth) / 2 + this.cropOffsetX();
      const dy = (size - drawHeight) / 2 + this.cropOffsetY();

      ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

      this.newCrush.avatarUrl = canvas.toDataURL('image/jpeg', 0.85);
      this.showCropModal.set(false);
    };
    image.src = source;
  }

  resetForm() {
    this.newCrush = {
      nickname: '',
      firstName: '',
      status: CrushStatus.Crush,
      initialRating: 3,
      currentRating: 3,
      note: '',
      noteVisibility: 'private',
      visibility: [],
      avatarUrl: '',
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
      age: undefined,
      howWeMet: '',
      whenWeMet: '',
      grade: '',
      occupation: '',
      family: '',
      friends: '',
      memorableMoments: '',
      privateNotes: ''
    };
    this.uploadedAvatarName.set('');
    this.cropSourceImage.set(null);
    this.cropZoom.set(1);
    this.cropOffsetX.set(0);
    this.cropOffsetY.set(0);
  }
}
