import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { SecurityService } from '../../services/security.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { MessagingService } from '../../services/messaging.service';
import { FriendsApiService } from '../../services/friends-api.service';
import { AppNotification, NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav aria-label="Primary navigation" [style.background-color]="theme.colors().bgSecondary"
         [style.border-bottom]="'1px solid ' + theme.colors().border"
         [style.z-index]="mobileMenuOpen() ? 90 : 50"
         class="navbar">
      <div class="navbar-brand">
        <div [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + ', ' + theme.colors().accent + ')'"
             class="navbar-logo">D</div>
        <div class="navbar-brand-copy">
          <span class="navbar-title">Dexii</span>
          @if (settings.settings().showUsername) {
            <span [style.color]="theme.colors().textSecondary" class="navbar-username">
              {{ settings.settings().displayName || '@' + (security.currentUser() || 'guest') }}
            </span>
          }
        </div>
      </div>

      <button type="button"
              class="navbar-menu-toggle"
              [class.navbar-menu-toggle-open]="mobileMenuOpen()"
              [style.color]="mobileMenuOpen() ? theme.colors().primary : theme.colors().text"
              [style.border]="'1px solid ' + (mobileMenuOpen() ? theme.colors().primary : theme.colors().border)"
              [style.background-color]="mobileMenuOpen() ? theme.colors().primary + '12' : 'transparent'"
              [attr.aria-expanded]="mobileMenuOpen()"
              aria-controls="primary-navigation-links"
              [attr.aria-label]="mobileMenuOpen() ? 'Close navigation menu' : 'Open navigation menu'"
              (click)="toggleMobileMenu()">
        <span></span><span></span><span></span>
      </button>

      <div id="primary-navigation-links"
           class="navbar-links"
           [class.navbar-links-open]="mobileMenuOpen()"
           [style.background-color]="theme.colors().bgSecondary"
           [style.border-color]="theme.colors().border">
        <div class="navbar-drawer-header">
          <div class="navbar-drawer-copy">
            <span class="navbar-drawer-title">Menu</span>
            <span [style.color]="theme.colors().textSecondary" class="navbar-drawer-subtitle">Navigate your space.</span>
          </div>
          <button type="button"
                  class="navbar-drawer-close"
                  [style.background-color]="theme.colors().bg"
                  [style.color]="theme.colors().textSecondary"
                  [style.border]="'1px solid ' + theme.colors().border"
                  aria-label="Close navigation menu"
                  (click)="closeMobileMenu()">
            ✕
          </button>
        </div>

        <div class="navbar-links-section navbar-links-section--primary">
          <span [style.color]="theme.colors().textSecondary" class="navbar-section-title">Navigation</span>
          <a routerLink="/dashboard"
             (click)="closeMobileMenu()"
             [style.color]="theme.colors().text"
             class="navbar-link">
            Dashboard
          </a>
          <a routerLink="/friends"
             (click)="closeMobileMenu()"
             [style.color]="theme.colors().text"
             class="navbar-link">
            Friends
            @if (incomingFriendRequestCount() > 0) {
              <span [style.background-color]="theme.colors().primary"
                    class="navbar-unread-badge"
                    aria-label="Pending friend requests">
                {{ incomingFriendRequestCount() }}
              </span>
            }
          </a>
          <a routerLink="/sharing"
             (click)="closeMobileMenu()"
             [style.color]="theme.colors().text"
             class="navbar-link">
            Sharing
          </a>
          <div class="navbar-tea-menu">
            <button type="button"
                    class="navbar-link navbar-tea-toggle"
                    [style.color]="theme.colors().text"
                    [attr.aria-expanded]="teaDropdownOpen()"
                    aria-label="Toggle tea notifications"
                    (click)="toggleTeaDropdown()">
              <span class="navbar-tea-icon" aria-hidden="true">🍵</span>
              Tea
              @if (notifications.unreadCount() > 0) {
                <span [style.background-color]="theme.colors().accent"
                      class="navbar-unread-badge"
                      aria-label="Unread notifications">
                  {{ notifications.unreadCount() }}
                </span>
              }
            </button>
            @if (teaDropdownOpen()) {
              <div class="navbar-notifications-panel"
                   [style.background-color]="theme.colors().bgSecondary"
                   [style.border]="'1px solid ' + theme.colors().border">
              <div class="navbar-notifications-header">
                <div>
                  <div [style.color]="theme.colors().text" class="navbar-notifications-title">Tea updates</div>
                  <div [style.color]="theme.colors().textSecondary" class="navbar-notifications-subtitle">
                    Fresh nudges and shared crushes.
                  </div>
                </div>
                <button type="button"
                        class="navbar-notifications-mark-all"
                        [style.color]="theme.colors().primary"
                        [disabled]="notifications.unreadCount() === 0"
                        (click)="markAllNotificationsRead($event)">
                  Mark all read
                </button>
              </div>

              <div class="navbar-notifications-list">
                @if (notifications.notifications().length === 0) {
                  <div [style.color]="theme.colors().textSecondary" class="navbar-notifications-empty">
                    No tea yet. We’ll spill it here.
                  </div>
                } @else {
                  @for (notification of notifications.notifications(); track notification.id) {
                    <button type="button"
                            class="navbar-notification-item"
                            [class.navbar-notification-item--unread]="!notification.read"
                            [style.border-bottom]="'1px solid ' + theme.colors().border"
                            (click)="openNotification(notification)">
                      <div class="navbar-notification-copy">
                        <span [style.color]="theme.colors().text">{{ notificationMessage(notification) }}</span>
                        <span [style.color]="theme.colors().textSecondary">{{ notification.createdAt | date:'short' }}</span>
                      </div>
                      @if (!notification.read) {
                        <span [style.background-color]="theme.colors().primary" class="navbar-notification-dot"></span>
                      }
                    </button>
                  }
                }
              </div>
              </div>
            }
          </div>
          <a routerLink="/chat"
             (click)="closeMobileMenu()"
             [style.color]="theme.colors().text"
             class="navbar-link">
            Chat
            @if (messaging.unreadTeaCount() > 0) {
              <span [style.background]="messaging.unreadSelfDestructCount() > 0 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : theme.colors().primary"
                    class="navbar-unread-badge"
                    [class.navbar-unread-badge--flame]="messaging.unreadSelfDestructCount() > 0"
                    aria-label="Unread chat messages">
                @if (messaging.unreadSelfDestructCount() > 0) {
                  <span class="navbar-unread-badge-icon">🔥</span>
                }
                {{ messaging.unreadTeaCount() }}
              </span>
            }
          </a>
          <a routerLink="/user/me"
             (click)="closeMobileMenu()"
             [style.color]="theme.colors().text"
             class="navbar-link">
            Profile
          </a>
          <a routerLink="/settings"
             (click)="closeMobileMenu()"
             [style.color]="theme.colors().text"
             class="navbar-link">
            Settings
          </a>
        </div>

        <div class="navbar-links-divider" [style.background-color]="theme.colors().border"></div>

        <div class="navbar-links-section navbar-links-section--account">
          <span [style.color]="theme.colors().textSecondary" class="navbar-section-title">Account</span>
          <button (click)="toggleTheme()"
                  [style.background-color]="'transparent'"
                  [style.color]="theme.colors().textSecondary"
                  [style.border]="'1px solid ' + theme.colors().border"
                  class="navbar-btn-outline navbar-account-action">
            {{ theme.isOnyx() ? 'Pearl' : 'Onyx' }}
          </button>
          <button (click)="lockApp()"
                  [style.background-color]="theme.colors().primary"
                  class="navbar-btn-primary navbar-account-action">
            Lock
          </button>
          <button (click)="logout()"
                  [style.background-color]="theme.colors().primary + '12'"
                  [style.color]="theme.colors().primary"
                  [style.border]="'1px solid ' + theme.colors().primary"
                  class="navbar-btn-primary navbar-btn-outline-secondary navbar-account-action navbar-account-action--logout">
            Logout
          </button>
          <button (click)="switchAccount()"
                  [style.background-color]="'transparent'"
                  [style.color]="theme.colors().textSecondary"
                  [style.border]="'1px solid ' + theme.colors().border"
                  class="navbar-btn-primary navbar-btn-outline-secondary navbar-account-action">
            Switch Account
          </button>
          <a routerLink="/vault"
             (click)="closeMobileMenu()"
             [style.background-color]="theme.colors().accent"
             class="navbar-link-vault">
            Vault
          </a>
        </div>
      </div>
    </nav>

    @if (mobileMenuOpen()) {
      <button type="button"
              class="navbar-drawer-backdrop"
              aria-label="Close navigation menu"
              (click)="closeMobileMenu()"></button>
    }
  `,
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  theme = inject(ThemeService);
  security = inject(SecurityService);
  settings = inject(UserSettingsService);
  messaging = inject(MessagingService);
  notifications = inject(NotificationsService);
  private friendsApi = inject(FriendsApiService);
  private router = inject(Router);
  private elementRef = inject(ElementRef<HTMLElement>);
  incomingFriendRequestCount = signal(0);
  mobileMenuOpen = signal(false);
  teaDropdownOpen = signal(false);
  private notificationRefreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.refreshNotificationBadges();
    this.notificationRefreshTimer = setInterval(() => {
      void this.refreshNotificationBadges();
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.notificationRefreshTimer) {
      clearInterval(this.notificationRefreshTimer);
      this.notificationRefreshTimer = null;
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
    this.teaDropdownOpen.set(false);
  }

  closeAllMenus(): void {
    this.closeMobileMenu();
    this.teaDropdownOpen.set(false);
  }


  toggleTheme(): void {
    this.closeAllMenus();
    this.theme.toggleTheme();
  }

  lockApp(): void {
    this.closeAllMenus();
    this.security.lockApp();
  }

  logout(): void {
    this.closeAllMenus();
    this.security.logout();
  }

  switchAccount(): void {
    this.closeAllMenus();
    this.security.resetPinSetup();
  }

  async toggleTeaDropdown(): Promise<void> {
    const nextState = !this.teaDropdownOpen();
    this.teaDropdownOpen.set(nextState);
    if (!nextState) return;

    await this.notifications.loadNotifications();
    await this.notifications.loadUnreadCount();
  }

  async openNotification(notification: AppNotification): Promise<void> {
    try {
      if (!notification.read) {
        await this.notifications.markRead(notification.id);
      }
    } catch {
      // Navigation should still work if marking read fails.
    }

    this.closeAllMenus();
    await this.router.navigate(this.notificationLink(notification));
  }

  async markAllNotificationsRead(event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.notifications.markAllRead();
    } catch {
      // Keep the dropdown open so the user can retry.
    }
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.teaDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAllMenus();
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

  private async refreshNotificationBadges(): Promise<void> {
    if (!this.security.isLoggedIn() || this.security.isLocked()) {
      this.incomingFriendRequestCount.set(0);
      return;
    }

    await this.messaging.loadConversationSummaries();
    await this.notifications.loadUnreadCount();

    try {
      const requests = await this.friendsApi.incomingRequests();
      this.incomingFriendRequestCount.set(requests.length);
    } catch {
      this.incomingFriendRequestCount.set(0);
    }
  }
}
