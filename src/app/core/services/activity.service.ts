import { Injectable, inject, signal } from '@angular/core';
import { getApiBaseUrl } from '../config/api-config';
import { SecurityService } from './security.service';
import { RealtimeService } from './realtime.service';

export type ActivityType =
  | 'crush_shared' | 'crush_unshared' | 'crush_deleted' | 'crush_viewed'
  | 'entry_shared' | 'entry_unshared'
  | 'dating_status_shared' | 'safety_alert'
  | 'request_sent' | 'request_accepted' | 'request_declined' | 'request_cancelled' | 'request_nudged'
  | 'invite_sent' | 'invite_cancelled' | 'invite_accepted' | 'friends_linked'
  | 'friend_paused' | 'friend_resumed' | 'friend_removed'
  | 'compatibility_voted'
  | 'chat_day';

export interface ActivityPerson {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

/** One line of history between you and a friend, as the server returns it. */
export interface ActivityEvent {
  id: string;
  type: ActivityType;
  actor: ActivityPerson | null;
  counterpart: ActivityPerson | null;
  crushId?: string | null;
  entryId?: string | null;
  requestId?: string | null;
  inviteId?: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityPage {
  events: ActivityEvent[];
  nextBefore: string | null;
}

/** Which filter chip an event belongs to on the history screens. */
export type ActivityGroup = 'sharing' | 'friendship' | 'chat';

export function activityGroup(type: ActivityType): ActivityGroup {
  if (type === 'chat_day' || type === 'safety_alert') return 'chat';
  if (type.startsWith('crush_') || type.startsWith('entry_') || type === 'dating_status_shared' || type === 'compatibility_voted') return 'sharing';
  return 'friendship';
}

const personName = (p: ActivityPerson | null | undefined): string =>
  p ? ([p.firstName, p.lastName].filter(Boolean).join(' ') || p.username || 'A friend') : 'A friend';

/**
 * Turns an event into one plain sentence from the signed-in person's point of view,
 * plus an icon and, when it makes sense, where to go.
 */
export function describeActivity(event: ActivityEvent, meId: string): { icon: string; text: string; route?: any[]; queryParams?: Record<string, string> } {
  const mine = Boolean(event.actor && event.actor.id === meId);
  const other = mine ? event.counterpart : (event.actor || event.counterpart);
  const name = personName(other);
  const meta = event.meta || {};
  const nickname = (meta['nickname'] as string) || 'a crush';
  const crushRoute = event.crushId ? ['/profile', event.crushId] : undefined;
  switch (event.type) {
    case 'crush_shared': return { icon: '💘', text: mine ? `You shared ${nickname} with ${name}` : `${name} shared ${nickname} with you`, route: crushRoute };
    case 'crush_unshared': return { icon: '🙈', text: mine ? `You stopped sharing ${nickname} with ${name}` : `${name} stopped sharing ${nickname} with you` };
    case 'crush_deleted': return { icon: '🗑️', text: mine ? `You deleted ${nickname}, which ${name} could see` : `${name} deleted ${nickname}` };
    case 'crush_viewed': return { icon: '👁️', text: mine ? `You opened ${nickname}` : `${name} opened ${nickname}`, route: crushRoute };
    case 'compatibility_voted': return { icon: '💞', text: mine ? `You weighed in on ${nickname}: ${meta['score']}%` : `${name} weighed in on ${nickname}: ${meta['score']}%`, route: crushRoute };
    case 'entry_shared': return { icon: '📝', text: mine ? `You shared a note about ${nickname} with ${name}` : `${name} shared a note about ${nickname} with you`, route: crushRoute };
    case 'entry_unshared': return { icon: '🙈', text: mine ? `You stopped sharing a note about ${nickname} with ${name}` : `${name} stopped sharing a note about ${nickname}` };
    case 'dating_status_shared': return { icon: '📣', text: mine ? `You sent ${name} a dating status update${meta['text'] ? `: ${String(meta['text']).replace(/^Dating status update for [^:]*:\s*/i, '')}` : ''}` : `${name} sent you a dating status update${meta['text'] ? `: ${String(meta['text']).replace(/^Dating status update for [^:]*:\s*/i, '')}` : ''}`, route: crushRoute };
    case 'safety_alert': return { icon: '🛡️', text: mine ? `You sent ${name} a safety alert${meta['text'] ? `: ${meta['text']}` : ''}` : `${name} sent you a safety alert${meta['text'] ? `: ${meta['text']}` : ''}`, route: ['/chat'], queryParams: other?.id ? { friendId: other.id } : undefined };
    case 'request_sent': return { icon: '👋', text: mine ? `You sent ${name} a friend request` : `${name} sent you a friend request` };
    case 'request_accepted': return { icon: '🤝', text: mine ? `You accepted ${name}'s friend request` : `${name} accepted your friend request` };
    case 'request_declined': return { icon: '✋', text: `You declined ${name}'s friend request` };
    case 'request_cancelled': return { icon: '↩️', text: `You cancelled your request to ${name}` };
    case 'request_nudged': return { icon: '👉', text: mine ? `You nudged ${name} about your request` : `${name} nudged you about their request` };
    case 'invite_sent': return { icon: '✉️', text: `You invited ${meta['contact'] || 'someone'} to Dexii` };
    case 'invite_cancelled': return { icon: '↩️', text: `You withdrew the invite to ${meta['contact'] || 'someone'}` };
    case 'invite_accepted': return { icon: '🎉', text: mine ? `You joined Dexii from ${name}'s invite` : `${name} joined Dexii from your invite` };
    case 'friends_linked': return { icon: '🤝', text: `You and ${name} became friends` };
    case 'friend_paused': return { icon: '⏸️', text: `You paused your friendship with ${name}${meta['muted'] ? ' and muted notifications' : ''}` };
    case 'friend_resumed': return { icon: '▶️', text: `You resumed your friendship with ${name}` };
    case 'friend_removed': return { icon: '💔', text: mine ? `You removed ${name} as a friend` : `${name} removed you as a friend` };
    case 'chat_day': {
      const count = Number(meta['count'] || 0);
      return { icon: '💬', text: `${count} message${count === 1 ? '' : 's'} with ${name}`, route: ['/chat'], queryParams: other?.id ? { friendId: other.id } : undefined };
    }
    default: return { icon: '•', text: 'Something happened' };
  }
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private security = inject(SecurityService);
  private realtime = inject(RealtimeService);
  private apiBase = getApiBaseUrl();

  /** Bumps whenever the server says history changed, so open screens refetch. */
  readonly changed = signal(0);

  constructor() {
    this.realtime.onActivityChanged(() => this.changed.update((n) => n + 1));
  }

  isAuthenticated(): boolean {
    return Boolean(this.security.authHeaders()['x-auth-token']);
  }

  listForFriend(friendId: string, before?: string | null, limit = 40): Promise<ActivityPage> {
    const q = new URLSearchParams({ limit: String(limit) });
    if (before) q.set('before', before);
    return this.get(`/friends/${encodeURIComponent(friendId)}/activity?${q}`);
  }

  listAll(before?: string | null, limit = 40): Promise<ActivityPage> {
    const q = new URLSearchParams({ limit: String(limit) });
    if (before) q.set('before', before);
    return this.get(`/activity?${q}`);
  }

  private async get(path: string): Promise<ActivityPage> {
    const response = await fetch(`${this.apiBase}${path}`, { headers: this.security.authHeaders() });
    if (!response.ok) {
      let message = `History unavailable (${response.status})`;
      try { message = (await response.json())?.message || message; } catch { /* keep */ }
      throw new Error(message);
    }
    return response.json();
  }
}
