import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService, TypingEvent } from './realtime.service';
import { TypingService } from './typing.service';

describe('TypingService', () => {
  let typingHandler: (e: TypingEvent) => void;
  let messageHandler: (m: any) => void;
  const emitted: unknown[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    emitted.length = 0;
    TestBed.configureTestingModule({
      providers: [{
        provide: RealtimeService,
        useValue: {
          onTyping: (h: any) => { typingHandler = h; return () => {}; },
          onMessage: (h: any) => { messageHandler = h; return () => {}; },
          onGroupMessage: () => () => {},
          emitTyping: (p: unknown) => emitted.push(p)
        }
      }]
    });
  });

  afterEach(() => vi.useRealTimers());

  it('shows a friend typing, and clears it when they stop, send, or go quiet', () => {
    const service = TestBed.inject(TypingService);
    typingHandler({ senderId: 'ana', isTyping: true });
    expect(service.typingIn({ recipientId: 'ana' })).toEqual(['ana']);
    typingHandler({ senderId: 'ana', isTyping: false });
    expect(service.typingIn({ recipientId: 'ana' })).toEqual([]);

    typingHandler({ senderId: 'ana', isTyping: true });
    messageHandler({ senderId: 'ana' });
    expect(service.typingIn({ recipientId: 'ana' })).toEqual([]);

    typingHandler({ senderId: 'ana', isTyping: true });
    vi.advanceTimersByTime(7000);
    expect(service.typingIn({ recipientId: 'ana' })).toEqual([]);
  });

  it('keeps group typing separate from 1:1', () => {
    const service = TestBed.inject(TypingService);
    typingHandler({ senderId: 'ben', groupId: 'g1', isTyping: true });
    expect(service.typingIn({ groupId: 'g1' })).toEqual(['ben']);
    expect(service.typingIn({ recipientId: 'ben' })).toEqual([]);
  });

  it('sends "typing" at most every few seconds, then "stopped" after a pause', () => {
    const service = TestBed.inject(TypingService);
    service.typed({ recipientId: 'ana' }, 'h');
    service.typed({ recipientId: 'ana' }, 'hi');
    service.typed({ recipientId: 'ana' }, 'hi!');
    expect(emitted).toEqual([{ recipientId: 'ana', isTyping: true }]);
    vi.advanceTimersByTime(3100);
    expect(emitted).toEqual([{ recipientId: 'ana', isTyping: true }, { recipientId: 'ana', isTyping: false }]);
  });
});
