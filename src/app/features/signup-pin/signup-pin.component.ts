import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

@Component({
  selector: 'app-signup-pin',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="pin-page">
      <div class="pin-container">
        <app-page-hint
          hintKey="signup_pin"
          title="Create Your Vault PIN"
          message="This 4-digit PIN will be required every time you open Dexii.">
        </app-page-hint>

        <div class="pin-header">
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
           <p [style.color]="theme.colors().textSecondary" class="pin-subtitle">
             {{ setupPinFirst() ? 'Confirm your new PIN' : 'Create Your 4-Digit Vault PIN' }}
           </p>
        </div>

        @if (errorMessage()) {
          <p class="error-message">{{ errorMessage() }}</p>
        }

        <div class="pin-dots">
          @for (dot of [1,2,3,4]; track $index) {
            <div [style.background-color]="enteredPin().length > $index ? theme.colors().primary : 'transparent'"
                 [style.border]="'1px solid ' + (enteredPin().length > $index ? theme.colors().primary : theme.colors().textSecondary)"
                 [style.box-shadow]="enteredPin().length > $index ? '0 0 15px ' + theme.colors().primary : 'none'"
                 class="pin-dot"></div>
          }
        </div>

        @if (pinConfirmed()) {
          <div class="pin-actions">
            <button (click)="createAccount()"
                    [style.background-color]="theme.colors().primary"
                    class="submit-button">
              Create My Account
            </button>
          </div>
        } @else {
          <div class="keypad">
            @for (num of [1,2,3,4,5,6,7,8,9]; track num) {
              <button (click)="handleInput(num.toString())"
                      [style.background]="'transparent'"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().text"
                      class="keypad-btn">
                {{ num }}
              </button>
            }
            <div class="keypad-empty"></div>
            <button (click)="handleInput('0')"
                    [style.background]="'transparent'"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    class="keypad-btn">0</button>
            <button (click)="clear()" [style.color]="theme.colors().primary" class="keypad-clear-btn">Clear</button>
          </div>
        }

        <div class="pin-actions">
           <button routerLink="/signup-profile" [style.color]="theme.colors().textSecondary" [style.border]="'1px solid ' + theme.colors().border" class="aux-btn">
              Back to Profile
           </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pin-page {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .pin-container {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 30px;
    }
    .pin-header {
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
    .pin-subtitle {
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
    .pin-dots {
      display: flex;
      gap: 20px;
      margin-bottom: 10px;
    }
    .pin-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      transition: all 0.2s ease;
    }
    .keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      width: 100%;
      max-width: 300px;
    }
    .keypad-btn {
      aspect-ratio: 1;
      border-radius: 50%;
      font-size: 1.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .keypad-btn:active {
      transform: scale(0.9);
      opacity: 0.7;
    }
    .keypad-clear-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
    }
    .pin-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 300px;
    }
    .submit-button {
      padding: 14px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      border: none;
      cursor: pointer;
      width: 100%;
    }
    .aux-btn {
      padding: 12px;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
    }
  `]
})
export class SignupPinComponent {
  public theme = inject(ThemeService);
  private security = inject(SecurityService);
  private router = inject(Router);

  enteredPin = signal<string>('');
  setupPinFirst = signal<string>('');
  pinConfirmed = signal<boolean>(false);
  errorMessage = signal<string>('');

  handleInput(val: string) {
    if (this.enteredPin().length >= 4) return;

    const nextPin = `${this.enteredPin()}${val}`;
    this.enteredPin.set(nextPin);

    if (nextPin.length === 4) {
      if (!this.setupPinFirst()) {
        this.setupPinFirst.set(nextPin);
        this.clear();
      } else {
        if (this.setupPinFirst() === nextPin) {
          this.pinConfirmed.set(true);
        } else {
          this.errorMessage.set('PINs did not match. Try again.');
          this.setupPinFirst.set('');
          this.clear();
        }
      }
    }
  }

  createAccount() {
    if (this.pinConfirmed()) {
      this.security.setInitialPin(this.setupPinFirst());
    }
  }

  clear() {
    this.enteredPin.set('');
  }
}
