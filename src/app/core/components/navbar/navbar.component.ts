import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { SecurityService } from '../../services/security.service';

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
        <span class="navbar-title">Dexii</span>
      </div>

      <div class="navbar-links">
        <a routerLink="/friends"
           [style.color]="theme.colors().text"
           class="navbar-link">
          Friends
        </a>
        <a routerLink="/user/me"
           [style.color]="theme.colors().text"
           class="navbar-link">
          Profile
        </a>
        <button (click)="theme.toggleTheme()"
                [style.background-color]="'transparent'"
                [style.color]="theme.colors().text"
                [style.border]="'1px solid ' + theme.colors().border"
                class="navbar-btn-outline">
          {{ theme.mode() === 'dark' ? 'Pearl' : 'Onyx' }}
        </button>
        <button (click)="security.lockApp()"
                [style.background-color]="theme.colors().primary"
                class="navbar-btn-primary">
          Lock
        </button>
        <button (click)="security.resetPinSetup()"
                [style.background-color]="'transparent'"
                [style.color]="theme.colors().textSecondary"
                [style.border]="'1px solid ' + theme.colors().border"
                class="navbar-btn-primary navbar-btn-outline-secondary">
          Switch Account
        </button>
        <a routerLink="/vault"
           [style.background-color]="theme.colors().accent"
           class="navbar-link-vault">
          Vault
        </a>
      </div>
    </nav>
  `,
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  theme = inject(ThemeService);
  security = inject(SecurityService);
}
