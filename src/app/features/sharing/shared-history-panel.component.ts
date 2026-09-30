import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MessagingService } from '../../core/services/messaging.service';
import { DataService } from '../../core/services/data.service';
import { AuditService } from '../../core/services/audit.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

/**
 * The "History" tab of the Sharing page: every crush/entry you have sent to a
 * friend, filterable by friend, with a one-tap unshare. Rendered inside
 * SharingComponent, so it carries no page chrome of its own.
 */
@Component({
  selector: 'app-shared-history-panel',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHintComponent],
  styleUrl: './shared-history-panel.component.css',
  template: `
    <div class="shared-history-panel">
      <app-page-hint
        hintKey="shared_history"
        title="Shared History Hint"
        message="Keep track of every crush profile you've sent. The eyeball icon indicates if your friend has viewed the shared content. Filter by friend to see your history with them.">
      </app-page-hint>

      <div class="shared-history-panel__filters">
        <span class="shared-history-panel__filter-label">Filter by Friend:</span>
        <button type="button"
                (click)="filterFriend.set(null)"
                [style.background-color]="filterFriend() === null ? theme.colors().primary : 'transparent'"
                [style.color]="filterFriend() === null ? '#fff' : theme.colors().text"
                [style.border]="'1px solid ' + (filterFriend() === null ? theme.colors().primary : theme.colors().border)"
                [attr.aria-pressed]="filterFriend() === null"
                class="shared-history-panel__filter">All</button>
        @for (friendId of uniqueFriends(); track friendId) {
          <button type="button"
                  (click)="filterFriend.set(friendId)"
                  [style.background-color]="filterFriend() === friendId ? theme.colors().primary : 'transparent'"
                  [style.color]="filterFriend() === friendId ? '#fff' : theme.colors().text"
                  [style.border]="'1px solid ' + (filterFriend() === friendId ? theme.colors().primary : theme.colors().border)"
                  [attr.aria-pressed]="filterFriend() === friendId"
                  class="shared-history-panel__filter">{{ friendId }}</button>
        }
      </div>

      @if (sharedCrushes().length > 0) {
        <div class="shared-history-panel__list">
          @for (item of sharedCrushes(); track item.messageId) {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="shared-history-panel__item">
              <div class="shared-history-panel__info">
                <div class="shared-history-panel__meta">
                  <span [style.color]="theme.colors().primary" class="shared-history-panel__friend">Sent to: {{ item.receiverId }}</span>
                  <span [style.color]="theme.colors().textSecondary" class="shared-history-panel__timestamp">{{ item.timestamp | date:'short' }}</span>
                </div>
                <h3 class="shared-history-panel__crush-name">{{ item.crushName }}</h3>
                @if (item.entryId) {
                  <p [style.color]="theme.colors().textSecondary" class="shared-history-panel__entry">
                    {{ item.entryContent }}
                  </p>
                }
              </div>

              <div class="shared-history-panel__actions">
                <a [routerLink]="['/profile', item.crushId]"
                   [style.color]="theme.colors().primary"
                   class="shared-history-panel__view-link">View Crush</a>

                <button type="button"
                        (click)="unshare(item.crushId, item.receiverId)"
                        class="shared-history-panel__unshare">Unshare</button>

                <div class="shared-history-panel__status">
                  @if (item.readAt) {
                    <span class="shared-history-panel__status-icon" title="Viewed" aria-label="Viewed">👁️</span>
                  } @else {
                    <span class="shared-history-panel__status-icon" title="Pending" aria-label="Pending" [style.color]="theme.colors().textSecondary">⌛👁️</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div [style.border]="'1px dashed ' + theme.colors().border" class="shared-history-panel__empty">
          <p [style.color]="theme.colors().textSecondary">No history found for this selection.</p>
          <a routerLink="/dashboard" [style.color]="theme.colors().primary">Browse your crushes to start sharing.</a>
        </div>
      }
    </div>
  `
})
export class SharedHistoryPanelComponent {
  public theme = inject(ThemeService);
  private messaging = inject(MessagingService);
  private dataService = inject(DataService);
  private audit = inject(AuditService);

  filterFriend = signal<string | null>(null);

  uniqueFriends = computed(() => {
    const msgs = this.messaging.messages();
    return [...new Set(msgs
      .filter(m => this.dataService.isMe(m.senderId) && m.relatedCrushId)
      .map(m => m.receiverId))];
  });

  sharedCrushes = computed(() => {
    const filter = this.filterFriend();
    const allHistory = this.audit.getAllSharedHistory(this.dataService)();

    if (!filter) return allHistory;
    return allHistory.filter(item => item.receiverId === filter);
  });

  unshare(crushId: string, friendId: string) {
    this.dataService.toggleCrushVisibility(crushId, friendId);
  }
}
