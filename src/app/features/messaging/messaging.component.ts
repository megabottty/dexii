import { Component, signal, inject, computed, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
        <div style="width: 100px;"></div> <!-- Spacer for Help button -->
      </header>

      <!-- Messages Area -->
      <div #scrollContainer class="messaging-component__s7">
        <app-page-hint
          hintKey="chat_inline"
          title="Chat Hint"
          message="Shared notes appear here. Send normal messages, and include the word 'secret' for self-destructing messages.">
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

  public messaging = inject(MessagingService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public modal = inject(ModalService);

  currentChatPartner = computed(() => {
    const user = this.security.currentUser();
    return {
      id: user ? 'me' : 'friend_1',
      username: user || 'Sarah Best'
    };
  });
  newMessage = '';

  activeMessages = computed(() =>
    this.messaging.getConversation('me', this.currentChatPartner().id)
  );

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
