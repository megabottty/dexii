import { Injectable, inject, signal } from '@angular/core';
import { RealtimeService, TypingEvent } from './realtime.service';

/** A chat you can type into: a friend (1:1) or a group. */
export type TypingTarget = { recipientId: string } | { groupId: string };

/** How often "still typing" is re-sent while someone keeps typing. */
const RESEND_MS = 2500;
/** No keystroke for this long means they stopped. */
const IDLE_MS = 3000;
/** A typing flag we heard about fades out after this, in case "stopped" never arrives. */
const EXPIRE_MS = 6000;

const keyFor = (target: TypingTarget | { senderId: string; groupId?: string }): string =>
  'groupId' in target && target.groupId ? `group:${target.groupId}` : `dm:${'recipientId' in target ? target.recipientId : (target as { senderId: string }).senderId}`;

/**
 * "Ana is typing…" for chats. Sends your typing state (throttled) and keeps track of
 * who is typing to you, per chat, with a timeout so a lost "stopped" never sticks.
 */
@Injectable({ providedIn: 'root' })
export class TypingService {
  private realtime = inject(RealtimeService);

  /** chat key → ids of people typing there right now. */
  private readonly _typing = signal<ReadonlyMap<string, ReadonlySet<string>>>(new Map());
  private readonly expiry = new Map<string, ReturnType<typeof setTimeout>>();

  private lastSent = new Map<string, number>();
  private idleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    this.realtime.onTyping((event) => this.receive(event));
    // A message arriving from someone means they've stopped typing.
    this.realtime.onMessage((m) => { if (m?.senderId) this.clear({ recipientId: String(m.senderId) }, String(m.senderId)); });
    this.realtime.onGroupMessage((raw: any) => {
      const sender = raw?.sender && typeof raw.sender === 'object' ? raw.sender._id : raw?.sender;
      if (raw?.group && sender) this.clear({ groupId: String(raw.group) }, String(sender));
    });
  }

  /** Ids typing in a 1:1 chat with this friend, or in this group. */
  typingIn(target: TypingTarget): string[] {
    return [...(this._typing().get(keyFor(target)) || [])];
  }

  /** Call on every keystroke in a chat's message box. */
  typed(target: TypingTarget, text: string): void {
    const key = keyFor(target);
    if (!text.trim()) {
      this.stopped(target);
      return;
    }
    const now = Date.now();
    if (now - (this.lastSent.get(key) || 0) >= RESEND_MS) {
      this.lastSent.set(key, now);
      this.realtime.emitTyping({ ...target, isTyping: true });
    }
    clearTimeout(this.idleTimers.get(key));
    this.idleTimers.set(key, setTimeout(() => this.stopped(target), IDLE_MS));
  }

  /** Call when the message is sent, the box is cleared, or the chat is left. */
  stopped(target: TypingTarget): void {
    const key = keyFor(target);
    clearTimeout(this.idleTimers.get(key));
    this.idleTimers.delete(key);
    if (this.lastSent.has(key)) {
      this.lastSent.delete(key);
      this.realtime.emitTyping({ ...target, isTyping: false });
    }
  }

  private receive(event: TypingEvent): void {
    const key = keyFor(event);
    const timerKey = `${key}|${event.senderId}`;
    clearTimeout(this.expiry.get(timerKey));
    this.expiry.delete(timerKey);
    this.set(key, event.senderId, event.isTyping);
    if (event.isTyping) {
      this.expiry.set(timerKey, setTimeout(() => {
        this.expiry.delete(timerKey);
        this.set(key, event.senderId, false);
      }, EXPIRE_MS));
    }
  }

  /** A message arriving from someone means they've stopped typing. */
  clear(target: TypingTarget, senderId: string): void {
    this.set(keyFor(target), senderId, false);
  }

  private set(key: string, senderId: string, typing: boolean): void {
    this._typing.update((map) => {
      const next = new Map(map);
      const ids = new Set(next.get(key) || []);
      if (typing) ids.add(senderId); else ids.delete(senderId);
      if (ids.size) next.set(key, ids); else next.delete(key);
      return next;
    });
  }
}
