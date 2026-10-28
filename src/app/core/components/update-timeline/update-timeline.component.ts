import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Entry } from '../../models/entry.model';
import { ThemeService } from '../../services/theme.service';
import { personName } from '../../utils/person-name';
import { IconComponent } from '../icon/icon.component';

type TimelineEntry = Entry & { owner?: { id?: string; username?: string; displayName?: string; avatarUrl?: string } };

interface DayGroup { key: string; label: string; entries: TimelineEntry[]; }

/** A little sticker per update, picked from its id so it never changes between visits. */
const STICKERS = ['💌', '💗', '✨', '🌸', '🦋', '💫', '🍓', '🌷'];

/**
 * Updates For Friends as a love-life timeline (DEX-44): updates grouped by day on a heart rail.
 * The owner gets the "What's new?" composer and can edit or delete; friends just read.
 * The parent owns the "Send update?" confirm and saving.
 */
@Component({
  selector: 'app-update-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, IconComponent],
  styleUrl: './update-timeline.component.css',
  host: {
    '[style.--ut-primary]': 'theme.colors().primary',
    '[style.--ut-accent]': 'theme.colors().accent',
    '[style.--ut-bg]': 'theme.colors().bg',
    '[style.--ut-text]': 'theme.colors().text',
    '[style.--ut-muted]': 'theme.colors().textSecondary',
    '[style.--ut-border]': 'theme.colors().border'
  },
  template: `
    @if (canPost()) {
      <div class="ut-composer">
        <label class="ut-composer__label" for="ut-draft"><span aria-hidden="true">💌</span> What's new with {{ crushName() }}?</label>
        <textarea id="ut-draft" class="ut-composer__input" rows="3" maxlength="2000"
                  [ngModel]="draft()" (ngModelChange)="draft.set($event)"
                  placeholder="A text, a date, a moment…"></textarea>
        <div class="ut-composer__footer">
          <span class="ut-audience">
            <span aria-hidden="true">{{ audience().length ? '👯' : '🔒' }}</span>
            {{ audience().length ? 'Goes to ' + audienceList() : "Not shared with anyone yet, so only you will see it" }}
          </span>
          <button type="button" class="ut-share" [disabled]="!draft().trim()" (click)="share.emit(draft().trim())">
            Share Update <span aria-hidden="true">💌</span>
          </button>
        </div>
      </div>
    }

    @if (groups().length === 0) {
      <div class="ut-empty">
        <span class="ut-empty__art" aria-hidden="true">💞</span>
        <p class="ut-empty__title">{{ canPost() ? 'Your love story starts here' : 'No updates yet' }}</p>
        <p class="ut-empty__copy">{{ canPost() ? 'Post your first update and friends you share ' + crushName() + ' with will see it.' : 'When there’s news about ' + crushName() + ', it shows up here.' }}</p>
      </div>
    } @else {
      <ol class="ut-timeline" [attr.aria-label]="'Updates about ' + crushName()">
        @for (group of groups(); track group.key) {
          <li class="ut-day">
            <h4 class="ut-day__label">{{ group.label }}</h4>
            <ol class="ut-day__items">
              @for (entry of group.entries; track entry.id) {
                <li class="ut-item">
                  <span class="ut-item__sticker" aria-hidden="true">{{ sticker(entry) }}</span>
                  <article class="ut-bubble">
                    <header class="ut-bubble__meta">
                      @if (!canPost() && entry.owner) {
                        <span class="ut-bubble__author">
                          @if (entry.owner.avatarUrl) { <img [src]="entry.owner.avatarUrl" alt="" class="ut-bubble__avatar"> }
                          {{ authorName(entry) }}
                        </span>
                      }
                      <time [attr.datetime]="iso(entry.timestamp)">{{ entry.timestamp | date:'h:mm a' }}</time>
                      @if (entry.editedAt) { <span>· edited</span> }
                      @if (canPost()) {
                        <span class="ut-bubble__actions">
                          <button type="button" class="ut-icon-btn" (click)="startEdit(entry)" aria-label="Edit update" title="Edit"><app-icon name="pencil" /></button>
                          <button type="button" class="ut-icon-btn ut-icon-btn--danger" (click)="remove.emit(entry)" aria-label="Delete update" title="Delete"><app-icon name="trash" /></button>
                        </span>
                      }
                    </header>
                    @if (editingId() === entry.id) {
                      <textarea class="ut-composer__input" rows="3" aria-label="Edit update" [ngModel]="editDraft()" (ngModelChange)="editDraft.set($event)"></textarea>
                      <div class="ut-edit-actions">
                        <button type="button" class="ut-ghost" (click)="editingId.set(null)">Cancel</button>
                        <button type="button" class="ut-share" [disabled]="!editDraft().trim()" (click)="saveEdit(entry)">Save</button>
                      </div>
                    } @else {
                      <p class="ut-bubble__text">{{ entry.content }}</p>
                    }
                  </article>
                </li>
              }
            </ol>
          </li>
        }
      </ol>
    }
  `
})
export class UpdateTimelineComponent {
  readonly theme = inject(ThemeService);

  /** Updates, any order; shown newest first. */
  readonly entries = input.required<TimelineEntry[]>();
  readonly crushName = input('this crush');
  /** Owner view: composer, edit and delete. */
  readonly canPost = input(false);
  /** Names of the friends this crush is shared with (who an update reaches). */
  readonly audience = input<string[]>([]);
  readonly draft = model('');

  readonly share = output<string>();
  readonly edit = output<{ entry: Entry; content: string }>();
  readonly remove = output<Entry>();

  readonly editingId = signal<string | null>(null);
  readonly editDraft = signal('');

  readonly audienceList = computed(() => {
    const names = this.audience();
    return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} + ${names.length - 3} more`;
  });

  readonly groups = computed<DayGroup[]>(() => {
    const sorted = [...this.entries()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const groups: DayGroup[] = [];
    for (const entry of sorted) {
      const date = new Date(entry.timestamp);
      const key = date.toDateString();
      let group = groups[groups.length - 1];
      if (!group || group.key !== key) {
        group = { key, label: dayLabel(date), entries: [] };
        groups.push(group);
      }
      group.entries.push(entry);
    }
    return groups;
  });

  sticker(entry: Entry): string {
    let hash = 0;
    for (const ch of String(entry.id)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return STICKERS[hash % STICKERS.length];
  }

  authorName(entry: TimelineEntry): string {
    return personName(entry.owner);
  }

  iso(value: Date | string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  startEdit(entry: Entry): void {
    this.editingId.set(entry.id);
    this.editDraft.set(entry.content);
  }

  saveEdit(entry: Entry): void {
    const content = this.editDraft().trim();
    if (!content) return;
    this.edit.emit({ entry, content });
    this.editingId.set(null);
  }
}

/** "Today", "Yesterday", or "Sat, Oct 24" (with the year when it isn't this year). */
export function dayLabel(date: Date, today: Date = new Date()): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
  });
}
