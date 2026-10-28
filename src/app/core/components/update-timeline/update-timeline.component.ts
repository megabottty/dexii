import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Entry, UpdateComment } from '../../models/entry.model';
import { DataService } from '../../services/data.service';
import { ModalService } from '../../services/modal.service';
import { SecurityService } from '../../services/security.service';
import { ThemeService } from '../../services/theme.service';
import { personName } from '../../utils/person-name';
import { IconComponent } from '../icon/icon.component';

type TimelineEntry = Entry & { owner?: { id?: string; username?: string; displayName?: string; avatarUrl?: string } };

interface DayGroup { key: string; label: string; entries: TimelineEntry[]; }

/** A little sticker per update, picked from its id so it never changes between visits. */
const STICKERS = ['💌', '💗', '✨', '🌸', '🦋', '💫', '🍓', '🌷'];

/** The reactions on offer; the server accepts exactly these (DEX-45). */
export const REACTION_EMOJIS = ['💗', '😍', '😂', '😬', '🔥', '🥺'];

/** Comments shown under an update before "View all". */
const COMMENT_PREVIEW = 2;

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
                <li class="ut-item" [attr.id]="'update-' + entry.id">
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
                    <!-- Reactions and comments, like an Instagram post (DEX-45) -->
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
                      <ul class="ut-who">
                        @for (r of entry.reactions || []; track r.userId) {
                          <li><span aria-hidden="true">{{ r.emoji }}</span> {{ nameOf(r.user, r.userId) }}</li>
                        }
                      </ul>
                    }

                    @if ((entry.comments?.length || 0) > commentPreview && !expanded().has(entry.id)) {
                      <button type="button" class="ut-link ut-view-all" (click)="expand(entry.id)">View all {{ entry.comments!.length }} comments</button>
                    }
                    @if (entry.comments?.length) {
                      <ul class="ut-comments">
                        @for (comment of visibleComments(entry); track comment.id) {
                          <li class="ut-comment">
                            @if (comment.user?.avatarUrl) { <img [src]="comment.user!.avatarUrl" alt="" class="ut-comment__avatar"> }
                            @else { <span class="ut-comment__avatar ut-comment__avatar--blank" aria-hidden="true">{{ initial(comment) }}</span> }
                            <div class="ut-comment__body">
                              @if (editingCommentId() === comment.id) {
                                <input class="ut-comment-input" [ngModel]="commentEditDraft()" (ngModelChange)="commentEditDraft.set($event)" maxlength="1000"
                                       aria-label="Edit comment" (keydown.enter)="saveComment(entry, comment)" (keydown.escape)="editingCommentId.set(null)">
                                <div class="ut-comment__meta">
                                  <button type="button" class="ut-link" (click)="saveComment(entry, comment)">Save</button>
                                  <button type="button" class="ut-link" (click)="editingCommentId.set(null)">Cancel</button>
                                </div>
                              } @else {
                                <p class="ut-comment__text"><strong>{{ nameOf(comment.user, comment.userId) }}</strong> {{ comment.content }}</p>
                                <div class="ut-comment__meta">
                                  <time [attr.datetime]="iso(comment.createdAt)">{{ ago(comment.createdAt) }}</time>
                                  @if (comment.editedAt) { <span>· edited</span> }
                                  @if (comment.hearts.length) { <span>· {{ comment.hearts.length }} {{ comment.hearts.length === 1 ? 'heart' : 'hearts' }}</span> }
                                  @if (comment.userId === me()) {
                                    <button type="button" class="ut-link" (click)="startCommentEdit(comment)">Edit</button>
                                  }
                                  @if (comment.userId === me() || isUpdateOwner(entry)) {
                                    <button type="button" class="ut-link ut-link--danger" (click)="deleteComment(entry, comment)">Delete</button>
                                  }
                                </div>
                              }
                            </div>
                            <button type="button" class="ut-heart" [class.ut-heart--on]="hearted(comment)" [attr.aria-pressed]="hearted(comment)"
                                    [attr.aria-label]="(hearted(comment) ? 'Remove your heart from ' : 'Heart ') + nameOf(comment.user, comment.userId) + '’s comment'"
                                    (click)="heart(entry, comment)">{{ hearted(comment) ? '♥' : '♡' }}</button>
                          </li>
                        }
                      </ul>
                    }
                    <form class="ut-add-comment" (submit)="$event.preventDefault(); addComment(entry)">
                      <input class="ut-comment-input" [ngModel]="commentDraft(entry.id)" (ngModelChange)="setCommentDraft(entry.id, $event)"
                             [ngModelOptions]="{ standalone: true }" maxlength="1000" placeholder="Add a comment…" [attr.aria-label]="'Comment on this update'">
                      <button type="submit" class="ut-link ut-post" [disabled]="!commentDraft(entry.id).trim() || busy()">Post</button>
                    </form>
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
  private readonly data = inject(DataService);
  private readonly modal = inject(ModalService);
  private readonly security = inject(SecurityService);
  readonly me = this.security.currentUserId;
  readonly emojis = REACTION_EMOJIS;
  readonly commentPreview = COMMENT_PREVIEW;

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

  readonly pickerFor = signal<string | null>(null);
  readonly whoFor = signal<string | null>(null);
  readonly expanded = signal<ReadonlySet<string>>(new Set());
  readonly editingCommentId = signal<string | null>(null);
  readonly commentEditDraft = signal('');
  readonly busy = signal(false);
  private readonly commentDrafts = signal<Record<string, string>>({});

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

  myReaction(entry: Entry): string | null {
    return (entry.reactions || []).find((r) => r.userId === this.me())?.emoji || null;
  }

  /** The update's author: the owner of the profile when they're posting, otherwise the friend who shared it. */
  isUpdateOwner(entry: TimelineEntry): boolean {
    const me = this.me();
    if (!me) return false;
    return (entry.userId || (this.canPost() ? me : entry.owner?.id)) === me;
  }

  visibleComments(entry: Entry): UpdateComment[] {
    const comments = entry.comments || [];
    return this.expanded().has(entry.id) ? comments : comments.slice(-COMMENT_PREVIEW);
  }

  expand(entryId: string): void {
    this.expanded.update((set) => new Set(set).add(entryId));
  }

  hearted(comment: UpdateComment): boolean {
    const me = this.me();
    return !!me && comment.hearts.includes(me);
  }

  nameOf(person: { username?: string; displayName?: string } | null | undefined, userId: string): string {
    if (userId === this.me()) return 'You';
    return personName(person, 'A friend');
  }

  initial(comment: UpdateComment): string {
    return this.nameOf(comment.user, comment.userId).charAt(0).toUpperCase();
  }

  commentDraft(entryId: string): string {
    return this.commentDrafts()[entryId] || '';
  }

  setCommentDraft(entryId: string, value: string): void {
    this.commentDrafts.update((drafts) => ({ ...drafts, [entryId]: value }));
  }

  react(entry: Entry, emoji: string): void {
    this.pickerFor.set(null);
    void this.run(() => this.data.reactToUpdate(entry.id, emoji));
  }

  addComment(entry: Entry): void {
    const content = this.commentDraft(entry.id).trim();
    if (!content) return;
    if (!this.security.moderateContent(content)) {
      this.modal.show('Comment flagged by AI moderation for safety.');
      return;
    }
    void this.run(async () => {
      await this.data.commentOnUpdate(entry.id, content);
      this.setCommentDraft(entry.id, '');
      this.expand(entry.id);
    });
  }

  startCommentEdit(comment: UpdateComment): void {
    this.editingCommentId.set(comment.id);
    this.commentEditDraft.set(comment.content);
  }

  saveComment(entry: Entry, comment: UpdateComment): void {
    const content = this.commentEditDraft().trim();
    if (!content) return;
    if (!this.security.moderateContent(content)) {
      this.modal.show('Comment flagged by AI moderation for safety.');
      return;
    }
    void this.run(async () => {
      await this.data.editUpdateComment(entry.id, comment.id, content);
      this.editingCommentId.set(null);
    });
  }

  deleteComment(entry: Entry, comment: UpdateComment): void {
    this.modal.confirm('Delete this comment? This cannot be undone.',
      () => { void this.run(() => this.data.deleteUpdateComment(entry.id, comment.id)); },
      undefined,
      { title: 'Delete comment', confirmLabel: 'Delete', danger: true });
  }

  heart(entry: Entry, comment: UpdateComment): void {
    void this.run(() => this.data.heartUpdateComment(entry.id, comment.id));
  }

  ago(value: Date | string): string {
    return timeAgo(new Date(value));
  }

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

/** "now", "5m", "3h", "2d", then "Oct 24" like Instagram comments. */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
