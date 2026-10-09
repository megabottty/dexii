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
  relatedCrushId?: string; // Optional context: the crush this message is about
  /** What the message is for; plain chat when omitted. The server logs status/safety kinds in the history. */
  kind?: 'chat' | 'crush_share' | 'entry_share' | 'dating_status' | 'safety_alert';
  relatedEntryId?: string; // Link to specific entry/note
  isSelfDestruct?: boolean;
  selfDestructDurationMs?: number;
  /** Safety Check messages: pushed as "safety alert" without revealing the text. */
  isSafetyAlert?: boolean;
  reactions?: MessageReaction[];
}

