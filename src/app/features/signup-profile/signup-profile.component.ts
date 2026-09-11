import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { UserSettingsService } from '../../core/services/user-settings.service';
import { FriendsApiService } from '../../core/services/friends-api.service';
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
           @if (inviterName()) {
             <p [style.color]="theme.colors().primary"
                [style.border]="'1px solid ' + theme.colors().primary"
                class="signup-invite-banner">
               ✦ {{ inviterName() }} invited you — you'll be friends automatically
             </p>
           }
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
                 autocomplete="off"
                 class="form-input" placeholder="e.g. dev_user">

          <label [style.color]="theme.colors().textSecondary" class="form-label">Email</label>
          <input [ngModel]="email()" (ngModelChange)="email.set($event)"
                 [style.background-color]="theme.colors().bg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 [style.color]="theme.colors().text"
                 autocomplete="off"
                 class="form-input" placeholder="email@example.com">

          <label [style.color]="theme.colors().textSecondary" class="form-label">Password</label>
          <div class="password-input-wrapper">
            <input [ngModel]="password()" (ngModelChange)="password.set($event)"
                   [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" minlength="8"
                   [style.background-color]="theme.colors().bg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   [style.color]="theme.colors().text"
                   class="form-input form-input--password" placeholder="At least 8 characters">
            <button type="button"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                    class="password-toggle-btn"
                    [style.color]="theme.colors().textSecondary">
              @if (showPassword()) {
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

          <label [style.color]="theme.colors().textSecondary" class="form-label">Confirm Password</label>
          <div class="password-input-wrapper">
            <input [ngModel]="confirmPassword()" (ngModelChange)="confirmPassword.set($event)"
                   [type]="showConfirmPassword() ? 'text' : 'password'" autocomplete="new-password" minlength="8"
                   [style.background-color]="theme.colors().bg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   [style.color]="theme.colors().text"
                   class="form-input form-input--password" placeholder="Re-enter your password">
            <button type="button"
                    (click)="showConfirmPassword.set(!showConfirmPassword())"
                    [attr.aria-label]="showConfirmPassword() ? 'Hide confirm password' : 'Show confirm password'"
                    class="password-toggle-btn"
                    [style.color]="theme.colors().textSecondary">
              @if (showConfirmPassword()) {
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
          <p class="password-hint" [style.color]="theme.colors().textSecondary">
            Use at least 8 characters. This password is for account login; your Vault PIN comes next.
          </p>

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
    .signup-invite-banner {
      margin: 12px 0 0 0;
      padding: 10px 16px;
      border-radius: 9999px;
      font-size: 12px;
      letter-spacing: 1px;
      text-align: center;
    }
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
    .password-hint {
      margin: -8px 0 0;
      font-size: 0.75rem;
      line-height: 1.4;
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
export class SignupProfileComponent implements OnInit {
  public theme = inject(ThemeService);
  private router = inject(Router);
  private settings = inject(UserSettingsService);
  private route = inject(ActivatedRoute);
  private friendsApi = inject(FriendsApiService);

  inviterName = signal<string>('');
  username = signal<string>(this.settings.getSignupDraft().username || '');
  email = signal<string>(this.settings.getSignupDraft().email || '');
  password = signal<string>('');
  confirmPassword = signal<string>('');
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  bio = signal<string>(this.settings.getSignupDraft().bio || '');
  relationshipStatus = signal<string>(this.settings.getSignupDraft().relationshipStatus || '');
  lookingFor = signal<string>(this.settings.getSignupDraft().lookingFor || '');
  interestedIn = signal<string>(this.settings.getSignupDraft().interestedIn || '');
  loveLanguage = signal<string>(this.settings.getSignupDraft().loveLanguage || '');
  idealDate = signal<string>(this.settings.getSignupDraft().idealDate || '');
  errorMessage = signal<string>('');

  ngOnInit(): void {
    const token = (this.route.snapshot.queryParamMap.get('invite') || '').trim();
    if (!token) return;

    localStorage.setItem('dexii_invite_token', token);
    void this.friendsApi.lookupInvite(token).then((invite) => {
      if (invite?.inviterName) {
        this.inviterName.set(invite.inviterName);
      } else {
        // Expired or already-used links shouldn't silently attach to the signup.
        localStorage.removeItem('dexii_invite_token');
      }
    });
  }

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
    if (!emailValue) {
      this.errorMessage.set('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      this.errorMessage.set('Enter a valid email address.');
      return;
    }

    if (this.password().length < 8) {
      this.errorMessage.set('Password must be at least 8 characters.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.settings.updateSignupDraft({
      username: usernameValue,
      email: emailValue,
      bio: this.bio().trim(),
      relationshipStatus: this.relationshipStatus() as any,
      lookingFor: this.lookingFor() as any,
      interestedIn: this.interestedIn() as any,
      loveLanguage: this.loveLanguage() as any,
      idealDate: this.idealDate().trim(),
      displayName: usernameValue
    });

    localStorage.setItem('dexii_pending_username', usernameValue);
    localStorage.setItem('dexii_pending_email', emailValue);
    sessionStorage.setItem('dexii_pending_password', this.password());
    localStorage.setItem('dexii_pending_bio', this.bio().trim());
    localStorage.setItem('dexii_pending_relationshipStatus', this.relationshipStatus());
    localStorage.setItem('dexii_pending_lookingFor', this.lookingFor());
    localStorage.setItem('dexii_pending_interestedIn', this.interestedIn());
    localStorage.setItem('dexii_pending_loveLanguage', this.loveLanguage());
    localStorage.setItem('dexii_pending_idealDate', this.idealDate().trim());

    this.errorMessage.set('');
    this.router.navigate(['/signup-pin']);
  }
}
