import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MessagingService } from '../../core/services/messaging.service';
import { DataService } from '../../core/services/data.service';
import { AuditService } from '../../core/services/audit.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

@Component({
  selector: 'app-shared-history',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="shared-history-container" style="font-family: 'Times New Roman', serif; min-height: 100vh;">
      <div class="header-section" style="padding: 2rem; border-bottom: 1px solid {{theme.colors().border}};">
        <a routerLink="/friends" [style.color]="theme.colors().textSecondary" class="back-link" style="text-decoration: none; display: block; margin-bottom: 1rem;">← Back to Inner Circle</a>
        <a routerLink="/dashboard" [style.color]="theme.colors().primary" style="text-decoration: none; display: inline-block; margin-bottom: 1rem; border: 1px solid currentColor; padding: 6px 12px; border-radius: 6px; font-weight: 600;">Dashboard</a>
        <h1 class="page-title" style="font-size: 2.5rem; margin-bottom: 0.5rem; letter-spacing: -1px;">Shared History</h1>
        <p [style.color]="theme.colors().textSecondary" style="font-size: 1.1rem; font-style: italic;">Track the crushes you've shared with friends.</p>
      </div>

      <div style="max-width: 900px; margin: 0 auto; padding: 2rem;">
        <app-page-hint
          hintKey="shared_history"
          title="Shared History Hint"
          message="Keep track of every crush profile you've sent. The eyeball icon indicates if your friend has viewed the shared content. Filter by friend to see your history with them.">
        </app-page-hint>

        <div class="filter-section" style="margin-bottom: 2rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <span style="font-weight: 600;">Filter by Friend:</span>
          <button (click)="filterFriend.set(null)"
                  [style.background-color]="filterFriend() === null ? theme.colors().primary : 'transparent'"
                  [style.color]="filterFriend() === null ? '#fff' : theme.colors().text"
                  [style.border]="'1px solid ' + (filterFriend() === null ? theme.colors().primary : theme.colors().border)"
                  style="padding: 6px 12px; border-radius: 4px; cursor: pointer;">All</button>
          @for (friendId of uniqueFriends(); track friendId) {
            <button (click)="filterFriend.set(friendId)"
                    [style.background-color]="filterFriend() === friendId ? theme.colors().primary : 'transparent'"
                    [style.color]="filterFriend() === friendId ? '#fff' : theme.colors().text"
                    [style.border]="'1px solid ' + (filterFriend() === friendId ? theme.colors().primary : theme.colors().border)"
                    style="padding: 6px 12px; border-radius: 4px; cursor: pointer;">{{ friendId }}</button>
          }
        </div>

        @if (sharedCrushes().length > 0) {
          <div class="shared-list" style="display: flex; flex-direction: column; gap: 1.5rem;">
            @for (item of sharedCrushes(); track item.messageId) {
              <div [style.background-color]="theme.colors().bgSecondary"
                   [style.border]="'1px solid ' + theme.colors().border"
                   class="shared-item" style="padding: 1.5rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; transition: transform 0.2s ease;">
                <div class="shared-info">
                  <div class="crush-meta" style="margin-bottom: 0.5rem;">
                    <span class="friend-name" style="font-weight: 600; color: {{theme.colors().primary}};">Sent to: {{ item.receiverId }}</span>
                    <span class="timestamp" [style.color]="theme.colors().textSecondary" style="margin-left: 1rem; font-size: 0.9rem;">{{ item.timestamp | date:'short' }}</span>
                  </div>
                  <h3 class="crush-name" style="font-size: 1.4rem; margin: 0;">{{ item.crushName }}</h3>
                </div>

                <div class="shared-actions" style="display: flex; align-items: center; gap: 1.5rem;">
                  <a [routerLink]="['/profile', item.crushId]"
                     [style.color]="theme.colors().primary"
                     class="view-link" style="text-decoration: none; border: 1px solid currentColor; padding: 6px 16px; border-radius: 4px;">View Crush</a>

                  <button (click)="unshare(item.crushId, item.receiverId)"
                          style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-family: inherit;">Unshare</button>

                  <div class="view-status">
                    @if (item.readAt) {
                      <span class="status-icon viewed" title="Viewed" style="font-size: 1.5rem;">👁️</span>
                    } @else {
                      <span class="status-icon pending" title="Pending" style="font-size: 1.5rem;" [style.color]="theme.colors().textSecondary">⌛👁️</span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="empty-state" [style.border]="'1px dashed ' + theme.colors().border" style="padding: 4rem; text-align: center; border-radius: 8px;">
            <p [style.color]="theme.colors().textSecondary" style="font-size: 1.2rem; margin-bottom: 1rem;">No history found for this selection.</p>
            <a routerLink="/dashboard" [style.color]="theme.colors().primary" style="text-decoration: underline;">Browse your crushes to start sharing.</a>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './shared-history.component.css'
})
export class SharedHistoryComponent {
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
