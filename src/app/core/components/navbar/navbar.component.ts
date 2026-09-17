import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { SecurityService } from '../../services/security.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { MessagingService } from '../../services/messaging.service';
import { FriendsApiService } from '../../services/friends-api.service';
import { NotificationsService } from '../../services/notifications.service';
import { SupportMenuService } from '../../services/support-menu.service';

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

      <div class="navbar-right">
        <a routerLink="/user/me"
           aria-label="View your profile"
           [style.border]="'2px solid ' + theme.colors().border"
           class="navbar-profile-avatar">
          <img [src]="settings.settings().avatarUrl || ('https://i.pravatar.cc/150?u=' + (security.currentUser() || 'guest'))"
               alt="Your profile photo"
               class="navbar-profile-avatar-img">
        </a>

        <button type="button"
              class="navbar-help-button"
              [style.color]="theme.colors().text"
              [style.border]="'1px solid ' + theme.colors().border"
              aria-label="Open help tools"
              [attr.aria-expanded]="supportMenu.open()"
              aria-controls="app-support-menu"
              (click)="toggleSupportMenu(); $event.stopPropagation()">
        ?
        </button>

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
      </div>
    </nav>

      <div id="primary-navigation-links"
           class="navbar-links"
           [class.navbar-links-open]="mobileMenuOpen()"
           [style.z-index]="mobileMenuOpen() ? 90 : 50"
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
          <a routerLink="/feed"
             (click)="closeMobileMenu()"
             [style.color]="theme.colors().text"
             class="navbar-link">
            <span class="navbar-tea-icon" aria-hidden="true">🍵</span>
            Tea
            @if (notifications.unreadCount() > 0) {
              <span [style.background-color]="theme.colors().accent"
                    class="navbar-unread-badge"
                    aria-label="Unread tea updates">
                {{ notifications.unreadCount() }}
              </span>
            }
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
          <button (click)="goToThemeSettings()"
                  [style.background-color]="'transparent'"
                  [style.color]="theme.colors().textSecondary"
                  [style.border]="'1px solid ' + theme.colors().border"
                  class="navbar-btn-outline navbar-account-action">
            🎨 Theme
          </button>
          <button (click)="lockApp()"
                  [style.background-color]="theme.colors().primary"
                  class="navbar-btn-primary navbar-account-action">
            Lock
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

        <div class="navbar-links-section navbar-links-section--logout">
          <button (click)="logout()"
                  [style.background-color]="theme.colors().primary + '12'"
                  [style.color]="theme.colors().primary"
                  [style.border]="'1px solid ' + theme.colors().primary"
                  class="navbar-btn-primary navbar-btn-outline-secondary navbar-account-action navbar-account-action--logout">
            Logout
          </button>
        </div>
      </div>

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
  supportMenu = inject(SupportMenuService);
  private friendsApi = inject(FriendsApiService);
  private router = inject(Router);
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

  closeAllMenus(): void {
    this.closeMobileMenu();
    this.supportMenu.close();
  }

  toggleSupportMenu(): void {
    this.supportMenu.toggle();
  }


  goToThemeSettings(): void {
    this.closeAllMenus();
    this.router.navigate(['/settings'], { fragment: 'theme' }).then(() => {
      // Give the settings page a moment to render before scrolling to the theme section.
      setTimeout(() => {
        document.getElementById('theme')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    });
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAllMenus();
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
