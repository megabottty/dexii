import { describe, expect, it } from 'vitest';
import { matchesTeaFilter, mergeTeaItems, SharedCrush } from './tea-feed.service';
import { AppNotification } from './notifications.service';
import { SharedEntry } from './entries-api.service';

const actor = { id: 'u2', username: 'sam', firstName: 'Sam', lastName: 'Lee' };
const notif = (over: Partial<AppNotification>): AppNotification => ({
  id: 'n1', recipient: 'me', actor, type: 'crush_shared', payload: {}, read: false,
  createdAt: '2026-09-30T10:00:00Z', ...over
});
const crush = (over: Partial<SharedCrush>): SharedCrush => ({
  id: 'c1', userId: 'u2', nickname: 'Mystery', bio: 'Barista with great hair', status: 'Crush' as any,
  visibility: [], sharedEntries: [], lastInteraction: new Date('2026-09-29T09:00:00Z'), redFlags: 0, vibeHistory: [],
  ownerId: 'u2', ownerUsername: 'sam', ...over
} as SharedCrush);

describe('mergeTeaItems', () => {
  it('shows a shared crush once when it has both a notification and a feed entry', () => {
    const items = mergeTeaItems(
      [notif({ id: 'n1', type: 'crush_shared', payload: { crushId: 'c1', crushNickname: 'Mystery' }, read: false })],
      [crush({ id: 'c1' })],
      []
    );
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe('crush:c1');
    expect(items[0].read).toBe(false);
    expect(items[0].crush?.bio).toBe('Barista with great hair');
    expect(items[0].timestamp.toISOString()).toBe('2026-09-30T10:00:00.000Z');
  });

  it('shows a shared crush with no notification as a read-less feed item', () => {
    const items = mergeTeaItems([], [crush({ id: 'c9' })], []);
    expect(items).toHaveLength(1);
    expect(items[0].read).toBeNull();
    expect(items[0].route).toEqual(['/profile', 'c9']);
  });

  it('puts unread first, then newest', () => {
    const items = mergeTeaItems([
      notif({ id: 'a', type: 'friend_request_received', payload: { friendRequestId: 'r1' }, read: true, createdAt: '2026-09-30T12:00:00Z' }),
      notif({ id: 'b', type: 'friend_request_received', payload: { friendRequestId: 'r2' }, read: false, createdAt: '2026-09-29T12:00:00Z' }),
      notif({ id: 'c', type: 'journal_prompt', read: false, createdAt: '2026-09-30T08:00:00Z' })
    ], [], []);
    expect(items.map((i) => i.notificationId)).toEqual(['c', 'b', 'a']);
  });

  it('carries the friend request id so a nudge and its request can be handled together', () => {
    const items = mergeTeaItems([
      notif({ id: 'a', type: 'friend_request_received', payload: { friendRequestId: 'r1' } }),
      notif({ id: 'b', type: 'friend_request_nudge', payload: { friendRequestId: 'r1' } })
    ], [], []);
    expect(items.every((i) => i.friendRequestId === 'r1')).toBe(true);
    expect(items.map((i) => i.kind).sort()).toEqual(['friend_request', 'nudge']);
  });

  it('turns shared entries into note items with the crush nickname', () => {
    const entry = { id: 'e1', crushId: 'c1', type: 'Note', content: 'He texted first!', timestamp: new Date('2026-09-30T11:00:00Z'), isSensitive: false, owner: { id: 'u2', username: 'sam' } } as unknown as SharedEntry;
    const items = mergeTeaItems([], [crush({ id: 'c1' })], [entry]);
    const note = items.find((i) => i.kind === 'entry_shared')!;
    expect(note.text).toBe('sam shared a note about Mystery');
    expect(matchesTeaFilter(note, 'notes')).toBe(true);
    expect(matchesTeaFilter(note, 'shares')).toBe(false);
    expect(matchesTeaFilter(items.find((i) => i.kind === 'crush_shared')!, 'shares')).toBe(true);
  });
});
