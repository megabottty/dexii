import { Component, signal, inject, computed, effect, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessagingService } from '../../core/services/messaging.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { ModalService } from '../../core/services/modal.service';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { FriendsApiService, FriendSummary } from '../../core/services/friends-api.service';

@Component({
  selector: 'app-messaging',
  standalone: true,
  styleUrl: './messaging.component.css',
  imports: [CommonModule, FormsModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         class="messaging-component__s1">

      <!-- Header -->
      <header [style.background-color]="theme.colors().bgSecondary" [style.border-bottom]="'1px solid ' + theme.colors().border"
              class="messaging-component__s2">
        <div class="messaging-component__s3">
          <a [routerLink]="hasActiveChat() ? '/chat' : '/friends'"
             [style.color]="theme.colors().textSecondary"
             [attr.aria-label]="hasActiveChat() ? 'Back to all chats' : 'Back to friends'"
             class="messaging-component__s4">←</a>
          <div>
            <h2 class="messaging-component__s5">{{ hasActiveChat() ? currentChatPartner().username : 'Chats' }}</h2>
            <span [style.color]="theme.colors().primary" class="messaging-component__s6">
              {{ hasActiveChat() ? 'End-to-End Encrypted Tea' : 'Your private conversations' }}
            </span>
          </div>
        </div>
        <a routerLink="/dashboard"
           [style.color]="theme.colors().primary"
           [style.border]="'1px solid ' + theme.colors().primary"
           style="text-decoration: none; padding: 6px 12px; border-radius: 6px; font-weight: 600;">
          Dashboard
        </a>
      </header>

      <!-- Messages Area -->
      <div #scrollContainer class="messaging-component__s7">
        <app-page-hint
          hintKey="chat_inline"
          title="Chat Hint"
          [message]="hasActiveChat() ? 'Shared notes appear here. Send normal messages, and include the word secret to make a message self-destruct after it is opened.' : 'Open an existing chat, or start a new conversation with a friend.'">
        </app-page-hint>

        @if (hasActiveChat()) {
          @for (msg of activeMessages(); track msg.id) {
            <div [style.align-self]="isMine(msg) ? 'flex-end' : 'flex-start'"
                 [style.max-width]="'70%'"
                 class="messaging-component__s8">
              <div [style.background-color]="isMine(msg) ? theme.colors().primary : theme.colors().bgSecondary"
                   [style.color]="isMine(msg) ? 'white' : theme.colors().text"
                   [style.border]="isMine(msg) ? 'none' : '1px solid ' + theme.colors().border"
                   class="messaging-component__s9">
                {{ msg.content }}
                @if (msg.isSelfDestruct) {
                  <span class="messaging-component__s10">
                    🔥 Self-Destructing
                    @if (msg.selfDestructDurationMs) {
                      • {{ formatSelfDestructDuration(msg.selfDestructDurationMs) }} after opened
                    }
                  </span>
                }
              </div>
              <span [style.color]="theme.colors().textSecondary" [style.text-align]="isMine(msg) ? 'right' : 'left'" class="messaging-time">
                {{ msg.timestamp | date:'h:mm a' }}
              </span>
            </div>
          } @empty {
            <div [style.border]="'1px dashed ' + theme.colors().border"
                 class="messaging-empty-state">
              <p [style.color]="theme.colors().textSecondary">No messages yet. Start the conversation below.</p>
            </div>
          }
        } @else {
          <section class="chat-hub">
            <div class="chat-hub__toolbar">
              <div class="chat-hub__toolbar-copy">
                <p [style.color]="theme.colors().primary" class="messaging-component__s6">Your chats</p>
                <span [style.color]="theme.colors().textSecondary" class="chat-hub__meta">
                  {{ conversationList().length }} conversation{{ conversationList().length === 1 ? '' : 's' }}
                  @if (messaging.unreadTeaCount() > 0) {
                    • {{ messaging.unreadTeaCount() }} unread
                  }
                </span>
              </div>
              <button type="button"
                      (click)="toggleNewChat()"
                      [style.background-color]="showNewChat() ? 'transparent' : theme.colors().primary"
                      [style.color]="showNewChat() ? theme.colors().primary : '#ffffff'"
                      [style.border]="'1px solid ' + theme.colors().primary"
                      class="chat-hub__new-btn">
                {{ showNewChat() ? 'Cancel' : '+ New Chat' }}
              </button>
            </div>

            @if (showNewChat()) {
              <div [style.background-color]="theme.colors().bgSecondary"
                   [style.border]="'1px solid ' + theme.colors().primary"
                   class="chat-hub__panel">
                <label [style.color]="theme.colors().textSecondary" class="chat-hub__panel-label">
                  Pick a friend to message
                </label>
                <input [ngModel]="friendSearch()"
                       (ngModelChange)="friendSearch.set($event)"
                       [style.background-color]="theme.colors().bg"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text"
                       placeholder="Search friends..."
                       aria-label="Search friends to start a new chat"
                       class="chat-hub__search">
                <div class="chat-hub__list chat-hub__list--scroll">
                  @for (friend of newChatCandidates(); track friend.id) {
                    <button (click)="startChat(friend)"
                            [style.background-color]="theme.colors().bg"
                            [style.border]="'1px solid ' + theme.colors().border"
                            [style.color]="theme.colors().text"
                            class="chat-hub__card">
                      <img [src]="friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + friend.id"
                           [alt]="friend.username + ' avatar'"
                           class="chat-hub__avatar">
                      <span class="chat-hub__content">
                        <span class="chat-hub__title">{{ friend.username }}</span>
                        <span [style.color]="theme.colors().textSecondary" class="chat-hub__preview">
                          Tap to start messaging
                        </span>
                      </span>
                    </button>
                  } @empty {
                    <div [style.border]="'1px dashed ' + theme.colors().border"
                         class="messaging-empty-state">
                      @if (friends().length === 0) {
                        <p [style.color]="theme.colors().textSecondary">Add a friend first to start a new chat.</p>
                        <a routerLink="/friends" [style.color]="theme.colors().primary">Go to Friends</a>
                      } @else if (friendSearch().trim()) {
                        <p [style.color]="theme.colors().textSecondary">No friends match “{{ friendSearch() }}”.</p>
                      } @else {
                        <p [style.color]="theme.colors().textSecondary">You already have a chat open with every friend.</p>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            @if (conversationList().length > 3) {
              <input [ngModel]="chatSearch()"
                     (ngModelChange)="chatSearch.set($event)"
                     [style.background-color]="theme.colors().bgSecondary"
                     [style.border]="'1px solid ' + theme.colors().border"
                     [style.color]="theme.colors().text"
                     placeholder="Search conversations..."
                     aria-label="Search conversations"
                     class="chat-hub__search">
            }

            <div class="chat-hub__list">
              @for (chat of filteredConversations(); track chat.friend.id) {
                <button (click)="openChat(chat.friend.id, chatDisplayName(chat.friend))"
                        [style.background-color]="theme.colors().bgSecondary"
                        [style.border]="chat.unreadCount > 0 ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                        [style.color]="theme.colors().text"
                        class="chat-hub__card"
                        [class.chat-hub__card--unread]="chat.unreadCount > 0">
                  <img [src]="chat.friend.avatarUrl || 'https://i.pravatar.cc/150?u=' + chat.friend.id"
                       [alt]="chatDisplayName(chat.friend) + ' avatar'"
                       class="chat-hub__avatar">
                  <span class="chat-hub__content">
                    <span class="chat-hub__row">
                      <span class="chat-hub__title">{{ chatDisplayName(chat.friend) }}</span>
                      <span [style.color]="theme.colors().textSecondary" class="chat-hub__time">
                        {{ chat.latestMessage.timestamp | date:'MMM d, h:mm a' }}
                      </span>
                    </span>
                    <span [style.color]="chat.unreadCount > 0 ? theme.colors().text : theme.colors().textSecondary"
                          class="chat-hub__preview">
                      @if (chat.latestMessage.senderId === selfId()) { <span [style.color]="theme.colors().textSecondary">You: </span> }
                      @if (chat.latestMessage.isSelfDestruct) { 🔥 }
                      {{ chat.latestMessage.content }}
                    </span>
                  </span>
                  @if ((chat.unreadSelfDestructCount || 0) > 0) {
                    <span class="chat-hub__badge chat-hub__badge--flame">🔥 {{ chat.unreadCount }}</span>
                  } @else if (chat.unreadCount > 0) {
                    <span [style.background-color]="theme.colors().primary" class="chat-hub__badge">
                      {{ chat.unreadCount }}
                    </span>
                  }
                </button>
              } @empty {
                <div [style.border]="'1px dashed ' + theme.colors().border"
                     class="messaging-empty-state">
                  @if (chatSearch().trim() && conversationList().length > 0) {
                    <p [style.color]="theme.colors().textSecondary">No conversations match “{{ chatSearch() }}”.</p>
                  } @else {
                    <p [style.color]="theme.colors().textSecondary">No chats yet. Start one to spill some tea.</p>
                    @if (!showNewChat()) {
                      <button type="button"
                              (click)="toggleNewChat()"
                              [style.background-color]="theme.colors().primary"
                              [style.border]="'1px solid ' + theme.colors().primary"
                              [style.color]="'#ffffff'"
                              class="chat-hub__new-btn"
                              style="margin-top: 12px;">
                        + New Chat
                      </button>
                    }
                  }
                </div>
              }
            </div>
          </section>
        }
      </div>

      <!-- Input Area -->
      @if (hasActiveChat()) {
        <div [style.background-color]="theme.colors().bgSecondary" [style.border-top]="'1px solid ' + theme.colors().border"
             class="messaging-component__s11">
          <div class="messaging-composer">
            <div class="messaging-composer__row">
              <input [(ngModel)]="newMessage" (keyup.enter)="send()"
                     [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text"
                     placeholder="Spill the tea..."
                     aria-label="Message input"
                     class="messaging-component__s12">
              <button (click)="send()" [style.background-color]="theme.colors().primary"
                      class="messaging-component__s13">
                Send
              </button>
            </div>
            <div class="messaging-composer__options">
              <label [style.color]="theme.colors().textSecondary" style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
                Self-destruct after
              </label>
              <select [(ngModel)]="selfDestructDurationMs"
                      [style.background-color]="theme.colors().bg"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.color]="theme.colors().text"
                      style="padding: 8px 10px; border-radius: 0; font-family: 'Times New Roman', serif;">
                @for (option of selfDestructOptions; track option.ms) {
                  <option [ngValue]="option.ms">{{ option.label }}</option>
                }
              </select>
              <span [style.color]="theme.colors().textSecondary" style="font-size: 11px;">
                Type “secret” to trigger the timer.
              </span>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class MessagingComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public messaging = inject(MessagingService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public modal = inject(ModalService);
  private friendsApi = inject(FriendsApiService);
  private chatPartnerId = signal<string>('');
  private chatPartnerName = signal<string>('');
  friends = signal<FriendSummary[]>([]);
  showNewChat = signal(false);
  friendSearch = signal('');
  chatSearch = signal('');
  selfDestructDurationMs = signal(30000);
  selfDestructOptions = [
    { label: '10 seconds', ms: 10000 },
    { label: '30 seconds', ms: 30000 },
    { label: '1 minute', ms: 60000 },
    { label: '5 minutes', ms: 300000 }
  ];

  currentChatPartner = computed(() => {
    return {
      id: this.chatPartnerId(),
      username: this.chatPartnerName() || this.chatPartnerId()
    };
  });
  hasActiveChat = computed(() => Boolean(this.currentChatPartner().id));
  newMessage = '';

  // Falls back to the legacy local-only 'me' marker when signed out, so existing
  // locally stored conversations still render.
  selfId = computed(() => this.security.currentUserId() || 'me');

  /** True when the message was sent by the signed-in user. */
  isMine(msg: { senderId: string }): boolean {
    return msg.senderId === this.selfId();
  }

  activeMessages = computed(() =>
    this.messaging.getConversation(this.selfId(), this.currentChatPartner().id)
  );

  constructor() {
    effect(() => {
      const error = this.messaging.lastSyncError();
      if (error) {
        this.modal.show(`Message saved locally but could not be synced: ${error}`);
      }
    });

    this.route.queryParamMap.subscribe((params) => {
      const partnerId = (params.get('friendId') || params.get('friend') || '').trim();
      const partnerName = (params.get('friendName') || params.get('name') || '').trim();

      if (partnerId) {
        this.chatPartnerId.set(partnerId);
        this.chatPartnerName.set(partnerName || partnerId);
        void this.messaging.loadConversation(partnerId);
        return;
      }

      this.chatPartnerId.set('');
      this.chatPartnerName.set('');
      void this.loadChatHub();
    });
  }

  ngOnInit() {
    void this.loadChatHub();
    if (this.hasActiveChat()) {
      this.messaging.markConversationAsRead(this.selfId(), this.currentChatPartner().id);
      void this.messaging.loadConversation(this.currentChatPartner().id);
    }
  }

  ngAfterViewChecked() {
    if (!this.hasActiveChat()) return;
    this.messaging.markConversationAsRead(this.selfId(), this.currentChatPartner().id);
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  send() {
    if (!this.hasActiveChat() || !this.newMessage.trim()) return;

    if (!this.security.moderateContent(this.newMessage)) {
      this.modal.show('Message flagged by AI moderation for safety.');
      return;
    }

    const isSelfDestruct = this.newMessage.toLowerCase().includes('secret');
    this.messaging.sendMessage({
      senderId: this.selfId(),
      receiverId: this.currentChatPartner().id,
      content: this.newMessage,
      isSelfDestruct,
      selfDestructDurationMs: isSelfDestruct ? this.selfDestructDurationMs() : undefined
    });
    this.newMessage = '';
  }

  openChat(friendId: string, friendName: string): void {
    this.router.navigate(['/chat'], { queryParams: { friendId, friendName } });
  }

  toggleNewChat(): void {
    this.showNewChat.update((open) => !open);
    this.friendSearch.set('');
  }

  startChat(friend: FriendSummary): void {
    this.showNewChat.set(false);
    this.friendSearch.set('');
    this.openChat(friend.id, friend.username);
  }

  /** Conversations sorted so unread tea floats to the top, then most recent. */
  conversationList = computed(() => {
    return [...this.messaging.conversationSummaries()].sort((a, b) => {
      const aUnread = a.unreadCount > 0 ? 1 : 0;
      const bUnread = b.unreadCount > 0 ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      return b.latestMessage.timestamp.getTime() - a.latestMessage.timestamp.getTime();
    });
  });

  filteredConversations = computed(() => {
    const term = this.chatSearch().trim().toLowerCase();
    if (!term) return this.conversationList();
    return this.conversationList().filter((chat) =>
      this.chatDisplayName(chat.friend).toLowerCase().includes(term) ||
      (chat.latestMessage.content || '').toLowerCase().includes(term)
    );
  });

  /** Friends you have not started a conversation with yet, filtered by the search box. */
  newChatCandidates = computed(() => {
    const existing = new Set<string>();
    for (const chat of this.messaging.conversationSummaries()) {
      existing.add(chat.friend.id);
      existing.add(chat.friend.username);
    }

    const term = this.friendSearch().trim().toLowerCase();
    return this.friends()
      .filter((friend) => !existing.has(friend.id) && !existing.has(friend.username))
      .filter((friend) => !term || friend.username.toLowerCase().includes(term))
      .sort((a, b) => a.username.localeCompare(b.username));
  });

  chatDisplayName(friend: { id: string; username: string }): string {
    const match = this.friends().find((item) => item.id === friend.id || item.username === friend.username);
    if (match?.username) return match.username;
    return this.looksLikeObjectId(friend.username) ? 'Unknown friend' : friend.username;
  }

  private looksLikeObjectId(value: string): boolean {
    return /^[a-f\d]{24}$/i.test(value);
  }

  private async loadChatHub(): Promise<void> {
    if (!this.security.currentUserId()) {
      this.friends.set([]);
      void this.messaging.loadConversationSummaries();
      return;
    }

    try {
      this.friends.set(await this.friendsApi.listFriends());
    } catch {
      this.friends.set([]);
    }

    void this.messaging.loadConversationSummaries();
  }

  formatSelfDestructDuration(ms: number): string {
    if (ms >= 60000 && ms % 60000 === 0) {
      const minutes = ms / 60000;
      return `${minutes} min${minutes === 1 ? '' : 's'}`;
    }
    const seconds = Math.max(1, Math.round(ms / 1000));
    return `${seconds} sec${seconds === 1 ? '' : 's'}`;
  }
}
