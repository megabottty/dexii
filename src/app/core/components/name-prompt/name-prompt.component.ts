import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FocusTrapDirective } from '../../a11y/focus-trap.directive';
import { SecurityService } from '../../services/security.service';
import { ThemeService } from '../../services/theme.service';
import { UserSettingsService } from '../../services/user-settings.service';

/**
 * Asks an existing account with no real name what friends should call them
 * (DEX-53), so nobody sees an email or a made-up username in its place.
 */
@Component({
  selector: 'app-name-prompt',
  standalone: true,
  imports: [FormsModule, FocusTrapDirective],
  template: `
    @if (settings.needsName() && security.isLoggedIn() && !security.isLocked()) {
      <div class="name-prompt__backdrop">
        <form (ngSubmit)="save()"
              appFocusTrap
              tabindex="-1"
              role="dialog"
              aria-modal="true"
              aria-labelledby="name-prompt-title"
              [style.background-color]="theme.colors().bg"
              [style.border]="'1px solid ' + theme.colors().border"
              class="name-prompt__card">
          <h3 id="name-prompt-title" class="name-prompt__title">What should friends call you?</h3>
          <p [style.color]="theme.colors().textSecondary" class="name-prompt__hint">
            Your name shows to friends, with your &#64;username under it.
          </p>
          @if (error()) {
            <p role="alert" [style.color]="theme.colors().danger" class="name-prompt__error">{{ error() }}</p>
          }
          <label for="name-prompt-first" [style.color]="theme.colors().textSecondary" class="name-prompt__label">First Name</label>
          <input id="name-prompt-first" name="firstName" [ngModel]="firstName()" (ngModelChange)="firstName.set($event)"
                 autocomplete="given-name"
                 [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.color]="theme.colors().text"
                 class="name-prompt__input">
          <label for="name-prompt-last" [style.color]="theme.colors().textSecondary" class="name-prompt__label">Last Name (Optional)</label>
          <input id="name-prompt-last" name="lastName" [ngModel]="lastName()" (ngModelChange)="lastName.set($event)"
                 autocomplete="family-name"
                 [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.color]="theme.colors().text"
                 class="name-prompt__input">
          <div class="name-prompt__actions">
            <button type="button" (click)="settings.skipNamePrompt()"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().textSecondary"
                    class="name-prompt__btn name-prompt__btn--ghost">
              Not now
            </button>
            <button type="submit" [disabled]="saving()"
                    [style.background-color]="theme.colors().primary"
                    class="name-prompt__btn">
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    .name-prompt__backdrop { position: fixed; inset: 0; z-index: 2050; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(8px); }
    .name-prompt__card { width: min(420px, 100%); padding: 28px 24px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: left; }
    .name-prompt__title { font-size: var(--fs-h-md); font-weight: 700; margin: 0 0 8px; text-align: center; }
    .name-prompt__hint { margin: 0 0 16px; text-align: center; }
    .name-prompt__error { margin: 0 0 12px; text-align: center; }
    .name-prompt__label { display: block; font-size: var(--fs-label); margin: 0 0 6px; }
    .name-prompt__input { width: 100%; box-sizing: border-box; padding: 12px; margin-bottom: 14px; border-radius: 12px; font-family: inherit; font-size: 16px; }
    .name-prompt__actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
    .name-prompt__btn { color: white; border: none; padding: 10px 24px; font-size: var(--fs-btn); font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; border-radius: 999px; }
    .name-prompt__btn--ghost { background: transparent; }
  `]
})
export class NamePromptComponent {
  protected theme = inject(ThemeService);
  protected settings = inject(UserSettingsService);
  protected security = inject(SecurityService);

  firstName = signal('');
  lastName = signal('');
  error = signal('');
  saving = signal(false);

  async save(): Promise<void> {
    const first = this.firstName().trim().slice(0, 80);
    const last = this.lastName().trim().slice(0, 80);
    if (!first) {
      this.error.set('Please add your first name.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.settings.saveRealName(first, last);
    } catch {
      this.error.set("Your name didn't save. Please try again.");
    } finally {
      this.saving.set(false);
    }
  }
}
