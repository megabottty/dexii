import { AppSelectComponent } from '../../core/components/app-select/app-select.component';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FocusTrapDirective } from '../../core/a11y/focus-trap.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ThemeService, ThemeMode, CustomThemeColors } from '../../core/services/theme.service';
import { ModalService } from '../../core/services/modal.service';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { SubscriptionTier } from '../../core/models/user.model';
import { SubscriptionService } from '../../core/services/subscription.service';
import { FriendsApiService } from '../../core/services/friends-api.service';
import { UserSettings, UserSettingsService } from '../../core/services/user-settings.service';
import { InstallPromptService } from '../../core/services/install-prompt.service';
import { WebPushService } from '../../core/services/web-push.service';
import { NotificationSetupComponent } from '../../core/components/notification-setup/notification-setup.component';
import { AvatarPickerComponent } from '../../core/components/avatar-picker/avatar-picker.component';
import { PersonNamePipe, selfName } from '../../core/utils/person-name';
import { AppUpdateService } from '../../core/services/app-update.service';
import { FeatureGateService } from '../../core/services/feature-gate.service';
import { PARKED_FEATURES_ENABLED, PREMIUM_FEATURES, PremiumFeatureKey } from '../../core/config/premium-features';
import { UpgradePromptComponent } from '../../core/components/upgrade-prompt/upgrade-prompt.component';
import { ActivatedRoute } from '@angular/router';

interface FriendChoice {
  id: string;
  username: string;
  avatarUrl?: string;
  friendCategories?: string[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, PageHintComponent, AvatarPickerComponent, UpgradePromptComponent, NotificationSetupComponent, FocusTrapDirective, AppSelectComponent, PersonNamePipe],
  styleUrl: './settings.component.css',
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="settings-page">
      <app-navbar></app-navbar>

      <main class="settings-shell">
        <app-page-hint
          hintKey="settings_inline"
          title="Settings"
          message="Edit your profile, photo, and journal defaults from one place.">
        </app-page-hint>

        <!-- Same look as a friend's profile (DEX-72): a full-width photo with your name over it,
             and a camera button to change the photo. -->
        <div [style.background-color]="theme.colors().cardBg"
             [style.border]="'1px solid ' + theme.colors().border"
             class="settings-hero">
          <div class="settings-hero__media" [style.background-color]="theme.colors().primary">
            @if (settings.settings().avatarUrl) {
              <img [src]="settings.settings().avatarUrl" alt="" class="settings-hero__photo">
            } @else {
              <div class="settings-hero__photo settings-hero__photo--empty" aria-hidden="true">{{ selfName(settings.settings().displayName, username()).replace('@', '').charAt(0).toUpperCase() }}</div>
            }
            <div class="settings-hero__shade"></div>
            <button type="button"
                    (click)="togglePhotoPicker()"
                    [attr.aria-expanded]="photoPickerOpen()"
                    aria-controls="settings-photo-picker"
                    aria-label="Change your photo"
                    title="Change your photo"
                    class="settings-hero__camera">📷</button>
            <div class="settings-hero__name-row">
              <h1 class="settings-hero__name">{{ selfName(settings.settings().displayName, username()) }}</h1>
              <p class="settings-hero__username">@{{ username() }}</p>
            </div>
          </div>
        </div>

        <section [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="settings-card">
          @if (lockedFeature(); as locked) {
            @if (subscription.tierGatingEnabled || locked === 'manageSuperAdmins') {
              <div class="settings-locked-banner">
                <app-upgrade-prompt [feature]="locked" [compact]="true"></app-upgrade-prompt>
              </div>
            }
          }

          <div class="settings-actions">
            <button (click)="saveChanges()"
                    [style.background-color]="theme.colors().primary"
                    class="settings-photo-btn settings-action-btn"
                    type="button">
              {{ saveMessage() || 'Save Changes' }}
            </button>
            <button (click)="settings.resetSettings()"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().textSecondary"
                    class="settings-reset-btn settings-action-btn">
              Reset Defaults
            </button>
          </div>

          @if (photoPickerOpen()) {
            <div id="settings-photo-picker"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.background-color]="theme.colors().bg"
                 class="settings-photo-picker">
              <app-avatar-picker label="Profile photo"
                                 [initial]="selfName(settings.settings().displayName, username()).replace('@', '')"
                                 [url]="settings.settings().avatarUrl || ''"
                                 (urlChange)="onPhotoChange('avatarUrl', $event)"
                                 [config]="settings.settings().avatarConfig"
                                 (configChange)="onPhotoChange('avatarConfig', $event)"></app-avatar-picker>
              <p [style.color]="theme.colors().textSecondary" class="settings-photo-picker-note">
                {{ photoSyncMessage() || 'Your photo saves on its own as soon as you pick it.' }}
              </p>
            </div>
          }

          <div class="settings-grid">
            <label class="settings-field">
              Display Name
              <input [value]="settings.settings().displayName"
                     (input)="update('displayName', inputValue($event))"
                     [style.background-color]="theme.colors().bg"
                     [style.border]="'1px solid ' + theme.colors().border"
                     [style.color]="theme.colors().text">
            </label>

            <label class="settings-field">
              Email
              <!-- The account email: shown, not edited. Changing it would need a verification flow of its own. -->
              <input type="email"
                     [value]="settings.settings().email || ''"
                     readonly
                     aria-readonly="true"
                     class="settings-input--readonly"
                     [style.background-color]="theme.colors().bgSecondary"
                     [style.border]="'1px solid ' + theme.colors().border"
                     [style.color]="theme.colors().textSecondary">
              <span [style.color]="theme.colors().textSecondary" class="settings-field-hint">Tied to your account and used to sign in, so it can't be changed here.</span>
            </label>

            <label class="settings-field settings-field--full">
              Bio
              <textarea [value]="settings.settings().bio"
                        (input)="update('bio', inputValue($event))"
                        rows="3"
                        [style.background-color]="theme.colors().bg"
                        [style.border]="'1px solid ' + theme.colors().border"
                        [style.color]="theme.colors().text"></textarea>
            </label>
          </div>

          <div class="settings-divider"></div>

          <div class="settings-grid">
            <div class="settings-field">
              <span>Relationship Status</span>
              <div class="settings-chip-list">
                @for (option of relationshipStatusOptions; track option.value) {
                  <div (click)="selectRelationshipStatus(option.value)"
                       role="button"
                       tabindex="0"
                       (keydown.enter)="selectRelationshipStatus(option.value)"
                       (keydown.space)="selectRelationshipStatus(option.value); $event.preventDefault()"
                       [attr.aria-pressed]="settings.settings().relationshipStatus === option.value"
                       [style.border]="settings.settings().relationshipStatus === option.value ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                       [style.background-color]="settings.settings().relationshipStatus === option.value ? theme.colors().primary + '10' : 'transparent'"
                       class="settings-chip">
                    <div [style.border]="'2px solid ' + (settings.settings().relationshipStatus === option.value ? theme.colors().primary : theme.colors().textSecondary)"
                         [style.background-color]="settings.settings().relationshipStatus === option.value ? theme.colors().primary : 'transparent'"
                         class="settings-chip-indicator">
                      @if (settings.settings().relationshipStatus === option.value) {
                        <span class="settings-chip-check">✓</span>
                      }
                    </div>
                    <span class="settings-chip-label">{{ option.label }}</span>
                  </div>
                }
              </div>
            </div>

            <label class="settings-field">
              Looking For
              <app-select ariaLabel="Looking for" [options]="lookingForOptions" [value]="settings.settings().lookingFor" (valueChange)="update('lookingFor', $any($event) || '')"></app-select>
            </label>

            <label class="settings-field">
              Interested In
              <app-select ariaLabel="Interested in" [options]="interestedInOptions" [value]="settings.settings().interestedIn" (valueChange)="update('interestedIn', $any($event) || '')"></app-select>
            </label>

            <label class="settings-field">
              Love Language
              <app-select ariaLabel="Love language" [options]="loveLanguageOptions" [value]="settings.settings().loveLanguage" (valueChange)="update('loveLanguage', $any($event) || '')"></app-select>
            </label>

            <label class="settings-field settings-field--full">
              My Ideal Date
              <textarea [value]="settings.settings().idealDate"
                        (input)="update('idealDate', inputValue($event))"
                        rows="2"
                        [style.background-color]="theme.colors().bg"
                        [style.border]="'1px solid ' + theme.colors().border"
                        [style.color]="theme.colors().text"></textarea>
            </label>
          </div>

          <div class="settings-divider"></div>

          <div class="settings-grid">
            <label class="settings-field">
              Journal Title
              <input [value]="settings.settings().journalTitle"
                     (input)="update('journalTitle', inputValue($event))"
                     [style.background-color]="theme.colors().bg"
                     [style.border]="'1px solid ' + theme.colors().border"
                     [style.color]="theme.colors().text">
            </label>

            <label class="settings-field settings-field--full">
              Journal Prompt
              <textarea [value]="settings.settings().journalPrompt"
                        (input)="update('journalPrompt', inputValue($event))"
                        rows="3"
                        [style.background-color]="theme.colors().bg"
                        [style.border]="'1px solid ' + theme.colors().border"
                        [style.color]="theme.colors().text"></textarea>
            </label>

            <label class="settings-field">
              Profile Visibility
              <app-select ariaLabel="Profile visibility" [options]="profileVisibilityOptions" [value]="settings.settings().profileVisibility" (valueChange)="update('profileVisibility', $any($event))"></app-select>
              @if (settings.settings().profileVisibility === 'Selected friends') {
                <button (click)="openFriendPicker()"
                        [style.border]="'1px solid ' + theme.colors().primary"
                        [style.color]="theme.colors().onBgPrimary"
                        class="settings-photo-btn settings-photo-btn--ghost"
                        type="button">
                  Choose Friends ({{ settings.settings().selectedFriendIds.length }})
                </button>
              }
            </label>
          </div>

          <div class="settings-toggles">
            <label class="settings-toggle">
              <input type="checkbox"
                     [checked]="settings.settings().weeklySummary"
                     (change)="update('weeklySummary', checkedValue($event))">
              Weekly summary nudges
            </label>
            <label class="settings-toggle">
              <input type="checkbox"
                     [checked]="settings.settings().shareWithFriends"
                     (change)="update('shareWithFriends', checkedValue($event))">
              Share journal updates with friends
            </label>
            <label class="settings-toggle">
              <input type="checkbox"
                     [checked]="settings.settings().showUsername"
                     (change)="update('showUsername', checkedValue($event))">
              Show username in app headers
            </label>
            @if (parkedFeaturesEnabled) {
              <label class="settings-toggle">
                <input type="checkbox"
                       [checked]="settings.settings().defaultSafetyCheck"
                       (change)="update('defaultSafetyCheck', checkedValue($event))">
                Default safety check on updates
              </label>
            }
            <label class="settings-toggle">
              <input type="checkbox"
                     [checked]="settings.settings().allowInvites"
                     (change)="update('allowInvites', checkedValue($event))">
              Allow friend invites
            </label>
          </div>

          <div class="settings-divider"></div>

          <section id="theme" class="settings-plan-section">
            <div class="settings-plan-header">
              <div>
                <p [style.color]="theme.colors().textSecondary" class="settings-eyebrow">Appearance</p>
                <h2 class="settings-section-title">Theme</h2>
                <p [style.color]="theme.colors().textSecondary" class="settings-plan-copy">
                  Your current look. Tap to see every theme.
                </p>
              </div>
            </div>

            <!-- Collapsed to the current theme (DEX-66). The lock marks themes as a paid extra later;
                 for user testing it opens for everyone. -->
            <button type="button"
                    (click)="themesOpen.set(!themesOpen())"
                    [attr.aria-expanded]="themesOpen()"
                    aria-controls="theme-options"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    class="settings-theme-current">
              <span class="settings-theme-preview">
                <span class="settings-theme-swatch" [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border"></span>
                <span class="settings-theme-swatch" [style.background-color]="theme.colors().primary"></span>
                <span class="settings-theme-swatch" [style.background-color]="theme.colors().accent"></span>
              </span>
              <span class="settings-theme-current__name">{{ currentThemeName() }}</span>
              <span class="settings-theme-current__lock" aria-hidden="true">🔓</span>
              <span [style.color]="theme.colors().onBgPrimary" [style.border]="'1px solid ' + theme.colors().primary" class="settings-theme-current__tag">Gold · Free during beta</span>
              <span class="settings-theme-current__caret" aria-hidden="true">{{ themesOpen() ? '▲' : '▼' }}</span>
              <span class="sr-only">{{ themesOpen() ? 'Hide themes' : 'Show all themes' }}</span>
            </button>

            @if (themesOpen()) {
            <div id="theme-options" class="settings-theme-options">
              @for (t of theme.themes; track t.id) {
                <button (click)="selectTheme(t.id)"
                        [attr.aria-pressed]="theme.mode() === t.id"
                        [style.background-color]="theme.mode() === t.id ? t.colors.primary + '14' : 'transparent'"
                        [style.border]="theme.mode() === t.id ? '2px solid ' + t.colors.primary : '1px solid ' + theme.colors().border"
                        class="settings-theme-card"
                        type="button">
                  <div class="settings-theme-preview">
                    <span class="settings-theme-swatch" [style.background-color]="t.colors.bg" [style.border]="'1px solid ' + t.colors.border"></span>
                    <span class="settings-theme-swatch" [style.background-color]="t.colors.primary"></span>
                    <span class="settings-theme-swatch" [style.background-color]="t.colors.accent"></span>
                  </div>
                  <div class="settings-theme-info">
                    <div class="settings-theme-title-row">
                      <span class="settings-theme-name" [style.color]="theme.colors().text">{{ t.name }}</span>
                      @if (theme.mode() === t.id) {
                        <span class="settings-theme-active-tag" [style.background-color]="theme.colors().primary">Active</span>
                      }
                    </div>
                    <span class="settings-theme-desc" [style.color]="theme.colors().textSecondary">
                      {{ t.description }}
                    </span>
                  </div>
                </button>
              }

              <button (click)="selectTheme('custom')"
                      [attr.aria-pressed]="theme.mode() === 'custom'"
                      [style.background-color]="theme.mode() === 'custom' ? theme.colors().primary + '14' : 'transparent'"
                      [style.border]="theme.mode() === 'custom' ? '2px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                      class="settings-theme-card"
                      type="button">
                <div class="settings-theme-preview">
                  <span class="settings-theme-swatch" [style.background-color]="customColorDraft.bg" [style.border]="'1px solid ' + theme.colors().border"></span>
                  <span class="settings-theme-swatch" [style.background-color]="customColorDraft.primary"></span>
                  <span class="settings-theme-swatch" [style.background-color]="customColorDraft.accent"></span>
                </div>
                <div class="settings-theme-info">
                  <div class="settings-theme-title-row">
                    <span class="settings-theme-name" [style.color]="theme.colors().text">Custom</span>
                    @if (theme.mode() === 'custom') {
                      <span class="settings-theme-active-tag" [style.background-color]="theme.colors().primary">Active</span>
                    }
                  </div>
                  <span class="settings-theme-desc" [style.color]="theme.colors().textSecondary">
                    Pick your own 3 colors below
                  </span>
                </div>
              </button>
            </div>

            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="settings-custom-theme-editor">
              <p [style.color]="theme.colors().textSecondary" class="settings-custom-theme-label">
                Design your own theme - pick a background, a primary color, and an accent color:
              </p>
              <div class="settings-custom-theme-row">
                <label class="settings-custom-theme-swatch-picker">
                  <input type="color" [(ngModel)]="customColorDraft.bg" (ngModelChange)="onCustomColorChange()" aria-label="Background color">
                  <span [style.color]="theme.colors().text">Background</span>
                </label>
                <label class="settings-custom-theme-swatch-picker">
                  <input type="color" [(ngModel)]="customColorDraft.primary" (ngModelChange)="onCustomColorChange()" aria-label="Primary color">
                  <span [style.color]="theme.colors().text">Primary</span>
                </label>
                <label class="settings-custom-theme-swatch-picker">
                  <input type="color" [(ngModel)]="customColorDraft.accent" (ngModelChange)="onCustomColorChange()" aria-label="Accent color">
                  <span [style.color]="theme.colors().text">Accent</span>
                </label>
              </div>
              <div class="settings-custom-theme-actions">
                <button type="button"
                        (click)="applyCustomTheme()"
                        [style.background-color]="theme.colors().primary"
                        class="settings-custom-theme-apply settings-photo-btn settings-action-btn">
                  Apply Custom Theme
                </button>
              </div>
            </div>
            }
          </section>

          @if (install.canInstall() && !install.isInstalled()) {
            <div class="settings-divider"></div>

            <section class="settings-plan-section">
              <div class="settings-plan-header">
                <div>
                  <p [style.color]="theme.colors().textSecondary" class="settings-eyebrow">Install</p>
                  <h2 class="settings-section-title">Get the App</h2>
                  <p [style.color]="theme.colors().textSecondary" class="settings-plan-copy">
                    Install Dexii on this device for a full-screen app, a home screen icon, and faster launches.
                  </p>
                </div>
              </div>

              <button type="button"
                      (click)="installApp()"
                      [style.background-color]="theme.colors().primary"
                      class="settings-install-btn">
                Install Dexii
              </button>
            </section>
          }

          <div class="settings-divider"></div>

          <!-- Every notification setting in one place (DEX-40) -->
          <section id="settings-notifications" class="settings-plan-section" aria-labelledby="settings-notifications-title">
            <div class="settings-plan-header">
              <div>
                <p [style.color]="theme.colors().textSecondary" class="settings-eyebrow">Notifications</p>
                <h2 id="settings-notifications-title" class="settings-section-title">Notifications</h2>
              </div>
            </div>
            @if (!webPush.offInDevBuild) {
              <app-notification-setup mode="settings"></app-notification-setup>
            }

            <h3 [style.color]="theme.colors().text" class="settings-subsection-title">Journal reminders</h3>
            <div class="settings-grid">
              <label class="settings-field">
                Journal Prompt Frequency
                <app-select ariaLabel="Journal prompt frequency" [options]="journalPromptFrequencyOptions" [value]="settings.settings().journalPromptFrequency" (valueChange)="update('journalPromptFrequency', $any($event))"></app-select>
              </label>

              <label class="settings-field">
                Reminder Time
                <input type="time"
                       [value]="settings.settings().reminderTime"
                       (input)="update('reminderTime', inputValue($event))"
                       [style.background-color]="theme.colors().bg"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text">
              </label>
            </div>
          </section>

          <div class="settings-divider"></div>

          @if (gate.canManageSuperAdmins()) {
            <section class="settings-plan-section">
              <div class="settings-plan-header">
                <div>
                  <p [style.color]="theme.colors().textSecondary" class="settings-eyebrow">Super admin</p>
                  <h2 class="settings-section-title">Admin tools</h2>
                  <p [style.color]="theme.colors().textSecondary" class="settings-plan-copy">
                    You have <strong>Super admin</strong> access: everything in Gold plus admin tools. See what each level unlocks and manage other super admins.
                  </p>
                </div>
              </div>
              <a routerLink="/admin"
                 [style.background-color]="theme.colors().primary"
                 class="settings-photo-btn settings-action-btn settings-admin-link">
                Open admin tools
              </a>
            </section>

            <div class="settings-divider"></div>
          }

          

          @if (subscription.tierGatingEnabled) {
          <section class="settings-plan-section">
            <div class="settings-plan-header">
              <div>
                <p [style.color]="theme.colors().textSecondary" class="settings-eyebrow">Subscription</p>
                <h2 class="settings-section-title">Crush Plan</h2>
                <p [style.color]="theme.colors().textSecondary" class="settings-plan-copy">
                  Your access: {{ subscription.accessLabel() }}@if (subscription.isSuperAdmin()) { (includes everything in Gold) }. @if (subscription.crushLimitLabel() === 'Unlimited') { Unlimited crushes. } @else { You can track up to {{ subscription.crushLimitLabel() }} crushes. }
                </p>
              </div>
            </div>

            <div class="settings-plan-options">
              @for (tier of subscriptionTiers; track tier) {
                <button (click)="choosePlan(tier)"
                        [attr.aria-pressed]="subscription.tier() === tier"
                        [style.background-color]="subscription.tier() === tier ? theme.colors().primary : 'transparent'"
                        [style.color]="subscription.tier() === tier ? 'white' : theme.colors().text"
                        [style.border]="'1px solid ' + (subscription.tier() === tier ? theme.colors().primary : theme.colors().border)"
                        class="settings-plan-option"
                        type="button">
                  <span class="settings-plan-tier">{{ tier }}</span>
                  <span class="settings-plan-price">{{ planPrice(tier) }}</span>
                  <span class="settings-plan-limit">{{ crushLimitFor(tier) === 'Unlimited' ? 'Unlimited crushes' : 'Up to ' + crushLimitFor(tier) + ' crushes' }}</span>
                  @if (subscription.tier() === tier) {
                    <span class="settings-plan-active">Active</span>
                  }
                </button>
              }
            </div>
          </section>
          }

          <div [style.border-top]="'1px solid ' + theme.colors().border" class="settings-footer">
            <p [style.color]="theme.colors().textSecondary">
              Saved for this username only, so each account can keep its own profile and journal vibe.
            </p>
            <div class="settings-footer-actions">
              <button (click)="saveChanges()"
                      [style.background-color]="theme.colors().primary"
                      class="settings-photo-btn settings-action-btn"
                      type="button">
                Save Changes
              </button>
            </div>
          </div>

          <!-- Version and update check: admin only -->
          @if (gate.canManageSuperAdmins()) {
            <div class="settings-build" [style.color]="theme.colors().textSecondary">
              <span>Dexii v{{ appUpdate.version }} · build {{ appUpdate.build }}</span>
              <button type="button"
                      class="settings-reset-btn settings-action-btn settings-build-check"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().onBgPrimary"
                      [disabled]="appUpdate.checking()"
                      (click)="appUpdate.checkNow()">
                @switch (appUpdate.lastCheck()) {
                  @case ('current') { You're up to date }
                  @case ('updating') { Updating… }
                  @case ('unavailable') { Reload the page to update }
                  @default { {{ appUpdate.checking() ? 'Checking…' : 'Check for updates' }} }
                }
              </button>
            </div>
          }
        </section>
      </main>

      <!-- Themes beta pricing test (DEX-66): asked once, and the theme applies whatever they answer. -->
      @if (pendingTheme(); as pending) {
        <div class="settings-modal-backdrop" (click)="closeThemeInterest()">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               class="settings-modal-card settings-theme-interest"
               role="dialog" aria-modal="true" aria-labelledby="theme-interest-title" appFocusTrap (escaped)="closeThemeInterest()"
               (click)="$event.stopPropagation()">
            <div class="settings-modal-header">
              <div>
                <p [style.color]="theme.colors().textSecondary" class="settings-modal-eyebrow">Quick question</p>
                <h2 id="theme-interest-title" class="settings-modal-title">Would you pay {{ '$' + theme.themeInterestPrice }} for this theme?</h2>
              </div>
              <button (click)="closeThemeInterest()" [style.color]="theme.colors().textSecondary"
                      class="settings-modal-close" type="button" aria-label="Close">✕</button>
            </div>
            <p [style.color]="theme.colors().textSecondary" class="settings-modal-help">
              Themes will be a Gold extra after beta. For now every theme is free, whatever you answer.
            </p>
            <div class="settings-theme-interest__answers">
              <button type="button" (click)="answerThemeInterest('yes')" [style.background-color]="theme.colors().primary" class="settings-photo-btn settings-action-btn">Yes</button>
              <button type="button" (click)="answerThemeInterest('maybe')" [style.color]="theme.colors().onBgPrimary" [style.border]="'1px solid ' + theme.colors().primary" class="settings-photo-btn settings-action-btn settings-theme-interest__ghost">Maybe</button>
              <button type="button" (click)="answerThemeInterest('no')" [style.color]="theme.colors().onBgPrimary" [style.border]="'1px solid ' + theme.colors().primary" class="settings-photo-btn settings-action-btn settings-theme-interest__ghost">No</button>
            </div>
          </div>
        </div>
      }

      @if (showFriendPicker()) {
        <div class="settings-modal-backdrop" (click)="closeFriendPicker()">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               class="settings-modal-card"
               role="dialog" aria-modal="true" aria-labelledby="settings-friend-picker-title" appFocusTrap (escaped)="closeFriendPicker()"
               (click)="$event.stopPropagation()">
            <div class="settings-modal-header">
              <div>
                <p [style.color]="theme.colors().textSecondary" class="settings-modal-eyebrow">Selected Friends</p>
                <h2 id="settings-friend-picker-title" class="settings-modal-title">Pick who can see your profile</h2>
              </div>
              <button (click)="closeFriendPicker()"
                      [style.color]="theme.colors().textSecondary"
                      class="settings-modal-close"
                      type="button" aria-label="Close">✕</button>
            </div>

            <p [style.color]="theme.colors().textSecondary" class="settings-modal-help">
              Choose the people who can view your private profile updates.
            </p>

            <div class="settings-modal-list">
              @for (friend of availableFriends(); track friend.id) {
                <label [style.border]="'1px solid ' + theme.colors().border"
                       class="settings-modal-friend">
                  <div class="settings-modal-friend-main">
                    <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id"
                         [alt]="friend | personName"
                         class="settings-modal-avatar">
                    <div>
                      <p class="settings-modal-friend-name">{{ friend | personName }}</p>
                      <p [style.color]="theme.colors().textSecondary" class="settings-modal-friend-meta">
                        {{ friend.friendCategories?.[0] || 'Friend' }}
                      </p>
                    </div>
                  </div>
                  <input type="checkbox"
                         [checked]="selectedFriendIds().includes(friend.id)"
                         (change)="toggleFriendSelection(friend.id, checkedValue($event))">
                </label>
              } @empty {
                <div [style.border]="'1px dashed ' + theme.colors().border" class="settings-modal-empty">
                  <p [style.color]="theme.colors().textSecondary">No friends found yet.</p>
                </div>
              }
            </div>

            <div class="settings-modal-actions">
              <button (click)="saveFriendSelection()"
                      [style.background-color]="theme.colors().primary"
                      class="settings-photo-btn settings-action-btn"
                      type="button">
                Save Selection
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class SettingsComponent {
  readonly selfName = selfName;
  theme = inject(ThemeService);
  install = inject(InstallPromptService);
  webPush = inject(WebPushService);
  photoPickerOpen = signal(false);
  appUpdate = inject(AppUpdateService);
  gate = inject(FeatureGateService);
  /** Safety Check is parked (see premium-features.ts), so its default toggle hides with it. */
  readonly parkedFeaturesEnabled = PARKED_FEATURES_ENABLED;
  private route = inject(ActivatedRoute);
  /** Set when a route guard sent the user here because a screen needs a higher level. */
  lockedFeature = signal<PremiumFeatureKey | null>(null);
  private lockedWatcher = effect(() => {
    const raw = this.route.snapshot.queryParamMap.get('locked');
    this.lockedFeature.set(raw && raw in PREMIUM_FEATURES ? (raw as PremiumFeatureKey) : null);
  });
  modal = inject(ModalService);
  settings = inject(UserSettingsService);
  subscription = inject(SubscriptionService);
  private friendsApi = inject(FriendsApiService);
  availableFriends = signal<FriendChoice[]>([]);
  selectedFriendIds = signal<string[]>(this.settings.getSelectedFriendIds());
  showFriendPicker = signal(false);
  saveMessage = signal('');
  relationshipStatusOptions: ReadonlyArray<{ label: string; value: UserSettings['relationshipStatus'] }> = [
    { label: 'Select Status', value: '' },
    { label: 'Single', value: 'Single' },
    { label: 'In a Relationship', value: 'In a Relationship' },
    { label: 'Married', value: 'Married' },
    { label: "It's Complicated", value: "It's Complicated" },
    { label: 'Open Relationship', value: 'Open Relationship' },
    { label: 'Other', value: 'Other' }
  ];
  subscriptionTiers = Object.values(SubscriptionTier);

  constructor() {
    void this.subscription.refreshFromBackend();
  }

  username() {
    return this.settings.currentUsername();
  }

  /** The camera on the photo opens the picker under the header and brings it into view. */
  togglePhotoPicker() {
    this.photoPickerOpen.set(!this.photoPickerOpen());
    if (this.photoPickerOpen()) {
      setTimeout(() => document.getElementById('settings-photo-picker')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }));
    }
  }

  defaultAvatar() {
    return `https://i.pravatar.cc/300?u=${encodeURIComponent(this.username())}`;
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  checkedValue(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  setProfileVisibility(event: Event) {
    const value = this.inputValue(event) as UserSettings['profileVisibility'];
    this.update('profileVisibility', value);
    if (value === 'Selected friends') {
      void this.openFriendPicker();
    } else {
      this.closeFriendPicker();
    }
  }

  selectRelationshipStatus(value: UserSettings['relationshipStatus']) {
    this.update('relationshipStatus', value);
  }

  /** Themes start collapsed to the current one (DEX-66). */
  themesOpen = signal(false);
  currentThemeName = computed(() => this.theme.themes.find((t) => t.id === this.theme.mode())?.name ?? 'Custom');

  /** The theme they just picked, while we ask once whether they'd pay for it (DEX-66). */
  pendingTheme = signal<ThemeMode | null>(null);

  selectTheme(mode: ThemeMode) {
    if (mode !== this.theme.mode() && !this.theme.themeInterestAsked()) {
      this.pendingTheme.set(mode);
    }
    this.applyTheme(mode);
  }

  private applyTheme(mode: ThemeMode) {
    this.theme.setTheme(mode);
    this.update('themeMode', mode);
  }

  answerThemeInterest(answer: 'yes' | 'maybe' | 'no') {
    const mode = this.pendingTheme();
    if (!mode) return;
    this.theme.answerThemeInterest(answer, mode);
    this.pendingTheme.set(null);
  }

  closeThemeInterest() {
    if (!this.pendingTheme()) return;
    this.theme.dismissThemeInterest();
    this.pendingTheme.set(null);
  }

  /** Local draft for the 3-color custom theme editor, seeded from whatever was last saved/applied. */
  customColorDraft: CustomThemeColors = { ...this.theme.customColors() };

  onCustomColorChange(): void {
    // Live-preview the swatches in the "Custom" card as the user picks colors,
    // without switching the whole app's theme until they hit Apply.
  }

  applyCustomTheme(): void {
    this.theme.setCustomColors({ ...this.customColorDraft });
    this.update('themeMode', 'custom');
  }

  async installApp() {
    await this.install.promptInstall();
  }

  crushLimitFor(tier: SubscriptionTier): string {
    return this.subscription.crushLimitLabel(tier);
  }

  planPrice(tier: SubscriptionTier): string {
    if (tier === SubscriptionTier.Premium) return '$7.99/month';
    if (tier === SubscriptionTier.Gold) return '$9.99/month';
    return 'Free';
  }

  setLookingFor(event: Event) {
    this.update('lookingFor', this.inputValue(event) as UserSettings['lookingFor']);
  }

  setInterestedIn(event: Event) {
    this.update('interestedIn', this.inputValue(event) as UserSettings['interestedIn']);
  }

  setLoveLanguage(event: Event) {
    this.update('loveLanguage', this.inputValue(event) as UserSettings['loveLanguage']);
  }

  setJournalPromptFrequency(event: Event) {
    this.update('journalPromptFrequency', this.inputValue(event) as UserSettings['journalPromptFrequency']);
  }

  update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    this.settings.updateSettings({ [key]: value } as Partial<UserSettings>);
  }

  /** "Saving photo…" / "Photo saved" under the picker. */
  photoSyncMessage = signal('');
  private photoSyncTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * The photo is saved to the server as soon as it changes (debounced, so a crop
   * followed by a preset pick sends one request), not only on Save Changes.
   */
  onPhotoChange(key: 'avatarUrl' | 'avatarConfig', value: UserSettings['avatarUrl'] | UserSettings['avatarConfig']) {
    this.settings.updateSettings({ [key]: value } as Partial<UserSettings>);
    if (this.photoSyncTimer) clearTimeout(this.photoSyncTimer);
    this.photoSyncMessage.set('Saving photo…');
    this.photoSyncTimer = setTimeout(() => {
      this.photoSyncTimer = null;
      void this.settings.saveToBackend(['avatarUrl', 'avatarConfig'])
        .then(() => this.photoSyncMessage.set('Photo saved. Your friends will see it too.'))
        .catch(() => {
          this.photoSyncMessage.set('');
          this.modal.show('Your photo is saved on this device but could not sync yet. Tap Save Changes to retry.');
        });
    }, 600);
  }

  async openFriendPicker() {
    this.showFriendPicker.set(true);
    this.selectedFriendIds.set(this.settings.getSelectedFriendIds());

    if (this.availableFriends().length > 0) {
      return;
    }

    try {
      const friends = await this.friendsApi.listFriends();
      this.availableFriends.set(friends.filter((friend) => !!friend.id).map((friend) => ({
        id: friend.id,
        username: friend.username,
        avatarUrl: friend.avatarUrl,
        friendCategories: friend.friendCategories || ['Friend']
      })));
    } catch {
      // Leave the modal empty if the friends API is unavailable.
    }
  }

  closeFriendPicker() {
    this.showFriendPicker.set(false);
  }

  toggleFriendSelection(friendId: string, checked: boolean) {
    const next = new Set(this.selectedFriendIds());
    if (checked) {
      next.add(friendId);
    } else {
      next.delete(friendId);
    }
    this.selectedFriendIds.set(Array.from(next));
  }

  saveFriendSelection() {
    this.settings.setSelectedFriendIds(this.selectedFriendIds());
    this.closeFriendPicker();
  }

  async saveChanges() {
    this.settings.updateSettings(this.settings.settings());
    try {
      await this.settings.saveToBackend();
      this.saveMessage.set('Saved');
      this.modal.show('Settings saved.');
    } catch (error) {
      this.saveMessage.set('');
      this.modal.show(error instanceof Error ? error.message : 'Settings saved locally, but could not sync to your profile.');
    }
  }

  async choosePlan(tier: SubscriptionTier): Promise<void> {
    try {
      await this.subscription.upgrade(tier);
    } catch (error) {
      this.modal.show(error instanceof Error ? error.message : 'Unable to start checkout.');
    }
  }


  // Dropdown choices (app-select).
  readonly lookingForOptions = [{ value: '', label: 'Select Goal' }, ...['Long-term', 'Short-term', 'Friendship', 'Not Sure', 'Other'].map((v) => ({ value: v, label: v }))];
  readonly interestedInOptions = [{ value: '', label: 'Select Interest' }, ...['Men', 'Women', 'Everyone', 'Other'].map((v) => ({ value: v, label: v }))];
  readonly loveLanguageOptions = [{ value: '', label: 'Select Love Language' }, ...['Words of Affirmation', 'Acts of Service', 'Receiving Gifts', 'Quality Time', 'Physical Touch'].map((v) => ({ value: v, label: v }))];
  readonly journalPromptFrequencyOptions = ['Off', 'Daily', 'Twice daily', 'Every 4 hours'].map((v) => ({ value: v, label: v }));
  readonly profileVisibilityOptions = ['Public', 'Friends only', 'Selected friends', 'Private'].map((v) => ({ value: v, label: v }));
}
