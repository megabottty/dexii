import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { NotificationsService } from '../../core/services/notifications.service';
import { WebPushService } from '../../core/services/web-push.service';
import { TeaFeedService, TeaFilter, TeaItem } from '../../core/services/tea-feed.service';

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
          title="Tea"
          message="Tea is what your friends share with you and requests waiting for you. Accept requests and open shared crushes right from here.">
        </app-page-hint>

        @if (webPush.shouldPrompt()) {
          <div class="tea-push-banner"
               [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().accent"
               role="region"
               aria-label="Turn on notifications">
            <div class="tea-push-banner-copy">
              <p [style.color]="theme.colors().text" class="tea-push-banner-title">📲 Get Tea on your phone</p>
              @if (webPush.status() === 'needs-install') {
                <p [style.color]="theme.colors().textSecondary" class="tea-push-banner-text">
                  Add Dexii to your Home Screen first (Settings → Get the App), then open it from there to turn on notifications.
                </p>
              } @else {
                <p [style.color]="theme.colors().textSecondary" class="tea-push-banner-text">
                  Hear about friend requests and shared crushes the moment they happen, even when Dexii is closed.
                </p>
              }
              @if (webPush.error()) {
                <p class="tea-push-banner-error">{{ webPush.error() }}</p>
              }
            </div>
            <div class="tea-push-banner-actions">
              @if (webPush.status() === 'off') {
                <button type="button"
                        class="tea-push-banner-enable"
                        [style.background-color]="theme.colors().primary"
                        [disabled]="webPush.busy()"
                        (click)="webPush.enable()">
                  {{ webPush.busy() ? 'Turning on…' : 'Turn on notifications' }}
                </button>
              }
              <button type="button"
                      class="tea-push-banner-dismiss"
                      [style.color]="theme.colors().textSecondary"
                      (click)="webPush.dismissPrompt()">
                Not now
              </button>
            </div>
          </div>
        }

        <div class="tea-header">
          <div>
            <h1 class="feed-title">🍵 Tea</h1>
            <p [style.color]="theme.colors().textSecondary" class="feed-subtitle">
              What your friends share with you, and requests waiting for you.
            </p>
          </div>
          <button type="button"
                  class="tea-updates-mark-all"
                  [style.color]="theme.colors().primary"
                  [disabled]="notifications.unreadCount() === 0"
                  (click)="markAllRead()">
            Mark all read
          </button>
        </div>

        <div class="tea-filters" role="tablist" aria-label="Filter Tea">
          @for (option of filterOptions; track option.value) {
            <button type="button"
                    role="tab"
                    class="tea-filter"
                    [attr.aria-selected]="tea.filter() === option.value"
                    [style.background-color]="tea.filter() === option.value ? theme.colors().primary : 'transparent'"
                    [style.color]="tea.filter() === option.value ? 'white' : theme.colors().text"
                    [style.border]="'1px solid ' + (tea.filter() === option.value ? theme.colors().primary : theme.colors().border)"
                    (click)="tea.filter.set(option.value); earlierLimit.set(PAGE)">
              {{ option.label }}
              @if (option.count() > 0) { <span class="tea-filter-count">{{ option.count() }}</span> }
            </button>
          }
        </div>

        @if (tea.loading() && tea.items().length === 0) {
          <div [style.border]="'1px dashed ' + theme.colors().border" class="feed-empty-state">
            <p [style.color]="theme.colors().textSecondary">Brewing your tea…</p>
          </div>
        } @else if (tea.visibleItems().length === 0) {
          <div [style.border]="'1px dashed ' + theme.colors().border" class="feed-empty-state">
            <p [style.color]="theme.colors().textSecondary">
              @switch (tea.filter()) {
                @case ('requests') { No friend requests waiting. }
                @case ('shares') { No crushes shared with you yet. When a friend shares one, it lands here. }
                @case ('notes') { No shared notes yet. }
                @default { No tea yet. When a friend shares a crush or sends a request, it lands here. }
              }
            </p>
          </div>
        } @else {
          <div class="tea-list">
            @if (tea.unreadItems().length > 0) {
              <p class="tea-group-label" [style.color]="theme.colors().textSecondary">
                {{ tea.unseenCount() > 0 ? 'New' : 'Seen this visit' }}
              </p>
            }
            @for (item of tea.unreadItems(); track item.key) {
              <ng-container *ngTemplateOutlet="card; context: { item: item }"></ng-container>
            }

            @if (tea.earlierItems().length > 0) {
              @if (tea.unreadItems().length > 0) {
                <button type="button"
                        class="tea-updates-history-toggle"
                        [style.color]="theme.colors().textSecondary"
                        [attr.aria-expanded]="earlierExpanded()"
                        (click)="earlierExpanded.set(!earlierExpanded())">
                  <span>{{ earlierExpanded() ? 'Hide earlier' : 'Show earlier' }}</span>
                  <span class="tea-updates-history-count">{{ tea.earlierItems().length }}</span>
                  <span aria-hidden="true">{{ earlierExpanded() ? '▴' : '▾' }}</span>
                </button>
              }
              @if (earlierExpanded() || tea.unreadItems().length === 0) {
                @for (item of earlierVisible(); track item.key) {
                  <ng-container *ngTemplateOutlet="card; context: { item: item }"></ng-container>
                }
                @if (earlierVisible().length < tea.earlierItems().length) {
                  <button type="button"
                          class="tea-load-more"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.color]="theme.colors().text"
                          (click)="earlierLimit.set(earlierLimit() + PAGE)">
                    Load more ({{ tea.earlierItems().length - earlierVisible().length }} more)
                  </button>
                }
              }
            }
          </div>
        }
      </div>
    </div>

    <ng-template #card let-item="item">
      <article class="tea-card"
               [class.tea-card--unread]="item.read === false"
               [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + (item.read === false ? theme.colors().accent : theme.colors().border)">
        <div class="tea-card-main"
             [attr.role]="item.route ? 'button' : null"
             [attr.tabindex]="item.route ? 0 : null"
             (click)="item.route && tea.open(item)"
             (keydown.enter)="item.route && tea.open(item)">
          <img [src]="item.actor.avatarUrl || ('https://i.pravatar.cc/150?u=' + (item.actor.username || item.actor.id || 'friend'))"
               [alt]="item.actor.name"
               class="feed-item-avatar">
          <div class="tea-card-body">
            <p class="tea-card-text" [style.color]="theme.colors().text">
              {{ item.text }}
              @if (item.read === false) { <span [style.background-color]="theme.colors().primary" class="tea-update-dot" aria-label="Unread"></span> }
            </p>

            @if (item.kind === 'crush_shared' && item.crush) {
              <div class="tea-crush" [style.border]="'1px solid ' + theme.colors().border" [style.background-color]="theme.colors().bg">
                @if (item.crush.avatarUrl) { <img [src]="item.crush.avatarUrl" [alt]="item.crush.nickname || 'Crush'" class="tea-crush-avatar"> }
                <div class="tea-crush-copy">
                  <span class="tea-crush-name" [style.color]="theme.colors().primary">{{ item.crush.nickname || 'A crush' }}</span>
                  @if (item.crush.bio) { <span class="tea-crush-bio" [style.color]="theme.colors().textSecondary">{{ item.crush.bio }}</span> }
                </div>
              </div>
            }

            @if (item.kind === 'entry_shared' && item.entry) {
              @if (item.entry.isSensitive) {
                <p [style.color]="theme.colors().textSecondary" class="feed-item-content">🔒 Sensitive entry - open the crush to view details.</p>
              } @else if (item.entry.content) {
                <p [style.color]="theme.colors().textSecondary" class="feed-item-content">{{ item.entry.content }}</p>
              }
            }

            <p [style.color]="theme.colors().textSecondary" class="feed-item-time">{{ timeAgo(item.timestamp) }}</p>
          </div>
        </div>

        @if (item.kind === 'friend_request' || item.kind === 'nudge') {
          <div class="tea-card-actions">
            <button type="button" class="tea-action tea-action--primary"
                    [style.background-color]="'#16a34a'"
                    [disabled]="busyKey() === item.key"
                    (click)="respond(item, 'accept')">Accept</button>
            <button type="button" class="tea-action"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().textSecondary"
                    [disabled]="busyKey() === item.key"
                    (click)="respond(item, 'decline')">Decline</button>
          </div>
        } @else if (item.actionLabel && item.route) {
          <div class="tea-card-actions">
            <button type="button" class="tea-action tea-action--primary"
                    [style.background-color]="theme.colors().primary"
                    (click)="tea.open(item)">{{ item.actionLabel }}</button>
          </div>
        }

        @if (item.read === true) {
          <button type="button"
                  class="tea-update-mark-unread"
                  [style.color]="theme.colors().primary"
                  aria-label="Mark as unread"
                  (click)="tea.markUnread(item); $event.stopPropagation()">
            Mark as unread
          </button>
        }
      </article>
    </ng-template>
  `
})
export class FeedComponent implements OnInit, OnDestroy {
  protected theme = inject(ThemeService);
  protected notifications = inject(NotificationsService);
  protected webPush = inject(WebPushService);
  protected tea = inject(TeaFeedService);

  protected earlierExpanded = signal(false);
  protected busyKey = signal<string | null>(null);
  /** Earlier (read) items are paged so a long history doesn't swamp the page. */
  protected readonly PAGE = 10;
  protected earlierLimit = signal(this.PAGE);
  protected earlierVisible = computed(() => this.tea.earlierItems().slice(0, this.earlierLimit()));
  protected readonly filterOptions: Array<{ value: TeaFilter; label: string; count: () => number }> = [
    { value: 'all', label: 'All', count: () => 0 },
    { value: 'requests', label: 'Requests', count: () => this.tea.counts().requests },
    { value: 'shares', label: 'Shared crushes', count: () => this.tea.counts().shares },
    { value: 'notes', label: 'Notes', count: () => this.tea.counts().notes }
  ];

  private seenTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    void this.tea.load().then(() => {
      // Give the eye a moment on the new cards, then treat them as seen.
      this.seenTimer = setTimeout(() => { void this.tea.markShownAsSeen(); }, 2500);
    });
  }

  ngOnDestroy(): void {
    if (this.seenTimer) clearTimeout(this.seenTimer);
    // Leaving the page counts as having looked at it.
    void this.tea.markShownAsSeen();
  }

  async respond(item: TeaItem, action: 'accept' | 'decline'): Promise<void> {
    this.busyKey.set(item.key);
    try {
      await this.tea.respondToRequest(item, action);
    } finally {
      this.busyKey.set(null);
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await this.notifications.markAllRead();
      this.tea.snapshotGroups();
      this.earlierExpanded.set(false);
    } catch {
      // Leave the list as-is so the user can retry.
    }
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
}
