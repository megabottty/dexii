import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { WebPushService } from '../../services/web-push.service';
import { PushNotificationsService } from '../../services/push-notifications.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { isNativeApp } from '../../config/api-config';

/**
 * Everything about turning notifications on, in one place: used as the last
 * step of account setup and again in Settings. Handles the browser (Web Push),
 * iPhone Safari (needs the Home Screen app first) and the native app (APNs/FCM).
 */
@Component({
  selector: 'app-notification-setup',
  standalone: true,
  styleUrl: './notification-setup.component.css',
  template: `
    <div class="ns" [class.ns--setup]="mode() === 'setup'">
      @if (mode() === 'setup') {
        <h2 class="ns-title">Hear about it the moment it happens</h2>
      }
      <p [style.color]="theme.colors().textSecondary" class="ns-copy">
        @switch (state()) {
          @case ('on') { Notifications are on for this device. You'll know when a friend sends a request, shares a crush or messages you, even when Dexii is closed. }
          @case ('native-denied') { Notifications are turned off for Dexii in your phone's Settings. Allow them there, then come back and turn them on. }
          @case ('native-off') { Get a notification on this phone when a friend sends a request, shares a crush or messages you. }
          @case ('blocked') { Notifications are blocked for Dexii in your browser settings. Allow them there, then come back and turn them on. }
          @case ('needs-install') { On iPhone, notifications work once Dexii is on your Home Screen. Add it with the steps below, open Dexii from there, and turn them on. }
          @case ('unsupported') { {{ webPush.unsupportedReason() || 'Notifications are not available in this browser.' }} }
          @default { Get a notification on this device when a friend sends a request, shares a crush or messages you, even when Dexii is closed. }
        }
      </p>

      @if (state() === 'needs-install') {
        <ol [style.color]="theme.colors().textSecondary"
            [style.border]="'1px solid ' + theme.colors().border"
            class="ns-steps">
          <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
          <li>Scroll and choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Open Dexii from your Home Screen and finish this step there.</li>
        </ol>
      }

      @if ((state() === 'blocked' || state() === 'unsupported') && webPush.failingChecks().length) {
        <ul class="ns-checklist" aria-label="What's missing">
          @for (check of webPush.failingChecks(); track check.label) {
            <li class="ns-check ns-check--fail">
              <span class="ns-check__label">✕ {{ check.label }}</span>
              @if (check.hint) {
                <span class="ns-check__hint" [style.color]="theme.colors().textSecondary">{{ check.hint }}</span>
              }
            </li>
          }
        </ul>
      }

      @if (webPush.error()) {
        <p class="ns-error">{{ webPush.error() }}</p>
      }

      <div class="ns-actions">
        @if (state() === 'off' || state() === 'native-off') {
          <button type="button"
                  (click)="turnOn()"
                  [disabled]="busy()"
                  [style.background-color]="theme.colors().primary"
                  class="ns-btn ns-btn--primary">
            {{ busy() ? 'Turning on…' : 'Turn on notifications' }}
          </button>
        } @else if (state() === 'on') {
          <span class="ns-on" [style.color]="theme.colors().onBgPrimary">✓ Notifications are on</span>
          @if (mode() === 'settings' && !native) {
            <button type="button"
                    (click)="webPush.disable()"
                    [disabled]="busy()"
                    [style.color]="theme.colors().text"
                    [style.border]="'1px solid ' + theme.colors().border"
                    class="ns-btn ns-btn--ghost">
              Turn off on this device
            </button>
          }
        }
      </div>

      <div class="ns-prefs" [style.border-top]="'1px solid ' + theme.colors().border">
        <p [style.color]="theme.colors().textSecondary" class="ns-prefs-title">What to notify me about</p>
        <label class="ns-toggle" [style.border]="'1px solid ' + theme.colors().border">
          <input type="checkbox"
                 [checked]="settings.settings().notifyFriendRequests"
                 (change)="setPref('notifyFriendRequests', $any($event.target).checked)">
          Friend requests and shared crushes
        </label>
        <label class="ns-toggle" [style.border]="'1px solid ' + theme.colors().border">
          <input type="checkbox"
                 [checked]="settings.settings().notifyChatMessages"
                 (change)="setPref('notifyChatMessages', $any($event.target).checked)">
          New chat messages
        </label>
      </div>

      @if (mode() === 'settings' && !native && webPush.diagnostics()) {
        <button type="button"
                class="ns-details-toggle"
                [style.color]="theme.colors().textSecondary"
                [attr.aria-expanded]="showDetails()"
                (click)="toggleDetails()">
          {{ showDetails() ? 'Hide details' : 'Details' }}
        </button>
        @if (showDetails()) {
          <ul class="ns-checklist" aria-label="Notification checks">
            @for (check of webPush.checks(); track check.label) {
              <li class="ns-check" [class.ns-check--fail]="!check.ok">
                <span class="ns-check__label">{{ check.ok ? '✓' : '✕' }} {{ check.label }}</span>
              </li>
            }
          </ul>
          <p class="ns-diagnostics" [style.color]="theme.colors().textSecondary">{{ webPush.diagnostics() }}</p>
        }
      }
    </div>
  `
})
export class NotificationSetupComponent {
  /** `setup` = the last step of creating an account; `settings` = the Settings page. */
  readonly mode = input<'setup' | 'settings'>('settings');
  /** Fires once notifications were turned on from here. */
  readonly enabled = output<void>();

  readonly theme = inject(ThemeService);
  readonly webPush = inject(WebPushService);
  readonly settings = inject(UserSettingsService);
  private readonly nativePush = inject(PushNotificationsService);

  readonly native = isNativeApp();
  readonly showDetails = signal(false);
  toggleDetails(): void { this.showDetails.update((open) => !open); }

  /** One state for every platform, so the template can stay simple. */
  readonly state = computed<'on' | 'off' | 'blocked' | 'needs-install' | 'unsupported' | 'native-off' | 'native-denied'>(() => {
    if (this.native) {
      if (this.nativePush.registered() || this.nativePush.permission() === 'granted') return 'on';
      if (this.nativePush.permission() === 'denied') return 'native-denied';
      return 'native-off';
    }
    return this.webPush.status();
  });

  readonly busy = computed(() => this.native ? this.nativePush.busy() : this.webPush.busy());

  constructor() {
    if (this.native) void this.nativePush.refreshPermission();
    else this.webPush.prepare();
  }

  async turnOn(): Promise<void> {
    const ok = this.native ? await this.nativePush.register() : await this.webPush.enable();
    if (ok) this.enabled.emit();
  }

  setPref(key: 'notifyFriendRequests' | 'notifyChatMessages', value: boolean): void {
    this.settings.updateSettings({ [key]: value });
    void this.settings.saveToBackend([key]).catch(() => undefined);
  }
}
