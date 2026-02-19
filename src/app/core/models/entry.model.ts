export type EntryType = 'Note' | 'Date' | 'RedFlag' | 'SafetyCheck' | 'PrivateJournal';

export interface Entry {
  id: string;
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
}
