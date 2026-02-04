import { Component, signal, inject, OnInit } from '@angular/core';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  templateUrl: './lock-screen.component.html'
})
export class LockScreenComponent implements OnInit {
  private security = inject(SecurityService);
  public theme = inject(ThemeService);

  // Local signal for the UI dots
  enteredPin = signal<string>('');

  ngOnInit() {
    console.log('LockScreenComponent initialized');
  }

  handleInput(val: string) {
    console.log('Input received:', val);
    if (this.enteredPin().length < 4) {
      this.enteredPin.update(p => p + val);
    }

    // Auto-check when 4 digits are entered
    if (this.enteredPin().length === 4) {
      console.log('Verifying PIN:', this.enteredPin());
      const success = this.security.verifyPin(this.enteredPin());
      if (!success) {
        console.log('PIN incorrect');
        // Shake animation or error feedback could go here
        this.clear();
      }
    }
  }

  clear() {
    this.enteredPin.set('');
  }
}
