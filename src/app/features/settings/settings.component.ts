import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { ModalService } from '../../core/services/modal.service';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { SubscriptionTier } from '../../core/models/user.model';
import { SubscriptionService } from '../../core/services/subscription.service';
import { FriendsApiService } from '../../core/services/friends-api.service';
import { WalkthroughService } from '../../core/services/walkthrough.service';
import { FIRST_LOGIN_TOUR, FIRST_LOGIN_TOUR_KEY } from '../../core/config/walkthrough-tours';
import { UserSettings, UserSettingsService } from '../../core/services/user-settings.service';

interface FriendChoice {
  id: string;
  username: string;
  avatarUrl?: string;
  friendCategories?: string[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, PageHintComponent],
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

        <section [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="settings-card">
          <div class="settings-header">
            <div>
              <p [style.color]="theme.colors().textSecondary" class="settings-eyebrow">Account</p>
              <h1 class="settings-title">{{ settings.settings().displayName || '@' + username() }}</h1>
              <p [style.color]="theme.colors().textSecondary" class="settings-subtitle">
                Username: @{{ username() }}
              </p>
            </div>
            <button (click)="settings.resetSettings()"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().textSecondary"
                    class="settings-reset-btn">
              Reset Defaults
            </button>
          </div>

          <div class="settings-profile-banner">
            <img [src]="settings.settings().avatarUrl || defaultAvatar()"
                 [alt]="settings.settings().displayName || username()"
                 class="settings-avatar">
            <div class="settings-photo-actions">
              <input #photoInput type="file" accept="image/*" (change)="uploadPhoto($event)" hidden>
              <button (click)="photoInput.click()"
                      [style.background-color]="theme.colors().primary"
                      class="settings-photo-btn">
                Upload / Change Photo
              </button>
              <button (click)="clearPhoto()"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().textSecondary"
                      class="settings-photo-btn settings-photo-btn--ghost">
                Remove Photo
              </button>
            </div>
          </div>

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
              <input type="email"
                     [value]="settings.settings().email"
                     (input)="update('email', inputValue($event))"
                     [style.background-color]="theme.colors().bg"
                     [style.border]="'1px solid ' + theme.colors().border"
                     [style.color]="theme.colors().text">
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
              <select [value]="settings.settings().lookingFor"
                      (change)="setLookingFor($event)"
                      [style.background-color]="theme.colors().bg"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().text">
                <option value="">Select Goal</option>
                <option value="Long-term">Long-term</option>
                <option value="Short-term">Short-term</option>
                <option value="Friendship">Friendship</option>
                <option value="Not Sure">Not Sure</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label class="settings-field">
              Interested In
              <select [value]="settings.settings().interestedIn"
                      (change)="setInterestedIn($event)"
                      [style.background-color]="theme.colors().bg"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().text">
                <option value="">Select Interest</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Everyone">Everyone</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label class="settings-field">
              Love Language
              <select [value]="settings.settings().loveLanguage"
                      (change)="setLoveLanguage($event)"
                      [style.background-color]="theme.colors().bg"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().text">
                <option value="">Select Love Language</option>
                <option value="Words of Affirmation">Words of Affirmation</option>
                <option value="Acts of Service">Acts of Service</option>
                <option value="Receiving Gifts">Receiving Gifts</option>
                <option value="Quality Time">Quality Time</option>
                <option value="Physical Touch">Physical Touch</option>
              </select>
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

            <label class="settings-field">
              Reminder Time
              <input type="time"
                     [value]="settings.settings().reminderTime"
                     (input)="update('reminderTime', inputValue($event))"
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
              <select [value]="settings.settings().profileVisibility"
                      (change)="setProfileVisibility($event)"
                      [style.background-color]="theme.colors().bg"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().text">
                <option>Friends only</option>
                <option>Selected friends</option>
                <option>Private</option>
              </select>
              @if (settings.settings().profileVisibility === 'Selected friends') {
                <button (click)="openFriendPicker()"
                        [style.border]="'1px solid ' + theme.colors().primary"
                        [style.color]="theme.colors().primary"
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
            <label class="settings-toggle">
              <input type="checkbox"
                     [checked]="settings.settings().defaultSafetyCheck"
                     (change)="update('defaultSafetyCheck', checkedValue($event))">
              Default safety check on updates
            </label>
            <label class="settings-toggle">
              <input type="checkbox"
                     [checked]="settings.settings().allowInvites"
                     (change)="update('allowInvites', checkedValue($event))">
              Allow friend invites
            </label>
          </div>

          <div class="settings-divider"></div>

          <section class="settings-plan-section">
            <div class="settings-plan-header">
              <div>
                <p [style.color]="theme.colors().textSecondary" class="settings-eyebrow">Notifications</p>
                <h2 class="settings-section-title">Notification Settings</h2>
                <p [style.color]="theme.colors().textSecondary" class="settings-plan-copy">
                  Choose which alerts Dexii shows while you are signed in.
                </p>
              </div>
            </div>

            <div class="settings-toggles">
              <label class="settings-toggle">
                <input type="checkbox"
                       [checked]="settings.settings().notifyFriendRequests"
                       (change)="update('notifyFriendRequests', checkedValue($event))">
                Notify me about friend requests
              </label>
              <label class="settings-toggle">
                <input type="checkbox"
                       [checked]="settings.settings().notifyChatMessages"
                       (change)="update('notifyChatMessages', checkedValue($event))">
                Notify me about new chat messages
              </label>
            </div>
          </section>

          <div class="settings-divider"></div>

          <section class="settings-plan-section">
            <div class="settings-plan-header">
              <div>
                <p [style.color]="theme.colors().textSecondary" class="settings-eyebrow">Subscription</p>
                <h2 class="settings-section-title">Crush Plan</h2>
                <p [style.color]="theme.colors().textSecondary" class="settings-plan-copy">
                  Current tier: {{ subscription.tier() }}. You can track up to {{ subscription.getCrushLimit() }} crushes.
                </p>
              </div>
            </div>

            <div class="settings-plan-options">
              @for (tier of subscriptionTiers; track tier) {
                <button (click)="subscription.upgrade(tier)"
                        [attr.aria-pressed]="subscription.tier() === tier"
                        [style.background-color]="subscription.tier() === tier ? theme.colors().primary : 'transparent'"
                        [style.color]="subscription.tier() === tier ? 'white' : theme.colors().text"
                        [style.border]="'1px solid ' + (subscription.tier() === tier ? theme.colors().primary : theme.colors().border)"
                        class="settings-plan-option"
                        type="button">
                  <span class="settings-plan-tier">{{ tier }}</span>
                  <span class="settings-plan-limit">Up to {{ crushLimitFor(tier) }} crushes</span>
                  @if (subscription.tier() === tier) {
                    <span class="settings-plan-active">Active</span>
                  }
                </button>
              }
            </div>
          </section>

          <section class="settings-plan-section">
            <div class="settings-plan-header">
              <div>
                <p [style.color]="theme.colors().textSecondary" class="settings-eyebrow">Getting started</p>
                <h2 class="settings-section-title">App Walkthrough</h2>
                <p [style.color]="theme.colors().textSecondary" class="settings-plan-copy">
                  Replay the intro tour if you want a refresher on how Dexii works.
                </p>
              </div>
            </div>
            <button (click)="replayWalkthrough()"
                    [style.border]="'1px solid ' + theme.colors().primary"
                    [style.color]="theme.colors().primary"
                    class="settings-photo-btn settings-photo-btn--ghost"
                    type="button">
              Replay Walkthrough
            </button>
          </section>

          <div [style.border-top]="'1px solid ' + theme.colors().border" class="settings-footer">
            <p [style.color]="theme.colors().textSecondary">
              Saved for this username only, so each account can keep its own profile and journal vibe.
            </p>
            <div class="settings-footer-actions">
              <button (click)="saveChanges()"
                      [style.background-color]="theme.colors().primary"
                      class="settings-photo-btn"
                      type="button">
                Save Changes
              </button>
            </div>
          </div>
        </section>
      </main>

      @if (showFriendPicker()) {
        <div class="settings-modal-backdrop" (click)="closeFriendPicker()">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               class="settings-modal-card"
               (click)="$event.stopPropagation()">
            <div class="settings-modal-header">
              <div>
                <p [style.color]="theme.colors().textSecondary" class="settings-modal-eyebrow">Selected Friends</p>
                <h2 class="settings-modal-title">Pick who can see your profile</h2>
              </div>
              <button (click)="closeFriendPicker()"
                      [style.color]="theme.colors().textSecondary"
                      class="settings-modal-close"
                      type="button">✕</button>
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
                         [alt]="friend.username"
                         class="settings-modal-avatar">
                    <div>
                      <p class="settings-modal-friend-name">{{ friend.username }}</p>
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
                      class="settings-photo-btn"
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
  theme = inject(ThemeService);
  modal = inject(ModalService);
  settings = inject(UserSettingsService);
  subscription = inject(SubscriptionService);
  private walkthrough = inject(WalkthroughService);
  private friendsApi = inject(FriendsApiService);
  availableFriends = signal<FriendChoice[]>([]);
  selectedFriendIds = signal<string[]>(this.settings.getSelectedFriendIds());
  showFriendPicker = signal(false);
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
  private readonly crushLimits: Record<SubscriptionTier, number> = {
    [SubscriptionTier.Free]: 5,
    [SubscriptionTier.Premium]: 25,
    [SubscriptionTier.Gold]: 100
  };

  username() {
    return this.settings.currentUsername();
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

  crushLimitFor(tier: SubscriptionTier): number {
    return this.crushLimits[tier];
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

  update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    this.settings.updateSettings({ [key]: value } as Partial<UserSettings>);
  }

  async uploadPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.settings.setProfileAvatar(file);
    input.value = '';
  }

  clearPhoto() {
    this.settings.updateSettings({ avatarUrl: '' });
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

  saveChanges() {
    this.settings.updateSettings(this.settings.settings());
    this.modal.show('Settings saved.');
  }

  replayWalkthrough() {
    this.walkthrough.reset(FIRST_LOGIN_TOUR_KEY);
    this.walkthrough.start(FIRST_LOGIN_TOUR_KEY, FIRST_LOGIN_TOUR);
  }
}
