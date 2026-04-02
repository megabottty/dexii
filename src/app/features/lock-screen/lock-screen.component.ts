import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';
import { ModalService } from '../../core/services/modal.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  styleUrl: './lock-screen.component.css',
  imports: [CommonModule, FormsModule, RouterModule, PageHintComponent],
  templateUrl: './lock-screen.component.html'
})
export class LockScreenComponent {
  public security = inject(SecurityService);
  public theme = inject(ThemeService);
  private modal = inject(ModalService);

  enteredPin = signal<string>('');
  errorMessage = signal<string>('');

  async handleInput(val: string) {
    if (this.enteredPin().length >= 4) {
      return;
    }

    const nextPin = `${this.enteredPin()}${val}`;
    this.enteredPin.set(nextPin);

    if (nextPin.length !== 4) {
      return;
    }

    const success = await this.security.verifyPin(nextPin);
    if (!success) {
      this.errorMessage.set('Incorrect PIN.');
      this.clear();
    }
  }

  recoverPin() {
    this.modal.confirm('Reset your PIN to the test PIN 1111?', () => {
      this.errorMessage.set('');
      this.security.recoverPinToDefault();
    });
  }

  createNewAccount() {
    this.modal.confirm('Create a new account on this device? This will clear local PIN/profile data.', () => {
      localStorage.removeItem('dexii_api_username');
      localStorage.removeItem('dexii_profile_email');
      localStorage.removeItem('dexii_profile_bio');
      localStorage.removeItem('dexii_api_token');
      localStorage.removeItem('dexii_walkthrough_seen');
      localStorage.removeItem('dexii_api_token'); // Ensure token is gone to trigger isLoggedIn update
      this.security.resetPinSetup();
    });
  }

  clear() {
    this.enteredPin.set('');
  }
}
