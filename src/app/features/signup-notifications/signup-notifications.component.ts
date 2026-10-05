import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { WebPushService } from '../../core/services/web-push.service';
import { NotificationSetupComponent } from '../../core/components/notification-setup/notification-setup.component';

/** Last step of creating an account: turn on notifications (or not now). */
@Component({
  selector: 'app-signup-notifications',
  standalone: true,
  imports: [NotificationSetupComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="sn-page">
      <div [style.background-color]="theme.colors().bgSecondary"
           [style.border]="'1px solid ' + theme.colors().border"
           class="sn-card">
        <p [style.color]="theme.colors().textSecondary" class="sn-eyebrow">Last step</p>
        <app-notification-setup mode="setup" (enabled)="turnedOn.set(true)"></app-notification-setup>

        <div class="sn-actions">
          @if (turnedOn()) {
            <button type="button" (click)="finish()" [style.background-color]="theme.colors().primary" class="sn-btn sn-btn--primary">
              Continue to Dexii
            </button>
          } @else {
            <button type="button" (click)="finish()" [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border" class="sn-btn sn-btn--ghost">
              {{ webPush.status() === 'on' ? 'Continue to Dexii' : 'Not now' }}
            </button>
            @if (webPush.status() !== 'on') {
              <p [style.color]="theme.colors().textSecondary" class="sn-hint">You can turn these on any time in Settings → Notifications.</p>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sn-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px calc(24px + env(safe-area-inset-bottom)); box-sizing: border-box; }
    .sn-card { width: 100%; max-width: 460px; padding: 28px 22px; border-radius: 24px; display: flex; flex-direction: column; gap: 18px; box-sizing: border-box; }
    .sn-eyebrow { margin: 0; font-size: var(--fs-label); font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
    .sn-actions { display: flex; flex-direction: column; gap: 10px; }
    .sn-btn { width: 100%; min-height: var(--tap-min); padding: 14px; border: none; border-radius: var(--radius-pill); font-size: var(--fs-btn); font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; }
    .sn-btn--primary { color: #fff; }
    .sn-btn--ghost { background: transparent; }
    .sn-hint { margin: 0; text-align: center; font-size: var(--fs-small); }
  `]
})
export class SignupNotificationsComponent {
  readonly theme = inject(ThemeService);
  readonly webPush = inject(WebPushService);
  private router = inject(Router);
  readonly turnedOn = signal(false);

  finish(): void {
    if (!this.turnedOn() && this.webPush.status() !== 'on') this.webPush.dismissPrompt();
    void this.router.navigate(['/dashboard']);
  }
}
