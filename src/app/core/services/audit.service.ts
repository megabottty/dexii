import { Injectable, inject, computed } from '@angular/core';
import { MessagingService } from './messaging.service';
import { DataService } from './data.service';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  type: 'share' | 'message';
  content: string;
  crushName?: string;
  crushId?: string;
  isFromMe: boolean;
  readAt?: Date;
  friendName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private messaging = inject(MessagingService);
  // Remove DataService from here to avoid circular dependency
  // We will pass DataService when needed or use another way if possible
  // Actually, we can just inject it and see if it fails, but DataService already injects AuditService.

  logEvent(senderId: string, receiverId: string, content: string, relatedCrushId?: string) {
    this.messaging.sendMessage({
      senderId,
      receiverId,
      content,
      relatedCrushId
    });
  }

  getAllSharedHistory(dataService: any) {
    return computed(() => {
      const msgs = this.messaging.messages();
      const crushes = dataService.getAllCrushes()();
      return msgs
        .filter(m => dataService.isMe(m.senderId) && m.relatedCrushId)
        .map(m => {
          const crushId = m.relatedCrushId!;
          const crush = crushes.find((c: any) => c.id === crushId);
          return {
            messageId: m.id,
            crushId: crushId,
            crushName: crush?.nickname || 'Unknown Crush',
            receiverId: m.receiverId,
            timestamp: m.timestamp,
            readAt: m.readAt
          };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
  }

  getHistoryWithFriend(friendId: string, dataService: any) {
    return computed(() => {
      const msgs = this.messaging.messages();
      const crushes = dataService.getAllCrushes()();
      const myId = dataService.getUserId();

      if (dataService.isMe(friendId)) return [];

      return msgs
        .filter(m =>
          // I sent it to them
          (dataService.isMe(m.senderId) &&
           (m.receiverId === friendId || (dataService.isMe(friendId) && dataService.isMe(m.receiverId)))) ||
          // They sent it to me
          (dataService.isMe(m.receiverId) &&
           (m.senderId === friendId || (dataService.isMe(friendId) && dataService.isMe(m.senderId))))
        )
        .map(m => {
          const crushId = m.relatedCrushId;
          const crush = crushId ? crushes.find((c: any) => c.id === crushId) : null;
          const isFromMe = dataService.isMe(m.senderId);

          const entry: AuditEntry = {
            id: m.id,
            timestamp: m.timestamp,
            type: crushId ? 'share' : 'message',
            content: m.content,
            crushName: crush?.nickname || 'Unknown Crush',
            crushId: crushId,
            isFromMe,
            readAt: m.readAt,
            friendName: isFromMe ? (dataService.isMe(friendId) ? myId : friendId) : m.senderId
          };
          return entry;
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
  }

  getSentCrushesStatus(friendId: string, dataService: any) {
    return computed(() => {
      const all = dataService.getAllCrushes()();
      const msgs = this.messaging.messages();

      if (dataService.isMe(friendId)) return [];

      return all
        .filter((c: any) => dataService.isCrushSharedWith(c, friendId))
        .map((c: any) => {
          // Find if there's a message for this sharing
          const shareMsg = msgs.find(m =>
            dataService.isMe(m.senderId) &&
            (m.receiverId === friendId || (dataService.isMe(friendId) && dataService.isMe(m.receiverId))) &&
            m.relatedCrushId === c.id
          );
          return {
            ...c,
            viewedByFriend: !!shareMsg?.readAt,
            readAt: shareMsg?.readAt
          };
        });
    });
  }
}
