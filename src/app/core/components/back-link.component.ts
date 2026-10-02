import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';

/**
 * "← Back to …" link for pages reached from somewhere else in the app.
 * Goes back in history when the previous page was inside Dexii, otherwise to
 * `fallback`, so a deep link or a fresh tab still lands somewhere sensible.
 */
@Component({
  selector: 'app-back-link',
  standalone: true,
  template: `
    <a href="#"
       (click)="goBack($event)"
       [style.color]="theme.colors().textSecondary"
       class="back-link">← {{ label() }}</a>
  `,
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      min-height: var(--tap-min);
      margin: 0 0 12px;
      text-decoration: none;
      font-size: var(--fs-btn);
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .back-link:hover { text-decoration: underline; }
  `]
})
export class BackLinkComponent {
  readonly label = input('Back');
  /** Where to go when there is no in-app page to return to. */
  readonly fallback = input<string | any[]>('/dashboard');

  readonly theme = inject(ThemeService);
  private location = inject(Location);
  private router = inject(Router);

  goBack(event: Event): void {
    event.preventDefault();
    const state = (typeof history !== 'undefined' ? history.state : null) as { navigationId?: number } | null;
    // Angular numbers in-app navigations; the first page of a session is 1.
    if (state?.navigationId && state.navigationId > 1) {
      this.location.back();
      return;
    }
    const target = this.fallback();
    void this.router.navigate(Array.isArray(target) ? target : [target]);
  }
}
