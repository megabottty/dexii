import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionTier } from '../../core/models/user.model';
import { getApiBaseUrl } from '../../core/config/api-config';
import { FriendNotesService, FriendNoteVisibility } from '../../core/services/friend-notes.service';
import { MessagingService } from '../../core/services/messaging.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

interface FriendView {
  id: string;
  username: string;
  avatarUrl?: string;
  friendCategories: string[];
  subscriptionTier: SubscriptionTier;
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
          message="Keep private notes for yourself or mark notes as shared to send them to this friend in chat.">
        </app-page-hint>

        <a routerLink="/friends"
           [style.color]="theme.colors().textSecondary"
           class="friend-profile-component__s3">
          ← Back to Inner Circle
        </a>

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
              <button (click)="draftVisibility = 'private'"
                      [style.background-color]="draftVisibility === 'private' ? theme.colors().primary : 'transparent'"
                      [style.color]="draftVisibility === 'private' ? 'white' : theme.colors().text"
                      [style.border]="'1px solid ' + (draftVisibility === 'private' ? theme.colors().primary : theme.colors().border)"
                      class="friend-profile-component__s13">
                Private
              </button>
              <button (click)="draftVisibility = 'shared'"
                      [style.background-color]="draftVisibility === 'shared' ? theme.colors().primary : 'transparent'"
                      [style.color]="draftVisibility === 'shared' ? 'white' : theme.colors().text"
                      [style.border]="'1px solid ' + (draftVisibility === 'shared' ? theme.colors().primary : theme.colors().border)"
                      class="friend-profile-component__s13">
                Shared
              </button>
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
                        {{ note.visibility === 'shared' ? 'Shared' : 'Private' }}
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
  private messaging = inject(MessagingService);

  private apiBase = `${getApiBaseUrl()}/demo/friends`;
  private currentUsername = localStorage.getItem('dexii_api_username') || 'dexii_demo_user';
  private friendId = signal(this.route.snapshot.paramMap.get('id') || '');

  friend = signal<FriendView | null>(null);
  draftNote = '';
  draftVisibility: FriendNoteVisibility = 'private';

  notes = computed(() => this.notesService.getNotesForFriend(this.friendId()));

  constructor() {
    void this.loadFriend();
  }

  private async loadFriend() {
    const username = encodeURIComponent(this.currentUsername);
    const response = await this.demoFetch(`/list?username=${username}`);
    if (!Array.isArray(response)) return;

    const match = response.find((f) => (f.id || f.username) === this.friendId());
    if (!match) return;

    this.friend.set({
      id: match.id || match.username,
      username: match.username,
      avatarUrl: match.avatarUrl,
      friendCategories: match.friendCategories || ['Close Friends'],
      subscriptionTier: match.subscriptionTier || SubscriptionTier.Free
    });
  }

  private async demoFetch(path: string, init: RequestInit = {}): Promise<any | null> {
    try {
      const response = await fetch(`${this.apiBase}${path}`, init);
      if (!response.ok) return null;
      return await response.json();
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

    const note = this.notesService.addNote(friend.id, content, this.draftVisibility);
    if (note.visibility === 'shared') {
      this.messaging.sendMessage({
        senderId: 'me',
        receiverId: friend.id,
        content: `Shared note: ${note.content}`
      });
      this.modal.show('Note saved and shared with friend.');
    } else {
      this.modal.show('Private note saved.');
    }
    this.draftNote = '';
    this.draftVisibility = 'private';
  }

  toggleNote(noteId: string) {
    const friend = this.friend();
    if (!friend) return;

    const note = this.notesService.toggleVisibility(noteId);
    if (!note) return;

    if (note.visibility === 'shared') {
      this.messaging.sendMessage({
        senderId: 'me',
        receiverId: friend.id,
        content: `Shared note: ${note.content}`
      });
      this.modal.show('Note is now shared with friend.');
    } else {
      this.modal.show('Note is now private.');
    }
  }
}
