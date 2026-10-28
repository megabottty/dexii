import { describe, expect, it } from 'vitest';
import { Message, canEditMessage } from './message.model';

const id = 'a'.repeat(24);
const msg = (over: Partial<Message> = {}): Message => ({
  id, senderId: 'me', receiverId: 'ana', content: 'hi', timestamp: new Date(1_000_000), ...over
});

describe('canEditMessage', () => {
  const now = 1_000_000 + 60_000;

  it('lets the sender edit a normal message for 15 minutes', () => {
    expect(canEditMessage(msg(), 'me', now)).toBe(true);
    expect(canEditMessage(msg(), 'me', 1_000_000 + 16 * 60_000)).toBe(false);
  });

  it("never lets you edit someone else's, a deleted, a disappearing, a shared or an unsynced message", () => {
    expect(canEditMessage(msg({ senderId: 'ana' }), 'me', now)).toBe(false);
    expect(canEditMessage(msg({ deletedAt: new Date() }), 'me', now)).toBe(false);
    expect(canEditMessage(msg({ isSelfDestruct: true }), 'me', now)).toBe(false);
    expect(canEditMessage(msg({ kind: 'crush_share' }), 'me', now)).toBe(false);
    expect(canEditMessage(msg({ id: 'local1' }), 'me', now)).toBe(false);
  });
});
