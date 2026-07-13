import { Component, signal, inject, computed, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MessagingService } from '../../core/services/messaging.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { ModalService } from '../../core/services/modal.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

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
          <a routerLink="/friends" [style.color]="theme.colors().textSecondary" aria-label="Back to friends" class="messaging-component__s4">←</a>
          <div>
            <h2 class="messaging-component__s5">{{ currentChatPartner().username }}</h2>
            <span [style.color]="theme.colors().primary" class="messaging-component__s6">End-to-End Encrypted Tea</span>
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
          message="Shared notes appear here. Send normal messages, and include the word 'secret' to make a message self-destruct and disappear.">
        </app-page-hint>

        @for (msg of activeMessages(); track msg.id) {
          <div [style.align-self]="msg.senderId === 'me' ? 'flex-end' : 'flex-start'"
               [style.max-width]="'70%'"
               class="messaging-component__s8">
            <div [style.background-color]="msg.senderId === 'me' ? theme.colors().primary : theme.colors().bgSecondary"
                 [style.color]="msg.senderId === 'me' ? 'white' : theme.colors().text"
                 [style.border]="msg.senderId === 'me' ? 'none' : '1px solid ' + theme.colors().border"
                 class="messaging-component__s9">
              {{ msg.content }}
              @if (msg.isSelfDestruct) {
                <span class="messaging-component__s10">🔥 Self-Destructing</span>
              }
            </div>
            <span [style.color]="theme.colors().textSecondary" [style.text-align]="msg.senderId === 'me' ? 'right' : 'left'" class="messaging-time">
              {{ msg.timestamp | date:'h:mm a' }}
            </span>
          </div>
        }
      </div>

      <!-- Input Area -->
      <div [style.background-color]="theme.colors().bgSecondary" [style.border-top]="'1px solid ' + theme.colors().border"
           class="messaging-component__s11">
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
    </div>
  `
})
export class MessagingComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private route = inject(ActivatedRoute);
  public messaging = inject(MessagingService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public modal = inject(ModalService);
  private fallbackPartnerId = 'friend_1';
  private fallbackPartnerName = 'Sarah Best';
  private chatPartnerId = signal<string>(this.fallbackPartnerId);
  private chatPartnerName = signal<string>(this.fallbackPartnerName);

  currentChatPartner = computed(() => {
    return {
      id: this.chatPartnerId(),
      username: this.chatPartnerName()
    };
  });
  newMessage = '';

  activeMessages = computed(() =>
    this.messaging.getConversation('me', this.currentChatPartner().id)
  );

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const partnerId = (params.get('friendId') || params.get('friend') || '').trim();
      const partnerName = (params.get('friendName') || params.get('name') || '').trim();

      if (partnerId) {
        this.chatPartnerId.set(partnerId);
        this.chatPartnerName.set(partnerName || partnerId);
        return;
      }

      const fallback = this.getLatestConversationPartner();
      if (fallback) {
        this.chatPartnerId.set(fallback.id);
        this.chatPartnerName.set(fallback.username);
      } else {
        this.chatPartnerId.set(this.fallbackPartnerId);
        this.chatPartnerName.set(this.fallbackPartnerName);
      }
    });
  }

  private getLatestConversationPartner(): { id: string; username: string } | null {
    const messages = this.messaging.messages().slice().reverse();
    for (const msg of messages) {
      if (msg.senderId === 'me' && msg.receiverId !== 'me') {
        return { id: msg.receiverId, username: msg.receiverId };
      }
      if (msg.receiverId === 'me' && msg.senderId !== 'me') {
        return { id: msg.senderId, username: msg.senderId };
      }
    }
    return null;
  }

  ngOnInit() {
    this.messaging.markConversationAsRead('me', this.currentChatPartner().id);
  }

  ngAfterViewChecked() {
    this.messaging.markConversationAsRead('me', this.currentChatPartner().id);
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  send() {
    if (!this.newMessage.trim()) return;

    if (!this.security.moderateContent(this.newMessage)) {
      this.modal.show('Message flagged by AI moderation for safety.');
      return;
    }

    this.messaging.sendMessage({
      senderId: 'me',
      receiverId: this.currentChatPartner().id,
      content: this.newMessage,
      isSelfDestruct: this.newMessage.toLowerCase().includes('secret')
    });
    this.newMessage = '';
  }
}
