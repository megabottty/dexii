import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

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
          message="Enter your username and PIN to access your private vault.">
        </app-page-hint>

        <div class="login-header">
           <h2 class="login-title">Dexii</h2>
           <p [style.color]="theme.colors().textSecondary" class="login-subtitle">Login to your account</p>
        </div>

        @if (errorMessage()) {
          <p class="error-message">{{ errorMessage() }}</p>
        }

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="login-form">

          <label [style.color]="theme.colors().textSecondary" class="form-label">Username</label>
          <input [ngModel]="username()" (ngModelChange)="username.set($event)"
                 [style.background-color]="theme.colors().bg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.color]="theme.colors().text"
                 class="form-input" placeholder="Enter your username">

          <label [style.color]="theme.colors().textSecondary" class="form-label">4-Digit PIN</label>
          <input [ngModel]="pin()" (ngModelChange)="handlePinInput($event)"
                 type="password"
                 maxlength="4"
                 [style.background-color]="theme.colors().bg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.color]="theme.colors().text"
                 class="form-input" placeholder="****">

          <button (click)="login()"
                  [disabled]="isLoading()"
                  [style.background-color]="theme.colors().primary"
                  class="submit-button">
            {{ isLoading() ? 'Logging in...' : 'Login' }}
          </button>

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
    }
    .login-title {
      font-size: 2.5rem;
      font-weight: 200;
      letter-spacing: 4px;
      margin: 0;
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
  `]
})
export class LoginComponent {
  public theme = inject(ThemeService);
  private security = inject(SecurityService);
  private router = inject(Router);

  username = signal<string>('');
  pin = signal<string>('');
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  handlePinInput(val: string) {
    // Only allow numbers
    const clean = val.replace(/\D/g, '');
    this.pin.set(clean);
  }

  async login() {
    if (!this.username() || this.pin().length !== 4) {
      this.errorMessage.set('Please enter a username and a 4-digit PIN.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Temporarily store username for verifyPin to use
      localStorage.setItem('dexii_api_username', this.username());

      const success = await this.security.verifyPin(this.pin(), false);

      if (success) {
        this.router.navigate(['/lock']);
      } else {
        this.errorMessage.set('Invalid username or PIN.');
        this.isLoading.set(false);
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Login failed. Please try again.');
      this.isLoading.set(false);
    }
  }
}
