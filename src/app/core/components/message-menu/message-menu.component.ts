import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

/**
 * The "⋯" on a chat message, like other chat apps: your own message can be edited
 * (for 15 minutes) or deleted for everyone; any message can be deleted just for you.
 */
@Component({
  selector: 'app-message-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="mm-trigger" [style.color]="theme.colors().textSecondary"
            [attr.aria-expanded]="open()" aria-haspopup="menu" aria-label="Message options"
            (click)="toggle($event)">⋯</button>
    @if (open()) {
      <div class="mm-menu" role="menu" [class.mm-menu--end]="mine()"
           [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border">
        @if (canEdit()) {
          <button type="button" role="menuitem" class="mm-item" [style.color]="theme.colors().text" (click)="pick('edit')">✏️ Edit</button>
        }
        @if (mine() && !deleted()) {
          <button type="button" role="menuitem" class="mm-item mm-item--danger" (click)="pick('everyone')">🗑️ Delete for everyone</button>
        }
        <button type="button" role="menuitem" class="mm-item mm-item--danger" (click)="pick('me')">🙈 Delete for me</button>
      </div>
    }
  `,
  styles: [`
    :host { position: relative; display: inline-flex; }
    .mm-trigger {
      width: 32px; height: 32px; min-height: 32px; padding: 0;
      border: none; border-radius: 50%; background: transparent;
      font-size: 20px; line-height: 1; cursor: pointer;
    }
    .mm-trigger:hover { background: rgba(127, 127, 127, 0.14); }
    .mm-menu {
      position: absolute; top: calc(100% + 4px); left: 0; z-index: 30;
      min-width: 190px; padding: 6px; border-radius: 12px;
      display: grid; gap: 2px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
    }
    .mm-menu--end { left: auto; right: 0; }
    .mm-item {
      min-height: 40px; padding: 8px 12px; border: none; border-radius: 8px;
      background: transparent; text-align: left; font: inherit; font-size: var(--fs-small); font-weight: 600; cursor: pointer;
    }
    .mm-item:hover { background: rgba(127, 127, 127, 0.12); }
    .mm-item--danger { color: var(--danger); }
  `]
})
export class MessageMenuComponent {
  readonly theme = inject(ThemeService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly mine = input(false);
  readonly canEdit = input(false);
  readonly deleted = input(false);

  readonly edit = output<void>();
  readonly deleteForEveryone = output<void>();
  readonly deleteForMe = output<void>();

  readonly open = signal(false);

  toggle(event: Event): void {
    event.stopPropagation();
    this.open.set(!this.open());
  }

  pick(action: 'edit' | 'everyone' | 'me'): void {
    this.open.set(false);
    if (action === 'edit') this.edit.emit();
    else if (action === 'everyone') this.deleteForEveryone.emit();
    else this.deleteForMe.emit();
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:keydown.escape', ['$event'])
  close(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
    if (event.type === 'keydown') this.open.set(false);
  }
}
