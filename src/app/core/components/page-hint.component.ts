import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-page-hint',
  standalone: true,
  styleUrl: './page-hint.component.css',
  template: `
    @if (!dismissed()) {
      @if (expanded()) {
        <div class="page-hint-component__s1" role="note" aria-live="polite">
          <div class="page-hint-component__s2">
            <div>
              <p class="page-hint-component__s3">{{ title }}</p>
              <p class="page-hint-component__s4">{{ message }}</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button (click)="expanded.set(false)"
                      aria-label="Collapse hint"
                      class="page-hint-component__s5">✕</button>
              <button (click)="dismiss()"
                      aria-label="Never show this hint again"
                      style="font-size: 8px; opacity: 0.6; background: none; border: none; cursor: pointer; padding: 0; text-transform: uppercase;">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      } @else {
        <button (click)="expanded.set(true)"
                aria-label="Show page hint"
                class="page-hint-toggle">
          💡
        </button>
      }
    }
  `
})
export class PageHintComponent {
  @Input() title = 'Hint';
  @Input() message = '';
  @Input() hintKey = '';

  dismissed = signal(false);
  expanded = signal(false);

  ngOnInit() {
    if (!this.hintKey) return;
    this.dismissed.set(localStorage.getItem(`dexii_hint_${this.hintKey}`) === '1');
  }

  dismiss() {
    this.dismissed.set(true);
    if (this.hintKey) {
      localStorage.setItem(`dexii_hint_${this.hintKey}`, '1');
    }
  }
}
