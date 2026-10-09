import { describe, expect, it } from 'vitest';
import { activityGroup, describeActivity, type ActivityEvent } from './activity.service';

const me = { id: 'me', username: 'ava' };
const sam = { id: 'f1', username: 'sam', firstName: 'Sam' };
const ev = (over: Partial<ActivityEvent>): ActivityEvent => ({ id: 'e', type: 'crush_shared', actor: me, counterpart: sam, meta: {}, createdAt: '2026-10-08T10:00:00Z', ...over });

describe('describeActivity', () => {
  it('reads from my point of view in both directions', () => {
    expect(describeActivity(ev({ meta: { nickname: 'Sunny' } }), 'me').text).toBe('You shared Sunny with Sam');
    expect(describeActivity(ev({ actor: sam, counterpart: me, meta: { nickname: 'Sunny' } }), 'me').text).toBe('Sam shared Sunny with you');
  });

  it('links share and view rows to the crush', () => {
    expect(describeActivity(ev({ crushId: 'c1' }), 'me').route).toEqual(['/profile', 'c1']);
    expect(describeActivity(ev({ type: 'crush_viewed', actor: sam, counterpart: me, crushId: 'c1', meta: { nickname: 'Sunny' } }), 'me').text).toBe('Sam opened Sunny');
  });

  it('summarises a chat day without any message text', () => {
    const d = describeActivity(ev({ type: 'chat_day', actor: null, counterpart: sam, meta: { count: 6, date: '2026-10-08' } }), 'me');
    expect(d.text).toBe('6 messages with Sam');
    expect(d.route).toEqual(['/chat']);
  });

  it('keeps private actions in the first person', () => {
    expect(describeActivity(ev({ type: 'friend_paused', meta: { muted: true } }), 'me').text).toBe('You paused your friendship with Sam and muted notifications');
    expect(describeActivity(ev({ type: 'request_declined', actor: me, counterpart: sam }), 'me').text).toBe("You declined Sam's friend request");
  });

  it('groups types for the filter chips', () => {
    expect(activityGroup('crush_shared')).toBe('sharing');
    expect(activityGroup('entry_unshared')).toBe('sharing');
    expect(activityGroup('request_nudged')).toBe('friendship');
    expect(activityGroup('friend_paused')).toBe('friendship');
    expect(activityGroup('chat_day')).toBe('chat');
    expect(activityGroup('safety_alert')).toBe('chat');
  });
});
