import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../services/modal.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-alert-modal',
  standalone: true,
  styleUrl: './alert-modal.component.css',
  imports: [CommonModule, FormsModule],
  template: `
    @if (modal.message()) {
      <div (click)="close()" class="alert-modal-component__s1">
        <div (click)="$event.stopPropagation()"
             (keydown.escape)="close()"
             tabindex="-1"
             role="dialog"
             aria-modal="true"
             aria-labelledby="alert-modal-title"
             aria-describedby="alert-modal-message"
             [style.background-color]="theme.colors().bg"
             [style.border]="'1px solid ' + theme.colors().border"
             class="alert-modal-component__s2">
          <button (click)="close()" [style.color]="theme.colors().textSecondary" aria-label="Close notice" class="alert-modal-component__s3">✕</button>
          <h3 id="alert-modal-title" class="alert-modal-component__s4">Notice</h3>
          <p id="alert-modal-message" [style.color]="theme.colors().textSecondary" class="alert-modal-component__s5">{{ modal.message() }}</p>

          @if (modal.type() === 'prompt') {
            <input
              [ngModel]="modal.promptValue()"
              (ngModelChange)="modal.promptValue.set($event)"
              (keydown.enter)="modal.handleConfirm()"
              [style.background-color]="theme.colors().bgSecondary"
              [style.border]="'1px solid ' + theme.colors().border"
              [style.color]="theme.colors().text"
              class="alert-modal-prompt-input"
              autofocus
            />
          }

          <div class="alert-modal-actions">
            @if (modal.type() === 'confirm' || modal.type() === 'prompt') {
              <button (click)="modal.handleCancel()"
                      [style.background-color]="'transparent'"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().textSecondary"
                      class="alert-modal-component__s6">
                Cancel
              </button>
            }
            <button (click)="modal.handleConfirm()"
                    [style.background-color]="theme.colors().primary"
                    class="alert-modal-component__s6">
              {{ modal.type() === 'alert' ? 'Close' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class AlertModalComponent {
  protected modal = inject(ModalService);
  protected theme = inject(ThemeService);

  close(): void {
    this.modal.close();
  }
}
