import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { ThemeService } from '../services/theme.service';

/** Full-screen loading state: dimmed page, centred spinner, on top of everything (see LoadingService). */
@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './loading-overlay.component.css',
  template: `
    @if (loading.active()) {
      <div class="lo-backdrop" role="status" aria-live="polite" aria-busy="true">
        <div class="lo-card" [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border">
          <span class="lo-spinner" [style.border-color]="theme.colors().border" [style.border-top-color]="theme.colors().primary" aria-hidden="true"></span>
          <span class="lo-label" [style.color]="theme.colors().textSecondary">Loading…</span>
        </div>
      </div>
    }
  `
})
export class LoadingOverlayComponent {
  protected readonly loading = inject(LoadingService);
  protected readonly theme = inject(ThemeService);
}
