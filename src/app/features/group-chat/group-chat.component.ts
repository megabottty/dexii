import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { GroupChatApiService, GroupChat, GroupMessage } from '../../core/services/group-chat-api.service';

@Component({
  selector: 'app-group-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  styleUrl: './group-chat.component.css',
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="group-chat-page">
      <div [style.border-bottom]="'1px solid ' + theme.colors().border" class="group-chat-header">
        <a routerLink="/chat" [style.color]="theme.colors().primary" class="group-chat-back">← Back to Chats</a>
        @if (group(); as g) {
          <div class="group-chat-header__info">
            <span class="group-chat-header__icon">👥</span>
            <div>
              <p class="group-chat-header__name">{{ g.name }}</p>
              <p [style.color]="theme.colors().textSecondary" class="group-chat-header__members">
                {{ g.members.length }} members: {{ memberNames(g) }}
              </p>
            </div>
          </div>
          <button type="button" (click)="leaveGroup()" [style.color]="theme.colors().textSecondary" class="group-chat-leave-btn">
            Leave
          </button>
        }
      </div>

      <div class="group-chat-messages">
        @if (loading()) {
          <p [style.color]="theme.colors().textSecondary">Loading messages...</p>
        } @else {
          @for (msg of messages(); track msg.id) {
            <div [style.align-self]="isMine(msg) ? 'flex-end' : 'flex-start'" class="group-chat-message">
              @if (!isMine(msg)) {
                <span [style.color]="theme.colors().textSecondary" class="group-chat-message__sender">{{ msg.senderUsername || 'Friend' }}</span>
              }
              <div [style.background-color]="isMine(msg) ? theme.colors().primary : theme.colors().bgSecondary"
                   [style.color]="isMine(msg) ? 'white' : theme.colors().text"
                   [style.border]="isMine(msg) ? 'none' : '1px solid ' + theme.colors().border"
                   (dblclick)="toggleReactionPicker(msg.id)"
                   class="group-chat-message__bubble">
                {{ msg.content }}
              </div>

              @if (groupedReactions(msg).length > 0) {
                <div class="group-chat-reactions-bar" [style.justify-content]="isMine(msg) ? 'flex-end' : 'flex-start'">
                  @for (grp of groupedReactions(msg); track grp.emoji) {
                    <button type="button"
                            (click)="react(msg.id, grp.emoji)"
                            [class.group-chat-reaction-pill--mine]="grp.reactedByMe"
                            [style.background-color]="theme.colors().bg"
                            [style.border]="'1px solid ' + (grp.reactedByMe ? theme.colors().primary : theme.colors().border)"
                            class="group-chat-reaction-pill">
                      <span>{{ grp.emoji }}</span>
                      @if (grp.count > 1) { <span>{{ grp.count }}</span> }
                    </button>
                  }
                </div>
              }

              <button type="button" (click)="toggleReactionPicker(msg.id)" [style.color]="theme.colors().textSecondary" class="group-chat-react-trigger">😀+</button>

              @if (activeReactionPickerFor() === msg.id) {
                <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="group-chat-reaction-picker">
                  @for (emoji of reactionOptions; track emoji) {
                    <button type="button" (click)="react(msg.id, emoji)" class="group-chat-reaction-picker__option">{{ emoji }}</button>
                  }
                </div>
              }

              <span [style.color]="theme.colors().textSecondary" class="group-chat-message__time">{{ msg.timestamp | date:'MMM d, h:mm a' }}</span>
            </div>
          } @empty {
            <p [style.color]="theme.colors().textSecondary">No messages yet. Say hi to the group!</p>
          }
        }
      </div>

      <div [style.border-top]="'1px solid ' + theme.colors().border" class="group-chat-composer">
        <input [(ngModel)]="newMessage"
               (keydown.enter)="send()"
               [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               [style.color]="theme.colors().text"
               placeholder="Message the group..."
               class="group-chat-composer__input">
        <button type="button"
                (click)="send()"
                [style.background-color]="theme.colors().primary"
                class="group-chat-composer__send">
          Send
        </button>
      </div>
    </div>
  `
})
export class GroupChatComponent implements OnInit, OnDestroy {
  protected theme = inject(ThemeService);
  private security = inject(SecurityService);
  private realtime = inject(RealtimeService);
  private groupsApi = inject(GroupChatApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected loading = signal(true);
  protected group = signal<GroupChat | null>(null);
  protected messages = signal<GroupMessage[]>([]);
  protected newMessage = '';
  protected activeReactionPickerFor = signal<string | null>(null);
  protected reactionOptions = ['❤️', '😂', '👍', '😮', '😢', '🔥'];
  private groupId = '';
  private unsubscribeGroupMessage: (() => void) | null = null;
  private unsubscribeReaction: (() => void) | null = null;

  selfId = computed(() => this.security.currentUserId() || '');

  async ngOnInit(): Promise<void> {
    this.groupId = this.route.snapshot.paramMap.get('groupId') || '';
    if (!this.groupId) {
      this.router.navigate(['/chat']);
      return;
    }

    this.unsubscribeGroupMessage = this.realtime.onGroupMessage((raw) => {
      const message = this.groupsApi.mapIncomingMessage(raw);
      if (message.groupId !== this.groupId) return;
      if (this.messages().some((m) => m.id === message.id)) return;
      this.messages.update((msgs) => [...msgs, message]);
    });

    this.unsubscribeReaction = this.realtime.onReactionUpdate((update) => {
      const id = String((update as any)._id || (update as any).id || '');
      if (!id) return;
      this.messages.update((msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, reactions: update.reactions || [] } : m))
      );
    });

    await this.loadGroupAndMessages();
    void this.groupsApi.markGroupRead(this.groupId);
  }

  ngOnDestroy(): void {
    this.unsubscribeGroupMessage?.();
    this.unsubscribeReaction?.();
  }

  private async loadGroupAndMessages(): Promise<void> {
    this.loading.set(true);
    try {
      const [summaries, msgs] = await Promise.all([
        this.groupsApi.listGroups(),
        this.groupsApi.getGroupMessages(this.groupId)
      ]);
      const summary = summaries.find((s) => s.group.id === this.groupId);
      if (summary) this.group.set(summary.group);
      this.messages.set(msgs);
    } finally {
      this.loading.set(false);
    }
  }

  memberNames(g: GroupChat): string {
    return g.members
      .filter((m) => m.id !== this.selfId())
      .map((m) => m.username)
      .join(', ');
  }

  isMine(msg: GroupMessage): boolean {
    return msg.senderId === this.selfId();
  }

  async send(): Promise<void> {
    const content = this.newMessage.trim();
    if (!content) return;
    this.newMessage = '';
    try {
      const message = await this.groupsApi.sendGroupMessage(this.groupId, content);
      this.messages.update((msgs) => [...msgs, message]);
    } catch (err) {
      console.warn('Could not send group message:', err);
    }
  }

  toggleReactionPicker(messageId: string): void {
    this.activeReactionPickerFor.set(this.activeReactionPickerFor() === messageId ? null : messageId);
  }

  async react(messageId: string, emoji: string): Promise<void> {
    this.activeReactionPickerFor.set(null);
    const selfId = this.selfId();
    const target = this.messages().find((m) => m.id === messageId);
    const existing = target?.reactions?.find((r) => r.user === selfId);
    const optimistic = (target?.reactions || []).filter((r) => r.user !== selfId);
    if (!existing || existing.emoji !== emoji) optimistic.push({ user: selfId, emoji });
    this.messages.update((msgs) => msgs.map((m) => (m.id === messageId ? { ...m, reactions: optimistic } : m)));

    const saved = await this.groupsApi.reactToMessage(messageId, emoji);
    const reactions = saved?.reactions || optimistic;
    this.messages.update((msgs) => msgs.map((m) => (m.id === messageId ? { ...m, reactions } : m)));

    const g = this.group();
    if (g) {
      this.realtime.emitReactionUpdate({
        message: { _id: messageId, reactions },
        memberIds: g.members.map((m) => m.id)
      });
    }
  }

  groupedReactions(msg: GroupMessage): Array<{ emoji: string; count: number; reactedByMe: boolean }> {
    const reactions = msg.reactions || [];
    if (reactions.length === 0) return [];
    const selfId = this.selfId();
    const byEmoji = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
    for (const r of reactions) {
      const entry = byEmoji.get(r.emoji) || { emoji: r.emoji, count: 0, reactedByMe: false };
      entry.count += 1;
      if (r.user === selfId) entry.reactedByMe = true;
      byEmoji.set(r.emoji, entry);
    }
    return Array.from(byEmoji.values());
  }

  async leaveGroup(): Promise<void> {
    await this.groupsApi.leaveGroup(this.groupId);
    this.router.navigate(['/chat']);
  }
}
