import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, model, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Entry } from '../../models/entry.model';
import { DataService } from '../../services/data.service';
import { ModalService } from '../../services/modal.service';
import { SecurityService } from '../../services/security.service';
import { ThemeService } from '../../services/theme.service';
import { personName } from '../../utils/person-name';
import { IconComponent } from '../icon/icon.component';

type TimelineEntry = Entry & { owner?: { id?: string; username?: string; displayName?: string; avatarUrl?: string } };

interface DayGroup { key: string; label: string; entries: TimelineEntry[]; }

/**
 * Where on the screen counts as "what you're reading" for the heart slider (DEX-63):
 * 35% of the way down, just below the top menu.
 */
const READING_LINE = 0.35;

/** The reactions on offer; the server accepts exactly these (DEX-45). */
export const REACTION_EMOJIS = ['💗', '😍', '😂', '😬', '🔥', '🥺'];


/**
 * Updates For Friends as a love-life timeline (DEX-44): updates grouped by day beside a heart rail.
 * On a long timeline the rail is a slider (DEX-63): drag the heart, tap the rail or use the arrow
 * keys to move through older updates.
 * The owner gets the "What's new?" composer, edits, deletes and sees who reacted.
 * Friends react with an emoji and tap the chat icon to reply privately in chat (DEX-71).
 * There are no comments on updates. The parent owns the "Send update?" confirm and saving.
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
      <div class="ut-track">
      <!-- The heart rail (DEX-63). It stays on screen while you scroll, and on a long timeline the heart
           shows how far through you are: drag it or tap the rail to jump, like a scrubber. -->
      <div class="ut-rail">
        <div class="ut-rail__sticky" #railTrack
             (pointerdown)="onRailPointerDown($event)" (pointermove)="onRailPointerMove($event)"
             (pointerup)="onRailPointerUp($event)" (pointercancel)="onRailPointerUp($event)">
          <span class="ut-rail__line" aria-hidden="true"></span>
          @if (scrollable()) {
            <div class="ut-rail__handle" role="slider" tabindex="0"
                 [class.ut-rail__handle--dragging]="dragging()"
                 [style.top.%]="progress() * 100"
                 aria-label="Move through updates"
                 aria-valuemin="0" aria-valuemax="100"
                 [attr.aria-valuenow]="progressPercent()"
                 [attr.aria-valuetext]="currentDayLabel()"
                 (keydown)="onHandleKey($event)">
              <img src="icons/nav/crushes.svg" alt="" class="ut-rail__heart" draggable="false">
              @if (dragging()) { <span class="ut-rail__day">{{ currentDayLabel() }}</span> }
            </div>
          }
        </div>
      </div>
      <ol class="ut-timeline" #timeline [attr.aria-label]="'Updates about ' + crushName()">
        @for (group of groups(); track group.key) {
          <li class="ut-day">
            <h4 class="ut-day__label">{{ group.label }}</h4>
            <ol class="ut-day__items">
              @for (entry of group.entries; track entry.id) {
                <li class="ut-item" [attr.id]="'update-' + entry.id">
                  <article class="ut-bubble" [class.ut-bubble--status]="isChange(entry)">
                    <header class="ut-bubble__meta">
                      @if (!isMine(entry) && entry.owner) {
                        <span class="ut-bubble__author">
                          @if (entry.owner.avatarUrl) { <img [src]="entry.owner.avatarUrl" alt="" class="ut-bubble__avatar"> }
                          {{ authorName(entry) }}
                        </span>
                      }
                      <time [attr.datetime]="iso(entry.timestamp)">{{ entry.timestamp | date:'h:mm a' }}</time>
                      @if (entry.editedAt) { <span>· edited</span> }
                      @if (canEdit(entry) || canDelete(entry)) {
                        <span class="ut-bubble__actions">
                          @if (canEdit(entry)) {
                            <button type="button" class="ut-icon-btn" (click)="startEdit(entry)" aria-label="Edit update" title="Edit"><app-icon name="pencil" /></button>
                          }
                          @if (canDelete(entry)) {
                            <button type="button" class="ut-icon-btn ut-icon-btn--danger" (click)="remove.emit(entry)" aria-label="Delete update" title="Delete"><app-icon name="trash" /></button>
                          }
                        </span>
                      }
                    </header>
                    @if (editingId() === entry.id) {
                      <textarea class="ut-composer__input" rows="3" aria-label="Edit update" [ngModel]="editDraft()" (ngModelChange)="editDraft.set($event)"></textarea>
                      <div class="ut-edit-actions">
                        <button type="button" class="ut-ghost" (click)="editingId.set(null)">Cancel</button>
                        <button type="button" class="ut-share" [disabled]="!editDraft().trim()" (click)="saveEdit(entry)">Save</button>
                      </div>
                    } @else if (entry.type === 'StatusChange') {
                      <!-- "from Crush" only when the server saved the old status (DEX-68); older ones just say the new one -->
                      <p class="ut-bubble__text ut-status"><span aria-hidden="true">💞</span> Status changed
                        @if (entry.previousStatus) { from {{ entry.previousStatus }} }
                        to <strong>{{ entry.content }}</strong></p>
                    } @else if (entry.type === 'FeelsChange') {
                      <p class="ut-bubble__text ut-status ut-feels"><span aria-hidden="true">💭</span> The Feels: <strong>{{ entry.content }}</strong></p>
                    } @else {
                      <p class="ut-bubble__text">{{ entry.content }}</p>
                    }
                    @if (sharedWith()) {
                      <p class="ut-shared-with"><span aria-hidden="true">👯</span> {{ sharedWith() }}</p>
                    }
                    <!-- Emoji reactions (DEX-45), for the owner and friends. A friend also gets the chat icon,
                         which opens their one-to-one chat with the owner quoting this update (DEX-71). -->
                    @if (interactive()) {
                    <div class="ut-reactions">
                      @for (r of reactionCounts(entry); track r.emoji) {
                        <button type="button" class="ut-reaction" [class.ut-reaction--mine]="r.mine" [attr.aria-pressed]="r.mine"
                                [attr.aria-label]="r.emoji + ' ' + r.count + (r.mine ? ', including you' : '')"
                                (click)="react(entry, r.emoji)">{{ r.emoji }} <span>{{ r.count }}</span></button>
                      }
                      <button type="button" class="ut-reaction ut-reaction--add" [attr.aria-expanded]="pickerFor() === entry.id"
                              aria-label="Add a reaction" (click)="pickerFor.set(pickerFor() === entry.id ? null : entry.id)">
                        <span aria-hidden="true">{{ myReaction(entry) || '🙂' }}</span><span aria-hidden="true">＋</span>
                      </button>
                      @if (entry.reactions?.length) {
                        <button type="button" class="ut-link" [attr.aria-expanded]="whoFor() === entry.id"
                                (click)="whoFor.set(whoFor() === entry.id ? null : entry.id)">{{ whoFor() === entry.id ? 'Hide' : 'Who reacted' }}</button>
                      }
                      @if (!isMine(entry)) {
                        <!-- Same icon as Chat in the top menu, no label (Arianne, DEX-71) -->
                        <button type="button" class="ut-chat" [attr.aria-label]="'Chat with ' + authorName(entry) + ' about this update'"
                                [title]="'Chat with ' + authorName(entry)" (click)="openChat(entry)">
                          <img src="icons/nav/chat.svg" alt="" class="ut-chat__icon">
                        </button>
                      }
                    </div>
                    @if (pickerFor() === entry.id) {
                      <div class="ut-picker" role="group" aria-label="Pick a reaction">
                        @for (emoji of emojis; track emoji) {
                          <button type="button" class="ut-picker__emoji" [attr.aria-pressed]="myReaction(entry) === emoji"
                                  [attr.aria-label]="'React with ' + emoji" (click)="react(entry, emoji)">{{ emoji }}</button>
                        }
                      </div>
                    }
                    @if (whoFor() === entry.id) {
                      <ul class="ut-who" [attr.aria-label]="'Who reacted'">
                        @for (r of entry.reactions || []; track r.userId) {
                          <li><span aria-hidden="true">{{ r.emoji }}</span> {{ nameOf(r.user, r.userId) }}</li>
                        }
                      </ul>
                    }
                    }
                  </article>
                </li>
              }
            </ol>
          </li>
        }
      </ol>
      </div>
    }
  `
})
export class UpdateTimelineComponent {
  readonly theme = inject(ThemeService);
  private readonly data = inject(DataService);
  private readonly modal = inject(ModalService);
  private readonly security = inject(SecurityService);
  private readonly router = inject(Router);
  readonly me = this.security.currentUserId;
  readonly emojis = REACTION_EMOJIS;

  /** Updates, any order; shown newest first. */
  readonly entries = input.required<TimelineEntry[]>();
  readonly crushName = input('this crush');
  /** Owner view: composer, edit and delete. */
  readonly canPost = input(false);
  /** Names of the friends this crush is shared with (who an update reaches). */
  readonly audience = input<string[]>([]);
  /** Reactions and, for friends, the chat icon. Off when the owner previews the page as a friend. */
  readonly interactive = input(true);
  /** You own this crush: you can delete anyone's update on it. */
  readonly isCrushOwner = input(false);
  /** "Shared with Ana, Ben" under each update: who can see it. */
  readonly sharedWith = input('');
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

  readonly pickerFor = signal<string | null>(null);
  readonly whoFor = signal<string | null>(null);
  readonly busy = signal(false);

  // ── Heart rail slider (DEX-63) ──
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly timelineEl = viewChild<ElementRef<HTMLElement>>('timeline');
  private readonly railTrack = viewChild<ElementRef<HTMLElement>>('railTrack');
  /** The timeline is taller than the screen, so the heart handle is worth showing. */
  readonly scrollable = signal(false);
  /** How far through the timeline you are, 0 (newest) to 1 (oldest). */
  readonly progress = signal(0);
  readonly progressPercent = computed(() => Math.round(this.progress() * 100));
  /** You're dragging the heart; shows the day label beside it. */
  readonly dragging = signal(false);
  /** Which day group is at the reading line. */
  private readonly currentDay = signal(0);
  readonly currentDayLabel = computed(() => this.groups()[this.currentDay()]?.label ?? '');

  constructor() {
    // Keep the heart in step with scrolling and resizing, in the browser only.
    afterNextRender(() => {
      const onScroll = () => this.measure();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
      this.measure();
    });
    // New or removed updates change the timeline's height, so measure again after they render.
    effect(() => {
      this.groups();
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => this.measure());
    });
  }

  /** Where the timeline sits on the page, in page coordinates. Null before it renders. */
  private layout(): { timelineTop: number; timelineHeight: number; viewportHeight: number } | null {
    const timeline = this.timelineEl()?.nativeElement;
    if (!timeline || typeof window === 'undefined') return null;
    const rect = timeline.getBoundingClientRect();
    return { timelineTop: rect.top + window.scrollY, timelineHeight: rect.height, viewportHeight: window.innerHeight };
  }

  /** The top of each day group, in page coordinates. */
  private dayTops(): number[] {
    const days = Array.from(this.host.nativeElement.querySelectorAll('.ut-day')) as HTMLElement[];
    return days.map((day) => day.getBoundingClientRect().top + window.scrollY);
  }

  /** Re-reads the page: whether to show the heart, where it sits, and which day you're on. */
  measure(): void {
    const layout = this.layout();
    if (!layout) return;
    this.scrollable.set(layout.timelineHeight > layout.viewportHeight);
    // While dragging, the drag decides where the heart is.
    if (!this.dragging()) this.progress.set(railProgress({ ...layout, scrollY: window.scrollY }));
    this.currentDay.set(dayIndexAt(this.dayTops(), window.scrollY + layout.viewportHeight * READING_LINE));
  }

  /** Scrolls so the point `fraction` of the way through the timeline is at the reading line. */
  private scrollToFraction(fraction: number): void {
    const layout = this.layout();
    if (!layout) return;
    this.progress.set(clamp01(fraction));
    window.scrollTo({ top: scrollYForProgress(fraction, layout), behavior: 'auto' });
    this.currentDay.set(dayIndexAt(this.dayTops(), scrollYForProgress(fraction, layout) + layout.viewportHeight * READING_LINE));
  }

  /** How far down the rail a pointer is, 0 to 1. */
  private fractionAt(event: PointerEvent): number {
    const rect = this.railTrack()?.nativeElement.getBoundingClientRect();
    if (!rect || rect.height <= 0) return 0;
    return clamp01((event.clientY - rect.top) / rect.height);
  }

  /** Pressing on the rail or the heart starts a drag and jumps straight to that point. */
  onRailPointerDown(event: PointerEvent): void {
    if (!this.scrollable()) return;
    event.preventDefault();
    this.dragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.scrollToFraction(this.fractionAt(event));
  }

  /** While dragging, the page follows the heart. */
  onRailPointerMove(event: PointerEvent): void {
    if (!this.dragging()) return;
    this.scrollToFraction(this.fractionAt(event));
  }

  /** Letting go ends the drag and hides the day label. */
  onRailPointerUp(event: PointerEvent): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  /**
   * Keyboard for the heart: arrow keys move a day at a time (down is older), Page keys move
   * three days, and Home or End go to the newest or oldest day.
   */
  onHandleKey(event: KeyboardEvent): void {
    const last = this.groups().length - 1;
    const steps: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, PageDown: 3, PageUp: -3 };
    let target: number;
    if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = last;
    else if (event.key in steps) target = this.currentDay() + steps[event.key];
    else return;
    event.preventDefault();
    this.goToDay(Math.max(0, Math.min(last, target)));
  }

  /** Scrolls so a day's heading sits just at the reading line. */
  private goToDay(index: number): void {
    const top = this.dayTops()[index];
    if (top === undefined) return;
    const y = Math.max(0, top - window.innerHeight * READING_LINE + 1);
    this.currentDay.set(index);
    window.scrollTo({ top: y, behavior: 'smooth' });
    const layout = this.layout();
    if (layout) this.progress.set(railProgress({ ...layout, scrollY: y }));
  }

  /** Each emoji used, with its count and whether one of them is yours. */
  reactionCounts(entry: Entry): { emoji: string; count: number; mine: boolean }[] {
    const me = this.me();
    const counts = new Map<string, { emoji: string; count: number; mine: boolean }>();
    for (const r of entry.reactions || []) {
      const row = counts.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
      row.count += 1;
      if (r.userId === me) row.mine = true;
      counts.set(r.emoji, row);
    }
    return REACTION_EMOJIS.filter((e) => counts.has(e)).map((e) => counts.get(e)!);
  }

  /** The emoji you reacted with on this update, or null if you haven't. */
  myReaction(entry: Entry): string | null {
    return (entry.reactions || []).find((r) => r.userId === this.me())?.emoji || null;
  }

  /** Posted by the signed-in user (entries without an author are your own, not yet synced). */
  isMine(entry: TimelineEntry): boolean {
    return !entry.userId || entry.userId === this.me();
  }

  /** A status or Feels change the server added (DEX-45, DEX-68), not something someone wrote. */
  isChange(entry: TimelineEntry): boolean {
    return entry.type === 'StatusChange' || entry.type === 'FeelsChange';
  }

  /** Only the person who wrote an update can edit it; status and Feels changes can't be edited. */
  canEdit(entry: TimelineEntry): boolean {
    return !this.isChange(entry) && this.isMine(entry);
  }

  /** The person who wrote it, or the crush's owner, can delete an update (DEX-45). */
  canDelete(entry: TimelineEntry): boolean {
    return this.isCrushOwner() || (!this.isChange(entry) && this.isMine(entry));
  }

  /** "You" for yourself, otherwise the person's name, as in the "Who reacted" list. */
  nameOf(person: { username?: string; displayName?: string } | null | undefined, userId: string): string {
    if (userId === this.me()) return 'You';
    return personName(person, 'A friend');
  }

  /** Sets (or, with the same emoji, removes) your reaction on an update and closes the picker. */
  react(entry: Entry, emoji: string): void {
    this.pickerFor.set(null);
    void this.run(() => this.data.reactToUpdate(entry.id, emoji));
  }

  /**
   * Opens the one-to-one chat with the person who posted this update, with the update
   * quoted above the message box so they know what the reply is about (DEX-71).
   */
  openChat(entry: TimelineEntry): void {
    const friendId = String(entry.owner?.id || entry.userId || '');
    if (!friendId) return;
    void this.router.navigate(['/chat'], { queryParams: { friendId, friendName: this.authorName(entry), quoteEntryId: entry.id } });
  }

  /** Runs a save, showing a busy state and a friendly message if it fails. */
  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.modal.show(error instanceof Error && error.message ? error.message : 'Couldn’t save that. Try again.');
    } finally {
      this.busy.set(false);
    }
  }

  /** The name of the friend who posted an update, for the byline and the chat icon. */
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

/** "now", "5m", "3h", "2d", then "Oct 24" like Instagram comments. */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Keeps a number between 0 and 1. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/**
 * How far through the timeline the reading line is, 0 to 1 (DEX-63).
 * All values are in page pixels.
 */
export function railProgress(p: { scrollY: number; timelineTop: number; timelineHeight: number; viewportHeight: number }): number {
  if (p.timelineHeight <= 0) return 0;
  return clamp01((p.scrollY + p.viewportHeight * READING_LINE - p.timelineTop) / p.timelineHeight);
}

/** The opposite of railProgress: where to scroll so that point of the timeline is at the reading line. */
export function scrollYForProgress(fraction: number, p: { timelineTop: number; timelineHeight: number; viewportHeight: number }): number {
  return Math.max(0, p.timelineTop + clamp01(fraction) * p.timelineHeight - p.viewportHeight * READING_LINE);
}

/** Which day group a point on the page falls in, given each day's top (in order). */
export function dayIndexAt(dayTops: number[], position: number): number {
  let index = 0;
  dayTops.forEach((top, i) => { if (top <= position) index = i; });
  return index;
}
