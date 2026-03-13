import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../services/modal.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-alert-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (modal.message()) {
      <div (click)="close()" style="position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(8px);">
        <div (click)="$event.stopPropagation()"
             [style.background-color]="theme.colors().bg"
             [style.border]="'1px solid ' + theme.colors().border"
             style="width: 100%; max-width: 420px; padding: 28px; border-radius: 0px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); position: relative; text-align: center;">
          <button (click)="close()" [style.color]="theme.colors().textSecondary" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 18px; cursor: pointer;">✕</button>
          <h3 style="font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 12px;">Notice</h3>
          <p [style.color]="theme.colors().textSecondary" style="font-size: 13px; line-height: 1.6; margin: 0 0 20px;">{{ modal.message() }}</p>
          <button (click)="close()" [style.background-color]="theme.colors().primary"
                  style="color: white; border: none; padding: 10px 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">
            Close
          </button>
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
