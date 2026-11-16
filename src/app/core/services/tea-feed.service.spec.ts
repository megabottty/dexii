import { describe, expect, it } from 'vitest';
import { buildFeedItems, matchesTeaFilter, mergeTeaItems, SharedCrush } from './tea-feed.service';
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
  it('turns reactions, comments and hearts on your updates into Updates items that open that update (DEX-45)', () => {
    const payload = { crushId: 'c1', crushNickname: 'Mystery', entryId: 'e1' };
    const items = mergeTeaItems([
      notif({ id: 'n1', type: 'update_reaction', payload: { ...payload, emoji: '😍' } }),
      notif({ id: 'n2', type: 'update_comment', payload: { ...payload, commentPreview: 'omg' }, createdAt: '2026-09-30T11:00:00Z' }),
      notif({ id: 'n3', type: 'comment_heart', payload: { ...payload, commentPreview: 'yay' }, createdAt: '2026-09-30T12:00:00Z' })
    ], [], []);
    const texts = items.map((i) => i.text);
    expect(texts).toContain('Sam Lee reacted 😍 to your update about Mystery');
    expect(texts).toContain('Sam Lee commented on your update about Mystery: “omg”');
    expect(texts).toContain('Sam Lee hearted your comment: “yay” 💗');
    expect(items.every((i) => i.kind === 'update_activity' && matchesTeaFilter(i, 'notes'))).toBe(true);
    expect(items[0].route).toEqual(['/profile', 'c1']);
    expect(items[0].queryParams).toEqual({ update: 'e1' });
  });

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

  it('turns shared entries into update items with the crush nickname', () => {
    const entry = { id: 'e1', crushId: 'c1', type: 'Note', content: 'He texted first!', timestamp: new Date('2026-09-30T11:00:00Z'), isSensitive: false, owner: { id: 'u2', username: 'sam' } } as unknown as SharedEntry;
    const items = mergeTeaItems([], [crush({ id: 'c1' })], [entry]);
    const note = items.find((i) => i.kind === 'entry_shared')!;
    expect(note.text).toBe('sam posted an update about Mystery');
    expect(matchesTeaFilter(note, 'notes')).toBe(true);
    expect(matchesTeaFilter(note, 'shares')).toBe(false);
    expect(matchesTeaFilter(items.find((i) => i.kind === 'crush_shared')!, 'shares')).toBe(true);
  });
});

/** DEX-68: the Feed tab, one running list of friends' crush updates, status and Feels changes. */
describe('buildFeedItems (DEX-68)', () => {
  const owner = { id: 'u2', username: 'sam', displayName: 'Sam Lee' };
  const entry = (over: Partial<SharedEntry> & Record<string, unknown>): SharedEntry => ({
    id: 'e1', userId: 'u2', crushId: 'c1', type: 'Update', content: 'We kissed!', timestamp: new Date('2026-11-10T10:00:00Z'),
    visibility: [], isSensitive: false, owner, ...over
  } as SharedEntry);

  it('lists updates, status changes and Feels changes newest first, each with friend, crush and time', () => {
    const items = buildFeedItems([
      entry({ id: 'e1', timestamp: new Date('2026-11-10T10:00:00Z') }),
      entry({ id: 'e2', type: 'StatusChange', content: 'Dating', previousStatus: 'Crush', timestamp: new Date('2026-11-12T10:00:00Z') }),
      entry({ id: 'e3', type: 'FeelsChange', content: 'Slow burn, Butterflies', timestamp: new Date('2026-11-11T10:00:00Z') })
    ], [crush({ id: 'c1', nickname: 'Alex' })], 'me');
    expect(items.map((i) => [i.entryId, i.type])).toEqual([['e2', 'status'], ['e3', 'feels'], ['e1', 'update']]);
    expect(items[0].text).toBe('Crush → Dating');
    expect(items[1].text).toBe('Slow burn, Butterflies');
    expect(items[2].text).toBe('We kissed!');
    expect(items.every((i) => i.friendName === 'Sam Lee' && i.crushName === 'Alex' && i.timestamp instanceof Date)).toBe(true);
  });

  it('opens the crush profile at that update', () => {
    const [item] = buildFeedItems([entry({ id: 'e9' })], [crush({ id: 'c1' })], 'me');
    expect(item.route).toEqual(['/profile', 'c1']);
    expect(item.queryParams).toEqual({ update: 'e9' });
  });

  it('leaves out my own entries and things that are not crush updates', () => {
    const items = buildFeedItems([
      entry({ id: 'mine', userId: 'me', owner: { id: 'me', username: 'me' } }),
      entry({ id: 'date', type: 'Date' }),
      entry({ id: 'private', type: 'Note', visibility: [] }),
      entry({ id: 'shared-note', type: 'Note', visibility: ['me'] })
    ], [], 'me');
    expect(items.map((i) => i.entryId)).toEqual(['shared-note']);
  });

  it('says only the new status for older status changes that never saved the old one', () => {
    const [item] = buildFeedItems([entry({ type: 'StatusChange', content: 'Dating' })], [], 'me');
    expect(item.text).toBe('→ Dating');
    expect(item.crushName).toBe('a crush');
  });

  it('hides the text of a sensitive update', () => {
    const [item] = buildFeedItems([entry({ isSensitive: true })], [], 'me');
    expect(item.text).not.toContain('We kissed!');
  });

  it('marks rows newer than your last visit as unread (DEX-45)', () => {
    const items = buildFeedItems([
      entry({ id: 'new', timestamp: new Date('2026-11-12T10:00:00Z') }),
      entry({ id: 'old', timestamp: new Date('2026-11-09T10:00:00Z') })
    ], [], 'me', new Date('2026-11-10T00:00:00Z'));
    expect(items.map((i) => [i.entryId, i.unread])).toEqual([['new', true], ['old', false]]);
  });

  it('treats everything as unread if you have never opened the Feed, and nothing while it loads', () => {
    expect(buildFeedItems([entry({})], [], 'me', null)[0].unread).toBe(true);
    expect(buildFeedItems([entry({})], [], 'me')[0].unread).toBe(false);
  });

  it('is never part of the other tabs', () => {
    expect(matchesTeaFilter({ kind: 'entry_shared' } as any, 'feed')).toBe(false);
  });
});
