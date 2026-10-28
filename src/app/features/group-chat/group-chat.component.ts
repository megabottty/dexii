import { MessageMenuComponent } from '../../core/components/message-menu/message-menu.component';
import { ModalService } from '../../core/services/modal.service';
import { canEditMessage } from '../../core/models/message.model';
import { TypingService } from '../../core/services/typing.service';
import { Component, OnInit, OnDestroy, computed, inject, signal, HostListener } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';
import { REACTION_EMOJIS } from '../../core/config/reaction-emojis';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { GroupChatApiService, GroupChat, GroupMessage } from '../../core/services/group-chat-api.service';
import { personName } from '../../core/utils/person-name';

@Component({
  selector: 'app-group-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MessageMenuComponent],
  styleUrl: './group-chat.component.css',
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="group-chat-page">
      <div [style.border-bottom]="'1px solid ' + theme.colors().border" class="group-chat-header">
        <a routerLink="/chat" [style.color]="theme.colors().onBgPrimary" class="group-chat-back">← Back to Chats</a>
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
                <span [style.color]="theme.colors().textSecondary" class="group-chat-message__sender">{{ msg.senderDisplayName || msg.senderUsername || 'Friend' }}</span>
              }
              <div [style.background-color]="isMine(msg) ? theme.colors().primary : theme.colors().bgSecondary"
                   [style.color]="isMine(msg) ? 'white' : theme.colors().text"
                   [style.border]="isMine(msg) ? 'none' : '1px solid ' + theme.colors().border"
                   (dblclick)="!msg.deletedAt && toggleReactionPicker(msg.id, $event)"
                   [class.group-chat-message__bubble--deleted]="!!msg.deletedAt"
                   class="group-chat-message__bubble">
                @if (msg.deletedAt) {
                  <span class="group-chat-deleted"><span aria-hidden="true">🚫</span> {{ isMine(msg) ? 'You deleted this message' : 'This message was deleted' }}</span>
                } @else if (editingMessageId() === msg.id) {
                  <span class="group-chat-edit">
                    <input class="group-chat-edit__input" [ngModel]="editDraft()" (ngModelChange)="editDraft.set($event)" maxlength="4000"
                           aria-label="Edit message" (keydown.enter)="saveEdit(msg)" (keydown.escape)="editingMessageId.set(null)">
                    <span class="group-chat-edit__actions">
                      <button type="button" class="group-chat-edit__btn" (click)="editingMessageId.set(null)">Cancel</button>
                      <button type="button" class="group-chat-edit__btn group-chat-edit__btn--save" [disabled]="!editDraft().trim()" (click)="saveEdit(msg)">Save</button>
                    </span>
                  </span>
                } @else {
                  {{ msg.content }}
                }
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

              <div class="group-chat-msg-actions" [style.align-self]="isMine(msg) ? 'flex-end' : 'flex-start'">
                @if (!msg.deletedAt) {
                  <button type="button" (click)="toggleReactionPicker(msg.id, $event)" [style.color]="theme.colors().textSecondary" class="group-chat-react-trigger" aria-label="Add a reaction">😀+</button>
                }
                <app-message-menu [mine]="isMine(msg)" [canEdit]="canEdit(msg)" [deleted]="!!msg.deletedAt"
                                  (edit)="startEdit(msg)" (deleteForEveryone)="deleteMsg(msg, 'everyone')" (deleteForMe)="deleteMsg(msg, 'me')"></app-message-menu>
              </div>

              @if (activeReactionPickerFor() === msg.id) {
                <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="group-chat-reaction-picker" role="group" aria-label="Pick a reaction" (click)="$event.stopPropagation()">
                  @for (emoji of reactionOptions; track emoji) {
                    <button type="button" (click)="react(msg.id, emoji)" class="group-chat-reaction-picker__option">{{ emoji }}</button>
                  }
                </div>
              }

              <span [style.color]="theme.colors().textSecondary" class="group-chat-message__time">{{ msg.timestamp | date:'MMM d, h:mm a' }}@if (msg.editedAt && !msg.deletedAt) { · Edited }</span>
            </div>
          } @empty {
            <p [style.color]="theme.colors().textSecondary">No messages yet. Say hi to the group!</p>
          }
          @if (typingText(); as text) {
            <div class="chat-typing" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" role="status">
              <span class="chat-typing__dots" aria-hidden="true"><span></span><span></span><span></span></span>
              <span [style.color]="theme.colors().textSecondary" class="chat-typing__label">{{ text }}</span>
            </div>
          }
        }
      </div>

      <div [style.border-top]="'1px solid ' + theme.colors().border" class="group-chat-composer">
        <input [ngModel]="newMessage" (ngModelChange)="onType($event)" (blur)="typing.stopped({ groupId: groupId })" aria-label="Message"
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
  protected reactionOptions = REACTION_EMOJIS;
  protected groupId = '';
  protected typing = inject(TypingService);

  /** "Ana is typing…", "Ana and Ben are typing…", or "3 people are typing…". */
  protected typingText = computed(() => {
    const g = this.group();
    const ids = this.typing.typingIn({ groupId: this.groupId }).filter((id) => id !== this.selfId());
    if (!g || ids.length === 0) return '';
    const names = ids.map((id) => personName(g.members.find((m) => m.id === id), 'Someone'));
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
    return `${names.length} people are typing…`;
  });

  protected onType(value: string): void {
    this.newMessage = value;
    if (this.groupId) this.typing.typed({ groupId: this.groupId }, value);
  }
  private unsubscribeGroupMessage: (() => void) | null = null;
  private unsubscribeReaction: (() => void) | null = null;
  private unsubscribeChanged: (() => void) | null = null;
  private modal = inject(ModalService);

  // ---- Edit and delete, like other chat apps ----
  protected editingMessageId = signal<string | null>(null);
  protected editDraft = signal('');

  protected canEdit(msg: GroupMessage): boolean {
    return canEditMessage(msg, this.selfId());
  }

  protected startEdit(msg: GroupMessage): void {
    this.editingMessageId.set(msg.id);
    this.editDraft.set(msg.content);
  }

  protected async saveEdit(msg: GroupMessage): Promise<void> {
    const text = this.editDraft().trim();
    if (!text) return;
    if (text === msg.content) { this.editingMessageId.set(null); return; }
    if (!this.security.moderateContent(text)) {
      this.modal.show('Message flagged by AI moderation for safety.');
      return;
    }
    const { message, error } = await this.groupsApi.editMessage(msg.id, text);
    if (error) { this.modal.show(error); return; }
    if (message) this.applyChange(message);
    this.editingMessageId.set(null);
  }

  protected deleteMsg(msg: GroupMessage, scope: 'everyone' | 'me'): void {
    this.modal.confirm(
      scope === 'everyone'
        ? 'Delete this message for everyone? The group will see “This message was deleted”.'
        : 'Delete this message for you? It stays in the chat for everyone else.',
      () => {
        void this.groupsApi.deleteMessage(msg.id, scope).then(({ message, error }) => {
          if (error) { this.modal.show(error); return; }
          if (scope === 'me') this.messages.update((msgs) => msgs.filter((m) => m.id !== msg.id));
          else if (message) this.applyChange(message);
        });
      },
      undefined,
      { title: scope === 'everyone' ? 'Delete for everyone' : 'Delete for me', confirmLabel: 'Delete', danger: true }
    );
  }

  /** Keeps the sender's name and picture; takes the new text, edited and deleted state. */
  private applyChange(changed: GroupMessage): void {
    this.messages.update((msgs) => msgs.map((m) => m.id === changed.id
      ? { ...m, content: changed.content, editedAt: changed.editedAt, deletedAt: changed.deletedAt, reactions: changed.deletedAt ? [] : (changed.reactions ?? m.reactions) }
      : m));
  }

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

    // Someone edited or deleted a message for everyone.
    this.unsubscribeChanged = this.realtime.onMessageChanged((row) => {
      if (String(row.group || '') !== this.groupId) return;
      this.applyChange(this.groupsApi.mapIncomingMessage(row));
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
    if (this.groupId) this.typing.stopped({ groupId: this.groupId });
    this.unsubscribeGroupMessage?.();
    this.unsubscribeReaction?.();
    this.unsubscribeChanged?.();
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
      .map((m) => personName(m))
      .join(', ');
  }

  isMine(msg: GroupMessage): boolean {
    return msg.senderId === this.selfId();
  }

  async send(): Promise<void> {
    const content = this.newMessage.trim();
    if (!content) return;
    this.newMessage = '';
    this.typing.stopped({ groupId: this.groupId });
    try {
      const message = await this.groupsApi.sendGroupMessage(this.groupId, content);
      this.messages.update((msgs) => [...msgs, message]);
    } catch (err) {
      console.warn('Could not send group message:', err);
    }
  }

  toggleReactionPicker(messageId: string, event?: Event): void {
    event?.stopPropagation();
    this.activeReactionPickerFor.set(this.activeReactionPickerFor() === messageId ? null : messageId);
  }

  /** Tapping anywhere outside the picker (or pressing Escape) dismisses it. */
  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  closeReactionPicker(): void {
    if (this.activeReactionPickerFor() !== null) this.activeReactionPickerFor.set(null);
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

  /** Page-level loading feeds the global overlay (app-loading-overlay). */
  private readonly loadingOverlay = inject(LoadingService).bindHere(computed(() => this.loading()));
}
