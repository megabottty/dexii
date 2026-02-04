export type EntryType = 'Note' | 'Date' | 'RedFlag' | 'SafetyCheck';

export interface Entry {
  id: string;
  crushId: string;
  type: EntryType;
  content: string;
  timestamp: Date;
  isBurnAfterReading?: boolean;
  hasViewed?: boolean; // For disappearing notes
  safetyContactId?: string; // Friend ID for safety check
}
