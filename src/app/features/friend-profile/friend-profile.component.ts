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
             style="text-decoration: none; padding: 6px 12px; border-radius: 6px; font-weight: 600;">
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
                <a [routerLink]="['/user', f.id]"
                   [style.color]="theme.colors().primary"
                   class="friend-profile-component__s9">
                  Open Profile
                </a>
                <a [routerLink]="['/chat']"
                   [queryParams]="{ friendId: f.id, friendName: f.username }"
                   [style.color]="theme.colors().primary"
                   class="friend-profile-component__s9"
                   style="margin-left: 12px;">
                  Open Chat
                </a>
              </div>
            </div>
          </div>

          <div [style.border]="'1px solid ' + theme.colors().border"
               [style.background-color]="theme.colors().bgSecondary"
               class="friend-profile-component__s4">
            <h3 class="friend-profile-component__s10">Add Note About Friend</h3>

            <textarea [(ngModel)]="draftNote"
                      rows="4"
                      [style.background-color]="theme.colors().bg"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().text"
                      placeholder="Add bio notes, reminders, updates..."
                      class="friend-profile-component__s11"></textarea>

            <div class="friend-profile-component__s12">
              <button (click)="addFriendNote()"
                      [style.background-color]="theme.colors().primary"
                      class="friend-profile-component__s14">
                Save Note
              </button>
            </div>
          </div>

          <div [style.border]="'1px solid ' + theme.colors().border"
               [style.background-color]="theme.colors().bgSecondary"
               class="friend-profile-component__s15">
            <h3 class="friend-profile-component__s10">
              Friend Notes
            </h3>

            @if (notes().length > 0) {
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
                      <button (click)="toggleNote(note.id)"
                              [style.border]="'1px solid ' + theme.colors().border"
                              class="friend-profile-component__s20">
                        Private
                      </button>
                    </div>
                    <p class="friend-profile-component__s21">{{ note.content }}</p>
                  </div>
                }
              </div>
            } @else {
              <p [style.color]="theme.colors().textSecondary" class="friend-profile-component__s22">No notes yet.</p>
            }
          </div>

          <div [style.border]="'1px solid ' + theme.colors().border"
               [style.background-color]="theme.colors().bgSecondary"
               class="friend-profile-component__s15">
            <h3 class="friend-profile-component__s10">
              Friendship Profile
            </h3>

            @if (friend(); as f) {
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
  draftNote = '';

  notes = computed(() => this.notesService.getNotesForFriend(this.friendId()));

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

  addFriendNote() {
    const friend = this.friend();
    const content = this.draftNote.trim();
    if (!friend || !content) return;

    if (!this.security.moderateContent(content)) {
      this.modal.show('Note flagged by AI moderation for safety.');
      return;
    }

    this.notesService.addNote(friend.id, content, 'private');
    this.modal.show('Private note saved.');
    this.draftNote = '';
  }

  toggleNote(noteId: string) {
    void noteId;
  }
}
