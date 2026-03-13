import { Component, signal, inject } from '@angular/core';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  templateUrl: './lock-screen.component.html'
})
export class LockScreenComponent {
  public security = inject(SecurityService);
  public theme = inject(ThemeService);

  enteredPin = signal<string>('');
  setupPinFirst = signal<string>('');
  errorMessage = signal<string>('');

  get setupMode(): boolean {
    return this.security.needsPinSetup();
  }

  handleInput(val: string) {
    if (this.enteredPin().length >= 4) {
      return;
    }

    const nextPin = `${this.enteredPin()}${val}`;
    this.enteredPin.set(nextPin);

    if (nextPin.length !== 4) {
      return;
    }

    if (this.setupMode) {
      if (!this.setupPinFirst()) {
        this.setupPinFirst.set(nextPin);
        this.clear();
        return;
      }

      if (this.setupPinFirst() === nextPin) {
        this.errorMessage.set('');
        this.security.setInitialPin(nextPin);
        return;
      }

      this.errorMessage.set('PINs did not match. Try again.');
      this.setupPinFirst.set('');
      this.clear();
      return;
    }

    const success = this.security.verifyPin(nextPin);
    if (!success) {
      this.errorMessage.set('Incorrect PIN.');
      this.clear();
    }
  }

  useDefaultPin() {
    this.errorMessage.set('');
    this.security.setInitialPin('1111');
  }

  recoverPin() {
    const confirmed = confirm('Reset your PIN to the test PIN 1111?');
    if (confirmed) {
      this.errorMessage.set('');
      this.security.recoverPinToDefault();
    }
  }

  startOverSetup() {
    this.setupPinFirst.set('');
    this.clear();
    this.errorMessage.set('');
  }

  clear() {
    this.enteredPin.set('');
  }
}
