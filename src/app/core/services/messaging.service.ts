import { Injectable, signal } from '@angular/core';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private _messages = signal<Message[]>([
    {
      id: 'seed_msg_1',
      senderId: 'friend_1',
      receiverId: 'me',
      content: 'Private tea: I saw your crush at Blue Velvet last night.',
      timestamp: new Date(Date.now() - 1000 * 60 * 20)
    }
  ]);
  public messages = this._messages.asReadonly();

  sendMessage(message: Omit<Message, 'id' | 'timestamp'>): void {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substring(2),
      timestamp: new Date()
    };
    this._messages.update(msgs => [...msgs, newMessage]);

    if (newMessage.isSelfDestruct) {
      setTimeout(() => {
        this._messages.update(msgs => msgs.filter(m => m.id !== newMessage.id));
      }, 8000);
    }
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

  getUnreadForUser(userId: string): Message[] {
    return this._messages()
      .filter(m => m.receiverId === userId && !m.readAt)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getLatestUnreadForUser(userId: string): Message | null {
    const unread = this.getUnreadForUser(userId);
    return unread.length > 0 ? unread[0] : null;
  }

  markUnreadForUserAsRead(userId: string): void {
    this._messages.update(msgs =>
      msgs.map(m =>
        m.receiverId === userId && !m.readAt ? { ...m, readAt: new Date() } : m
      )
    );
  }

  markConversationAsRead(userId: string, friendId: string): void {
    this._messages.update(msgs =>
      msgs.map(m =>
        m.senderId === friendId && m.receiverId === userId && !m.readAt
          ? { ...m, readAt: new Date() }
          : m
      )
    );
  }
}
