export type EntryType = 'Note' | 'Update' | 'Date' | 'RedFlag' | 'SafetyCheck' | 'PrivateJournal';

export interface EntryEditHistoryItem {
  previousContent: string;
  editedAt: Date;
}

/** Someone shown on a reaction or comment. */
export interface EntryPerson {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

/** One emoji per person on an Update For Friends (DEX-45). */
export interface UpdateReaction {
  userId: string;
  emoji: string;
  at?: Date;
  user?: EntryPerson | null;
}

export interface UpdateComment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  editedAt?: Date;
  /** Ids of everyone who hearted it. */
  hearts: string[];
  user?: EntryPerson | null;
}

export interface Entry {
  id: string;
  /** The author (set on entries from the server). */
  userId?: string;
  crushId: string;
  type: EntryType;
  content: string;
  timestamp: Date;
  isBurnAfterReading?: boolean;
  hasViewed?: boolean;
  visibility: string[]; // List of friend IDs this specific entry is shared with
  isSensitive: boolean; // For blurred/extra security
  safetyContactId?: string; // Friend ID for safety check-in
  safetyStatus?: 'Draft' | 'Sent' | 'Safe' | 'Urgent';
  redFlagCount?: number; // Optional increment if RedFlag type
  editHistory?: EntryEditHistoryItem[]; // Prior versions of `content`, oldest first
  editedAt?: Date; // Timestamp of the most recent content edit, if any
  reactions?: UpdateReaction[];
  comments?: UpdateComment[];
}
