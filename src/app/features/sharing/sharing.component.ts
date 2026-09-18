import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { ModalService } from '../../core/services/modal.service';
import { MessagingService } from '../../core/services/messaging.service';
import { DataService } from '../../core/services/data.service';
import { FriendsApiService, FriendSummary } from '../../core/services/friends-api.service';

/**
 * A dedicated, top-level "Sharing" page (linked directly from the main nav)
 * that gives a single, obvious place to:
 *  - see an at-a-glance overview of which crushes are currently shared with whom,
 *  - pick any friend and manage exactly what they can see (whole crushes and
 *    individual notes/entries), and
 *  - jot a quick note and share it in one step.
 * This replaces the old flow where "Sharing" only existed buried inside a modal
 * on each individual friend row in the Friends list.
 */
@Component({
  selector: 'app-sharing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, PageHintComponent],
  styleUrl: './sharing.component.css',
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="sharing-component__page">
      <app-navbar></app-navbar>

      <main class="sharing-component__main">
        <app-page-hint
          hintKey="sharing_page_inline"
          title="Sharing Hint"
          message="Pick a friend on the left to control exactly which crushes and notes they can see. The overview below shows everything you're currently sharing at a glance.">
        </app-page-hint>

        <h1 [style.border-bottom]="'1px solid ' + theme.colors().border" class="sharing-component__title">
          Sharing Controls
        </h1>
        <p [style.color]="theme.colors().textSecondary" class="sharing-component__subtitle">
          See, share, and manage exactly what each friend can view.
        </p>

        <div class="sharing-component__layout">
          <!-- Friend picker -->
          <aside [style.background-color]="theme.colors().cardBg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="sharing-component__picker">
            <input [ngModel]="friendSearch()"
                   (ngModelChange)="friendSearch.set($event)"
                   [style.background-color]="theme.colors().bg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   [style.color]="theme.colors().text"
                   placeholder="Search friends..."
                   aria-label="Search friends"
                   class="sharing-component__search">
            <p [style.color]="theme.colors().textSecondary" class="sharing-component__picker-help">
              Choose a friend from the list to manage what they can see.
            </p>
            <div class="sharing-component__friend-list">
              @for (friend of filteredFriends(); track friend.id) {
                <button type="button"
                        (click)="selectFriend(friend)"
                        [style.background-color]="selectedFriend()?.id === friend.id ? theme.colors().primary + '18' : 'transparent'"
                        [style.border]="'1px solid ' + (selectedFriend()?.id === friend.id ? theme.colors().primary : theme.colors().border)"
                        [style.color]="theme.colors().text"
                        class="sharing-component__friend-row">
                  <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id"
                       [alt]="friend.username + ' avatar'"
                       class="sharing-component__friend-avatar">
                  <span class="sharing-component__friend-name">{{ friend.username }}</span>
                  <span [style.color]="theme.colors().textSecondary" class="sharing-component__friend-count">
                    {{ sharedCrushCountFor(friend.id) }} shared
                  </span>
                </button>
              } @empty {
                <p [style.color]="theme.colors().textSecondary" class="sharing-component__empty">
                  @if (friends().length === 0) {
                    Add a friend first to start sharing.
                  } @else {
                    No friends match “{{ friendSearch() }}”.
                  }
                </p>
              }
            </div>
          </aside>

          <!-- Sharing panel for the selected friend -->
          <section [style.background-color]="theme.colors().cardBg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   class="sharing-component__panel">
            @if (!selectedFriend()) {
              <p [style.color]="theme.colors().textSecondary" class="sharing-component__empty">Select a friend to view sharing controls.</p>
            } @else {
              <div [style.border]="'1px solid ' + theme.colors().border" class="sharing-component__friend-banner">
                <img [src]="selectedFriend()?.avatarUrl || 'https://i.pravatar.cc/150?u=' + selectedFriend()?.id"
                     [alt]="selectedFriend()?.username || 'Selected friend'"
                     class="sharing-component__friend-banner-avatar">
                <div>
                  <p [style.color]="theme.colors().textSecondary" class="sharing-component__friend-banner-label">Sharing with</p>
                  <p class="sharing-component__friend-banner-name">{{ selectedFriend()?.username }}</p>
                </div>
              </div>

              <div class="sharing-component__crush-list">
                @for (crush of allCrushes(); track crush.id) {
                  <div [style.border-bottom]="'1px solid ' + theme.colors().border" class="sharing-component__crush-row">
                    <div class="sharing-component__crush-row-header">
                      <div class="sharing-component__crush-row-identity">
                        <img [src]="crush.avatarUrl" [alt]="crush.nickname + ' avatar'" class="sharing-component__crush-avatar">
                        <div>
                          <h4 class="sharing-component__crush-name">{{ crush.nickname }}</h4>
                          <span [style.color]="theme.colors().primary" class="sharing-component__crush-status">{{ crush.status }}</span>
                        </div>
                      </div>
                      <button (click)="toggleCrushSharing(crush.id)"
                              [style.background-color]="isCrushShared(crush) ? theme.colors().primary : 'transparent'"
                              [style.color]="isCrushShared(crush) ? 'white' : theme.colors().text"
                              [style.border]="'1px solid ' + (isCrushShared(crush) ? theme.colors().primary : theme.colors().border)"
                              [attr.aria-pressed]="isCrushShared(crush)"
                              [attr.aria-label]="(isCrushShared(crush) ? 'Unshare ' : 'Share ') + crush.nickname + ' with ' + (selectedFriend()?.username || 'selected friend')"
                              class="sharing-component__crush-toggle">
                        {{ isCrushShared(crush) ? 'Unshare' : 'Share' }}
                      </button>
                    </div>

                    @if (isCrushShared(crush)) {
                      <div class="sharing-component__entries">
                        <div style="display:flex; align-items:center; gap:6px;">
                          <p [style.color]="theme.colors().textSecondary" class="sharing-component__entries-label">Specific Entries</p>
                          <span class="info-icon-tooltip">
                            <button                             (click)="showShareDestinationInfo()"
                            [style.color]="theme.colors().textSecondary"
                            data-tooltip="This goes to the chat window between you two."
                                    aria-label="Where do shared notes go?"
                                    type="button"
                                    class="sharing-component__info-button">
                              ⓘ
                            </button>
                          </span>
                        </div>
                        <div
                          [style.max-height]="getEntries(crush.id).length > 3 ? '260px' : 'none'"
                          [style.overflow-y]="getEntries(crush.id).length > 3 ? 'auto' : 'visible'"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.background-color]="theme.colors().bg"
                          class="sharing-component__entries-list">
                          @for (entry of getEntries(crush.id); track entry.id) {
                            <div class="sharing-component__entry-row">
                              <span class="sharing-component__entry-text">"{{ entry.content | slice:0:40 }}{{ entry.content.length > 40 ? '...' : '' }}"</span>
                              <button (click)="toggleEntrySharing(entry)"
                                      [style.color]="isEntryShared(entry) ? theme.colors().accent : theme.colors().textSecondary"
                                      class="sharing-component__entry-toggle">
                                {{ isEntryShared(entry) ? '👁️' : '🔒' }}
                              </button>
                            </div>
                          } @empty {
                            <p [style.color]="theme.colors().textSecondary" class="sharing-component__entries-empty">No specific entries to share.</p>
                          }
                        </div>
                        <div style="display:flex; gap:6px; margin-top:8px;">
                          <input [ngModel]="quickEntryDraft(crush.id)"
                                 (ngModelChange)="setQuickEntryDraft(crush.id, $event)"
                                 (keydown.enter)="addAndShareQuickEntry(crush.id)"
                                 [style.background-color]="theme.colors().bgSecondary"
                                 [style.border]="'1px solid ' + theme.colors().border"
                                 [style.color]="theme.colors().text"
                                 placeholder="Type a quick note to share..."
                                 [attr.aria-label]="'Quick note to share about ' + crush.nickname"
                                 style="flex:1; border-radius:6px; padding:6px 8px; font-size:13px;">
                          <button (click)="addAndShareQuickEntry(crush.id)"
                                  [disabled]="!quickEntryDraft(crush.id).trim()"
                                  [style.background-color]="theme.colors().primary"
                                  style="color:white; border:none; border-radius:6px; padding:6px 12px; font-size:13px; cursor:pointer;">
                            Share
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                } @empty {
                  <p [style.color]="theme.colors().textSecondary" class="sharing-component__empty">
                    Add a crush on your Dashboard first, then come back here to share it.
                  </p>
                }
              </div>
            }
          </section>
        </div>

        <!-- At-a-glance overview across all friends -->
        <section [style.background-color]="theme.colors().cardBg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="sharing-component__overview">
          <h2 class="sharing-component__overview-title">What you're sharing</h2>
          @for (crush of sharedOverview(); track crush.id) {
            <div [style.border-bottom]="'1px solid ' + theme.colors().border" class="sharing-component__overview-row">
              <span class="sharing-component__overview-name">{{ crush.nickname }}</span>
              <span [style.color]="theme.colors().textSecondary" class="sharing-component__overview-friends">
                Shared with {{ crush.friendNames.join(', ') }}
              </span>
            </div>
          } @empty {
            <p [style.color]="theme.colors().textSecondary" class="sharing-component__empty">
              You're not sharing any crushes yet.
            </p>
          }
        </section>
      </main>
    </div>
  `
})
export class SharingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private friendsApi = inject(FriendsApiService);
  public dataService = inject(DataService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public modal = inject(ModalService);
  public messaging = inject(MessagingService);

  friends = signal<FriendSummary[]>([]);
  friendSearch = signal('');
  selectedFriend = signal<FriendSummary | null>(null);
  allCrushes = this.dataService.getAllCrushes();

  filteredFriends = computed(() => {
    const term = this.friendSearch().trim().toLowerCase();
    if (!term) return this.friends();
    return this.friends().filter((f) => f.username.toLowerCase().includes(term));
  });

  /** Every crush that's currently shared with at least one friend, with the friend names resolved for display. */
  sharedOverview = computed(() => {
    const friends = this.friends();
    return this.allCrushes()
      .map((crush: any) => {
        const visibility: string[] = crush.visibility || [];
        const friendNames = friends
          .filter((f) => visibility.includes(f.id))
          .map((f) => f.username);
        return { id: crush.id, nickname: crush.nickname, friendNames };
      })
      .filter((entry) => entry.friendNames.length > 0);
  });

  private get currentUserId(): string | null {
    return this.security.currentUserId();
  }

  private get currentUsername(): string {
    return this.currentUserId || 'signed_out';
  }

  async ngOnInit() {
    await this.loadFriends();

    const friendId = this.route.snapshot.queryParamMap.get('friendId');
    if (friendId) {
      const match = this.friends().find((f) => f.id === friendId);
      if (match) this.selectedFriend.set(match);
    }
  }

  async loadFriends() {
    try {
      const data = await this.friendsApi.listFriends();
      this.friends.set(data);
    } catch (error: any) {
      this.modal.show(error?.message || 'Unable to load friends right now.');
    }
  }

  selectFriend(friend: FriendSummary): void {
    this.selectedFriend.set(friend);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { friendId: friend.id },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  sharedCrushCountFor(friendId: string): number {
    return this.allCrushes().filter((crush: any) => this.dataService.isCrushSharedWith(crush, friendId)).length;
  }

  isCrushShared(crush: any): boolean {
    const friend = this.selectedFriend();
    if (!friend) return false;
    return this.dataService.isCrushSharedWith(crush, friend.id);
  }

  isEntryShared(entry: any): boolean {
    const friend = this.selectedFriend();
    return friend ? entry.visibility.includes(friend.id) || entry.visibility.includes('public') : false;
  }

  toggleCrushSharing(crushId: string): void {
    const friend = this.selectedFriend();
    if (!friend) return;

    const wasShared = this.isCrushSharedBefore(crushId, friend.id);
    this.dataService.toggleCrushVisibility(crushId, friend.id);

    if (!wasShared) {
      const crush = this.allCrushes().find((current: any) => current.id === crushId);
      this.messaging.sendMessage({
        senderId: this.currentUserId || this.currentUsername,
        receiverId: friend.id,
        content: `Shared a crush: ${crush?.nickname || 'a crush'}`,
        relatedCrushId: crushId
      });
      // No blocking confirmation modal here on purpose: it would cover the
      // "Specific Entries" quick-note input that appears right below as soon
      // as the crush becomes shared. The chat message above already confirms it.
    }
  }

  private isCrushSharedBefore(crushId: string, friendId: string): boolean {
    const crush = this.allCrushes().find((current: any) => current.id === crushId);
    return crush ? this.dataService.isCrushSharedWith(crush, friendId) : false;
  }

  toggleEntrySharing(entry: any): void {
    const friend = this.selectedFriend();
    if (!friend) return;

    const wasShared = this.isEntryShared(entry);
    this.dataService.toggleEntryVisibility(entry.id, friend.id);

    if (!wasShared) {
      const crush = this.allCrushes().find((current: any) => current.id === entry.crushId);
      const preview = (entry.content || '').trim();
      this.messaging.sendMessage({
        senderId: this.currentUserId || this.currentUsername,
        receiverId: friend.id,
        content: `Shared a specific entry${crush ? ` from ${crush.nickname}` : ''}: ${preview}`,
        relatedCrushId: entry.crushId,
        relatedEntryId: entry.id
      });
      this.modal.show(`Shared entry sent to ${friend.username}.`);
    }
  }

  getEntries(crushId: string) {
    return this.dataService.getEntriesForCrush(crushId)();
  }

  /** Draft text for the quick-add note input, keyed by crush id. */
  quickEntryDrafts: Record<string, string> = {};

  quickEntryDraft(crushId: string): string {
    return this.quickEntryDrafts[crushId] || '';
  }

  setQuickEntryDraft(crushId: string, value: string): void {
    this.quickEntryDrafts[crushId] = value;
  }

  /** Adds a private quick note; the lock can be toggled to share it with the selected friend. */
  addAndShareQuickEntry(crushId: string): void {
    const friend = this.selectedFriend();
    if (!friend) return;

    const content = (this.quickEntryDrafts[crushId] || '').trim();
    if (!content) return;

    const crush = this.allCrushes().find((current: any) => current.id === crushId);

    this.dataService.addEntry({
      crushId,
      type: 'Note',
      content,
      visibility: [],
      isSensitive: false
    });

    const newEntry = this.getEntries(crushId).find((entry) => entry.content === content);

    this.quickEntryDrafts[crushId] = '';
    this.modal.show(`Private note added. Tap the lock to share it with ${friend.username}.`);
  }

  showShareDestinationInfo(): void {
    this.modal.show('This goes to the chat window between you two.');
  }
}
