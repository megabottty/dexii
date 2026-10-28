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
  /** Set when the sender edited it ("Edited"). */
  editedAt?: Date;
  /** Set when the sender deleted it for everyone ("Message deleted"); content is then empty. */
  deletedAt?: Date;
}

/** The sender can edit a message for this long, like other chat apps. */
export const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

/** True while the sender may still edit this message. */
export function canEditMessage(message: Message, selfId: string | null | undefined, now: number = Date.now()): boolean {
  return !!selfId && message.senderId === selfId && !message.deletedAt && !message.isSelfDestruct
    && !message.isSafetyAlert && (!message.kind || message.kind === 'chat')
    && /^[a-f0-9]{24}$/.test(message.id)
    && now - new Date(message.timestamp).getTime() <= MESSAGE_EDIT_WINDOW_MS;
}

