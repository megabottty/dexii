import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

@Component({
  selector: 'app-signup-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="signup-page">
      <div class="signup-container">
        <app-page-hint
          hintKey="signup_profile"
          title="Create Your Profile"
          message="Choose a unique username and optional bio to get started.">
        </app-page-hint>

        <div class="signup-header">
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
           <p [style.color]="theme.colors().textSecondary" class="signup-subtitle">Create Your Profile</p>
        </div>

        @if (errorMessage()) {
          <p class="error-message">{{ errorMessage() }}</p>
        }

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="signup-form">
          <label [style.color]="theme.colors().textSecondary" class="form-label">Username</label>
          <input [ngModel]="username()" (ngModelChange)="username.set($event)"
                 [style.background-color]="theme.colors().bg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.color]="theme.colors().text"
                 class="form-input" placeholder="e.g. dev_user">

          <label [style.color]="theme.colors().textSecondary" class="form-label">Email (Optional)</label>
          <input [ngModel]="email()" (ngModelChange)="email.set($event)"
                 [style.background-color]="theme.colors().bg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.color]="theme.colors().text"
                 class="form-input" placeholder="email@example.com">

          <label [style.color]="theme.colors().textSecondary" class="form-label">Bio (Optional)</label>
          <textarea [ngModel]="bio()" (ngModelChange)="bio.set($event)"
                    [style.background-color]="theme.colors().bg"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    rows="3"
                    class="form-textarea" placeholder="Tell us about yourself..."></textarea>

          <div class="love-life-section">
            <h3 [style.color]="theme.colors().text" class="section-title">Love Life Info</h3>

            <label [style.color]="theme.colors().textSecondary" class="form-label">Relationship Status</label>
            <select [ngModel]="relationshipStatus()" (ngModelChange)="relationshipStatus.set($event)"
                    [style.background-color]="theme.colors().bg"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    class="form-input">
              <option value="">Select Status</option>
              <option value="Single">Single</option>
              <option value="In a Relationship">In a Relationship</option>
              <option value="Married">Married</option>
              <option value="It's Complicated">It's Complicated</option>
              <option value="Open Relationship">Open Relationship</option>
              <option value="Other">Other</option>
            </select>

            <label [style.color]="theme.colors().textSecondary" class="form-label">Looking For</label>
            <select [ngModel]="lookingFor()" (ngModelChange)="lookingFor.set($event)"
                    [style.background-color]="theme.colors().bg"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    class="form-input">
              <option value="">Select Goal</option>
              <option value="Long-term">Long-term</option>
              <option value="Short-term">Short-term</option>
              <option value="Friendship">Friendship</option>
              <option value="Not Sure">Not Sure</option>
              <option value="Other">Other</option>
            </select>

            <label [style.color]="theme.colors().textSecondary" class="form-label">Interested In</label>
            <select [ngModel]="interestedIn()" (ngModelChange)="interestedIn.set($event)"
                    [style.background-color]="theme.colors().bg"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    class="form-input">
              <option value="">Select Interest</option>
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Everyone">Everyone</option>
              <option value="Other">Other</option>
            </select>

            <label [style.color]="theme.colors().textSecondary" class="form-label">Love Language</label>
            <select [ngModel]="loveLanguage()" (ngModelChange)="loveLanguage.set($event)"
                    [style.background-color]="theme.colors().bg"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    class="form-input">
              <option value="">Select Love Language</option>
              <option value="Words of Affirmation">Words of Affirmation</option>
              <option value="Acts of Service">Acts of Service</option>
              <option value="Receiving Gifts">Receiving Gifts</option>
              <option value="Quality Time">Quality Time</option>
              <option value="Physical Touch">Physical Touch</option>
            </select>

            <label [style.color]="theme.colors().textSecondary" class="form-label">My Ideal Date</label>
            <textarea [ngModel]="idealDate()" (ngModelChange)="idealDate.set($event)"
                      [style.background-color]="theme.colors().bg"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().text"
                      rows="2"
                      class="form-textarea" placeholder="Describe your perfect first date..."></textarea>
          </div>

          <button (click)="continue()"
                  [style.background-color]="theme.colors().primary"
                  class="submit-button">
            Continue To PIN Setup
          </button>

          <button routerLink="/login" [style.color]="theme.colors().textSecondary" class="back-link">
             Back to Login
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .signup-page {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .signup-container {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .signup-header {
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
    .signup-subtitle {
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
    .signup-form {
      padding: 24px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .form-input, .form-textarea {
      padding: 12px;
      border-radius: 8px;
      font-size: 1rem;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
    }
    .love-life-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 500;
      margin: 0;
      opacity: 0.9;
    }
    .submit-button {
      padding: 14px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      border: none;
      cursor: pointer;
      margin-top: 8px;
    }
    .back-link {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      margin-top: 8px;
    }
  `]
})
export class SignupProfileComponent {
  public theme = inject(ThemeService);
  private router = inject(Router);

  username = signal<string>(localStorage.getItem('dexii_api_username') || '');
  email = signal<string>(localStorage.getItem('dexii_profile_email') || '');
  bio = signal<string>(localStorage.getItem('dexii_profile_bio') || '');
  relationshipStatus = signal<string>(localStorage.getItem('dexii_profile_relationshipStatus') || '');
  lookingFor = signal<string>(localStorage.getItem('dexii_profile_lookingFor') || '');
  interestedIn = signal<string>(localStorage.getItem('dexii_profile_interestedIn') || '');
  loveLanguage = signal<string>(localStorage.getItem('dexii_profile_loveLanguage') || '');
  idealDate = signal<string>(localStorage.getItem('dexii_profile_idealDate') || '');
  errorMessage = signal<string>('');

  continue() {
    const usernameValue = this.username().trim();
    if (!usernameValue) {
      this.errorMessage.set('Username is required.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(usernameValue)) {
      this.errorMessage.set('Username: 3-24 chars, letters/numbers/underscore.');
      return;
    }

    const emailValue = this.email().trim();
    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      this.errorMessage.set('Enter a valid email or leave it blank.');
      return;
    }

    localStorage.setItem('dexii_api_username', usernameValue);
    if (emailValue) {
      localStorage.setItem('dexii_profile_email', emailValue);
    } else {
      localStorage.removeItem('dexii_profile_email');
    }
    localStorage.setItem('dexii_profile_bio', this.bio().trim());
    localStorage.setItem('dexii_profile_relationshipStatus', this.relationshipStatus());
    localStorage.setItem('dexii_profile_lookingFor', this.lookingFor());
    localStorage.setItem('dexii_profile_interestedIn', this.interestedIn());
    localStorage.setItem('dexii_profile_loveLanguage', this.loveLanguage());
    localStorage.setItem('dexii_profile_idealDate', this.idealDate().trim());
    localStorage.removeItem('dexii_api_token');

    this.errorMessage.set('');
    this.router.navigate(['/signup-pin']);
  }
}
