import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { SubscriptionService } from '../../services/subscription.service';
import { ModalService } from '../../services/modal.service';
import { PREMIUM_FEATURES, PremiumFeatureKey } from '../../config/premium-features';

/**
 * The one upgrade box used wherever a premium feature is locked. Copy comes
 * from the premium feature registry, so every gate reads the same way.
 */
@Component({
  selector: 'app-upgrade-prompt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './upgrade-prompt.component.css',
  template: `
    <div class="up-box"
         [class.up-box--compact]="compact()"
         [style.border]="'1px dashed ' + theme.colors().border"
         [style.background-color]="theme.colors().bgSecondary"
         role="region"
         [attr.aria-label]="entry().title">
      <div class="up-icon" aria-hidden="true">✨</div>
      <h3 class="up-title" [style.color]="theme.colors().text">{{ entry().title }}</h3>
      <p class="up-body" [style.color]="theme.colors().textSecondary">{{ entry().body }}</p>
      @if (entry().minTier !== 'SuperAdmin') {
        <button type="button"
                class="up-btn"
                [style.background-color]="theme.colors().primary"
                [disabled]="busy()"
                (click)="upgrade()">
          {{ busy() ? 'Opening checkout…' : 'Upgrade to ' + entry().minTier }}
        </button>
      }
    </div>
  `
})
export class UpgradePromptComponent {
  protected theme = inject(ThemeService);
  private subscription = inject(SubscriptionService);
  private modal = inject(ModalService);

  readonly feature = input.required<PremiumFeatureKey>();
  readonly compact = input(false);
  protected readonly busy = signal(false);
  protected readonly entry = computed(() => PREMIUM_FEATURES[this.feature()]);

  protected async upgrade(): Promise<void> {
    this.busy.set(true);
    try {
      const target = this.entry().minTier;
      if (target === 'SuperAdmin') return;
      await this.subscription.upgrade(target);
    } catch (err: any) {
      this.modal.show(err?.message || 'Paid plans are not available yet.');
    } finally {
      this.busy.set(false);
    }
  }
}
