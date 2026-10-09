import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionTier } from '../../core/models/user.model';
import { FriendsApiService, FriendSummary } from '../../core/services/friends-api.service';
import { FriendNotesService } from '../../core/services/friend-notes.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

interface FriendView {
  id: string;
  username: string;
  avatarUrl?: string;
  friendCategories: string[];
  subscriptionTier: SubscriptionTier;
  friendshipProfile?: {
    relationshipName?: string;
    relationshipType?: string;
    howMet?: string;
    trustLevel?: string;
    notes?: string;
  } | null;
}

type FriendshipProfile = NonNullable<FriendView['friendshipProfile']>;

@Component({
  selector: 'app-friend-profile',
  standalone: true,
  styleUrl: './friend-profile.component.css',
  imports: [CommonModule, FormsModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         class="friend-profile-component__s1">
      <div class="friend-profile-component__s2">
        <app-page-hint
          hintKey="friend_bio_inline"
          title="Friend Bio Hint"
          message="Keep private notes for yourself on this friend.">
        </app-page-hint>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <a routerLink="/friends"
             [style.color]="theme.colors().textSecondary"
             class="friend-profile-component__s3">
            ← Back to Inner Circle
          </a>
          <a routerLink="/dashboard"
             [style.color]="theme.colors().primary"
             [style.border]="'1px solid ' + theme.colors().primary"
             style="text-decoration: none; padding: 6px 12px; border-radius: var(--radius-pill); font-weight: 600;">
            Dashboard
          </a>
        </div>

        @if (friend(); as f) {
          <div [style.border]="'1px solid ' + theme.colors().border"
               [style.background-color]="theme.colors().bgSecondary"
               class="friend-profile-component__s4">
            <div class="friend-profile-component__s5">
              <img [src]="f.avatarUrl || 'https://i.pravatar.cc/150?u=' + f.id"
                   [alt]="f.username"
                   class="friend-profile-component__s6">
              <div>
                <h2 class="friend-profile-component__s7">{{ f.username }}</h2>
                <p [style.color]="theme.colors().textSecondary"
                   class="friend-profile-component__s8">
                  {{ f.subscriptionTier }} • {{ f.friendCategories[0] || 'Uncategorized' }}
                </p>
                <div class="friend-profile-actions">
                  <a [routerLink]="['/user', f.id]"
                     [style.background-color]="theme.colors().primary"
                     [style.border-color]="theme.colors().primary"
                     class="friend-profile-action friend-profile-action--primary">
                    Open Profile
                  </a>
                  <a [routerLink]="['/chat']"
                     [queryParams]="{ friendId: f.id, friendName: f.username }"
                     [style.color]="theme.colors().primary"
                     [style.border-color]="theme.colors().primary"
                     class="friend-profile-action friend-profile-action--secondary">
                    Open Chat
                  </a>
                  <button (click)="startEditingFriendshipProfile()"
                          [style.color]="theme.colors().primary"
                          [style.border-color]="theme.colors().primary"
                          class="friend-profile-action friend-profile-action--secondary">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>

          @if (notes().length > 0) {
            <div [style.border]="'1px solid ' + theme.colors().border"
                 [style.background-color]="theme.colors().bgSecondary"
                 class="friend-profile-component__s15">
              <h3 class="friend-profile-component__s10">Your notes</h3>
              <div class="friend-profile-component__s16">
                @for (note of notes(); track note.id) {
                  <div [style.border]="'1px solid ' + theme.colors().border"
                       [style.background-color]="theme.colors().bg"
                       class="friend-profile-component__s17">
                    <div class="friend-profile-component__s18">
                      <span [style.color]="theme.colors().textSecondary"
                            class="friend-profile-component__s19">
                        {{ note.createdAt | date:'MMM d, h:mm a' }}
                      </span>
                    </div>
                    <p class="friend-profile-component__s21">{{ note.content }}</p>
                  </div>
                }
              </div>
            </div>
          }

          <div [style.border]="'1px solid ' + theme.colors().border"
               [style.background-color]="theme.colors().bgSecondary"
               class="friend-profile-component__s15">
            <div class="friend-profile-section-heading">
              <h3 class="friend-profile-component__s10">Friendship Profile</h3>
              @if (!editingFriendshipProfile()) {
                <button (click)="startEditingFriendshipProfile()"
                        [style.color]="theme.colors().primary"
                        [style.border-color]="theme.colors().primary"
                        class="friend-profile-edit-link">
                  Edit
                </button>
              }
            </div>

            @if (editingFriendshipProfile()) {
              <div class="friend-profile-edit-grid">
                <label for="fp-relationship-name">Relationship Name
                  <input id="fp-relationship-name" [(ngModel)]="friendshipDraft.relationshipName" placeholder="e.g. Bestie, cousin"
                         [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="friend-profile-field">
                </label>
                <label for="fp-relationship-type">Relationship Type
                  <input id="fp-relationship-type" [(ngModel)]="friendshipDraft.relationshipType" placeholder="e.g. Close friend"
                         [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="friend-profile-field">
                </label>
                <label for="fp-how-met">How You Met
                  <input id="fp-how-met" [(ngModel)]="friendshipDraft.howMet" placeholder="e.g. College"
                         [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="friend-profile-field">
                </label>
                <label for="fp-trust">Trust Level
                  <input id="fp-trust" [(ngModel)]="friendshipDraft.trustLevel" placeholder="e.g. Tell them everything"
                         [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="friend-profile-field">
                </label>
                <label class="friend-profile-edit-field--full" for="fp-notes">Notes
                  <textarea id="fp-notes" [(ngModel)]="friendshipDraft.notes" rows="3" placeholder="Anything worth remembering"
                            [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="friend-profile-field"></textarea>
                </label>
              </div>
              <div class="friend-profile-actions">
                <button (click)="saveFriendshipProfile()"
                        [style.background-color]="theme.colors().primary"
                        class="friend-profile-action friend-profile-action--primary">
                  Save Changes
                </button>
                <button (click)="editingFriendshipProfile.set(false)"
                        [style.color]="theme.colors().primary"
                        [style.border-color]="theme.colors().primary"
                        class="friend-profile-action friend-profile-action--secondary">
                  Cancel
                </button>
              </div>
            } @else if (friend(); as f) {
              @if (f.friendshipProfile) {
                <div class="friend-profile-friendship-grid">
                  <div class="friend-profile-friendship-row">
                    <span class="friend-profile-friendship-label">Relationship Name</span>
                    <span class="friend-profile-friendship-value">{{ f.friendshipProfile.relationshipName || 'N/A' }}</span>
                  </div>
                  <div class="friend-profile-friendship-row">
                    <span class="friend-profile-friendship-label">Relationship Type</span>
                    <span class="friend-profile-friendship-value">{{ f.friendshipProfile.relationshipType || 'N/A' }}</span>
                  </div>
                  <div class="friend-profile-friendship-row">
                    <span class="friend-profile-friendship-label">How You Met</span>
                    <span class="friend-profile-friendship-value">{{ f.friendshipProfile.howMet || 'N/A' }}</span>
                  </div>
                  <div class="friend-profile-friendship-row">
                    <span class="friend-profile-friendship-label">Trust Level</span>
                    <span class="friend-profile-friendship-value">{{ f.friendshipProfile.trustLevel || 'N/A' }}</span>
                  </div>
                  <div class="friend-profile-friendship-row friend-profile-friendship-row--full">
                    <span class="friend-profile-friendship-label">Notes</span>
                    <span class="friend-profile-friendship-value">{{ f.friendshipProfile.notes || 'N/A' }}</span>
                  </div>
                </div>
              } @else {
                <p [style.color]="theme.colors().textSecondary" class="friend-profile-component__s22">No friendship profile saved yet.</p>
              }
            }
          </div>
        } @else {
          <div [style.border]="'1px solid ' + theme.colors().border"
               [style.background-color]="theme.colors().bgSecondary"
               class="friend-profile-component__s15">
            <p class="friend-profile-component__s23">Friend not found.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class FriendProfileComponent {
  public theme = inject(ThemeService);
  private route = inject(ActivatedRoute);
  private security = inject(SecurityService);
  private modal = inject(ModalService);
  private notesService = inject(FriendNotesService);
  private friendsApi = inject(FriendsApiService);

  private friendId = signal(this.route.snapshot.paramMap.get('id') || '');

  friend = signal<FriendView | null>(null);
  editingFriendshipProfile = signal(false);
  friendshipDraft: NonNullable<FriendView['friendshipProfile']> = {};

  notes = computed(() => {
    const friend = this.friend();
    return this.notesService.getNotesForFriend(friend?.id || this.friendId());
  });

  constructor() {
    void this.loadFriend();
  }

  private async loadFriend() {
    if (!this.friendsApi.isAuthenticated()) return;

    let friends: FriendSummary[] = [];
    try {
      friends = await this.friendsApi.listFriends();
    } catch {
      return;
    }

    const match = friends.find((f) => f.id === this.friendId() || f.username === this.friendId());
    if (!match) return;

    this.friend.set({
      id: match.id || match.username,
      username: match.username,
      avatarUrl: match.avatarUrl,
      friendCategories: match.friendCategories || ['Close Friends'],
      subscriptionTier: SubscriptionTier.Free,
      friendshipProfile: this.readLocalFriendshipProfile(match.id || match.username)
    });
  }

  private readLocalFriendshipProfile(friendId: string): any {
    const ownerId = this.security.currentUserId() || 'signed_out';
    try {
      const raw = localStorage.getItem(`dexii_friendship_profiles_${ownerId}`);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed[friendId] || null : null;
    } catch {
      return null;
    }
  }

  startEditingFriendshipProfile() {
    const profile = this.friend()?.friendshipProfile;
    this.friendshipDraft = { ...(profile || {}) };
    this.editingFriendshipProfile.set(true);
  }

  saveFriendshipProfile() {
    const friend = this.friend();
    if (!friend) return;

    const profile = {
      relationshipName: this.friendshipDraft.relationshipName?.trim() || '',
      relationshipType: this.friendshipDraft.relationshipType?.trim() || '',
      howMet: this.friendshipDraft.howMet?.trim() || '',
      trustLevel: this.friendshipDraft.trustLevel?.trim() || '',
      notes: this.friendshipDraft.notes?.trim() || ''
    };
    const ownerId = this.security.currentUserId() || 'signed_out';
    const storageKey = `dexii_friendship_profiles_${ownerId}`;
    const raw = localStorage.getItem(storageKey);
    let profiles: Record<string, FriendshipProfile> = {};
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          profiles = parsed as Record<string, FriendshipProfile>;
        }
      } catch {
        profiles = {};
      }
    }
    profiles[friend.id] = profile;
    localStorage.setItem(storageKey, JSON.stringify(profiles));
    this.friend.update((current) => current ? { ...current, friendshipProfile: profile } : current);
    this.editingFriendshipProfile.set(false);
    this.modal.show('Friendship profile saved.');
  }

}
