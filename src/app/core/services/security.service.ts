import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private router = inject(Router);

  private _isVerified18 = signal<boolean>(false);
  public isVerified18 = this._isVerified18.asReadonly();

  // 1. The core state of the app's privacy
  private _isLocked = signal<boolean>(true);
  private _userPin = signal<string | null>(null); // In a real app, this would be hashed in storage

  // 2. Publicly accessible Read-Only signal
  public isLocked = this._isLocked.asReadonly();

  constructor() {
    // Check local storage on init to see if a PIN was previously set
    const savedPin = localStorage.getItem('dexii_pin');
    console.log('SecurityService init, savedPin:', savedPin);
    if (savedPin) {
      this._userPin.set(savedPin);
      this._isLocked.set(true);
    } else {
      // If no PIN exists, it's a first-time user
      this._isLocked.set(false);
    }
  }

  // 3. Logic to unlock the app
  verifyPin(input: string): boolean {
    if (input === this._userPin()) {
      this._isLocked.set(false);
      this.router.navigate(['/dashboard']);
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
    alert("Stealth Mode Activated. The app icon will now appear as 'Simple Notes' on your home screen.");
  }

  // 7. 18+ Verification
  verifyAge(): void {
    // Mocking an external ID verification flow or AI face analysis
    const confirmed = confirm("Please confirm you are 18+ to access intimate content. This requires ID verification.");
    if (confirmed) {
      this._isVerified18.set(true);
    }
  }

  // 8. Content Moderation (Mock)
  moderateContent(content: string): boolean {
    // Mock logic for AI moderation
    const bannedWords = ['badword1', 'badword2']; // Example
    return !bannedWords.some(word => content.toLowerCase().includes(word));
  }

  // 5. Initial setup
  setInitialPin(newPin: string): void {
    localStorage.setItem('dexii_pin', newPin);
    this._userPin.set(newPin);
    this._isLocked.set(false);
  }
}
