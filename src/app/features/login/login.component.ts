import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { getApiBaseUrl } from '../../core/config/api-config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="login-page">
      <div class="login-container">
        <app-page-hint
          hintKey="login_screen"
          title="Login"
          message="Use your account password to sign in. Your Vault PIN unlocks the app afterward.">
        </app-page-hint>

        <div class="login-header">
           <div class="logo-wrapper">
             <span class="logo-text d" [style.color]="theme.colors().text">d</span>
             <span class="logo-text e" [style.color]="theme.colors().text">e</span>
             <span class="logo-text x" [style.color]="theme.colors().text">x</span>
             <div class="logo-icon boy" [style.color]="theme.colors().primary">
               <svg viewBox="0 0 24 24" fill="currentColor">
                 <circle cx="12" cy="4" r="2"/>
                 <path d="M15 7H9a1 1 0 0 0-1 1v7h2v7h4v-7h2V8a1 1 0 0 0-1-1z"/>
               </svg>
             </div>
             <div class="logo-icon girl" [style.color]="theme.colors().primary">
               <svg viewBox="0 0 24 24" fill="currentColor">
                 <circle cx="12" cy="4" r="2.5"/>
                 <path d="M12 7L18 16H6L12 7zM10 16h2v6h-2zm2 0h2v6h-2z"/>
               </svg>
             </div>
           </div>
           <p [style.color]="theme.colors().textSecondary" class="login-subtitle">Login to your account</p>
        </div>

        @if (errorMessage()) {
          <p class="error-message">{{ errorMessage() }}</p>
        }

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="login-form">

          <label [style.color]="theme.colors().textSecondary" class="form-label">Username or Email</label>
          <input [ngModel]="username()" (ngModelChange)="username.set($event)"
                 [style.background-color]="theme.colors().bg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.color]="theme.colors().text"
                 autocomplete="username"
                 class="form-input" placeholder="Enter your username or email">

          <label [style.color]="theme.colors().textSecondary" class="form-label">Password</label>
          <div class="password-input-wrapper">
            <input [ngModel]="password()" (ngModelChange)="password.set($event)"
                   [type]="showPassword() ? 'text' : 'password'"
                   autocomplete="current-password"
                   [style.background-color]="theme.colors().bg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   [style.color]="theme.colors().text"
                   class="form-input form-input--password" placeholder="Your account password">
            <button type="button"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                    class="password-toggle-btn"
                    [style.color]="theme.colors().textSecondary">
              @if (showPassword()) {
                <!-- Eye Open Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              } @else {
                <!-- Eye Off / Closed Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                  <line x1="2" y1="2" x2="22" y2="22"/>
                </svg>
              }
            </button>
          </div>

          <button (click)="login()"
                  [disabled]="isLoading()"
                  [style.background-color]="theme.colors().primary"
                  class="submit-button">
            {{ isLoading() ? 'Logging in...' : 'Login' }}
          </button>
          <button type="button" (click)="requestReset()" class="forgot-link">
            Forgot password?
          </button>

          @if (resetMessage()) {
            <p class="reset-message">{{ resetMessage() }}</p>
            <input [ngModel]="resetCode()" (ngModelChange)="resetCode.set($event)"
                   class="form-input" inputmode="numeric" maxlength="6" placeholder="Reset code">
            <div class="password-input-wrapper">
              <input [ngModel]="newPassword()" (ngModelChange)="newPassword.set($event)"
                     [type]="showNewPassword() ? 'text' : 'password'" autocomplete="new-password"
                     [style.background-color]="theme.colors().bg"
                     [style.border]="'1px solid ' + theme.colors().border"
                     [style.color]="theme.colors().text"
                     class="form-input form-input--password"
                     placeholder="New password (8+ characters)">
              <button type="button"
                      (click)="showNewPassword.set(!showNewPassword())"
                      [attr.aria-label]="showNewPassword() ? 'Hide password' : 'Show password'"
                      class="password-toggle-btn"
                      [style.color]="theme.colors().textSecondary">
                @if (showNewPassword()) {
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                    <line x1="2" y1="2" x2="22" y2="22"/>
                  </svg>
                }
              </button>
            </div>
            <button type="button" (click)="resetPassword()" class="submit-button reset-button"
                    [style.background-color]="theme.colors().accent">
              Reset Password
            </button>
          }

          <div class="login-footer">
            <span [style.color]="theme.colors().textSecondary">Don't have an account?</span>
            <a routerLink="/signup-profile" [style.color]="theme.colors().primary" class="signup-link">Create Account</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .login-container {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .login-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .logo-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      margin-bottom: 8px;
    }
    .logo-text {
      font-size: 3rem;
      font-weight: 200;
      line-height: 1;
      text-transform: lowercase;
    }
    .logo-icon {
      width: 2.2rem;
      height: 3rem;
      display: flex;
      align-items: flex-end;
      padding-bottom: 4px;
    }
    .logo-icon svg {
      width: 100%;
      height: 80%;
    }
    .login-subtitle {
      font-size: 0.875rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .error-message {
      color: #ef4444;
      font-size: 0.875rem;
      text-align: center;
    }
    .login-form {
      padding: 32px;
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .form-input {
      padding: 14px;
      border-radius: 10px;
      font-size: 1rem;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    .form-input:focus {
      border-color: var(--primary-color) !important;
    }
    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .form-input--password {
      padding-right: 48px;
    }
    .password-toggle-btn {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 6px;
      transition: opacity 0.2s;
    }
    .password-toggle-btn:hover {
      opacity: 0.8;
    }
    .submit-button {
      padding: 16px;
      border-radius: 10px;
      color: white;
      font-weight: 600;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      margin-top: 8px;
      transition: opacity 0.2s;
    }
    .submit-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .login-footer {
      display: flex;
      justify-content: center;
      gap: 8px;
      font-size: 0.875rem;
      margin-top: 8px;
    }
    .signup-link {
      text-decoration: none;
      font-weight: 600;
    }
    .signup-link:hover {
      text-decoration: underline;
    }
    .forgot-link {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 0.8rem;
      text-decoration: underline;
    }
    .reset-message {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.4;
    }
    .reset-button {
      margin-top: 0;
    }
  `]
})
export class LoginComponent {
  public theme = inject(ThemeService);
  private security = inject(SecurityService);
  private router = inject(Router);
  private apiBase = getApiBaseUrl();

  username = signal<string>('');
  password = signal<string>('');
  showPassword = signal<boolean>(false);
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);
  resetMessage = signal<string>('');
  resetCode = signal<string>('');
  newPassword = signal<string>('');
  showNewPassword = signal<boolean>(false);

  async login() {
    if (!this.username() || !this.password()) {
      this.errorMessage.set('Please enter a username and your password.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Temporarily store username for verifyPin to use
      localStorage.setItem('dexii_api_username', this.username());

      const success = await this.security.verifyPassword(this.username(), this.password());

      if (success) {
        this.router.navigate(['/lock']);
      } else {
        this.errorMessage.set('Invalid username or password.');
        this.isLoading.set(false);
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Login failed. Please try again.');
      this.isLoading.set(false);
    }
  }

  async requestReset(): Promise<void> {
      if (!this.username().trim()) {
        this.errorMessage.set('Enter your username first to request a reset code.');
        return;
      }
      this.resetMessage.set('');
      try {
        const response = await fetch(`${this.apiBase}/auth/request-password-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail: this.username().trim() })
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Unable to request reset.');
        this.resetMessage.set(body.message);
      } catch (err: any) {
        this.errorMessage.set(err.message || 'Unable to request password reset.');
      }
  }

  async resetPassword(): Promise<void> {
        if (this.newPassword().length < 8 || this.resetCode().length !== 6) {
          this.errorMessage.set('Enter the 6-digit reset code and an 8+ character password.');
          return;
        }
        try {
          const response = await fetch(`${this.apiBase}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usernameOrEmail: this.username().trim(),
              code: this.resetCode(),
              password: this.newPassword()
            })
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.message || 'Unable to reset password.');
          this.resetMessage.set('Password reset. You can now log in.');
          this.newPassword.set('');
          this.resetCode.set('');
        } catch (err: any) {
          this.errorMessage.set(err.message || 'Unable to reset password.');
        }
  }
}
