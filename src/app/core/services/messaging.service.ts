import { Injectable, signal } from '@angular/core';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private _messages = signal<Message[]>([]);
  public messages = this._messages.asReadonly();

  sendMessage(message: Omit<Message, 'id' | 'timestamp'>): void {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substring(2),
      timestamp: new Date()
    };
    this._messages.update(msgs => [...msgs, newMessage]);
    console.log('Message sent:', newMessage);
  }

  markAsRead(messageId: string): void {
    this._messages.update(msgs => msgs.map(m =>
      m.id === messageId ? { ...m, readAt: new Date() } : m
    ));
  }

  getConversation(userId1: string, userId2: string): Message[] {
    return this._messages().filter(m =>
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
