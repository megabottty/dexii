import { Component, signal, inject, computed, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MessagingService } from '../../core/services/messaging.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';

@Component({
  selector: 'app-messaging',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         style="height: 100vh; font-family: 'Times New Roman', serif; display: flex; flex-direction: column;">

      <!-- Header -->
      <header [style.background-color]="theme.colors().bgSecondary" [style.border-bottom]="'1px solid ' + theme.colors().border"
              style="padding: 20px 40px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <a routerLink="/friends" [style.color]="theme.colors().textSecondary" style="text-decoration: none; font-size: 20px;">←</a>
          <div>
            <h2 style="font-size: 18px; font-weight: 200; text-transform: uppercase; letter-spacing: 2px; margin: 0;">{{ currentChatPartner().username }}</h2>
            <span [style.color]="theme.colors().primary" style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">End-to-End Encrypted Tea</span>
          </div>
        </div>
      </header>

      <!-- Messages Area -->
      <div #scrollContainer style="flex: 1; overflow-y: auto; padding: 40px; display: flex; flex-direction: column; gap: 20px;">
        @for (msg of activeMessages(); track msg.id) {
          <div [style.align-self]="msg.senderId === 'me' ? 'flex-end' : 'flex-start'"
               [style.max-width]="'70%'"
               style="display: flex; flex-direction: column; gap: 4px;">
            <div [style.background-color]="msg.senderId === 'me' ? theme.colors().primary : theme.colors().bgSecondary"
                 [style.color]="msg.senderId === 'me' ? 'white' : theme.colors().text"
                 [style.border]="msg.senderId === 'me' ? 'none' : '1px solid ' + theme.colors().border"
                 style="padding: 12px 20px; border-radius: 0px; font-size: 14px; position: relative;">
              {{ msg.content }}
              @if (msg.isSelfDestruct) {
                <span style="display: block; font-size: 8px; margin-top: 4px; opacity: 0.7; text-transform: uppercase;">🔥 Self-Destructing</span>
              }
            </div>
            <span [style.color]="theme.colors().textSecondary" style="font-size: 8px; text-transform: uppercase; letter-spacing: 1px; text-align: {{ msg.senderId === 'me' ? 'right' : 'left' }}">
              {{ msg.timestamp | date:'h:mm a' }}
            </span>
          </div>
        }
      </div>

      <!-- Input Area -->
      <div [style.background-color]="theme.colors().bgSecondary" [style.border-top]="'1px solid ' + theme.colors().border"
           style="padding: 24px 40px; display: flex; gap: 16px; align-items: center;">
        <input [(ngModel)]="newMessage" (keyup.enter)="send()"
               [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text"
               placeholder="Spill the tea..."
               style="flex: 1; padding: 14px 20px; border-radius: 0px; outline: none; font-family: 'Times New Roman', serif;">
        <button (click)="send()" [style.background-color]="theme.colors().primary"
                style="color: white; border: none; padding: 14px 30px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">
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

  currentChatPartner = signal({ id: 'friend_1', username: 'Bestie_Sarah' });
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
      alert("Message flagged by AI moderation for safety.");
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
