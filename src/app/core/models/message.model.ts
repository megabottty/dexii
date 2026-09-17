export interface MessageReaction {
  user: string; // user id who reacted
  emoji: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  readAt?: Date;
  relatedCrushId?: string; // Optional context: sharing tea about someone
  relatedEntryId?: string; // Link to specific entry/note
  isSelfDestruct?: boolean;
  selfDestructDurationMs?: number;
  reactions?: MessageReaction[];
}

