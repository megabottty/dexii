import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { FriendsApiService, FriendSummary } from '../../core/services/friends-api.service';
import { CrushProfile } from '../../core/models/crush-profile.model';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { AppNotification, NotificationsService } from '../../core/services/notifications.service';

interface FeedItem {
  id: string;
  kind: 'entry' | 'crush';
  ownerId: string;
  ownerUsername: string;
  ownerAvatarUrl?: string;
  crushId: string;
  crushNickname?: string;
  crushAvatarUrl?: string;
  verb: string;
  content: string;
  isSensitive: boolean;
  timestamp: Date;
}

const ENTRY_TYPE_VERBS: Record<string, string> = {
  Note: 'shared a note about',
  Date: 'logged a date with',
  RedFlag: 'flagged a red flag about',
  SafetyCheck: 'sent a safety check about',
  PrivateJournal: 'shared a journal entry about'
};

@Component({
  selector: 'app-feed',
  standalone: true,
  styleUrl: './feed.component.css',
  imports: [CommonModule, RouterModule, NavbarComponent, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg"
         [style.color]="theme.colors().text"
         class="feed-page">
      <app-navbar></app-navbar>

      <div class="feed-container">
        <app-page-hint
          hintKey="feed_inline"
          title="Feed Hint"
          message="See everything your friends have shared with you - crushes, notes, and updates - all in one place.">
        </app-page-hint>

        <div class="tea-updates-section"
             [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border">
          <div class="tea-updates-header">
            <div>
              <h2 [style.color]="theme.colors().text" class="tea-updates-title">🍵 Tea Updates</h2>
              <p [style.color]="theme.colors().textSecondary" class="tea-updates-subtitle">
                Fresh nudges and shared crushes.
              </p>
            </div>
            <button type="button"
                    class="tea-updates-mark-all"
                    [style.color]="theme.colors().primary"
                    [disabled]="notifications.unreadCount() === 0"
                    (click)="markAllNotificationsRead()">
              Mark all read
            </button>
          </div>

          <div class="tea-updates-list">
            @if (notificationsLoading()) {
              <div [style.color]="theme.colors().textSecondary" class="tea-updates-empty">
                Loading tea updates...
              </div>
            } @else if (notifications.notifications().length === 0) {
              <div [style.color]="theme.colors().textSecondary" class="tea-updates-empty">
                No tea yet. We'll spill it here.
              </div>
            } @else {
              @for (notification of unreadNotifications(); track notification.id) {
                <button type="button"
                        class="tea-update-item"
                        [class.tea-update-item--unread]="!notification.read"
                        [style.border-bottom]="'1px solid ' + theme.colors().border"
                        (click)="openNotification(notification)">
                  <div class="tea-update-copy">
                    <span [style.color]="theme.colors().text">{{ notificationMessage(notification) }}</span>
                    <span [style.color]="theme.colors().textSecondary">{{ notification.createdAt | date:'short' }}</span>
                  </div>
                  <span [style.background-color]="theme.colors().primary" class="tea-update-dot"></span>
                </button>
              }

              @if (readNotifications().length > 0) {
                <button type="button"
                        class="tea-updates-history-toggle"
                        [style.color]="theme.colors().textSecondary"
                        [attr.aria-expanded]="readUpdatesExpanded()"
                        (click)="toggleReadUpdates()">
                  <span>{{ readUpdatesExpanded() ? 'Hide earlier tea' : 'Show earlier tea' }}</span>
                  <span class="tea-updates-history-count">{{ readNotifications().length }}</span>
                  <span aria-hidden="true">{{ readUpdatesExpanded() ? '▴' : '▾' }}</span>
                </button>

                @if (readUpdatesExpanded()) {
                  @for (notification of readNotifications(); track notification.id) {
                    <button type="button"
                            class="tea-update-item tea-update-item--read"
                            [style.border-bottom]="'1px solid ' + theme.colors().border"
                            (click)="openNotification(notification)">
                      <div class="tea-update-copy">
                        <span [style.color]="theme.colors().text">{{ notificationMessage(notification) }}</span>
                        <span [style.color]="theme.colors().textSecondary">{{ notification.createdAt | date:'short' }}</span>
                      </div>
                    </button>
                  }
                }
              }
            }
          </div>
        </div>

        <div class="feed-header">
          <div>
            <h1 class="feed-title">Friend Feed</h1>
            <p [style.color]="theme.colors().textSecondary" class="feed-subtitle">
              Updates and entries your friends have shared with you.
            </p>
          </div>
        </div>

        @if (loading()) {
          <div [style.border]="'1px dashed ' + theme.colors().border"
               class="feed-empty-state">
            <p [style.color]="theme.colors().textSecondary">Loading your feed...</p>
          </div>
        } @else if (feedItems().length === 0) {
          <div [style.border]="'1px dashed ' + theme.colors().border"
               class="feed-empty-state">
            <p [style.color]="theme.colors().textSecondary">
              Nothing here yet. Once a friend shares a crush or a note with you, it'll show up in this feed.
            </p>
          </div>
        } @else {
          <div class="feed-list">
            @for (item of feedItems(); track item.id) {
              <button type="button"
                      (click)="openCrush(item)"
                      [style.background-color]="theme.colors().bgSecondary"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().text"
                      class="feed-item">
                <img [src]="item.ownerAvatarUrl || ('https://i.pravatar.cc/150?u=' + item.ownerUsername)"
                     [alt]="item.ownerUsername"
                     class="feed-item-avatar">
                <div class="feed-item-body">
                  <p class="feed-item-line">
                    <span class="feed-item-username">{{ item.ownerUsername }}</span>
                    <span [style.color]="theme.colors().textSecondary"> {{ item.verb }} </span>
                    @if (item.crushNickname) {
                      <span [style.color]="theme.colors().primary" class="feed-item-crush">{{ item.crushNickname }}</span>
                    }
                  </p>
                  @if (item.isSensitive) {
                    <p [style.color]="theme.colors().textSecondary" class="feed-item-content">
                      🔒 Sensitive entry - open the crush to view details.
                    </p>
                  } @else if (item.content) {
                    <p [style.color]="theme.colors().textSecondary" class="feed-item-content">{{ item.content }}</p>
                  }
                  <p [style.color]="theme.colors().textSecondary" class="feed-item-time">{{ timeAgo(item.timestamp) }}</p>
                </div>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class FeedComponent implements OnInit {
  protected theme = inject(ThemeService);
  protected notifications = inject(NotificationsService);
  private dataService = inject(DataService);
  private friendsApi = inject(FriendsApiService);
  private router = inject(Router);

  protected loading = signal(true);
  protected notificationsLoading = signal(true);
  protected readUpdatesExpanded = signal(false);
  private friendCrushes = signal<Map<string, CrushProfile & { ownerId: string; ownerUsername: string; ownerAvatarUrl?: string }>>(new Map());
  protected unreadNotifications = computed(() => this.notifications.notifications().filter(notification => !notification.read));
  protected readNotifications = computed(() => this.notifications.notifications().filter(notification => notification.read));

  async ngOnInit(): Promise<void> {
    void this.loadTeaUpdates();

    this.loading.set(true);
    try {
      await this.dataService.refreshSharedEntries();

      if (this.friendsApi.isAuthenticated()) {
        const friends: FriendSummary[] = await this.friendsApi.listFriends();
        const map = new Map<string, CrushProfile & { ownerId: string; ownerUsername: string; ownerAvatarUrl?: string }>();

        const results = await Promise.all(friends.map(async (friend) => {
          try {
            const crushes = await this.friendsApi.getFriendSharedCrushes(friend.id);
            return { friend, crushes };
          } catch {
            return { friend, crushes: [] as CrushProfile[] };
          }
        }));

        for (const { friend, crushes } of results) {
          for (const crush of crushes) {
            map.set(crush.id, {
              ...crush,
              ownerId: friend.id,
              ownerUsername: friend.username,
              ownerAvatarUrl: friend.avatarUrl
            });
          }
        }

        this.friendCrushes.set(map);
      }
    } finally {
      this.loading.set(false);
    }
  }

  feedItems = computed<FeedItem[]>(() => {
    const crushMap = this.friendCrushes();
    const entries = this.dataService.getSharedEntries()();

    const entryItems: FeedItem[] = entries.map((entry) => {
      const crush = crushMap.get(entry.crushId);
      return {
        id: `entry-${entry.id}`,
        kind: 'entry',
        ownerId: entry.owner.id,
        ownerUsername: entry.owner.username || 'Friend',
        ownerAvatarUrl: entry.owner.avatarUrl,
        crushId: entry.crushId,
        crushNickname: crush?.nickname,
        crushAvatarUrl: crush?.avatarUrl,
        verb: ENTRY_TYPE_VERBS[entry.type] || 'shared an update about',
        content: entry.content,
        isSensitive: !!entry.isSensitive,
        timestamp: entry.timestamp
      };
    });

    const crushItems: FeedItem[] = [...crushMap.values()].map((crush) => ({
      id: `crush-${crush.id}`,
      kind: 'crush',
      ownerId: crush.ownerId,
      ownerUsername: crush.ownerUsername,
      ownerAvatarUrl: crush.ownerAvatarUrl,
      crushId: crush.id,
      crushNickname: crush.nickname,
      crushAvatarUrl: crush.avatarUrl,
      verb: 'shared a crush:',
      content: crush.bio || '',
      isSensitive: false,
      timestamp: crush.lastInteraction ? new Date(crush.lastInteraction) : new Date()
    }));

    return [...entryItems, ...crushItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });

  openCrush(item: FeedItem): void {
    this.router.navigate(['/profile', item.crushId]);
  }

  timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    return new Date(date).toLocaleDateString();
  }

  private async loadTeaUpdates(): Promise<void> {
    this.notificationsLoading.set(true);
    try {
      await this.notifications.loadNotifications();
      await this.notifications.loadUnreadCount();
    } finally {
      this.notificationsLoading.set(false);
    }
  }

  async openNotification(notification: AppNotification): Promise<void> {
    try {
      if (!notification.read) {
        await this.notifications.markRead(notification.id);
        this.readUpdatesExpanded.set(false);
      }
    } catch {
      // Navigation should still work if marking read fails.
    }

    await this.router.navigate(this.notificationLink(notification));
  }

  async markAllNotificationsRead(): Promise<void> {
    try {
      await this.notifications.markAllRead();
      this.readUpdatesExpanded.set(false);
    } catch {
      // Leave the list as-is so the user can retry.
    }
  }

  toggleReadUpdates(): void {
    this.readUpdatesExpanded.update(expanded => !expanded);
  }

  notificationMessage(notification: AppNotification): string {
    const actorName = this.actorDisplayName(notification.actor);
    switch (notification.type) {
      case 'friend_request_nudge':
        return `${actorName} sent you a nudge on their friend request`;
      case 'crush_shared':
        return `${actorName} shared a new crush with you`;
      case 'invite_accepted':
        return `${actorName} accepted your invite and joined Dexii!`;
      case 'friend_request_received':
        return `${actorName} sent you a friend request`;
      case 'friend_request_accepted':
        return `${actorName} accepted your friend request`;
      default:
        return `${actorName} sent you an update`;
    }
  }

  private actorDisplayName(actor: AppNotification['actor']): string {
    if (!actor) return 'A friend';
    const fullName = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
    return fullName || actor.username || 'A friend';
  }

  private notificationLink(notification: AppNotification): any[] {
    if (notification.type === 'crush_shared' && typeof notification.payload?.crushId === 'string') {
      return ['/profile', notification.payload.crushId];
    }
    return ['/friends'];
  }
}
