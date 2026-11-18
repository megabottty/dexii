import { Component, HostListener, inject, input, output, signal } from '@angular/core';
import { SecurityService } from '../../services/security.service';
import { ThemeService } from '../../services/theme.service';

/**
 * A 4-digit PIN pad that checks the app PIN without locking or moving the app.
 * The Vault shows it every time it's opened; when the PIN is right it says
 * "unlocked" and the Vault opens. Looks like the lock screen's pad.
 */
@Component({
  selector: 'app-pin-pad',
  standalone: true,
  styleUrl: './pin-pad.component.css',
  template: `
    <div class="pin-pad">
      <p [style.color]="theme.colors().textSecondary" class="pin-pad__title">{{ title() }}</p>

      @if (errorMessage()) {
        <p class="pin-pad__error" role="alert">{{ errorMessage() }}</p>
      }

      <!-- Four dots fill in as digits are typed; they shake on a wrong PIN -->
      <div class="pin-pad__dots" [class.pin-pad__dots--shake]="isShaking()" role="status" aria-live="polite"
           [attr.aria-label]="enteredPin().length + ' of 4 digits entered'">
        @for (dot of [0, 1, 2, 3]; track dot) {
          <div [style.background-color]="enteredPin().length > dot ? theme.colors().primary : 'transparent'"
               [style.border]="'2px solid ' + (enteredPin().length > dot ? theme.colors().primary : theme.colors().textSecondary)"
               class="pin-pad__dot"></div>
        }
      </div>

      <div class="pin-pad__keys">
        @for (key of keys; track key) {
          @if (key === '') {
            <span></span>
          } @else if (key === 'Clear') {
            <button type="button" (click)="clear()" [style.color]="theme.colors().onBgPrimary" class="pin-pad__clear">Clear</button>
          } @else {
            <button type="button" (click)="press(key)" [disabled]="checking()"
                    [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text"
                    class="pin-pad__key">{{ key }}</button>
          }
        }
      </div>
    </div>
  `
})
export class PinPadComponent {
  private security = inject(SecurityService);
  protected theme = inject(ThemeService);

  /** The line above the dots, e.g. "Enter your PIN to open the Vault". */
  readonly title = input('Enter your 4-digit PIN');
  /** Fires once the PIN has been checked and is right. */
  readonly unlocked = output<void>();

  readonly enteredPin = signal('');
  readonly errorMessage = signal('');
  readonly isShaking = signal(false);
  readonly checking = signal(false);

  /** Keypad layout, phone-style: an empty cell to the left of 0, Clear to the right. */
  protected readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Clear'];

  /**
   * Adds one digit. On the fourth, asks the server (or the offline copy) whether
   * it's the app PIN. A right PIN fires `unlocked`; a wrong one shows why and starts over.
   */
  async press(digit: string): Promise<void> {
    if (this.checking() || this.enteredPin().length >= 4) return;
    const pin = this.enteredPin() + digit;
    this.enteredPin.set(pin);
    if (pin.length < 4) return;

    this.checking.set(true);
    try {
      // `false`: only check the PIN; don't touch the app lock or navigate.
      const ok = await this.security.verifyPin(pin, false);
      if (ok) {
        this.errorMessage.set('');
        this.unlocked.emit();
        return;
      }
      // The server explains lockouts after too many wrong guesses (DEX-56).
      this.errorMessage.set(this.security.lastPinError() || 'Incorrect PIN.');
      this.isShaking.set(true);
      setTimeout(() => this.isShaking.set(false), 500);
      this.clear();
    } finally {
      this.checking.set(false);
    }
  }

  /** Wipes the digits typed so far. */
  clear(): void {
    this.enteredPin.set('');
  }

  /** Lets people on a computer type the PIN with the keyboard; Backspace removes a digit. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    // Don't steal keys from a text box elsewhere on the page.
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (/^\d$/.test(event.key)) {
      void this.press(event.key);
    } else if (event.key === 'Backspace') {
      this.enteredPin.update((pin) => pin.slice(0, -1));
    }
  }
}
