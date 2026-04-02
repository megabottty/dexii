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

  clear() {
    this.enteredPin.set('');
  }
}
