import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FocusTrapDirective } from '../../a11y/focus-trap.directive';
import { DataService } from '../../services/data.service';
import { ThemeService } from '../../services/theme.service';
import { CrushProfile } from '../../models/crush-profile.model';

/**
 * Pick which of your crushes a friend can see, all at once: tick any number of
 * crushes (or Select all / Clear all), then Share — one confirm, one diff against
 * what's already shared, instead of a separate tap per crush. Used on the friends
 * list (share without leaving the list) and on a friend's page.
 */
@Component({
  selector: 'app-crush-share-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crush-share-picker.component.css',
  imports: [CommonModule, RouterModule, FocusTrapDirective],
  template: `
    <div class="csp-backdrop" (click)="close()">
      <div [style.background-color]="theme.colors().bg"
           [style.border]="'1px solid ' + theme.colors().border"
           class="csp-card"
           role="dialog" aria-modal="true" aria-labelledby="csp-title" appFocusTrap (escaped)="close()"
           (click)="$event.stopPropagation()">

        <div class="csp-header">
          <h3 id="csp-title" class="csp-title">Share with {{ friendName() || 'this friend' }}</h3>
          <button type="button" (click)="close()" [style.color]="theme.colors().textSecondary" aria-label="Close" class="csp-close">×</button>
        </div>

        <p [style.color]="theme.colors().textSecondary" class="csp-hint">
          Pick any number of crushes. {{ friendName() || 'They' }} will see each one's profile and whatever you share about it.
        </p>

        @if (crushes().length > 0) {
          <div class="csp-tools">
            <button type="button" (click)="selectAll()" [style.color]="theme.colors().onBgPrimary" [style.border]="'1px solid ' + theme.colors().primary" class="csp-tool-btn">Select all</button>
            <button type="button" (click)="clearAll()" [style.color]="theme.colors().textSecondary" [style.border]="'1px solid ' + theme.colors().border" class="csp-tool-btn">Clear all</button>
          </div>
        }

        <div class="csp-list">
          @for (crush of crushes(); track crush.id) {
            <div [style.background-color]="theme.colors().bgSecondary"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="csp-row">
              <div class="csp-row-info">
                <img [src]="crush.avatarUrl || 'https://i.pravatar.cc/150?u=' + crush.nickname" [alt]="crush.nickname" class="csp-avatar">
                <div>
                  <p class="csp-name">{{ crush.nickname }}</p>
                  @if (crush.fullName) { <p [style.color]="theme.colors().textSecondary" class="csp-fullname">{{ crush.fullName }}</p> }
                </div>
              </div>
              <button type="button"
                      (click)="toggle(crush.id)"
                      [attr.aria-pressed]="isSelected(crush.id)"
                      [style.background-color]="isSelected(crush.id) ? theme.colors().primary : 'transparent'"
                      [style.color]="isSelected(crush.id) ? '#fff' : theme.colors().text"
                      [style.border]="'1px solid ' + (isSelected(crush.id) ? theme.colors().primary : theme.colors().border)"
                      class="csp-toggle">
                {{ isSelected(crush.id) ? 'Selected' : 'Select' }}
              </button>
            </div>
          } @empty {
            <div class="csp-empty">
              <p [style.color]="theme.colors().textSecondary">You have no crushes to share yet.</p>
              <a routerLink="/dashboard" (click)="close()" [style.color]="theme.colors().onBgPrimary">Create a crush profile</a>
            </div>
          }
        </div>

        @if (crushes().length > 0) {
          <div class="csp-actions">
            <button type="button" (click)="close()" [style.color]="theme.colors().onBgPrimary" [style.border]="'1px solid ' + theme.colors().primary" class="csp-cancel-btn">Cancel</button>
            <button type="button" (click)="confirm()" [disabled]="saving()" [style.background-color]="theme.colors().primary" class="csp-share-btn">
              {{ saving() ? 'Sharing…' : 'Share with selected' }}
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class CrushSharePickerComponent {
  private dataService = inject(DataService);
  protected theme = inject(ThemeService);

  readonly friendId = input.required<string>();
  readonly friendName = input<string>('');
  readonly closed = output<void>();

  protected saving = signal(false);
  private selected = signal<Set<string>>(new Set());

  crushes = computed<CrushProfile[]>(() => this.dataService.activeCrushes());

  constructor() {
    // Freshly seeded whenever this is mounted for a (possibly new) friend: start
    // from whatever is already shared with them, not from a blank slate.
    effect(() => {
      const friendId = this.friendId();
      const crushes = untracked(() => this.crushes());
      const current = crushes.filter((crush) => this.dataService.isCrushSharedWith(crush, friendId)).map((crush) => crush.id);
      this.selected.set(new Set(current));
    }, { allowSignalWrites: true });
  }

  isSelected(crushId: string): boolean {
    return this.selected().has(crushId);
  }

  toggle(crushId: string): void {
    this.selected.update((ids) => {
      const next = new Set(ids);
      if (next.has(crushId)) next.delete(crushId); else next.add(crushId);
      return next;
    });
  }

  selectAll(): void {
    this.selected.set(new Set(this.crushes().map((crush) => crush.id)));
  }

  clearAll(): void {
    this.selected.set(new Set());
  }

  async confirm(): Promise<void> {
    const friendId = this.friendId();
    if (!friendId || this.saving()) return;
    this.saving.set(true);
    try {
      const selected = this.selected();
      const tasks: Promise<void>[] = [];
      for (const crush of this.crushes()) {
        const shouldBeShared = selected.has(crush.id);
        const isShared = this.dataService.isCrushSharedWith(crush, friendId);
        if (shouldBeShared === isShared) continue;
        tasks.push(shouldBeShared
          ? this.dataService.shareCrushWith(crush.id, [friendId])
          : this.dataService.unshareCrushWith(crush.id, friendId));
      }
      await Promise.all(tasks);
    } finally {
      this.saving.set(false);
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }
}
