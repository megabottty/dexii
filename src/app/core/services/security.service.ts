import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalService } from './modal.service';
import { getApiBaseUrl } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private router = inject(Router);
  private modal = inject(ModalService);
  private apiBase = getApiBaseUrl();

  private _isVerified18 = signal<boolean>(false);
  public isVerified18 = this._isVerified18.asReadonly();
  private _needsPinSetup = signal<boolean>(false);
  public needsPinSetup = this._needsPinSetup.asReadonly();

  // New logged in state
  private _isLoggedIn = signal<boolean>(false);
  public isLoggedIn = this._isLoggedIn.asReadonly();

  // 1. The core state of the app's privacy
  private _isLocked = signal<boolean>(true);
  private _userPin = signal<string | null>(null); // In a real app, this would be hashed in storage

  // 2. Publicly accessible Read-Only signal
  public isLocked = this._isLocked.asReadonly();

  constructor() {
    const savedPin = localStorage.getItem('dexii_pin');
    const savedToken = localStorage.getItem('dexii_api_token');

    if (savedToken) {
      this._isLoggedIn.set(true);
    } else {
      this._isLoggedIn.set(false);
    }

    if (savedPin && /^\d{4}$/.test(savedPin)) {
      this._userPin.set(savedPin);
      this._isLocked.set(true);
    } else if (savedToken) {
      // If we have a token but no pin (maybe cleared?), we should probably still lock
      this._isLocked.set(true);
      this._needsPinSetup.set(false);
    } else {
      this._isLocked.set(true);
      this._needsPinSetup.set(true);
      this._userPin.set(null);
      localStorage.removeItem('dexii_pin');
    }
  }

  // 3. Logic to unlock the app
  async verifyPin(input: string, shouldNavigate: boolean = true): Promise<boolean> {
    const username = localStorage.getItem('dexii_api_username');

    if (username) {
      try {
        const response = await fetch(`${this.apiBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, pin: input })
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('dexii_api_token', data.token);
          this._isLoggedIn.set(true);
          if (shouldNavigate) {
            this._isLocked.set(false);
            this.router.navigate(['/dashboard']);
          } else {
            this._isLocked.set(true);
          }
          return true;
        }
      } catch (err) {
        console.error('Auth API error, falling back to local:', err);
      }
    }

    // Fallback to local pin if offline or not registered yet
    if (input === this._userPin()) {
      if (shouldNavigate) {
        this._isLocked.set(false);
        this.router.navigate(['/dashboard']);
      } else {
        this._isLocked.set(true);
      }
      return true;
    }
    return false;
  }

  // 4. Manual lock (e.g., a "Lock Now" button)
  lockApp(): void {
    this._isLocked.set(true);
    this.router.navigate(['/lock']);
  }

  // 6. Stealth Toggle (Simulation)
  toggleStealthMode(): void {
    // This would swap the app icon or change the manifest in a real build
    this.modal.show("Stealth Mode Activated. The app icon will now appear as 'Simple Notes' on your home screen.");
  }

  // 7. 18+ Verification
  verifyAge(): void {
    // Mocking an external ID verification flow or AI face analysis
    this.modal.confirm(
      "Please confirm you are 18+ to access intimate content. This requires ID verification.",
      () => {
        this._isVerified18.set(true);
      }
    );
  }

  // 8. Content Moderation (Mock)
  moderateContent(content: string): boolean {
    // Mock logic for AI moderation
    const bannedWords = ['badword1', 'badword2']; // Example
    return !bannedWords.some(word => content.toLowerCase().includes(word));
  }

  // 5. Initial setup
  async setInitialPin(newPin: string): Promise<void> {
    if (!/^\d{4}$/.test(newPin)) {
      return;
    }
    // We now have a confirmation step, so we store it as pending
    localStorage.setItem('dexii_pending_pin', newPin);

    try {
      await this.registerUser(newPin);
      this.router.navigate(['/signup-email-confirmation']);
    } catch (err: any) {
      this.modal.show("Error: " + err.message);
    }
  }

  finalizeSetup(finalPin: string): void {
    localStorage.setItem('dexii_pin', finalPin);
    this._userPin.set(finalPin);
    this._needsPinSetup.set(false);
    this._isLoggedIn.set(true);
    this._isLocked.set(true);
    this.router.navigate(['/lock']);
  }

  async registerUser(pin: string): Promise<void> {
    const username = localStorage.getItem('dexii_api_username');
    const email = localStorage.getItem('dexii_profile_email');
    const bio = localStorage.getItem('dexii_profile_bio');

    if (!username) throw new Error('Username missing');

    const response = await fetch(`${this.apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin, email, bio })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }
  }

  async verifyEmailCode(code: string): Promise<void> {
    const username = localStorage.getItem('dexii_api_username');
    if (!username) throw new Error('Username missing');

    const response = await fetch(`${this.apiBase}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Verification failed');
    }

    const data = await response.json();
    localStorage.setItem('dexii_api_token', data.token);

    // We get the pin from pending since it wasn't saved to dexii_pin yet
    const pendingPin = localStorage.getItem('dexii_pending_pin');
    if (pendingPin) {
       this.finalizeSetup(pendingPin);
    }
  }

  async resendVerificationCode(): Promise<void> {
    const username = localStorage.getItem('dexii_api_username');
    if (!username) throw new Error('Username missing');

    const response = await fetch(`${this.apiBase}/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to resend code');
    }
  }

  recoverPinToDefault(): void {
    this.setInitialPin('1111');
  }

  resetPinSetup(): void {
    localStorage.removeItem('dexii_pin');
    localStorage.removeItem('dexii_api_token');
    localStorage.removeItem('dexii_api_username');
    this._userPin.set(null);
    this._isLoggedIn.set(false);
    this._isLocked.set(true);
    this._needsPinSetup.set(true);
    this.router.navigate(['/login']);
  }
}
