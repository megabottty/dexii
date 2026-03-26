import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { ModalService } from '../../core/services/modal.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

@Component({
  selector: 'app-signup-email-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="confirmation-page">
      <div class="confirmation-container">
        <app-page-hint
          hintKey="signup_email_confirmation"
          title="Verify Your Email"
          message="We've sent a verification code to your email address. Please enter it below to complete your registration.">
        </app-page-hint>

        <div class="confirmation-header">
           <h2 class="confirmation-title">Dexii</h2>
           <p [style.color]="theme.colors().textSecondary" class="confirmation-subtitle">
             Email Verification
           </p>
        </div>

        <p class="instruction-text" [style.color]="theme.colors().textSecondary">
          Enter the 6-digit code sent to <br>
          <strong>{{ email() || 'your email' }}</strong>
        </p>

        @if (errorMessage()) {
          <p class="error-message">{{ errorMessage() }}</p>
        }

        <div class="code-inputs">
          @for (box of [0,1,2,3,4,5]; track $index) {
            <input
              type="text"
              maxlength="1"
              class="code-box"
              [style.background]="'transparent'"
              [style.border]="'1px solid ' + (code()[$index] ? theme.colors().primary : theme.colors().border)"
              [style.color]="theme.colors().text"
              [style.box-shadow]="code()[$index] ? '0 0 10px ' + theme.colors().primary : 'none'"
              (input)="onInput($event, $index)"
              (keydown)="onKeyDown($event, $index)"
              #codeBox
            >
          }
        </div>

        <button
          (click)="verifyCode()"
          [disabled]="code().length < 6 || isLoading()"
          [style.background-color]="theme.colors().primary"
          class="verify-button">
          {{ isLoading() ? 'Verifying...' : 'Verify & Complete' }}
        </button>

        <div class="actions">
           <button (click)="resendCode()" [style.color]="theme.colors().primary" class="aux-btn">
              Resend Code
           </button>
           <button routerLink="/signup-pin" [style.color]="theme.colors().textSecondary" class="aux-btn">
              Back to PIN Setup
           </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-page {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .confirmation-container {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 30px;
      text-align: center;
    }
    .confirmation-header {
      text-align: center;
    }
    .confirmation-title {
      font-size: 2.5rem;
      font-weight: 200;
      letter-spacing: 4px;
      margin: 0;
    }
    .confirmation-subtitle {
      font-size: 0.875rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .instruction-text {
      font-size: 1rem;
      line-height: 1.5;
    }
    .error-message {
      color: #ef4444;
      font-size: 0.875rem;
    }
    .code-inputs {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    .code-box {
      width: 45px;
      height: 55px;
      font-size: 1.5rem;
      text-align: center;
      border-radius: 8px;
      outline: none;
      transition: all 0.2s;
    }
    .verify-button {
      width: 100%;
      padding: 14px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .verify-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    .aux-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
    }
  `]
})
export class SignupEmailConfirmationComponent {
  public theme = inject(ThemeService);
  private security = inject(SecurityService);
  private router = inject(Router);
  private modal = inject(ModalService);

  email = signal<string>(localStorage.getItem('dexii_profile_email') || '');
  code = signal<string>('');
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  onInput(event: any, index: number) {
    const val = event.target.value;
    if (!/^\d?$/.test(val)) {
      event.target.value = '';
      return;
    }

    let currentCode = this.code().split('');
    currentCode[index] = val;
    this.code.set(currentCode.join(''));

    if (val && index < 5) {
      const nextInput = event.target.nextElementSibling;
      if (nextInput) nextInput.focus();
    }

    if (this.code().length === 6) {
      // Auto verify? Maybe not yet
    }
  }

  onKeyDown(event: any, index: number) {
    if (event.key === 'Backspace' && !event.target.value && index > 0) {
      const prevInput = event.target.previousElementSibling;
      if (prevInput) prevInput.focus();
    }
  }

  verifyCode() {
    if (this.code().length !== 6) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    // Mock verification delay
    setTimeout(() => {
      if (this.code() === '123456') {
        // Success! Complete setup in SecurityService
        const pendingPin = localStorage.getItem('dexii_pending_pin');
        if (pendingPin) {
           this.security.finalizeSetup(pendingPin);
           localStorage.removeItem('dexii_pending_pin');
        } else {
           this.errorMessage.set('Session expired. Please restart setup.');
           this.isLoading.set(false);
        }
      } else {
        this.errorMessage.set('Invalid verification code. Use 123456 for testing.');
        this.isLoading.set(false);
      }
    }, 1500);
  }

  resendCode() {
    this.modal.show('A new code has been sent to ' + (this.email() || 'your email'));
  }
}
