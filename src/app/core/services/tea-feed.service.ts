import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification, NotificationsService } from './notifications.service';
import { FriendsApiService, FriendSummary } from './friends-api.service';
import { DataService } from './data.service';
import { ModalService } from './modal.service';
import { CrushProfile } from '../models/crush-profile.model';
import { SharedEntry } from './entries-api.service';

/**
 * "Tea" = what your friends share with you and requests waiting for you.
 *
 * One newest-first stream merged from three sources:
 *  - notifications (all types)
 *  - crushes friends currently share with you
 *  - entries friends currently share with you
 * A shared crush that also has a `crush_shared` notification renders as ONE card.
 */
export type TeaKind =
  | 'friend_request'
  | 'nudge'
  | 'crush_shared'
  | 'entry_shared'
  | 'invite_accepted'
  | 'friend_request_accepted'
  | 'journal_prompt'
  | 'compatibility_vote'
  | 'other';

export type TeaFilter = 'all' | 'requests' | 'shares' | 'notes';

export interface TeaActor {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
}

export interface TeaItem {
  /** Dedupe key: `crush:<id>` | `entry:<id>` | `notif:<id>` */
  key: string;
  kind: TeaKind;
  notificationId?: string;
  /** true/false for notification-backed items; null = pure feed item (no unread state). */
  read: boolean | null;
  timestamp: Date;
  actor: TeaActor;
  text: string;
  friendRequestId?: string;
  crush?: { id: string; nickname?: string; avatarUrl?: string; bio?: string };
  entry?: { id: string; verb: string; content: string; isSensitive: boolean; crushNickname?: string };
  route?: any[];
  queryParams?: Record<string, string>;
  actionLabel?: string;
}

export type SharedCrush = CrushProfile & { ownerId: string; ownerUsername: string; ownerAvatarUrl?: string };

export const ENTRY_TYPE_VERBS: Record<string, string> = {
  Note: 'shared a note about',
  Date: 'logged a date with',
  RedFlag: 'flagged a red flag about',
  SafetyCheck: 'sent a safety check about',
  PrivateJournal: 'shared a journal entry about'
};

const actorFromNotification = (actor: AppNotification['actor']): TeaActor => {
  if (!actor) return { id: '', name: 'A friend' };
  const fullName = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
  return { id: actor.id, name: fullName || actor.username || 'A friend', username: actor.username, avatarUrl: actor.avatarUrl };
};

const kindOf = (type: string): TeaKind => {
  switch (type) {
    case 'friend_request_received': return 'friend_request';
    case 'friend_request_nudge': return 'nudge';
    case 'crush_shared': return 'crush_shared';
    case 'invite_accepted': return 'invite_accepted';
    case 'friend_request_accepted': return 'friend_request_accepted';
    case 'journal_prompt': return 'journal_prompt';
    case 'compatibility_vote': return 'compatibility_vote';
    default: return 'other';
  }
};

/** Pure merge used by the service and its spec. */
export function mergeTeaItems(
  notifications: AppNotification[],
  crushes: SharedCrush[],
  entries: SharedEntry[]
): TeaItem[] {
  const byKey = new Map<string, TeaItem>();
  const crushById = new Map(crushes.map((c) => [c.id, c]));

  for (const n of notifications) {
    const kind = kindOf(n.type);
    const actor = actorFromNotification(n.actor);
    const crushId = typeof n.payload?.crushId === 'string' ? n.payload.crushId : undefined;
    const key = kind === 'crush_shared' && crushId ? `crush:${crushId}` : `notif:${n.id}`;
    const item: TeaItem = {
      key,
      kind,
      notificationId: n.id,
      read: Boolean(n.read),
      timestamp: new Date(n.createdAt),
      actor,
      text: '',
      friendRequestId: typeof n.payload?.friendRequestId === 'string' ? n.payload.friendRequestId : undefined
    };
    switch (kind) {
      case 'friend_request':
        item.text = `${actor.name} sent you a friend request`;
        break;
      case 'nudge':
        item.text = `${actor.name} nudged you about their friend request`;
        break;
      case 'crush_shared': {
        const crush = crushId ? crushById.get(crushId) : undefined;
        item.text = `${actor.name} shared a crush with you`;
        item.crush = { id: crushId || '', nickname: crush?.nickname || (n.payload?.crushNickname as string | undefined), avatarUrl: crush?.avatarUrl, bio: crush?.bio };
        if (crushId) item.route = ['/profile', crushId];
        break;
      }
      case 'invite_accepted':
        item.text = `${actor.name} accepted your invite and joined Dexii`;
        item.route = ['/friends']; item.queryParams = { tab: 'friends' }; item.actionLabel = 'Set up friendship profile';
        break;
      case 'friend_request_accepted':
        item.text = `${actor.name} accepted your friend request`;
        item.route = ['/chat']; item.queryParams = { friendId: actor.id, friendName: actor.username || actor.name }; item.actionLabel = 'Say hi';
        break;
      case 'compatibility_vote': {
        const crush = crushId ? crushById.get(crushId) : undefined;
        const nickname = crush?.nickname || (n.payload?.crushNickname as string | undefined) || 'your crush';
        item.text = `${actor.name} weighed in on ${nickname}: ${n.payload?.['score'] ?? '?'}% compatible`;
        if (crushId) item.route = ['/profile', crushId];
        item.actionLabel = 'See their read';
        break;
      }
      case 'journal_prompt':
        item.text = 'Your journal prompt is ready';
        item.route = ['/vault']; item.actionLabel = 'Open Vault';
        break;
      default:
        item.text = `${actor.name} sent you an update`;
        item.route = ['/friends'];
    }
    // Later notifications for the same key win on timestamp; keep unread if any is unread.
    const existing = byKey.get(key);
    if (existing) {
      if (item.timestamp > existing.timestamp) existing.timestamp = item.timestamp;
      existing.read = existing.read === false || item.read === false ? false : existing.read;
      continue;
    }
    byKey.set(key, item);
  }

  for (const crush of crushes) {
    const key = `crush:${crush.id}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      key,
      kind: 'crush_shared',
      read: null,
      timestamp: crush.lastInteraction ? new Date(crush.lastInteraction) : new Date(0),
      actor: { id: crush.ownerId, name: crush.ownerUsername, username: crush.ownerUsername, avatarUrl: crush.ownerAvatarUrl },
      text: `${crush.ownerUsername} shared a crush with you`,
      crush: { id: crush.id, nickname: crush.nickname, avatarUrl: crush.avatarUrl, bio: crush.bio },
      route: ['/profile', crush.id]
    });
  }

  for (const entry of entries) {
    const key = `entry:${entry.id}`;
    if (byKey.has(key)) continue;
    const crush = crushById.get(entry.crushId);
    const ownerName = entry.owner?.username || 'A friend';
    byKey.set(key, {
      key,
      kind: 'entry_shared',
      read: null,
      timestamp: new Date(entry.timestamp),
      actor: { id: entry.owner?.id || '', name: ownerName, username: entry.owner?.username, avatarUrl: entry.owner?.avatarUrl },
      text: `${ownerName} ${ENTRY_TYPE_VERBS[entry.type] || 'shared an update about'} ${crush?.nickname || 'a crush'}`,
      entry: { id: entry.id, verb: ENTRY_TYPE_VERBS[entry.type] || 'shared an update about', content: entry.content, isSensitive: Boolean(entry.isSensitive), crushNickname: crush?.nickname },
      crush: crush ? { id: crush.id, nickname: crush.nickname, avatarUrl: crush.avatarUrl } : undefined,
      route: ['/profile', entry.crushId]
    });
  }

  return [...byKey.values()].sort((a, b) => {
    const aUnread = a.read === false ? 0 : 1;
    const bUnread = b.read === false ? 0 : 1;
    if (aUnread !== bUnread) return aUnread - bUnread;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
}

export const matchesTeaFilter = (item: TeaItem, filter: TeaFilter): boolean => {
  switch (filter) {
    case 'requests': return item.kind === 'friend_request' || item.kind === 'nudge';
    case 'shares': return item.kind === 'crush_shared';
    case 'notes': return item.kind === 'entry_shared';
    default: return true;
  }
};

@Injectable({ providedIn: 'root' })
export class TeaFeedService {
  private notifications = inject(NotificationsService);
  private friendsApi = inject(FriendsApiService);
  private dataService = inject(DataService);
  private modal = inject(ModalService);
  private router = inject(Router);

  private sharedCrushes = signal<SharedCrush[]>([]);
  readonly loading = signal(false);
  readonly filter = signal<TeaFilter>('all');
  /** Bumps when a friend request is answered here so badges elsewhere can refresh. */
  readonly requestsChanged = signal(0);

  readonly items = computed(() => mergeTeaItems(
    this.notifications.notifications(),
    this.sharedCrushes(),
    this.dataService.getSharedEntries()()
  ));
  readonly visibleItems = computed(() => this.items().filter((item) => matchesTeaFilter(item, this.filter())));

  /**
   * Which group each card sat in when the page was opened. Marking something
   * read while you look at it clears its highlight but does not move it, so the
   * list stays still until the next visit. Cards that arrive later go on top.
   */
  private groupSnapshot = signal<Map<string, 'new' | 'earlier'>>(new Map());
  private groupOf(item: TeaItem): 'new' | 'earlier' {
    const snap = this.groupSnapshot().get(item.key);
    if (snap) return snap;
    return item.read === false ? 'new' : 'earlier';
  }
  readonly unreadItems = computed(() => this.visibleItems().filter((item) => this.groupOf(item) === 'new'));
  readonly earlierItems = computed(() => this.visibleItems().filter((item) => this.groupOf(item) === 'earlier'));
  /** Live unread count among the cards on the page (for the highlight/dot). */
  readonly unseenCount = computed(() => this.items().filter((item) => item.read === false).length);
  readonly counts = computed(() => ({
    requests: this.items().filter((i) => i.kind === 'friend_request' || i.kind === 'nudge').length,
    shares: this.items().filter((i) => i.kind === 'crush_shared').length,
    notes: this.items().filter((i) => i.kind === 'entry_shared').length
  }));

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      await Promise.all([
        this.notifications.loadNotifications(),
        this.notifications.loadUnreadCount(),
        this.dataService.refreshSharedEntries(),
        this.loadSharedCrushes()
      ]);
    } finally {
      this.snapshotGroups();
      this.loading.set(false);
    }
  }

  /** Freezes the new/earlier split for this visit. */
  snapshotGroups(): void {
    const snap = new Map<string, 'new' | 'earlier'>();
    for (const item of this.items()) snap.set(item.key, item.read === false ? 'new' : 'earlier');
    this.groupSnapshot.set(snap);
  }

  /**
   * Inbox behaviour: everything currently shown counts as seen. Clears the
   * highlight and the badge; cards keep their place until the next visit.
   * Requests stay actionable (their buttons don't depend on unread state).
   */
  async markShownAsSeen(): Promise<void> {
    const pending = this.items().filter((item) => item.notificationId && item.read === false);
    if (!pending.length) return;
    await Promise.all(pending.map((item) => this.notifications.markRead(item.notificationId!).catch(() => undefined)));
  }

  private async loadSharedCrushes(): Promise<void> {
    if (!this.friendsApi.isAuthenticated()) { this.sharedCrushes.set([]); return; }
    try {
      const friends: FriendSummary[] = await this.friendsApi.listFriends();
      const results = await Promise.all(friends.map(async (friend) => {
        try { return { friend, crushes: await this.friendsApi.getFriendSharedCrushes(friend.id) }; }
        catch { return { friend, crushes: [] as CrushProfile[] }; }
      }));
      const list: SharedCrush[] = [];
      for (const { friend, crushes } of results) {
        for (const crush of crushes) list.push({ ...crush, ownerId: friend.id, ownerUsername: friend.username, ownerAvatarUrl: friend.avatarUrl });
      }
      this.sharedCrushes.set(list);
    } catch {
      this.sharedCrushes.set([]);
    }
  }

  /** Accept or decline a friend request straight from its Tea card. */
  async respondToRequest(item: TeaItem, action: 'accept' | 'decline'): Promise<boolean> {
    if (!item.friendRequestId) return false;
    try {
      await this.friendsApi.respondToRequest(item.friendRequestId, action);
    } catch (err: any) {
      const message = String(err?.message || '');
      // Already handled elsewhere (accepted on the Friends page, or withdrawn): just tidy up.
      if (!/already|not found|handled/i.test(message)) {
        this.modal.show(message || 'Unable to respond to that request right now.');
        return false;
      }
    }
    // The request is handled, so its card (and any nudge for the same request) leaves Tea.
    const siblings = this.items().filter((i) => i.friendRequestId === item.friendRequestId && i.notificationId);
    await Promise.all(siblings.map((s) => this.notifications.remove(s.notificationId!).catch(() => undefined)));
    await this.notifications.loadNotifications().catch(() => undefined);
    this.requestsChanged.update((n) => n + 1);
    if (action === 'accept') this.modal.show(`You and ${item.actor.name} are now friends.`);
    return true;
  }

  /** Opens the thing a card points at; stale crush shares are cleared instead. */
  async open(item: TeaItem): Promise<void> {
    if (item.kind === 'crush_shared' && item.crush?.id) {
      const result = await this.friendsApi.getSharedCrush(item.crush.id);
      if (result.kind === 'not_shared' || result.kind === 'not_found') {
        if (item.notificationId) await this.notifications.remove(item.notificationId);
        this.sharedCrushes.update((list) => list.filter((c) => c.id !== item.crush!.id));
        this.modal.show('That crush isn\'t shared with you anymore, so we cleared it.');
        return;
      }
      if (result.kind === 'error') {
        // A bad connection is not the friend taking the crush back: keep the card.
        this.modal.show('Couldn\'t load that crush right now. Check your connection and try again.');
        return;
      }
    }
    if (item.notificationId && item.read === false) {
      await this.notifications.markRead(item.notificationId).catch(() => undefined);
    }
    if (item.route) await this.router.navigate(item.route, { queryParams: item.queryParams });
  }

  async markUnread(item: TeaItem): Promise<void> {
    if (!item.notificationId || item.read !== true) return;
    await this.notifications.markUnread(item.notificationId).catch(() => undefined);
  }
}
