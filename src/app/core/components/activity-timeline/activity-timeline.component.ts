import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { SecurityService } from '../../services/security.service';
import { DataService } from '../../services/data.service';
import { ActivityEvent, ActivityGroup, ActivityService, activityGroup, describeActivity } from '../../services/activity.service';
import { crushSeenAt } from '../../models/crush-profile.model';

interface TimelineRow {
  event: ActivityEvent;
  icon: string;
  text: string;
  route?: any[];
  queryParams?: Record<string, string>;
  seenAt: Date | null;
  stillShared: boolean;
  friendId: string | null;
}

interface DayGroup {
  day: string;
  rows: TimelineRow[];
}

/**
 * The history between you and your friends: everything that happened, newest
 * first, grouped by day. Used on a friend's page (one friend) and on
 * Sharing → History (everyone). Reads from the server's activity log and
 * refreshes live when it changes.
 */
@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styleUrl: './activity-timeline.component.css',
  template: `
    <div class="at">
      @if (showFilters()) {
        <div class="at-filters" role="group" aria-label="Show">
          @for (chip of chips; track chip.id) {
            <button type="button"
                    (click)="toggleGroup(chip.id)"
                    [attr.aria-pressed]="groups().has(chip.id)"
                    [style.background-color]="groups().has(chip.id) ? theme.colors().primary : 'transparent'"
                    [style.color]="groups().has(chip.id) ? '#fff' : theme.colors().text"
                    [style.border]="'1px solid ' + (groups().has(chip.id) ? theme.colors().primary : theme.colors().border)"
                    class="at-chip">{{ chip.label }}</button>
          }
          @if (friendOptions().length > 1) {
            <label class="at-friend-filter" [style.color]="theme.colors().textSecondary">
              Friend
              <select [value]="friendFilter() || ''" (change)="friendFilter.set($any($event.target).value || null)"
                      [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text"
                      class="at-select" aria-label="Filter by friend">
                <option value="">Everyone</option>
                @for (f of friendOptions(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
              </select>
            </label>
          }
        </div>
      }

      @if (error()) {
        <p class="at-error" role="alert">{{ error() }}</p>
      } @else if (loading() && days().length === 0) {
        <p [style.color]="theme.colors().textSecondary" class="at-empty" role="status">Loading history…</p>
      } @else if (days().length === 0) {
        <div [style.border]="'1px dashed ' + theme.colors().border" class="at-empty">
          <p [style.color]="theme.colors().textSecondary">{{ emptyText() }}</p>
        </div>
      } @else {
        @for (group of days(); track group.day) {
          <section class="at-day">
            <h3 [style.color]="theme.colors().textSecondary" class="at-day-title">{{ group.day }}</h3>
            <ol class="at-list">
              @for (row of group.rows; track row.event.id) {
                <li class="at-row" [style.border-color]="theme.colors().border">
                  <span class="at-icon" aria-hidden="true">{{ row.icon }}</span>
                  <div class="at-body">
                    <p class="at-text">
                      {{ row.text }}
                      @if (row.route) {
                        <a [routerLink]="row.route" [queryParams]="row.queryParams" [style.color]="theme.colors().onBgPrimary" class="at-link">Open</a>
                      }
                    </p>
                    <p [style.color]="theme.colors().textSecondary" class="at-meta">
                      {{ row.event.createdAt | date:'h:mm a' }}
                      @if (row.event.type === 'crush_shared' && row.seenAt) { · 👁️ Seen {{ row.seenAt | date:'MMM d, h:mm a' }} }
                      @else if (row.event.type === 'crush_shared' && row.stillShared && isMine(row.event)) { · Not seen yet }
                    </p>
                  </div>
                  @if (row.event.type === 'crush_shared' && row.stillShared && isMine(row.event) && row.friendId && row.event.crushId) {
                    <button type="button" (click)="unshare(row)" class="at-unshare" [style.border]="'1px solid #ef4444'">Unshare</button>
                  }
                </li>
              }
            </ol>
          </section>
        }
        @if (nextBefore()) {
          <button type="button" (click)="loadMore()" [disabled]="loading()" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="at-more">
            {{ loading() ? 'Loading…' : 'Load more' }}
          </button>
        }
      }
    </div>
  `
})
export class ActivityTimelineComponent {
  /** One friend's history, or every friend when omitted. */
  readonly friendId = input<string | null>(null);
  readonly showFilters = input(true);

  readonly theme = inject(ThemeService);
  private security = inject(SecurityService);
  private dataService = inject(DataService);
  private activity = inject(ActivityService);

  readonly chips: ReadonlyArray<{ id: ActivityGroup; label: string }> = [
    { id: 'sharing', label: 'Sharing' },
    { id: 'friendship', label: 'Friendship' },
    { id: 'chat', label: 'Chat' }
  ];
  readonly groups = signal<Set<ActivityGroup>>(new Set(['sharing', 'friendship', 'chat']));
  readonly friendFilter = signal<string | null>(null);
  readonly events = signal<ActivityEvent[]>([]);
  readonly nextBefore = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    // Reload when the friend changes or the server reports new history.
    effect(() => {
      this.friendId();
      this.activity.changed();
      void this.load(true);
    }, { allowSignalWrites: true });
  }

  private get meId(): string {
    return this.security.currentUserId() || this.dataService.getUserId();
  }

  isMine(event: ActivityEvent): boolean {
    return Boolean(event.actor && event.actor.id === this.meId);
  }

  readonly friendOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const e of this.events()) {
      const other = this.isMine(e) ? e.counterpart : e.actor;
      if (other?.id && other.id !== this.meId) seen.set(other.id, [other.firstName, other.lastName].filter(Boolean).join(' ') || other.username || other.id);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly days = computed<DayGroup[]>(() => {
    const groups = this.groups();
    const friend = this.friendFilter();
    const crushes = this.dataService.getAllCrushes()();
    const rows: TimelineRow[] = [];
    for (const event of this.events()) {
      if (!groups.has(activityGroup(event.type))) continue;
      const other = this.isMine(event) ? event.counterpart : event.actor;
      const friendId = other?.id && other.id !== this.meId ? other.id : (event.counterpart?.id || null);
      if (friend && friendId !== friend) continue;
      const described = describeActivity(event, this.meId);
      const crush = event.crushId ? crushes.find((c) => c.id === event.crushId) : undefined;
      rows.push({
        event,
        ...described,
        seenAt: crush && friendId ? crushSeenAt(crush, friendId) : null,
        stillShared: Boolean(crush && friendId && this.dataService.isCrushSharedWith(crush, friendId)),
        friendId
      });
    }
    const byDay = new Map<string, TimelineRow[]>();
    for (const row of rows) {
      const day = new Date(row.event.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(row);
    }
    return [...byDay.entries()].map(([day, rows]) => ({ day, rows }));
  });

  emptyText(): string {
    return this.friendId()
      ? 'Nothing between you two yet. Share a crush or say hi and it will show up here.'
      : 'Nothing yet. Shares, requests and chats with your friends will show up here.';
  }

  toggleGroup(id: ActivityGroup): void {
    this.groups.update((set) => {
      const next = new Set(set);
      if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id);
      return next;
    });
  }

  private loadSeq = 0;

  async load(reset = false): Promise<void> {
    if (!this.activity.isAuthenticated()) { this.events.set([]); return; }
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set('');
    try {
      const before = reset ? null : this.nextBefore();
      const friend = this.friendId();
      const page = friend ? await this.activity.listForFriend(friend, before) : await this.activity.listAll(before);
      if (seq !== this.loadSeq) return; // a newer load (different friend) superseded this one
      this.events.update((list) => reset ? page.events : [...list, ...page.events.filter((e) => !list.some((x) => x.id === e.id))]);
      this.nextBefore.set(page.nextBefore);
    } catch (err: any) {
      if (seq === this.loadSeq) this.error.set(err?.message || 'History is unavailable right now.');
    } finally {
      if (seq === this.loadSeq) this.loading.set(false);
    }
  }

  loadMore(): void { void this.load(false); }

  unshare(row: TimelineRow): void {
    if (!row.event.crushId || !row.friendId) return;
    void this.dataService.unshareCrushWith(row.event.crushId, row.friendId);
  }
}
