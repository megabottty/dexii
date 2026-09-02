import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { WalkthroughService } from '../../services/walkthrough.service';

@Component({
  selector: 'app-walkthrough',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './walkthrough.component.css',
  template: `
    @if (walkthrough.isOpen()) {
      @if (walkthrough.currentStep(); as step) {
        <div class="walkthrough-overlay">
          <div role="dialog"
               aria-modal="true"
               aria-labelledby="walkthrough-title"
               aria-describedby="walkthrough-body"
               tabindex="-1"
               (keydown.escape)="walkthrough.skip()"
               [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               [style.color]="theme.colors().text"
               class="walkthrough-card">

            <button (click)="walkthrough.skip()"
                    [style.color]="theme.colors().textSecondary"
                    aria-label="Skip this walkthrough"
                    class="walkthrough-skip">
              Skip
            </button>

            @if (step.icon) {
              <div class="walkthrough-icon" aria-hidden="true">{{ step.icon }}</div>
            }

            <h2 id="walkthrough-title"
                [style.color]="theme.colors().primary"
                class="walkthrough-title">{{ step.title }}</h2>

            <p id="walkthrough-body"
               [style.color]="theme.colors().textSecondary"
               class="walkthrough-body">{{ step.body }}</p>

            @if (walkthrough.stepCount() > 1) {
              <div class="walkthrough-dots">
                @for (dot of dots(); track dot) {
                  <button (click)="walkthrough.goTo(dot)"
                          [style.background-color]="dot === walkthrough.index() ? theme.colors().primary : theme.colors().border"
                          [attr.aria-label]="'Go to step ' + (dot + 1)"
                          [attr.aria-current]="dot === walkthrough.index() ? 'step' : null"
                          class="walkthrough-dot"></button>
                }
              </div>
            }

            <div class="walkthrough-actions">
              <span [style.color]="theme.colors().textSecondary" class="walkthrough-step-count">
                Step {{ walkthrough.index() + 1 }} of {{ walkthrough.stepCount() }}
              </span>

              <div class="walkthrough-buttons">
                @if (!walkthrough.isFirstStep()) {
                  <button (click)="walkthrough.back()"
                          [style.background-color]="'transparent'"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.color]="theme.colors().textSecondary"
                          class="walkthrough-btn">
                    Back
                  </button>
                }
                <button (click)="walkthrough.next()"
                        [style.background-color]="theme.colors().primary"
                        class="walkthrough-btn walkthrough-btn--primary">
                  {{ walkthrough.isLastStep() ? 'Got it' : 'Next' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    }
  `
})
export class WalkthroughComponent {
  protected walkthrough = inject(WalkthroughService);
  protected theme = inject(ThemeService);

  protected dots(): number[] {
    return Array.from({ length: this.walkthrough.stepCount() }, (_, i) => i);
  }
}
