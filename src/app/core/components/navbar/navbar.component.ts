import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { SecurityService } from '../../services/security.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { MessagingService } from '../../services/messaging.service';
import { FriendsApiService } from '../../services/friends-api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav aria-label="Primary navigation" [style.background-color]="theme.colors().bgSecondary"
         [style.border-bottom]="'1px solid ' + theme.colors().border"
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
              [attr.aria-expanded]="mobileMenuOpen()"
              aria-controls="primary-navigation-links"
              aria-label="Toggle navigation menu"
              (click)="toggleMobileMenu()">
        <span></span><span></span><span></span>
      </button>

      <div id="primary-navigation-links"
           class="navbar-links"
           [class.navbar-links-open]="mobileMenuOpen()">
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
        <a routerLink="/chat"
           (click)="closeMobileMenu()"
           [style.color]="theme.colors().text"
           class="navbar-link">
          Chat
          @if (messaging.totalUnreadCount() > 0) {
            <span [style.background-color]="theme.colors().primary"
                  class="navbar-unread-badge"
                  aria-label="Unread chat messages">
              {{ messaging.totalUnreadCount() }}
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
        <button (click)="theme.toggleTheme()"
                (click)="closeMobileMenu()"
                [style.background-color]="'transparent'"
                [style.color]="theme.colors().text"
                [style.border]="'1px solid ' + theme.colors().border"
                class="navbar-btn-outline">
          {{ theme.mode() === 'dark' ? 'Pearl' : 'Onyx' }}
        </button>
        <button (click)="security.lockApp()"
                (click)="closeMobileMenu()"
                [style.background-color]="theme.colors().primary"
                class="navbar-btn-primary">
          Lock
        </button>
        <button (click)="security.logout()"
                (click)="closeMobileMenu()"
                [style.background-color]="'transparent'"
                [style.color]="theme.colors().textSecondary"
                [style.border]="'1px solid ' + theme.colors().border"
                class="navbar-btn-primary navbar-btn-outline-secondary">
          Logout
        </button>
        <button (click)="security.resetPinSetup()"
                (click)="closeMobileMenu()"
                [style.background-color]="'transparent'"
                [style.color]="theme.colors().textSecondary"
                [style.border]="'1px solid ' + theme.colors().border"
                class="navbar-btn-primary navbar-btn-outline-secondary">
          Switch Account
        </button>
        <a routerLink="/vault"
           (click)="closeMobileMenu()"
           [style.background-color]="theme.colors().accent"
           class="navbar-link-vault">
          Vault
        </a>
      </div>
    </nav>
  `,
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  theme = inject(ThemeService);
  security = inject(SecurityService);
  settings = inject(UserSettingsService);
  messaging = inject(MessagingService);
  private friendsApi = inject(FriendsApiService);
  incomingFriendRequestCount = signal(0);
  mobileMenuOpen = signal(false);
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
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobileMenu();
  }

  private async refreshNotificationBadges(): Promise<void> {
    if (!this.security.isLoggedIn() || this.security.isLocked()) {
      this.incomingFriendRequestCount.set(0);
      return;
    }

    await this.messaging.loadConversationSummaries();

    try {
      const requests = await this.friendsApi.incomingRequests();
      this.incomingFriendRequestCount.set(requests.length);
    } catch {
      this.incomingFriendRequestCount.set(0);
    }
  }
}
